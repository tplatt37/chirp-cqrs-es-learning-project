# CQRS + Event Sourcing Architecture

This document describes the architecture of the Chirp application, which implements Command Query Responsibility Segregation (CQRS) and Event Sourcing patterns.

## Table of Contents
1. [Overall Architecture](#overall-architecture)
2. [Command Flow (Write Side)](#command-flow-write-side)
3. [Query Flow (Read Side)](#query-flow-read-side)
4. [Event Sourcing](#event-sourcing)
5. [Event Projection & Timeline Optimization](#event-projection--timeline-optimization)
6. [Layer Architecture](#layer-architecture)
7. [Specific Flow Examples](#specific-flow-examples)

---

## Overall Architecture

The application follows CQRS principles, separating the write side (commands) from the read side (queries).

```mermaid
graph TB
    subgraph "Write Side (Commands)"
        CMD[Command] --> CH[Command Handler]
        CH --> AGG[Aggregate]
        AGG --> EVENTS[Domain Events]
        EVENTS --> ES[(Event Store)]
    end
    
    subgraph "Read Side (Queries)"
        QUERY[Query] --> QH[Query Handler]
        QH --> RM[(Read Model)]
    end
    
    subgraph "Event Projection"
        ES --> PROJ[Event Projector]
        PROJ --> RM
    end
    
    UI[User Interface] --> CMD
    UI --> QUERY
    
    style CMD fill:#e1f5ff
    style QUERY fill:#fff4e1
    style ES fill:#ffe1e1
    style RM fill:#e1ffe1
```

**Key Principles:**
- **Write Side**: Commands modify state by creating domain events
- **Read Side**: Queries read from optimized read models
- **Event Store**: Single source of truth for all state changes
- **Eventual Consistency**: Read models are eventually consistent with the event store

---

## Command Flow (Write Side)

Commands represent user intentions to modify state. They flow through the system creating events that are persisted.

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant CH as Command Handler
    participant AGG as Aggregate
    participant ES as Event Store
    participant PROJ as Event Projector
    participant RM as Read Model
    
    UI->>CH: Execute Command
    Note over CH: Validate command
    CH->>RM: Check business rules<br/>(e.g., username exists)
    RM-->>CH: Validation result
    
    CH->>AGG: Create/Load Aggregate
    Note over AGG: Business logic<br/>enforced here
    AGG->>AGG: Generate Domain Event(s)
    AGG-->>CH: Return uncommitted events
    
    CH->>ES: Save events
    Note over ES: Events persisted<br/>as single source of truth
    ES-->>CH: Confirmation
    
    ES->>PROJ: Notify new events
    PROJ->>RM: Update read model
    
    CH-->>UI: Command result
```

**Flow Steps:**
1. User interface sends a command to the handler
2. Handler validates the command (may check read model)
3. Handler creates or loads the aggregate from events
4. Aggregate enforces business rules and generates domain events
5. Handler saves events to the event store
6. Event projector updates the read model
7. Handler returns result to UI

---

## Query Flow (Read Side)

Queries read from optimized read models without touching the event store or aggregates.

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant QH as Query Handler
    participant RM as Read Model
    
    UI->>QH: Execute Query
    Note over QH: No business logic<br/>Simple data retrieval
    
    QH->>RM: Fetch data
    Note over RM: Optimized for reads<br/>Denormalized data
    
    RM-->>QH: Return data
    QH-->>UI: Query result
```

**Key Points:**
- Queries are simple and fast
- No business logic on the read side
- Read models are denormalized for optimal query performance
- Read models may be eventually consistent

---

## Event Sourcing

Instead of storing current state, the system stores all events that led to the current state.

### Aggregate Reconstruction from Events

```mermaid
graph LR
    subgraph "Event Store"
        E1[Event 1<br/>UserRegistered<br/>v1]
        E2[Event 2<br/>ChirpPosted<br/>v2]
        E3[Event 3<br/>ChirpPosted<br/>v3]
    end
    
    subgraph "Aggregate Reconstruction"
        E1 --> AGG[Aggregate]
        E2 --> AGG
        E3 --> AGG
        AGG --> STATE[Current State<br/>User with 2 chirps<br/>Version: 3]
    end
    
    style E1 fill:#ffe1e1
    style E2 fill:#ffe1e1
    style E3 fill:#ffe1e1
    style STATE fill:#e1f5ff
```

### Event Store Structure

```mermaid
graph TB
    subgraph "Event Store"
        ES[(Event Store)]
        
        subgraph "User-123 Events"
            E1[UserRegistered<br/>version: 1]
            E2[ChirpPosted<br/>version: 2]
        end
        
        subgraph "User-456 Events"
            E3[UserRegistered<br/>version: 1]
            E4[UserFollowed<br/>version: 2]
        end
        
        subgraph "Chirp-789 Events"
            E5[ChirpPosted<br/>version: 1]
        end
    end
    
    ES --> E1
    ES --> E2
    ES --> E3
    ES --> E4
    ES --> E5
```

**Benefits:**
- Complete audit trail of all changes
- Ability to reconstruct state at any point in time
- Can rebuild read models by replaying events
- Temporal queries (what was the state at time X?)

---

## Event Projection & Timeline Optimization

The system uses different strategies for projecting events to read models based on user type (celebrity vs regular user).

### Event Projection Flow

```mermaid
flowchart TB
    START[Domain Event Created] --> PROJ[Event Projector]
    
    PROJ --> CHECK{Event Type?}
    
    CHECK -->|UserRegistered| UR[Create User Profile<br/>in Read Model]
    CHECK -->|UserFollowed| UF[Add Following Relationship]
    CHECK -->|UserUnfollowed| UUF[Remove Following Relationship]
    CHECK -->|ChirpPosted| CP[Save Chirp to Read Model]
    
    CP --> CELEB{Is Author<br/>a Celebrity?}
    
    CELEB -->|Yes| TRACK[Track Celebrity Chirp<br/>No Fan-out]
    CELEB -->|No| FANOUT[Fan-out to Followers]
    
    FANOUT --> GET[Get All Followers]
    GET --> PUSH[Push Chirp to Each<br/>Follower's Timeline]
    
    UF --> BACKFILL{Is Followee<br/>a Celebrity?}
    BACKFILL -->|No| BF[Backfill Existing Chirps<br/>to Follower's Timeline]
    BACKFILL -->|Yes| SKIP[Skip Backfill<br/>Pull at Read Time]
    
    UUF --> CLEANUP{Is Followee<br/>a Celebrity?}
    CLEANUP -->|No| CLEAN[Remove All Followee Chirps<br/>from Timeline]
    CLEANUP -->|Yes| NOCLEAN[No Cleanup Needed]
    
    UR --> DONE[Read Model Updated]
    TRACK --> DONE
    PUSH --> DONE
    BF --> DONE
    SKIP --> DONE
    CLEAN --> DONE
    NOCLEAN --> DONE
    
    style CELEB fill:#fff4e1
    style BACKFILL fill:#fff4e1
    style CLEANUP fill:#fff4e1
```

### Timeline Strategies

#### Regular Users (Write-time Fan-out)

```mermaid
sequenceDiagram
    participant User as Regular User
    participant ES as Event Store
    participant PROJ as Event Projector
    participant F1 as Follower 1 Timeline
    participant F2 as Follower 2 Timeline
    participant F3 as Follower 3 Timeline
    
    User->>ES: ChirpPosted Event
    ES->>PROJ: Project Event
    
    PROJ->>PROJ: Get Followers
    Note over PROJ: Write-time fan-out
    
    PROJ->>F1: Add Chirp to Timeline
    PROJ->>F2: Add Chirp to Timeline
    PROJ->>F3: Add Chirp to Timeline
    
    Note over F1,F3: Chirps pre-materialized<br/>Fast reads
```

**Advantages:**
- Fast reads (timeline is pre-computed)
- Simple query logic

**Trade-offs:**
- Higher write cost
- More storage (duplicated chirp references)

#### Celebrity Users (Read-time Pull)

```mermaid
sequenceDiagram
    participant Celeb as Celebrity User
    participant ES as Event Store
    participant PROJ as Event Projector
    participant CT as Celebrity Tracker
    participant Reader as Feed Reader
    participant Timeline as User Timeline
    
    Celeb->>ES: ChirpPosted Event
    ES->>PROJ: Project Event
    
    PROJ->>CT: Track Celebrity Chirp
    Note over PROJ: No fan-out!
    
    Note over Reader,Timeline: Later: User reads feed
    Reader->>Timeline: Get materialized chirps
    Reader->>CT: Get celebrity chirps
    Reader->>Reader: Merge & sort
    Reader-->>Reader: Return combined feed
```

**Advantages:**
- Scalable for high-follower-count users
- Lower write cost
- Less storage

**Trade-offs:**
- Slightly slower reads (pull + merge)

### Follow/Unfollow Timeline Management

```mermaid
flowchart TB
    subgraph "Follow Event"
        FOLLOW[UserFollowed Event] --> CHECKF{Followee is<br/>Celebrity?}
        CHECKF -->|No| BACKFILL[Backfill Timeline]
        CHECKF -->|Yes| SKIPB[Skip Backfill]
        
        BACKFILL --> GET[Get Followee's<br/>Existing Chirps]
        GET --> ADD[Add All to<br/>Follower's Timeline]
    end
    
    subgraph "Unfollow Event"
        UNFOLLOW[UserUnfollowed Event] --> CHECKU{Followee is<br/>Celebrity?}
        CHECKU -->|No| CLEANUP[Clean Timeline]
        CHECKU -->|Yes| SKIPC[Skip Cleanup]
        
        CLEANUP --> REMOVE[Remove All Followee<br/>Chirps from Timeline]
    end
    
    style CHECKF fill:#fff4e1
    style CHECKU fill:#fff4e1
```

---

## Layer Architecture

The application follows a layered architecture pattern.

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[React Components]
        CONTEXT[App Context]
    end
    
    subgraph "Application Layer"
        CMD[Commands]
        QUERY[Queries]
        CMDH[Command Handlers]
        QUERYH[Query Handlers]
        PORTS[Ports/Interfaces]
    end
    
    subgraph "Domain Layer"
        AGG[Aggregates]
        VO[Value Objects]
        EVENTS[Domain Events]
        ERRORS[Domain Errors]
    end
    
    subgraph "Infrastructure Layer"
        ES[(Event Store)]
        RM[(Read Model Repository)]
        PROJ[Event Projector]
        LOG[Logger]
    end
    
    UI --> CONTEXT
    CONTEXT --> CMDH
    CONTEXT --> QUERYH
    
    CMDH --> PORTS
    QUERYH --> PORTS
    CMDH --> AGG
    
    AGG --> VO
    AGG --> EVENTS
    AGG --> ERRORS
    
    PORTS -.implements.-> ES
    PORTS -.implements.-> RM
    
    ES --> PROJ
    PROJ --> RM
    
    LOG -.used by.-> CMDH
    LOG -.used by.-> QUERYH
    LOG -.used by.-> AGG
    LOG -.used by.-> PROJ
    
    style UI fill:#e1f5ff
    style AGG fill:#ffe1e1
    style ES fill:#fff4e1
    style RM fill:#e1ffe1
```

**Layer Responsibilities:**

1. **Presentation Layer**
   - User interface components
   - State management
   - User interactions

2. **Application Layer**
   - Coordinates application flow
   - Commands and queries
   - Handlers (application logic)
   - Ports (interfaces for infrastructure)

3. **Domain Layer**
   - Business logic and rules
   - Aggregates (entities with identity)
   - Value objects (immutable values)
   - Domain events
   - Domain errors

4. **Infrastructure Layer**
   - Event store implementation
   - Read model repository implementation
   - Event projection
   - Logging

---

## Specific Flow Examples

### Example 1: User Registration

```mermaid
sequenceDiagram
    participant UI
    participant Handler as RegisterUserHandler
    participant RM as Read Model
    participant User as User Aggregate
    participant ES as Event Store
    participant Projector
    
    UI->>Handler: RegisterUserCommand("alice")
    Handler->>RM: Check if username exists
    RM-->>Handler: Username available
    
    Handler->>User: User.register(username)
    Note over User: Create UserId<br/>Create UserRegistered event
    User-->>Handler: User aggregate + events
    
    Handler->>ES: saveEvents(userId, events)
    ES-->>Handler: Success
    
    ES->>Projector: UserRegistered event
    Projector->>RM: Save user profile
    
    Handler-->>UI: userId
```

### Example 2: Posting a Chirp (Regular User)

```mermaid
sequenceDiagram
    participant UI
    participant Handler as PostChirpHandler
    participant ES as Event Store
    participant Chirp as Chirp Aggregate
    participant Projector
    participant RM as Read Model
    
    UI->>Handler: PostChirpCommand(userId, content)
    
    Handler->>ES: getEvents(userId)
    ES-->>Handler: User events
    
    Note over Handler: Verify user exists<br/>by checking events
    
    Handler->>Chirp: Chirp.post(chirpId, userId, content)
    Note over Chirp: Create ChirpPosted event
    Chirp-->>Handler: Chirp aggregate + events
    
    Handler->>ES: saveEvents(chirpId, events)
    ES-->>Handler: Success
    
    ES->>Projector: ChirpPosted event
    Projector->>RM: Save chirp
    Projector->>RM: Get author followers
    RM-->>Projector: [follower1, follower2, follower3]
    
    Note over Projector: Write-time fan-out
    loop For each follower
        Projector->>RM: addToTimeline(followerId, chirpId)
    end
    
    Handler-->>UI: chirpId
```

### Example 3: Following a User (with Timeline Backfill)

```mermaid
sequenceDiagram
    participant UI
    participant Handler as FollowUserHandler
    participant ES as Event Store
    participant Follow as FollowRelationship Aggregate
    participant Projector
    participant RM as Read Model
    
    UI->>Handler: FollowUserCommand(followerId, followeeId)
    
    Handler->>RM: Check if already following
    RM-->>Handler: Not following
    
    Handler->>Follow: FollowRelationship.create(followerId, followeeId)
    Note over Follow: Create UserFollowed event
    Follow-->>Handler: Aggregate + events
    
    Handler->>ES: saveEvents(relationshipId, events)
    ES-->>Handler: Success
    
    ES->>Projector: UserFollowed event
    Projector->>RM: addFollowing(followerId, followeeId)
    
    Projector->>RM: Is followee celebrity?
    RM-->>Projector: No (regular user)
    
    Projector->>RM: Get followee's existing chirps
    RM-->>Projector: [chirp1, chirp2, chirp3]
    
    Note over Projector: Timeline backfill
    loop For each chirp
        Projector->>RM: addToTimeline(followerId, chirpId)
    end
    
    Handler-->>UI: relationshipId
```

### Example 4: Reading User Feed

```mermaid
sequenceDiagram
    participant UI
    participant Handler as GetUserFeedHandler
    participant RM as Read Model
    
    UI->>Handler: GetUserFeedQuery(userId)
    
    Handler->>RM: getUserFeed(userId)
    
    Note over RM: Read materialized timeline<br/>+ pull celebrity chirps<br/>Merge and sort
    
    RM-->>Handler: [chirp1, chirp2, chirp3, ...]
    
    Handler-->>UI: Feed data
    
    Note over UI: Fast read!<br/>No event replay<br/>No complex joins
```

---

## Key Patterns and Concepts

### 1. Eventual Consistency
- Write side completes immediately after saving events
- Read models are updated asynchronously
- UI may show slightly stale data (acceptable trade-off)

### 2. Aggregate Boundaries
- Each aggregate is responsible for its own consistency
- User aggregate: manages user registration
- Chirp aggregate: manages chirp posting
- FollowRelationship aggregate: manages follow/unfollow

### 3. Domain Events as First-Class Citizens
- Events are the source of truth
- Events enable temporal queries
- Events enable rebuilding read models
- Events provide complete audit trail

### 4. Read Model Optimization
- Denormalized for fast reads
- Separate models for different use cases
- Celebrity optimization pattern
- Timeline pre-materialization

### 5. Command-Query Separation
- Commands: Mutate state, return minimal data (usually IDs)
- Queries: Read state, never mutate
- Different models for writes vs reads
- Optimized independently

---

## Benefits of This Architecture

1. **Scalability**
   - Read and write sides scale independently
   - Celebrity optimization prevents write bottlenecks
   - Read models optimized for specific queries

2. **Auditability**
   - Complete history of all changes
   - Can answer "what happened?" questions
   - Supports compliance and debugging

3. **Flexibility**
   - Can add new read models without changing write side
   - Can rebuild read models from events
   - Can create new projections for new features

4. **Business Logic Isolation**
   - Domain logic encapsulated in aggregates
   - Clean separation of concerns
   - Testable business rules

5. **Performance**
   - Reads are fast (pre-computed data)
   - Writes are focused (just append events)
   - Can optimize each side independently

---

## Trade-offs and Considerations

1. **Complexity**
   - More moving parts than CRUD
   - Eventual consistency requires careful UX design
   - Requires understanding of both patterns

2. **Storage**
   - Events are never deleted (by design)
   - Read models duplicate data
   - Need to plan for data growth

3. **Learning Curve**
   - Team needs to understand CQRS/ES patterns
   - Different from traditional CRUD thinking
   - Requires discipline to maintain boundaries

4. **Debugging**
   - More complex to trace through system
   - Need good logging and monitoring
   - Event versioning considerations

---

## Conclusion

This architecture provides a robust foundation for building scalable, auditable applications. The separation of concerns between commands and queries, combined with event sourcing, enables the system to handle complex domain logic while maintaining high performance for both reads and writes.

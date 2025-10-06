# Hexagonal Architecture (Ports and Adapters)

This document explains how the Chirp application implements Hexagonal Architecture, also known as the Ports and Adapters pattern.

## Table of Contents
1. [Introduction](#introduction)
2. [The Hexagonal Structure](#the-hexagonal-structure)
3. [Ports (Interfaces)](#ports-interfaces)
4. [Adapters (Implementations)](#adapters-implementations)
5. [Dependency Inversion Principle](#dependency-inversion-principle)
6. [Request Flow Through the Hexagon](#request-flow-through-the-hexagon)
7. [Benefits and Advantages](#benefits-and-advantages)
8. [Swappable Adapters](#swappable-adapters)

---

## Introduction

**Hexagonal Architecture** (coined by Alistair Cockburn) is an architectural pattern that aims to create loosely coupled application components that can be easily connected to their software environment through ports and adapters. This architecture separates the core business logic from external concerns.

### Key Principles

1. **Domain at the center**: Business logic is isolated from external concerns
2. **Ports**: Define interfaces (contracts) for communication
3. **Adapters**: Implement the interfaces to connect to external systems
4. **Dependency direction**: All dependencies point inward toward the domain

---

## The Hexagonal Structure

```mermaid
graph TB
    subgraph "Outside World"
        UI[UI/React<br/>Primary Adapter]
        DB[(Database<br/>Secondary Adapter)]
        LOG[Logger<br/>Secondary Adapter]
    end
    
    subgraph "Hexagon Boundary - Ports"
        COMMANDS[Commands<br/>Primary Port]
        QUERIES[Queries<br/>Primary Port]
        IES[IEventStore<br/>Secondary Port]
        IRM[IReadModelRepository<br/>Secondary Port]
    end
    
    subgraph "Application Layer"
        HANDLERS[Command/Query<br/>Handlers]
    end
    
    subgraph "Domain Core - Protected"
        DOMAIN[Domain Logic<br/>Aggregates<br/>Value Objects<br/>Events]
    end
    
    UI -->|drives| COMMANDS
    UI -->|drives| QUERIES
    COMMANDS --> HANDLERS
    QUERIES --> HANDLERS
    
    HANDLERS -->|uses| DOMAIN
    HANDLERS -->|depends on| IES
    HANDLERS -->|depends on| IRM
    
    DB -->|implements| IES
    DB -->|implements| IRM
    LOG -.->|used by| HANDLERS
    
    style DOMAIN fill:#ffe1e1
    style UI fill:#e1f5ff
    style DB fill:#e1ffe1
    style IES fill:#fff4e1
    style IRM fill:#fff4e1
```

### Layers Explained

- **Domain Core** (center): Pure business logic with zero dependencies
- **Application Layer**: Orchestrates domain logic, depends only on ports
- **Ports**: Interfaces defining how to interact with external systems
- **Adapters**: Concrete implementations of ports, connecting to actual technologies

---

## Ports (Interfaces)

Ports are interfaces that define contracts. They represent what the application needs from the outside world (secondary ports) or what the outside world can do to the application (primary ports).

### Port Types

```mermaid
graph LR
    subgraph "Primary Ports - Driving"
        COMMANDS[Commands<br/>RegisterUserCommand<br/>PostChirpCommand<br/>etc.]
        QUERIES[Queries<br/>GetUserFeedQuery<br/>GetAllUsersQuery<br/>etc.]
    end
    
    subgraph "Application Core"
        APP[Application<br/>Handlers]
    end
    
    subgraph "Secondary Ports - Driven"
        IES[IEventStore<br/>Port]
        IRM[IReadModelRepository<br/>Port]
    end
    
    COMMANDS -->|drive| APP
    QUERIES -->|drive| APP
    APP -->|needs| IES
    APP -->|needs| IRM
    
    style COMMANDS fill:#e1f5ff
    style QUERIES fill:#e1f5ff
    style IES fill:#fff4e1
    style IRM fill:#fff4e1
```

### Secondary Port: IEventStore

Located at: `src/application/ports/IEventStore.ts`

```typescript
export interface IEventStore {
  saveEvents(aggregateId: string, events: DomainEvent[]): Promise<void>;
  getEvents(aggregateId: string): Promise<DomainEvent[]>;
  getAllEvents(): Promise<DomainEvent[]>;
}
```

**Purpose**: Defines how to persist and retrieve domain events
**Why it's a port**: Application doesn't care *how* events are stored (memory, PostgreSQL, MongoDB, etc.)

### Secondary Port: IReadModelRepository

Located at: `src/application/ports/IReadModelRepository.ts`

```typescript
export interface IReadModelRepository {
  // User operations
  saveUserProfile(profile: UserProfileReadModel): Promise<void>;
  getUserProfile(userId: string): Promise<UserProfileReadModel | null>;
  // ... many more methods
  
  // Feed operations
  getUserFeed(userId: string): Promise<ChirpReadModel[]>;
  
  // Timeline operations
  addToTimeline(userId: string, chirpId: string): Promise<void>;
  // ... etc
}
```

**Purpose**: Defines how to persist and query read models
**Why it's a port**: Application doesn't care about the underlying storage technology

---

## Adapters (Implementations)

Adapters are concrete implementations of ports. They connect the application to specific technologies.

### Adapter Structure

```mermaid
graph TB
    subgraph "Application Layer - Depends on Ports"
        HANDLER[Command Handler]
        PORT1[IEventStore<br/>interface]
        PORT2[IReadModelRepository<br/>interface]
        HANDLER -.depends on.-> PORT1
        HANDLER -.depends on.-> PORT2
    end
    
    subgraph "Infrastructure Layer - Implements Ports"
        ADAPTER1[InMemoryEventStore<br/>implements IEventStore]
        ADAPTER2[InMemoryReadModelRepository<br/>implements IReadModelRepository]
        
        ADAPTER1 -.implements.-> PORT1
        ADAPTER2 -.implements.-> PORT2
    end
    
    subgraph "External Systems"
        MEM1[(In-Memory<br/>Storage)]
        MEM2[(In-Memory<br/>Storage)]
    end
    
    ADAPTER1 --> MEM1
    ADAPTER2 --> MEM2
    
    style PORT1 fill:#fff4e1
    style PORT2 fill:#fff4e1
    style ADAPTER1 fill:#e1ffe1
    style ADAPTER2 fill:#e1ffe1
```

### Primary Adapter: React UI

Located at: `src/presentation/`

```mermaid
graph LR
    USER[User] -->|interacts| UI[React Components]
    UI -->|creates| COMMANDS[Commands]
    UI -->|creates| QUERIES[Queries]
    COMMANDS -->|sent to| HANDLERS[Application Handlers]
    QUERIES -->|sent to| HANDLERS
    
    style UI fill:#e1f5ff
```

**Purpose**: Translates user actions into commands and queries
**Technology**: React, but could be replaced with Vue, Angular, CLI, etc.

### Secondary Adapter: InMemoryEventStore

Located at: `src/infrastructure/event-store/InMemoryEventStore.ts`

```mermaid
graph TB
    PORT[IEventStore<br/>Port/Interface]
    
    ADAPTER[InMemoryEventStore<br/>Adapter]
    
    STORAGE[(Map<string, DomainEvent[]><br/>In-Memory Storage)]
    
    ADAPTER -.implements.-> PORT
    ADAPTER -->|uses| STORAGE
    
    style PORT fill:#fff4e1
    style ADAPTER fill:#e1ffe1
```

**Current Implementation**: Uses JavaScript Map for in-memory storage
**Could be replaced with**: PostgresEventStore, MongoEventStore, EventStoreDB adapter, etc.

### Secondary Adapter: InMemoryReadModelRepository

Located at: `src/infrastructure/repositories/InMemoryReadModelRepository.ts`

```mermaid
graph TB
    PORT[IReadModelRepository<br/>Port/Interface]
    
    ADAPTER[InMemoryReadModelRepository<br/>Adapter]
    
    subgraph "In-Memory Storage"
        USERS[(User Profiles Map)]
        CHIRPS[(Chirps Map)]
        FOLLOWING[(Following Map)]
        TIMELINES[(Timelines Map)]
    end
    
    ADAPTER -.implements.-> PORT
    ADAPTER -->|uses| USERS
    ADAPTER -->|uses| CHIRPS
    ADAPTER -->|uses| FOLLOWING
    ADAPTER -->|uses| TIMELINES
    
    style PORT fill:#fff4e1
    style ADAPTER fill:#e1ffe1
```

**Current Implementation**: Uses JavaScript Maps for in-memory storage
**Could be replaced with**: PostgresReadModelRepository, RedisReadModelRepository, etc.

### Secondary Adapter: EventProjector

Located at: `src/infrastructure/projections/EventProjector.ts`

```mermaid
graph LR
    ES[Event Store] -->|events| PROJ[EventProjector<br/>Adapter]
    PROJ -->|updates| RM[Read Model Repository]
    
    style PROJ fill:#e1ffe1
```

**Purpose**: Projects domain events into read models
**Why it's an adapter**: Bridges between event store and read model repository

---

## Dependency Inversion Principle

The key to Hexagonal Architecture is that **dependencies point inward**.

```mermaid
graph TB
    subgraph "Layer 1 - External/Infrastructure"
        UI[UI Adapter<br/>React]
        ES[EventStore Adapter<br/>InMemory]
        RM[ReadModel Adapter<br/>InMemory]
    end
    
    subgraph "Layer 2 - Ports"
        COMMANDS[Commands]
        QUERIES[Queries]
        IES[IEventStore<br/>interface]
        IRM[IReadModelRepository<br/>interface]
    end
    
    subgraph "Layer 3 - Application"
        HANDLERS[Handlers]
    end
    
    subgraph "Layer 4 - Domain Core"
        DOMAIN[Domain Logic<br/>No Dependencies!]
    end
    
    UI -->|implements| COMMANDS
    UI -->|implements| QUERIES
    ES -.implements.-> IES
    RM -.implements.-> IRM
    
    COMMANDS --> HANDLERS
    QUERIES --> HANDLERS
    HANDLERS -.depends on.-> IES
    HANDLERS -.depends on.-> IRM
    HANDLERS --> DOMAIN
    
    style DOMAIN fill:#ffe1e1
    style IES fill:#fff4e1
    style IRM fill:#fff4e1
```

### Dependency Rules

1. **Domain Layer**: Has ZERO dependencies - pure business logic
2. **Application Layer**: Depends only on Domain and Port interfaces
3. **Infrastructure Layer**: Depends on Ports (implements them)
4. **Never**: Domain → Application, Domain → Infrastructure

### Example: Handler Dependencies

```mermaid
classDiagram
    class RegisterUserHandler {
        -eventStore: IEventStore
        -readModelRepository: IReadModelRepository
        +handle(command)
    }
    
    class IEventStore {
        <<interface>>
        +saveEvents()
        +getEvents()
    }
    
    class IReadModelRepository {
        <<interface>>
        +getUserProfile()
        +saveUserProfile()
    }
    
    class InMemoryEventStore {
        +saveEvents()
        +getEvents()
    }
    
    class InMemoryReadModelRepository {
        +getUserProfile()
        +saveUserProfile()
    }
    
    RegisterUserHandler ..> IEventStore : depends on
    RegisterUserHandler ..> IReadModelRepository : depends on
    
    InMemoryEventStore ..|> IEventStore : implements
    InMemoryReadModelRepository ..|> IReadModelRepository : implements
    
    note for RegisterUserHandler "Handler depends on\ninterfaces (ports),\nNOT implementations"
```

**Key Point**: `RegisterUserHandler` knows about `IEventStore` and `IReadModelRepository` interfaces, but has no knowledge of `InMemoryEventStore` or `InMemoryReadModelRepository` concrete classes.

---

## Request Flow Through the Hexagon

### Command Flow (Write Operation)

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Adapter<br/>(React)
    participant CMD as Command
    participant Handler as Command Handler<br/>(Application)
    participant Domain as Domain Core
    participant IES as IEventStore<br/>(Port)
    participant ES as EventStore Adapter<br/>(InMemory)
    participant IRM as IReadModelRepository<br/>(Port)
    participant PROJ as EventProjector<br/>(Adapter)
    participant RM as ReadModel Adapter<br/>(InMemory)
    
    User->>UI: Click "Register"
    UI->>CMD: Create RegisterUserCommand
    CMD->>Handler: Execute command
    
    Note over Handler: Application Layer<br/>Orchestrates flow
    
    Handler->>Domain: Create User aggregate
    Domain-->>Handler: UserRegistered event
    
    Handler->>IES: saveEvents()
    Note over IES: Port interface
    IES->>ES: Concrete implementation
    ES-->>IES: Success
    IES-->>Handler: Success
    
    ES->>PROJ: Notify event
    PROJ->>IRM: Project to read model
    IRM->>RM: Save user profile
    
    Handler-->>CMD: userId
    CMD-->>UI: Success
    UI-->>User: Show confirmation
    
    Note over Domain: Domain has zero<br/>outbound dependencies
```

**Key Observations:**

1. **UI Adapter** (primary) drives the application by creating commands
2. **Application** orchestrates but depends only on port interfaces
3. **Domain** is completely isolated - no knowledge of adapters
4. **Infrastructure Adapters** (secondary) implement the port interfaces
5. **Dependency direction**: Always points inward

### Query Flow (Read Operation)

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Adapter<br/>(React)
    participant QRY as Query
    participant Handler as Query Handler<br/>(Application)
    participant IRM as IReadModelRepository<br/>(Port)
    participant RM as ReadModel Adapter<br/>(InMemory)
    
    User->>UI: Request feed
    UI->>QRY: Create GetUserFeedQuery
    QRY->>Handler: Execute query
    
    Handler->>IRM: getUserFeed()
    Note over IRM: Port interface
    IRM->>RM: Concrete implementation
    RM-->>IRM: Feed data
    IRM-->>Handler: Feed data
    
    Handler-->>QRY: Feed data
    QRY-->>UI: Feed data
    UI-->>User: Display feed
    
    Note over Handler,IRM: No domain involvement<br/>in queries
```

---

## Benefits and Advantages

### 1. Testability

```mermaid
graph TB
    subgraph "Production"
        HANDLER1[Handler]
        PROD_ES[InMemoryEventStore]
        PROD_RM[InMemoryReadModelRepository]
        
        HANDLER1 --> PROD_ES
        HANDLER1 --> PROD_RM
    end
    
    subgraph "Testing"
        HANDLER2[Handler]
        MOCK_ES[MockEventStore<br/>Test Double]
        MOCK_RM[MockReadModelRepository<br/>Test Double]
        
        HANDLER2 --> MOCK_ES
        HANDLER2 --> MOCK_RM
    end
    
    style MOCK_ES fill:#ffcccc
    style MOCK_RM fill:#ffcccc
```

**Benefit**: Easy to test handlers by injecting mock adapters

```typescript
// Example: Testing with mocks
const mockEventStore: IEventStore = {
  saveEvents: jest.fn(),
  getEvents: jest.fn(),
  getAllEvents: jest.fn(),
};

const handler = new RegisterUserHandler(
  mockEventStore,
  mockReadModelRepository
);

// Test handler without real infrastructure
```

### 2. Swappable Technology

```mermaid
graph TB
    subgraph "Application Core - Unchanged"
        HANDLER[Handler<br/>depends on IEventStore]
        PORT[IEventStore<br/>Port]
        HANDLER --> PORT
    end
    
    subgraph "Adapter Options"
        OPT1[InMemoryEventStore]
        OPT2[PostgresEventStore]
        OPT3[MongoEventStore]
        OPT4[EventStoreDB]
    end
    
    PORT -.-> OPT1
    PORT -.-> OPT2
    PORT -.-> OPT3
    PORT -.-> OPT4
    
    style PORT fill:#fff4e1
    style OPT1 fill:#e1ffe1
    style OPT2 fill:#e1ffe1
    style OPT3 fill:#e1ffe1
    style OPT4 fill:#e1ffe1
```

**Benefit**: Can swap implementations without changing application code

### 3. Technology Independence

```mermaid
graph LR
    subgraph "Domain Core"
        DOMAIN[Pure Business Logic<br/>No Framework Dependencies<br/>No Database Dependencies<br/>No UI Dependencies]
    end
    
    DOMAIN -.-> NOT_REACT[❌ Not coupled to React]
    DOMAIN -.-> NOT_DB[❌ Not coupled to Database]
    DOMAIN -.-> NOT_API[❌ Not coupled to API Framework]
    
    style DOMAIN fill:#ffe1e1
```

**Benefit**: Domain logic survives technology changes

### 4. Clear Boundaries

```mermaid
graph TB
    subgraph "Clear Separation"
        direction TB
        A[Business Logic<br/>Domain Layer]
        B[Application Coordination<br/>Application Layer]
        C[Technical Details<br/>Infrastructure Layer]
        
        A --> B
        B --> C
    end
    
    style A fill:#ffe1e1
    style B fill:#fff4e1
    style C fill:#e1ffe1
```

**Benefit**: Each layer has a single, well-defined responsibility

### 5. Parallel Development

```mermaid
graph LR
    T1[Team 1:<br/>Domain Logic]
    T2[Team 2:<br/>React UI]
    T3[Team 3:<br/>Database Adapter]
    
    PORT[Shared Ports<br/>Contract]
    
    T1 --> PORT
    T2 --> PORT
    T3 --> PORT
    
    style PORT fill:#fff4e1
```

**Benefit**: Teams can work in parallel as long as they agree on port contracts

---

## Swappable Adapters

One of the main benefits is the ability to swap adapters without changing the core application.

### Example: Replacing Event Store

#### Current Setup

```typescript
// src/config/container.ts (conceptual)
const eventStore: IEventStore = new InMemoryEventStore();
```

#### Could Be Replaced With

```typescript
// PostgreSQL adapter
const eventStore: IEventStore = new PostgresEventStore(config);

// EventStoreDB adapter  
const eventStore: IEventStore = new EventStoreDBAdapter(config);

// File-based adapter
const eventStore: IEventStore = new FileSystemEventStore(config);
```

### Migration Strategy

```mermaid
flowchart TB
    START[Current: InMemory] --> STEP1[Create PostgresEventStore<br/>implementing IEventStore]
    STEP1 --> STEP2[Test PostgresEventStore<br/>against same interface]
    STEP2 --> STEP3[Deploy side-by-side<br/>Write to both stores]
    STEP3 --> STEP4[Validate data consistency]
    STEP4 --> STEP5[Switch reads to Postgres]
    STEP5 --> END[Remove InMemory<br/>Migration complete]
    
    style START fill:#e1ffe1
    style END fill:#e1ffe1
```

**Key Point**: Application handlers never change - they still use `IEventStore` interface

### Example: Multiple UI Adapters

```mermaid
graph TB
    subgraph "Primary Adapters - All Drive Same Core"
        UI1[React Web UI]
        UI2[React Native Mobile]
        UI3[CLI Interface]
        UI4[REST API]
        UI5[GraphQL API]
    end
    
    subgraph "Application Core"
        HANDLERS[Command/Query Handlers<br/>Same for all adapters]
    end
    
    UI1 --> HANDLERS
    UI2 --> HANDLERS
    UI3 --> HANDLERS
    UI4 --> HANDLERS
    UI5 --> HANDLERS
    
    style UI1 fill:#e1f5ff
    style UI2 fill:#e1f5ff
    style UI3 fill:#e1f5ff
    style UI4 fill:#e1f5ff
    style UI5 fill:#e1f5ff
```

**Benefit**: Can support multiple interfaces without duplicating business logic

---

## Real-World Adapter Replacements

### Scenario 1: Production Scaling

```mermaid
graph TB
    subgraph "Phase 1: Development"
        H1[Handlers]
        IM1[InMemoryEventStore]
        H1 --> IM1
    end
    
    subgraph "Phase 2: Production"
        H2[Handlers<br/>Unchanged]
        PG[PostgresEventStore<br/>implements IEventStore]
        H2 --> PG
    end
    
    subgraph "Phase 3: High Scale"
        H3[Handlers<br/>Still Unchanged]
        ES[EventStoreDB<br/>implements IEventStore]
        H3 --> ES
    end
    
    style H1 fill:#fff4e1
    style H2 fill:#fff4e1
    style H3 fill:#fff4e1
```

### Scenario 2: Read Model Optimization

```mermaid
graph TB
    subgraph "Initial: Simple Storage"
        H1[Handlers]
        IM[InMemoryReadModel]
        H1 --> IM
    end
    
    subgraph "Phase 2: Persistent Storage"
        H2[Handlers<br/>Unchanged]
        PG[PostgresReadModel]
        H2 --> PG
    end
    
    subgraph "Phase 3: Performance"
        H3[Handlers<br/>Still Unchanged]
        REDIS[RedisReadModel<br/>Fast timelines]
        H3 --> REDIS
    end
    
    subgraph "Phase 4: Hybrid"
        H4[Handlers<br/>Still Unchanged]
        HYBRID[HybridReadModel<br/>Redis + Postgres]
        H4 --> HYBRID
    end
    
    style H1 fill:#fff4e1
    style H2 fill:#fff4e1
    style H3 fill:#fff4e1
    style H4 fill:#fff4e1
```

---

## Comparison: With vs Without Hexagonal Architecture

### Without Hexagonal Architecture (Tightly Coupled)

```mermaid
graph TB
    UI[UI] --> HANDLER[Handler]
    HANDLER --> DB[(Concrete Database)]
    HANDLER --> UI
    
    Note1[Handler knows about<br/>specific database technology]
    Note2[Can't swap database<br/>without rewriting handler]
    Note3[Hard to test<br/>requires real database]
    
    style DB fill:#ffcccc
```

### With Hexagonal Architecture (Loosely Coupled)

```mermaid
graph TB
    UI[UI Adapter] --> PORT1[Command Port]
    PORT1 --> HANDLER[Handler]
    HANDLER --> PORT2[IEventStore Port]
    PORT2 --> ADAPTER[(Adapter)]
    
    Note1[Handler depends on<br/>abstraction not concrete]
    Note2[Can swap adapter<br/>without touching handler]
    Note3[Easy to test<br/>use mock adapter]
    
    style PORT2 fill:#fff4e1
    style ADAPTER fill:#e1ffe1
```

---

## Complete System View

```mermaid
graph TB
    subgraph "Primary Side - Drivers"
        USER[User]
        UI[React UI<br/>Primary Adapter]
    end
    
    subgraph "Hexagon Core"
        subgraph "Ports - Left Side"
            COMMANDS[Commands<br/>Primary Ports]
            QUERIES[Queries<br/>Primary Ports]
        end
        
        subgraph "Application Layer"
            CMD_H[Command Handlers]
            QRY_H[Query Handlers]
        end
        
        subgraph "Domain Layer"
            AGG[Aggregates]
            VO[Value Objects]
            EVENTS[Domain Events]
        end
        
        subgraph "Ports - Right Side"
            IES[IEventStore<br/>Secondary Port]
            IRM[IReadModelRepository<br/>Secondary Port]
        end
    end
    
    subgraph "Secondary Side - Driven"
        ES[InMemoryEventStore<br/>Secondary Adapter]
        RM[InMemoryReadModelRepository<br/>Secondary Adapter]
        PROJ[EventProjector<br/>Secondary Adapter]
        LOG[Logger<br/>Secondary Adapter]
    end
    
    USER --> UI
    UI --> COMMANDS
    UI --> QUERIES
    
    COMMANDS --> CMD_H
    QUERIES --> QRY_H
    
    CMD_H --> AGG
    AGG --> VO
    AGG --> EVENTS
    
    CMD_H -.depends on.-> IES
    CMD_H -.depends on.-> IRM
    QRY_H -.depends on.-> IRM
    
    ES -.implements.-> IES
    RM -.implements.-> IRM
    
    ES --> PROJ
    PROJ --> RM
    
    LOG -.used by.-> CMD_H
    LOG -.used by.-> QRY_H
    LOG -.used by.-> PROJ
    
    style AGG fill:#ffe1e1
    style UI fill:#e1f5ff
    style IES fill:#fff4e1
    style IRM fill:#fff4e1
    style ES fill:#e1ffe1
    style RM fill:#e1ffe1
```

---

## Key Takeaways

1. **Ports define contracts**: Interfaces that abstract away implementation details

2. **Adapters implement contracts**: Concrete implementations that can be swapped

3. **Dependencies point inward**: Outer layers depend on inner layers, never the reverse

4. **Domain is protected**: Core business logic has zero dependencies on frameworks or technologies

5. **Testability**: Easy to test by injecting mock adapters

6. **Flexibility**: Can swap technologies without changing business logic

7. **Technology independence**: Domain logic survives technology changes

8. **Clear boundaries**: Each layer has a single, well-defined responsibility

---

## Conclusion

Hexagonal Architecture provides a clean separation between business logic and technical concerns. By using ports (interfaces) and adapters (implementations), the application core remains independent of external technologies, frameworks, and delivery mechanisms.

This architecture enables:
- **Easy testing** through dependency injection
- **Technology migration** without rewriting business logic
- **Multiple interfaces** (web, mobile, API) to the same core
- **Parallel development** as long as teams agree on port contracts
- **Long-term maintainability** by isolating what changes from what stays stable

The Chirp application demonstrates these principles by keeping the domain pure, defining clear port interfaces, and implementing adapters that can be easily replaced as needs evolve.

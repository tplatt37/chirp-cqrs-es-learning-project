# Chirp CQRS/Event Sourcing Logging Guide

This document explains the comprehensive logging system added to the Chirp application to help you learn CQRS and Event Sourcing patterns.

## Overview

The application uses **Pino** logger with a custom implementation that provides:
- Color-coded logs by architectural layer
- Multiple log levels (trace, debug, info, warn, error)
- Browser console integration
- Admin panel for real-time log control
- Performance timing for operations
- Request ID tracking for correlation

## Administrator Panel

A floating admin panel (⚙️ button in top-right corner) provides:

### Controls
- **Enable/Disable Logging**: Toggle all logging on/off
- **Log Level Selection**: Choose from:
  - `TRACE`: Most detailed - shows every step
  - `DEBUG`: Detailed information for debugging
  - `INFO`: General informational messages (default)
  - `WARN`: Warning messages
  - `ERROR`: Error messages only

### Features
- **Filter Logs**: View logs by specific level
- **Auto-scroll**: Automatically scroll to newest logs
- **Clear Logs**: Remove all stored logs
- **Export Logs**: Download logs as text file
- **Real-time Display**: See logs as they happen

## Architectural Layer Colors

Logs are color-coded to help you understand which layer of the architecture is executing:

- 🔵 **DOMAIN** (Blue): Domain aggregates, value objects, domain events
- 🟢 **APPLICATION** (Green): Command handlers, query handlers
- 🟠 **INFRASTRUCTURE** (Orange): Event store, projections, repositories
- 🟣 **PRESENTATION** (Purple): React components, user interactions
- ⚫ **SYSTEM** (Gray): Container, DI, system-level operations

## Learning Flows

### User Registration Flow

When you register a new user, you'll see logs showing:

1. **PRESENTATION Layer** (Purple)
   - User submits form
   - Creates `RegisterUserCommand`
   - Executes command via handler

2. **APPLICATION Layer** (Green)
   - Command received by `RegisterUserHandler`
   - Checks if username exists (query to read model)
   - Creates user aggregate

3. **DOMAIN Layer** (Blue)
   - `User.register()` creates aggregate
   - Emits `UserRegistered` event
   - Applies event to aggregate state

4. **INFRASTRUCTURE Layer** (Orange)
   - Saves events to event store
   - Projects event to read model
   - Updates user profile in read model

### Chirp Posting Flow

When you post a chirp:

1. **PRESENTATION** → User submits chirp form
2. **APPLICATION** → `PostChirpHandler` validates user exists
3. **DOMAIN** → `Chirp.post()` creates aggregate, emits `ChirpPosted` event
4. **INFRASTRUCTURE** → Event stored and projected to read model

### Follow User Flow

Similar pattern:
1. Form submission (Presentation)
2. Command handling (Application)
3. Aggregate creation and event emission (Domain)
4. Event storage and projection (Infrastructure)

## Key Concepts Demonstrated

### 1. Command Query Responsibility Segregation (CQRS)

Watch how:
- **Commands** (write operations) go through handlers → aggregates → events → event store
- **Queries** (read operations) go directly to the read model
- These paths are completely separate

### 2. Event Sourcing

Observe:
- All state changes are stored as immutable events
- Events are saved to the event store
- Current state is reconstructed from events
- Read models are projections of these events

### 3. Domain-Driven Design (DDD)

See:
- Aggregates (User, Chirp) contain business logic
- Value objects (Username, ChirpContent) enforce invariants
- Domain events represent things that happened
- Clear boundaries between layers

### 4. Hexagonal Architecture

Notice:
- **Domain** layer has no dependencies on other layers
- **Application** layer orchestrates use cases
- **Infrastructure** implements technical details
- **Presentation** handles user interface

## Log Data Structure

Each log entry includes:

```typescript
{
  timestamp: Date,           // When the log occurred
  level: string,            // Log level (trace/debug/info/warn/error)
  message: string,          // Human-readable description
  context: {
    layer?: string,         // Architectural layer
    component?: string,     // Component name
    action?: string,        // Action being performed
    requestId?: string,     // Correlation ID
    aggregateId?: string,   // Domain aggregate ID
    userId?: string,        // User ID if applicable
    data?: object,          // Additional contextual data
    duration?: number       // Operation timing in ms
  }
}
```

## Performance Timing

Many operations include timing information:
- Command execution duration
- Event projection duration
- Full request/response cycles

This helps you understand the performance characteristics of CQRS/ES patterns.

## Browser Console

All logs are also output to the browser's JavaScript console with:
- Color coding by layer
- Expandable data objects
- Error stack traces
- Timestamp for each entry

Open your browser's DevTools Console (F12) to see enhanced logging.

## Example Log Sequences

### Registering User "alice"

```
[INFO] [PRESENTATION] RegisterForm: User submitted registration form
  → handleSubmit
  data: { username: "alice" }

[DEBUG] [PRESENTATION] RegisterForm: Creating RegisterUserCommand
  → createCommand

[INFO] [APPLICATION] RegisterUserHandler: Command received
  → handle

[DEBUG] [APPLICATION] RegisterUserHandler: Checking if username exists
  → checkUsername

[DEBUG] [APPLICATION] RegisterUserHandler: Creating user aggregate
  → createAggregate

[DEBUG] [DOMAIN] User: Creating new User aggregate
  → register

[INFO] [DOMAIN] User: User aggregate created, emitting UserRegistered event
  → register

[INFO] [APPLICATION] RegisterUserHandler: Saving events to event store
  → saveEvents

[INFO] [INFRASTRUCTURE] InMemoryEventStore: Saving events
  → saveEvents

[INFO] [INFRASTRUCTURE] EventProjector: Projecting event to read model
  → projectEvent

[INFO] [INFRASTRUCTURE] EventProjector: User profile created in read model
  → projectUserRegistered

[INFO] [PRESENTATION] RegisterForm: User registered successfully
  ⏱ 23.45ms
```

## Tips for Learning

1. **Start with INFO level**: Good balance of detail without overwhelming
2. **Use DEBUG for deep dives**: When you want to understand every step
3. **Try TRACE for complete flow**: See every single operation
4. **Filter by layer**: Focus on one architectural layer at a time
5. **Watch the data flow**: Notice how data transforms through layers
6. **Compare read vs write paths**: See CQRS in action
7. **Observe event sourcing**: Events are immutable, state is derived

## Troubleshooting

- **Too many logs?** Increase log level to WARN or ERROR
- **Missing logs?** Check that logging is enabled in Admin Panel
- **Can't find logs?** Use the filter dropdown to narrow by level
- **Need to save logs?** Use Export button to download as text file

## Code Structure

### Logger Files
- `src/infrastructure/logging/Logger.ts` - Main logger implementation
- `src/infrastructure/logging/LoggerConfig.ts` - Configuration service
- `src/presentation/components/AdminPanel.tsx` - UI for log control

### Logged Components
All major components include logging:
- Domain aggregates (User, Chirp, FollowRelationship)
- Application handlers (RegisterUserHandler, PostChirpHandler, etc.)
- Infrastructure services (EventStore, EventProjector, Repositories)
- Presentation components (RegisterForm, ChirpComposer, etc.)

## Next Steps

1. Open the application at http://localhost:5173
2. Click the ⚙️ button to open Admin Panel
3. Try registering a user and watch the logs
4. Post a chirp and observe the flow
5. Experiment with different log levels
6. Compare command (write) vs query (read) paths

Happy Learning! 🎓

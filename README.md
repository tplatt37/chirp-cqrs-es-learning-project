# Chirp - A DDD/CQRS/Event Sourcing Demo

A Twitter-like social network application built with TypeScript and React, demonstrating Domain-Driven Design, Hexagonal Architecture, CQRS, and Event Sourcing patterns.

I created this to help students visualize and understand the flow of events and processing that happens in a CQRS + Event Sourcing architecture. For simplicity, it runs 100% in the web browser and there is no persistence (all events and views stored in memory).

Created and maintained with Cline and Anthropic Sonnet 4.5

## Features

- **Register as a user** - Create a new user account
- **Post a Chirp** - Share messages (chirps) with your followers
- **Follow users** - Subscribe to other users' chirps
- **View feed** - See recent chirps from users you follow

## Architecture

### Domain-Driven Design (DDD)
- **Aggregates**: User, Chirp, FollowRelationship
- **Value Objects**: UserId, Username, ChirpId, ChirpContent
- **Domain Events**: UserRegistered, ChirpPosted, UserFollowed
- **Domain Errors**: Custom error types for business rule violations

### Hexagonal Architecture (Ports & Adapters)
```
src/
├── domain/              # Core business logic (center)
├── application/         # Use cases, commands, queries
│   ├── commands/        # Write operations
│   ├── queries/         # Read operations
│   ├── handlers/        # Command/query handlers
│   └── ports/           # Interfaces (dependency inversion)
├── infrastructure/      # Adapters (outer layer)
│   ├── event-store/     # Event storage implementation
│   ├── repositories/    # Read model storage
│   └── projections/     # Event projection logic
└── presentation/        # UI layer (React components)
```

### CQRS (Command Query Responsibility Segregation)
- **Commands**: RegisterUser, PostChirp, FollowUser
- **Queries**: GetUserFeed, GetAllUsers
- Separate write models (aggregates) and read models (projections)

### Event Sourcing
- All state changes are captured as immutable domain events
- Event store maintains complete history of all events
- Read models are built by replaying events (projections)
- Aggregates are reconstructed from their event streams

## Technology Stack

- **TypeScript 5** - Type-safe development
- **React 18** - UI framework with functional components and hooks
- **Vite** - Fast build tool and dev server
- **ESLint** - Code quality and consistency

## Getting Started

### Prerequisites
- Node.js 16 or higher
- npm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Project Structure

```
chirp/
├── src/
│   ├── domain/                    # Domain layer
│   │   ├── aggregates/            # Business entities
│   │   ├── value-objects/         # Immutable values
│   │   ├── events/                # Domain events
│   │   └── errors/                # Domain errors
│   ├── application/               # Application layer
│   │   ├── commands/              # Write operations
│   │   ├── queries/               # Read operations
│   │   ├── handlers/              # Command/query handlers
│   │   └── ports/                 # Repository interfaces
│   ├── infrastructure/            # Infrastructure layer
│   │   ├── event-store/           # Event persistence
│   │   ├── repositories/          # Read model storage
│   │   └── projections/           # Event projections
│   ├── presentation/              # Presentation layer
│   │   ├── components/            # React components
│   │   ├── hooks/                 # Custom hooks
│   │   └── context/               # React context
│   ├── config/                    # DI container
│   └── index.tsx                  # Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Key Concepts Demonstrated

### 1. Aggregate Root Pattern
Each aggregate (User, Chirp, FollowRelationship) controls its own lifecycle and enforces business rules.

### 2. Value Objects
Immutable objects like `UserId`, `Username`, and `ChirpContent` encapsulate validation logic.

### 3. Domain Events
All changes to aggregates produce events (e.g., `UserRegistered`, `ChirpPosted`).

### 4. Event Store
In-memory implementation that stores all domain events chronologically.

### 5. Projections
Read models are built by subscribing to and processing domain events.

### 6. Dependency Injection
Container pattern manages dependencies and wires up the application.

### 7. Clean Architecture
Dependencies flow inward: Presentation → Application → Domain (no outward dependencies from domain).

## Usage Example

1. **Register Users**: Create one or more user accounts
2. **Select User**: Click "Select" on a user to act as that user
3. **Follow Others**: While logged in, click "Follow" on other users
4. **Post Chirps**: Write and post chirps as the selected user
5. **View Feed**: See chirps from users you follow

## Design Decisions

- **In-Memory Storage**: Simplifies the demo; easily replaceable with real persistence
- **No Authentication**: Focus on architecture patterns rather than security
- **Inline Styles**: Keeps components self-contained; replace with CSS modules in production
- **Synchronous Projections**: Events are projected immediately after commands for simplicity

## Learning Resources

This project demonstrates practical implementation of:
- Domain-Driven Design by Eric Evans
- Implementing Domain-Driven Design by Vaughn Vernon
- Hexagonal Architecture by Alistair Cockburn
- CQRS pattern by Greg Young
- Event Sourcing pattern

import { UserId } from '../value-objects/UserId';
import { Username } from '../value-objects/Username';
import { DomainEvent } from '../events/DomainEvent';
import { UserRegistered } from '../events/UserRegistered';
import { logger } from '../../infrastructure/logging/Logger';

export class User {
  private id: UserId;
  private username: Username;
  private version: number;
  private uncommittedEvents: DomainEvent[];

  private constructor(id: UserId, username: Username, version: number) {
    this.id = id;
    this.username = username;
    this.version = version;
    this.uncommittedEvents = [];
  }

  static register(username: Username): User {
    logger.debug('Creating new User aggregate', {
      layer: 'domain',
      component: 'User',
      action: 'register',
      data: { username: username.getValue() },
    });

    const userId = UserId.create();
    const user = new User(userId, username, 0);
    
    const event = new UserRegistered(
      userId.getValue(),
      username.getValue(),
      user.version + 1
    );
    
    logger.info('User aggregate created, emitting UserRegistered event', {
      layer: 'domain',
      component: 'User',
      action: 'register',
      data: { 
        userId: userId.getValue(),
        username: username.getValue(),
        version: event.version,
      },
    });

    user.applyEvent(event);
    user.uncommittedEvents.push(event);
    
    return user;
  }

  static fromEvents(events: DomainEvent[]): User {
    logger.trace('Reconstructing User aggregate from events', {
      layer: 'domain',
      component: 'User',
      action: 'fromEvents',
      data: { eventCount: events.length },
    });

    if (events.length === 0) {
      throw new Error('Cannot create user from empty event list');
    }

    const firstEvent = events[0];
    if (!firstEvent) {
      throw new Error('First event is undefined');
    }

    if (!(firstEvent instanceof UserRegistered)) {
      throw new Error('First event must be UserRegistered');
    }

    const userId = UserId.fromString(firstEvent.aggregateId);
    const username = Username.create(firstEvent.username);
    const user = new User(userId, username, 0);

    events.forEach(event => {
      user.applyEvent(event);
    });

    logger.debug('User aggregate reconstructed from events', {
      layer: 'domain',
      component: 'User',
      action: 'fromEvents',
      data: { 
        userId: userId.getValue(),
        username: username.getValue(),
        finalVersion: user.version,
      },
    });

    return user;
  }

  private applyEvent(event: DomainEvent): void {
    logger.trace('Applying event to User aggregate', {
      layer: 'domain',
      component: 'User',
      action: 'applyEvent',
      data: { 
        eventType: event.constructor.name,
        eventVersion: event.version,
      },
    });

    if (event instanceof UserRegistered) {
      this.id = UserId.fromString(event.aggregateId);
      this.username = Username.create(event.username);
    }
    this.version = event.version;
  }

  getId(): UserId {
    return this.id;
  }

  getUsername(): Username {
    return this.username;
  }

  getVersion(): number {
    return this.version;
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }
}

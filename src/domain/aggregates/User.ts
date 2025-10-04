import { UserId } from '../value-objects/UserId';
import { Username } from '../value-objects/Username';
import { DomainEvent } from '../events/DomainEvent';
import { UserRegistered } from '../events/UserRegistered';

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
    const userId = UserId.create();
    const user = new User(userId, username, 0);
    
    const event = new UserRegistered(
      userId.getValue(),
      username.getValue(),
      user.version + 1
    );
    
    user.applyEvent(event);
    user.uncommittedEvents.push(event);
    
    return user;
  }

  static fromEvents(events: DomainEvent[]): User {
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

    return user;
  }

  private applyEvent(event: DomainEvent): void {
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

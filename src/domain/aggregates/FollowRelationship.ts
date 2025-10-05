import { UserId } from '../value-objects/UserId';
import { DomainEvent } from '../events/DomainEvent';
import { UserFollowed } from '../events/UserFollowed';
import { UserUnfollowed } from '../events/UserUnfollowed';
import { CannotFollowSelfError, NotFollowingError } from '../errors/DomainError';

export class FollowRelationship {
  private id: string;
  private followerId: UserId;
  private followeeId: UserId;
  private isActive: boolean;
  private version: number;
  private uncommittedEvents: DomainEvent[];

  private constructor(id: string, followerId: UserId, followeeId: UserId, isActive: boolean, version: number) {
    this.id = id;
    this.followerId = followerId;
    this.followeeId = followeeId;
    this.isActive = isActive;
    this.version = version;
    this.uncommittedEvents = [];
  }

  static create(followerId: UserId, followeeId: UserId): FollowRelationship {
    if (followerId.equals(followeeId)) {
      throw new CannotFollowSelfError();
    }

    const relationshipId = crypto.randomUUID();
    const relationship = new FollowRelationship(relationshipId, followerId, followeeId, true, 0);
    
    const event = new UserFollowed(
      relationshipId,
      followerId.getValue(),
      followeeId.getValue(),
      relationship.version + 1
    );
    
    relationship.applyEvent(event);
    relationship.uncommittedEvents.push(event);
    
    return relationship;
  }

  static fromEvents(events: DomainEvent[]): FollowRelationship {
    if (events.length === 0) {
      throw new Error('Cannot create follow relationship from empty event list');
    }

    const firstEvent = events[0];
    if (!firstEvent) {
      throw new Error('First event is undefined');
    }

    if (!(firstEvent instanceof UserFollowed)) {
      throw new Error('First event must be UserFollowed');
    }

    const relationshipId = firstEvent.aggregateId;
    const followerId = UserId.fromString(firstEvent.followerId);
    const followeeId = UserId.fromString(firstEvent.followeeId);
    const relationship = new FollowRelationship(relationshipId, followerId, followeeId, true, 0);

    events.forEach(event => {
      relationship.applyEvent(event);
    });

    return relationship;
  }

  private applyEvent(event: DomainEvent): void {
    if (event instanceof UserFollowed) {
      this.id = event.aggregateId;
      this.followerId = UserId.fromString(event.followerId);
      this.followeeId = UserId.fromString(event.followeeId);
      this.isActive = true;
    } else if (event instanceof UserUnfollowed) {
      this.isActive = false;
    }
    this.version = event.version;
  }

  getId(): string {
    return this.id;
  }

  getFollowerId(): UserId {
    return this.followerId;
  }

  getFolloweeId(): UserId {
    return this.followeeId;
  }

  getVersion(): number {
    return this.version;
  }

  isActiveRelationship(): boolean {
    return this.isActive;
  }

  unfollow(): void {
    if (!this.isActive) {
      throw new NotFollowingError(
        this.followerId.getValue(),
        this.followeeId.getValue()
      );
    }

    const event = new UserUnfollowed(
      this.id,
      this.followerId.getValue(),
      this.followeeId.getValue(),
      this.version + 1
    );

    this.applyEvent(event);
    this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }
}

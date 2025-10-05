import { UnfollowUserCommand } from '../commands/UnfollowUserCommand';
import { IEventStore } from '../ports/IEventStore';
import { IReadModelRepository } from '../ports/IReadModelRepository';
import { FollowRelationship } from '../../domain/aggregates/FollowRelationship';
import { UserNotFoundError, NotFollowingError } from '../../domain/errors/DomainError';

export class UnfollowUserHandler {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly readModelRepository: IReadModelRepository
  ) {}

  async handle(command: UnfollowUserCommand): Promise<void> {
    // Verify both users exist
    const follower = await this.readModelRepository.getUserProfile(command.followerId);
    if (!follower) {
      throw new UserNotFoundError(command.followerId);
    }

    const followee = await this.readModelRepository.getUserProfile(command.followeeId);
    if (!followee) {
      throw new UserNotFoundError(command.followeeId);
    }

    // Check if currently following
    const isFollowing = await this.readModelRepository.isFollowing(
      command.followerId,
      command.followeeId
    );
    if (!isFollowing) {
      throw new NotFollowingError(command.followerId, command.followeeId);
    }

    // Get the relationship ID from read model
    const relationshipId = await this.readModelRepository.getFollowRelationshipId(
      command.followerId,
      command.followeeId
    );
    if (!relationshipId) {
      throw new NotFollowingError(command.followerId, command.followeeId);
    }

    // Load the follow relationship aggregate from event store
    const events = await this.eventStore.getEvents(relationshipId);
    const relationship = FollowRelationship.fromEvents(events);

    // Unfollow
    relationship.unfollow();

    // Save events
    const uncommittedEvents = relationship.getUncommittedEvents();
    await this.eventStore.saveEvents(relationship.getId(), uncommittedEvents);
    relationship.clearUncommittedEvents();
  }
}

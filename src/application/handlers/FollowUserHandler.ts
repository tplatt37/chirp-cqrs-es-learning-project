import { FollowUserCommand } from '../commands/FollowUserCommand';
import { IEventStore } from '../ports/IEventStore';
import { IReadModelRepository } from '../ports/IReadModelRepository';
import { FollowRelationship } from '../../domain/aggregates/FollowRelationship';
import { UserId } from '../../domain/value-objects/UserId';
import { UserNotFoundError, AlreadyFollowingError } from '../../domain/errors/DomainError';

export class FollowUserHandler {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly readModelRepository: IReadModelRepository
  ) {}

  async handle(command: FollowUserCommand): Promise<string> {
    // Verify both users exist
    const follower = await this.readModelRepository.getUserProfile(command.followerId);
    if (!follower) {
      throw new UserNotFoundError(command.followerId);
    }

    const followee = await this.readModelRepository.getUserProfile(command.followeeId);
    if (!followee) {
      throw new UserNotFoundError(command.followeeId);
    }

    // Check if already following
    const isFollowing = await this.readModelRepository.isFollowing(
      command.followerId,
      command.followeeId
    );
    if (isFollowing) {
      throw new AlreadyFollowingError(command.followerId, command.followeeId);
    }

    // Create follow relationship aggregate
    const followerId = UserId.fromString(command.followerId);
    const followeeId = UserId.fromString(command.followeeId);
    const relationship = FollowRelationship.create(followerId, followeeId);

    // Save events
    const events = relationship.getUncommittedEvents();
    await this.eventStore.saveEvents(relationship.getId(), events);
    relationship.clearUncommittedEvents();

    return relationship.getId();
  }
}

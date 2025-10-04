import { DomainEvent } from '../../domain/events/DomainEvent';
import { UserRegistered } from '../../domain/events/UserRegistered';
import { ChirpPosted } from '../../domain/events/ChirpPosted';
import { UserFollowed } from '../../domain/events/UserFollowed';
import { IReadModelRepository } from '../../application/ports/IReadModelRepository';
import { IEventStore } from '../../application/ports/IEventStore';

export class EventProjector {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly readModelRepository: IReadModelRepository
  ) {}

  async projectEvent(event: DomainEvent): Promise<void> {
    if (event instanceof UserRegistered) {
      await this.projectUserRegistered(event);
    } else if (event instanceof ChirpPosted) {
      await this.projectChirpPosted(event);
    } else if (event instanceof UserFollowed) {
      await this.projectUserFollowed(event);
    }
  }

  private async projectUserRegistered(event: UserRegistered): Promise<void> {
    await this.readModelRepository.saveUserProfile({
      userId: event.aggregateId,
      username: event.username,
    });
  }

  private async projectChirpPosted(event: ChirpPosted): Promise<void> {
    // Get author's username
    const author = await this.readModelRepository.getUserProfile(event.authorId);
    if (!author) {
      throw new Error(`Author not found: ${event.authorId}`);
    }

    await this.readModelRepository.saveChirp({
      chirpId: event.aggregateId,
      authorId: event.authorId,
      authorUsername: author.username,
      content: event.content,
      postedAt: event.postedAt,
    });
  }

  private async projectUserFollowed(event: UserFollowed): Promise<void> {
    await this.readModelRepository.addFollowing(event.followerId, event.followeeId);
  }

  async rebuildProjections(): Promise<void> {
    // Get all events and replay them
    const events = await this.eventStore.getAllEvents();
    
    for (const event of events) {
      await this.projectEvent(event);
    }
  }
}

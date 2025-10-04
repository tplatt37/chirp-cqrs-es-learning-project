import { DomainEvent } from '../../domain/events/DomainEvent';
import { UserRegistered } from '../../domain/events/UserRegistered';
import { ChirpPosted } from '../../domain/events/ChirpPosted';
import { UserFollowed } from '../../domain/events/UserFollowed';
import { IReadModelRepository } from '../../application/ports/IReadModelRepository';
import { IEventStore } from '../../application/ports/IEventStore';
import { logger } from '../logging/Logger';

export class EventProjector {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly readModelRepository: IReadModelRepository
  ) {}

  async projectEvent(event: DomainEvent): Promise<void> {
    logger.info('EventProjector: Projecting event to read model', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectEvent',
      data: { 
        eventType: event.constructor.name,
        aggregateId: event.aggregateId,
        version: event.version,
      },
    });

    const timer = logger.startTimer();

    if (event instanceof UserRegistered) {
      await this.projectUserRegistered(event);
    } else if (event instanceof ChirpPosted) {
      await this.projectChirpPosted(event);
    } else if (event instanceof UserFollowed) {
      await this.projectUserFollowed(event);
    }

    const duration = timer();
    logger.debug('EventProjector: Event projected successfully', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectEvent',
      data: { 
        eventType: event.constructor.name,
      },
      duration,
    });
  }

  private async projectUserRegistered(event: UserRegistered): Promise<void> {
    logger.debug('EventProjector: Projecting UserRegistered event', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectUserRegistered',
      data: { 
        userId: event.aggregateId,
        username: event.username,
      },
    });

    await this.readModelRepository.saveUserProfile({
      userId: event.aggregateId,
      username: event.username,
    });

    logger.info('EventProjector: User profile created in read model', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectUserRegistered',
      data: { 
        userId: event.aggregateId,
        username: event.username,
      },
    });
  }

  private async projectChirpPosted(event: ChirpPosted): Promise<void> {
    logger.debug('EventProjector: Projecting ChirpPosted event', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectChirpPosted',
      data: { 
        chirpId: event.aggregateId,
        authorId: event.authorId,
      },
    });

    // Get author's username
    const author = await this.readModelRepository.getUserProfile(event.authorId);
    if (!author) {
      logger.error('EventProjector: Author not found for chirp', undefined, {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectChirpPosted',
        data: { 
          authorId: event.authorId,
          chirpId: event.aggregateId,
        },
      });
      throw new Error(`Author not found: ${event.authorId}`);
    }

    await this.readModelRepository.saveChirp({
      chirpId: event.aggregateId,
      authorId: event.authorId,
      authorUsername: author.username,
      content: event.content,
      postedAt: event.postedAt,
    });

    logger.info('EventProjector: Chirp added to read model', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectChirpPosted',
      data: { 
        chirpId: event.aggregateId,
        authorId: event.authorId,
        authorUsername: author.username,
      },
    });
  }

  private async projectUserFollowed(event: UserFollowed): Promise<void> {
    logger.debug('EventProjector: Projecting UserFollowed event', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectUserFollowed',
      data: { 
        followerId: event.followerId,
        followeeId: event.followeeId,
      },
    });

    await this.readModelRepository.addFollowing(event.followerId, event.followeeId);

    logger.info('EventProjector: Follow relationship added to read model', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectUserFollowed',
      data: { 
        followerId: event.followerId,
        followeeId: event.followeeId,
      },
    });
  }

  async rebuildProjections(): Promise<void> {
    logger.info('EventProjector: Rebuilding all projections', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'rebuildProjections',
    });

    const timer = logger.startTimer();

    // Get all events and replay them
    const events = await this.eventStore.getAllEvents();
    
    logger.debug('EventProjector: Replaying events', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'rebuildProjections',
      data: { eventCount: events.length },
    });

    for (const event of events) {
      await this.projectEvent(event);
    }

    const duration = timer();
    logger.info('EventProjector: Projections rebuilt successfully', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'rebuildProjections',
      data: { eventCount: events.length },
      duration,
    });
  }
}

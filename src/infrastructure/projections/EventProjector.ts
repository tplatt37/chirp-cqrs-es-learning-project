import { DomainEvent } from '../../domain/events/DomainEvent';
import { UserRegistered } from '../../domain/events/UserRegistered';
import { ChirpPosted } from '../../domain/events/ChirpPosted';
import { ChirpDeleted } from '../../domain/events/ChirpDeleted';
import { UserFollowed } from '../../domain/events/UserFollowed';
import { UserUnfollowed } from '../../domain/events/UserUnfollowed';
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
    } else if (event instanceof ChirpDeleted) {
      await this.projectChirpDeleted(event);
    } else if (event instanceof UserFollowed) {
      await this.projectUserFollowed(event);
    } else if (event instanceof UserUnfollowed) {
      await this.projectUserUnfollowed(event);
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

    // Save the chirp to read model
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

    // WRITE-TIME FAN-OUT: Push chirp to follower timelines
    const isCelebrity = await this.readModelRepository.isCelebrity(event.authorId);
    
    if (isCelebrity) {
      // Celebrity optimization: don't fan out, track separately
      await this.readModelRepository.addCelebrityChirp(event.aggregateId, event.authorId);
      
      logger.info('EventProjector: Celebrity chirp tracked (no fan-out)', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectChirpPosted',
        data: { 
          chirpId: event.aggregateId,
          authorId: event.authorId,
          isCelebrity: true,
        },
      });
    } else {
      // Regular user: fan out to all followers
      const followers = await this.readModelRepository.getFollowers(event.authorId);
      
      logger.debug('EventProjector: Fanning out chirp to followers', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectChirpPosted',
        data: { 
          chirpId: event.aggregateId,
          authorId: event.authorId,
          followerCount: followers.length,
        },
      });

      // Push chirp to each follower's materialized timeline
      for (const followerId of followers) {
        await this.readModelRepository.addToTimeline(followerId, event.aggregateId);
      }

      logger.info('EventProjector: Chirp fanned out to followers', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectChirpPosted',
        data: { 
          chirpId: event.aggregateId,
          authorId: event.authorId,
          followerCount: followers.length,
          isCelebrity: false,
        },
      });
    }
  }

  private async projectChirpDeleted(event: ChirpDeleted): Promise<void> {
    logger.debug('EventProjector: Projecting ChirpDeleted event', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectChirpDeleted',
      data: {
        chirpId: event.aggregateId,
      },
    });

    // Get the chirp to determine if author is a celebrity
    const chirp = await this.readModelRepository.getChirp(event.aggregateId);
    if (!chirp) {
      logger.error('EventProjector: Chirp not found for deletion', undefined, {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectChirpDeleted',
        data: { chirpId: event.aggregateId },
      });
      throw new Error(`Chirp not found: ${event.aggregateId}`);
    }

    const isCelebrity = await this.readModelRepository.isCelebrity(chirp.authorId);

    if (isCelebrity) {
      // Remove from celebrity chirp tracking
      await this.readModelRepository.removeCelebrityChirp(event.aggregateId);

      logger.info('EventProjector: Celebrity chirp removed from tracking', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectChirpDeleted',
        data: {
          chirpId: event.aggregateId,
          authorId: chirp.authorId,
          isCelebrity: true,
        },
      });
    } else {
      // Remove from all follower timelines
      logger.debug('EventProjector: Removing chirp from all timelines', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectChirpDeleted',
        data: {
          chirpId: event.aggregateId,
          authorId: chirp.authorId,
        },
      });

      await this.readModelRepository.removeChirpFromAllTimelines(event.aggregateId);

      logger.info('EventProjector: Chirp removed from all timelines', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectChirpDeleted',
        data: {
          chirpId: event.aggregateId,
          authorId: chirp.authorId,
          isCelebrity: false,
        },
      });
    }

    // Delete the chirp from read model
    await this.readModelRepository.deleteChirp(event.aggregateId);

    logger.info('EventProjector: Chirp removed from read model', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectChirpDeleted',
      data: {
        chirpId: event.aggregateId,
        authorId: chirp.authorId,
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
        relationshipId: event.aggregateId,
      },
    });

    await this.readModelRepository.addFollowing(event.followerId, event.followeeId, event.aggregateId);

    logger.info('EventProjector: Follow relationship added to read model', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectUserFollowed',
      data: { 
        followerId: event.followerId,
        followeeId: event.followeeId,
      },
    });

    // TIMELINE BACKFILL: Add existing chirps from followee to follower's timeline
    const isCelebrity = await this.readModelRepository.isCelebrity(event.followeeId);
    
    if (!isCelebrity) {
      // For non-celebrities, backfill their chirps into the follower's timeline
      const existingChirps = await this.readModelRepository.getChirpsByAuthor(event.followeeId);
      
      logger.debug('EventProjector: Backfilling timeline with existing chirps', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectUserFollowed',
        data: { 
          followerId: event.followerId,
          followeeId: event.followeeId,
          chirpCount: existingChirps.length,
        },
      });

      // Add each chirp to the follower's timeline (newest first)
      for (const chirp of existingChirps) {
        await this.readModelRepository.addToTimeline(event.followerId, chirp.chirpId);
      }

      logger.info('EventProjector: Timeline backfilled with existing chirps', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectUserFollowed',
        data: { 
          followerId: event.followerId,
          followeeId: event.followeeId,
          chirpCount: existingChirps.length,
        },
      });
    } else {
      // For celebrities, ensure all their chirps are in the celebrity index
      // This handles cases where chirps were posted before they became a celebrity
      const existingChirps = await this.readModelRepository.getChirpsByAuthor(event.followeeId);
      
      logger.debug('EventProjector: Ensuring celebrity chirps are properly indexed', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectUserFollowed',
        data: { 
          followerId: event.followerId,
          followeeId: event.followeeId,
          chirpCount: existingChirps.length,
          isCelebrity: true,
        },
      });
      
      // Add each chirp to the celebrity index if not already there
      for (const chirp of existingChirps) {
        await this.readModelRepository.addCelebrityChirp(chirp.chirpId, event.followeeId);
      }
      
      logger.info('EventProjector: Celebrity chirps indexed (pulled at read time)', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectUserFollowed',
        data: { 
          followerId: event.followerId,
          followeeId: event.followeeId,
          chirpCount: existingChirps.length,
          isCelebrity: true,
        },
      });
    }
  }

  private async projectUserUnfollowed(event: UserUnfollowed): Promise<void> {
    logger.debug('EventProjector: Projecting UserUnfollowed event', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectUserUnfollowed',
      data: { 
        followerId: event.followerId,
        followeeId: event.followeeId,
      },
    });

    // Remove following relationship from read model
    await this.readModelRepository.removeFollowing(event.followerId, event.followeeId);

    logger.info('EventProjector: Follow relationship removed from read model', {
      layer: 'infrastructure',
      component: 'EventProjector',
      action: 'projectUserUnfollowed',
      data: { 
        followerId: event.followerId,
        followeeId: event.followeeId,
      },
    });

    // TIMELINE CLEANUP: Remove followee's chirps from follower's timeline
    const isCelebrity = await this.readModelRepository.isCelebrity(event.followeeId);
    
    if (!isCelebrity) {
      // For non-celebrities, remove their chirps from the follower's timeline
      logger.debug('EventProjector: Removing chirps from timeline', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectUserUnfollowed',
        data: { 
          followerId: event.followerId,
          followeeId: event.followeeId,
        },
      });

      await this.readModelRepository.removeAllChirpsFromTimeline(
        event.followerId,
        event.followeeId
      );

      logger.info('EventProjector: Timeline cleaned up after unfollow', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectUserUnfollowed',
        data: { 
          followerId: event.followerId,
          followeeId: event.followeeId,
        },
      });
    } else {
      // For celebrities, chirps are pulled at read time, so no cleanup needed
      logger.info('EventProjector: Unfollowed user is celebrity, no timeline cleanup needed', {
        layer: 'infrastructure',
        component: 'EventProjector',
        action: 'projectUserUnfollowed',
        data: { 
          followerId: event.followerId,
          followeeId: event.followeeId,
          isCelebrity: true,
        },
      });
    }
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

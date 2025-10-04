import { PostChirpCommand } from '../commands/PostChirpCommand';
import { IEventStore } from '../ports/IEventStore';
import { IReadModelRepository } from '../ports/IReadModelRepository';
import { Chirp } from '../../domain/aggregates/Chirp';
import { UserId } from '../../domain/value-objects/UserId';
import { ChirpContent } from '../../domain/value-objects/ChirpContent';
import { UserNotFoundError } from '../../domain/errors/DomainError';
import { logger } from '../../infrastructure/logging/Logger';

export class PostChirpHandler {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly readModelRepository: IReadModelRepository
  ) {}

  async handle(command: PostChirpCommand): Promise<string> {
    const requestId = logger.generateRequestId();
    const timer = logger.startTimer();

    logger.info('PostChirpHandler: Command received', {
      layer: 'application',
      component: 'PostChirpHandler',
      action: 'handle',
      requestId,
      data: { 
        authorId: command.authorId,
        contentLength: command.content.length,
      },
    });

    // Verify user exists
    logger.debug('PostChirpHandler: Verifying user exists', {
      layer: 'application',
      component: 'PostChirpHandler',
      action: 'verifyUser',
      requestId,
      data: { authorId: command.authorId },
    });

    const user = await this.readModelRepository.getUserProfile(command.authorId);
    if (!user) {
      logger.warn('PostChirpHandler: User not found', {
        layer: 'application',
        component: 'PostChirpHandler',
        action: 'handle',
        requestId,
        data: { authorId: command.authorId },
      });
      throw new UserNotFoundError(command.authorId);
    }

    // Create chirp aggregate
    logger.debug('PostChirpHandler: Creating chirp aggregate', {
      layer: 'application',
      component: 'PostChirpHandler',
      action: 'createAggregate',
      requestId,
    });

    const authorId = UserId.fromString(command.authorId);
    const content = ChirpContent.create(command.content);
    const chirp = Chirp.post(authorId, content);

    // Save events
    const events = chirp.getUncommittedEvents();
    logger.info('PostChirpHandler: Saving events to event store', {
      layer: 'application',
      component: 'PostChirpHandler',
      action: 'saveEvents',
      requestId,
      data: { 
        chirpId: chirp.getId().getValue(),
        eventCount: events.length,
      },
    });

    await this.eventStore.saveEvents(chirp.getId().getValue(), events);
    chirp.clearUncommittedEvents();

    const duration = timer();
    logger.info('PostChirpHandler: Command completed successfully', {
      layer: 'application',
      component: 'PostChirpHandler',
      action: 'handle',
      requestId,
      data: { 
        chirpId: chirp.getId().getValue(),
        authorId: command.authorId,
      },
      duration,
    });

    return chirp.getId().getValue();
  }
}

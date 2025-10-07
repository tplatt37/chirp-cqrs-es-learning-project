import { DeleteChirpCommand } from '../commands/DeleteChirpCommand';
import { IEventStore } from '../ports/IEventStore';
import { Chirp } from '../../domain/aggregates/Chirp';
import { logger } from '../../infrastructure/logging/Logger';

export class DeleteChirpHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(command: DeleteChirpCommand): Promise<void> {
    const requestId = logger.generateRequestId();
    const timer = logger.startTimer();

    logger.info('DeleteChirpHandler: Command received', {
      layer: 'application',
      component: 'DeleteChirpHandler',
      action: 'handle',
      requestId,
      data: {
        chirpId: command.chirpId,
        userId: command.userId,
      },
    });

    // Reconstruct chirp aggregate from events
    logger.debug('DeleteChirpHandler: Reconstructing chirp from event store', {
      layer: 'application',
      component: 'DeleteChirpHandler',
      action: 'reconstructAggregate',
      requestId,
      data: { chirpId: command.chirpId },
    });

    const events = await this.eventStore.getEvents(command.chirpId);
    if (events.length === 0) {
      logger.warn('DeleteChirpHandler: Chirp not found', {
        layer: 'application',
        component: 'DeleteChirpHandler',
        action: 'handle',
        requestId,
        data: { chirpId: command.chirpId },
      });
      throw new Error(`Chirp not found: ${command.chirpId}`);
    }

    const chirp = Chirp.fromEvents(events);

    // Authorization: Verify user is the author
    if (chirp.getAuthorId().getValue() !== command.userId) {
      logger.warn('DeleteChirpHandler: Unauthorized deletion attempt', {
        layer: 'application',
        component: 'DeleteChirpHandler',
        action: 'handle',
        requestId,
        data: {
          chirpId: command.chirpId,
          requestingUserId: command.userId,
          actualAuthorId: chirp.getAuthorId().getValue(),
        },
      });
      throw new Error('Unauthorized: Only the author can delete this chirp');
    }

    // Delete the chirp
    logger.debug('DeleteChirpHandler: Deleting chirp', {
      layer: 'application',
      component: 'DeleteChirpHandler',
      action: 'deleteChirp',
      requestId,
      data: { chirpId: command.chirpId },
    });

    chirp.delete();

    // Save events
    const newEvents = chirp.getUncommittedEvents();
    logger.info('DeleteChirpHandler: Saving events to event store', {
      layer: 'application',
      component: 'DeleteChirpHandler',
      action: 'saveEvents',
      requestId,
      data: {
        chirpId: command.chirpId,
        eventCount: newEvents.length,
      },
    });

    await this.eventStore.saveEvents(command.chirpId, newEvents);
    chirp.clearUncommittedEvents();

    const duration = timer();
    logger.info('DeleteChirpHandler: Command completed successfully', {
      layer: 'application',
      component: 'DeleteChirpHandler',
      action: 'handle',
      requestId,
      data: {
        chirpId: command.chirpId,
        userId: command.userId,
      },
      duration,
    });
  }
}

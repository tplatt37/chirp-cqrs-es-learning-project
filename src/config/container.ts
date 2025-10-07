import { InMemoryEventStore } from '../infrastructure/event-store/InMemoryEventStore';
import { InMemoryReadModelRepository } from '../infrastructure/repositories/InMemoryReadModelRepository';
import { EventProjector } from '../infrastructure/projections/EventProjector';
import { RegisterUserHandler } from '../application/handlers/RegisterUserHandler';
import { PostChirpHandler } from '../application/handlers/PostChirpHandler';
import { DeleteChirpHandler } from '../application/handlers/DeleteChirpHandler';
import { FollowUserHandler } from '../application/handlers/FollowUserHandler';
import { UnfollowUserHandler } from '../application/handlers/UnfollowUserHandler';
import { GetUserFeedHandler } from '../application/handlers/GetUserFeedHandler';
import { GetAllUsersHandler } from '../application/handlers/GetAllUsersHandler';
import { logger } from '../infrastructure/logging/Logger';

export class Container {
  private static instance: Container;

  // Infrastructure
  public readonly eventStore: InMemoryEventStore;
  public readonly readModelRepository: InMemoryReadModelRepository;
  public readonly eventProjector: EventProjector;

  // Command handlers
  public readonly registerUserHandler: RegisterUserHandler;
  public readonly postChirpHandler: PostChirpHandler;
  public readonly deleteChirpHandler: DeleteChirpHandler;
  public readonly followUserHandler: FollowUserHandler;
  public readonly unfollowUserHandler: UnfollowUserHandler;

  // Query handlers
  public readonly getUserFeedHandler: GetUserFeedHandler;
  public readonly getAllUsersHandler: GetAllUsersHandler;

  private constructor() {
    logger.info('Container: Initializing dependency injection container', {
      layer: 'system',
      component: 'Container',
      action: 'constructor',
    });

    // Initialize infrastructure
    logger.debug('Container: Creating infrastructure components', {
      layer: 'system',
      component: 'Container',
      action: 'initInfrastructure',
    });

    this.eventStore = new InMemoryEventStore();
    this.readModelRepository = new InMemoryReadModelRepository();
    this.eventProjector = new EventProjector(this.eventStore, this.readModelRepository);

    // Initialize command handlers
    logger.debug('Container: Creating command handlers', {
      layer: 'system',
      component: 'Container',
      action: 'initCommandHandlers',
    });

    this.registerUserHandler = new RegisterUserHandler(
      this.eventStore,
      this.readModelRepository
    );
    this.postChirpHandler = new PostChirpHandler(this.eventStore, this.readModelRepository);
    this.deleteChirpHandler = new DeleteChirpHandler(this.eventStore);
    this.followUserHandler = new FollowUserHandler(this.eventStore, this.readModelRepository);
    this.unfollowUserHandler = new UnfollowUserHandler(this.eventStore, this.readModelRepository);

    // Initialize query handlers
    logger.debug('Container: Creating query handlers', {
      layer: 'system',
      component: 'Container',
      action: 'initQueryHandlers',
    });

    this.getUserFeedHandler = new GetUserFeedHandler(this.readModelRepository);
    this.getAllUsersHandler = new GetAllUsersHandler(this.readModelRepository);

    logger.info('Container: Dependency injection container initialized successfully', {
      layer: 'system',
      component: 'Container',
      action: 'constructor',
    });
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  async projectEventsAfterCommand(): Promise<void> {
    logger.debug('Container: Starting event projection after command', {
      layer: 'system',
      component: 'Container',
      action: 'projectEventsAfterCommand',
    });

    const events = await this.eventStore.getAllEvents();
    const lastEvent = events[events.length - 1];
    
    if (lastEvent) {
      logger.info('Container: Projecting last event', {
        layer: 'system',
        component: 'Container',
        action: 'projectEventsAfterCommand',
        data: { 
          eventType: lastEvent.constructor.name,
          aggregateId: lastEvent.aggregateId,
        },
      });
      await this.eventProjector.projectEvent(lastEvent);
    } else {
      logger.warn('Container: No events to project', {
        layer: 'system',
        component: 'Container',
        action: 'projectEventsAfterCommand',
      });
    }
  }
}

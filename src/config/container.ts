import { InMemoryEventStore } from '../infrastructure/event-store/InMemoryEventStore';
import { InMemoryReadModelRepository } from '../infrastructure/repositories/InMemoryReadModelRepository';
import { EventProjector } from '../infrastructure/projections/EventProjector';
import { RegisterUserHandler } from '../application/handlers/RegisterUserHandler';
import { PostChirpHandler } from '../application/handlers/PostChirpHandler';
import { FollowUserHandler } from '../application/handlers/FollowUserHandler';
import { GetUserFeedHandler } from '../application/handlers/GetUserFeedHandler';
import { GetAllUsersHandler } from '../application/handlers/GetAllUsersHandler';

export class Container {
  private static instance: Container;

  // Infrastructure
  public readonly eventStore: InMemoryEventStore;
  public readonly readModelRepository: InMemoryReadModelRepository;
  public readonly eventProjector: EventProjector;

  // Command handlers
  public readonly registerUserHandler: RegisterUserHandler;
  public readonly postChirpHandler: PostChirpHandler;
  public readonly followUserHandler: FollowUserHandler;

  // Query handlers
  public readonly getUserFeedHandler: GetUserFeedHandler;
  public readonly getAllUsersHandler: GetAllUsersHandler;

  private constructor() {
    // Initialize infrastructure
    this.eventStore = new InMemoryEventStore();
    this.readModelRepository = new InMemoryReadModelRepository();
    this.eventProjector = new EventProjector(this.eventStore, this.readModelRepository);

    // Initialize command handlers
    this.registerUserHandler = new RegisterUserHandler(
      this.eventStore,
      this.readModelRepository
    );
    this.postChirpHandler = new PostChirpHandler(this.eventStore, this.readModelRepository);
    this.followUserHandler = new FollowUserHandler(this.eventStore, this.readModelRepository);

    // Initialize query handlers
    this.getUserFeedHandler = new GetUserFeedHandler(this.readModelRepository);
    this.getAllUsersHandler = new GetAllUsersHandler(this.readModelRepository);
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  async projectEventsAfterCommand(): Promise<void> {
    const events = await this.eventStore.getAllEvents();
    const lastEvent = events[events.length - 1];
    if (lastEvent) {
      await this.eventProjector.projectEvent(lastEvent);
    }
  }
}

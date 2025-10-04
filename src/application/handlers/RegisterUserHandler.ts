import { RegisterUserCommand } from '../commands/RegisterUserCommand';
import { IEventStore } from '../ports/IEventStore';
import { IReadModelRepository } from '../ports/IReadModelRepository';
import { User } from '../../domain/aggregates/User';
import { Username } from '../../domain/value-objects/Username';
import { UserAlreadyExistsError } from '../../domain/errors/DomainError';
import { logger } from '../../infrastructure/logging/Logger';

export class RegisterUserHandler {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly readModelRepository: IReadModelRepository
  ) {}

  async handle(command: RegisterUserCommand): Promise<string> {
    const requestId = logger.generateRequestId();
    const timer = logger.startTimer();

    logger.info('RegisterUserHandler: Command received', {
      layer: 'application',
      component: 'RegisterUserHandler',
      action: 'handle',
      requestId,
      data: { username: command.username },
    });

    // Check if username already exists
    logger.debug('RegisterUserHandler: Checking if username exists', {
      layer: 'application',
      component: 'RegisterUserHandler',
      action: 'checkUsername',
      requestId,
      data: { username: command.username },
    });

    const existingUser = await this.readModelRepository.getUserProfileByUsername(
      command.username
    );
    
    if (existingUser) {
      logger.warn('RegisterUserHandler: Username already exists', {
        layer: 'application',
        component: 'RegisterUserHandler',
        action: 'handle',
        requestId,
        data: { username: command.username },
      });
      throw new UserAlreadyExistsError(command.username);
    }

    // Create user aggregate
    logger.debug('RegisterUserHandler: Creating user aggregate', {
      layer: 'application',
      component: 'RegisterUserHandler',
      action: 'createAggregate',
      requestId,
    });

    const username = Username.create(command.username);
    const user = User.register(username);

    // Save events
    const events = user.getUncommittedEvents();
    logger.info('RegisterUserHandler: Saving events to event store', {
      layer: 'application',
      component: 'RegisterUserHandler',
      action: 'saveEvents',
      requestId,
      data: { 
        userId: user.getId().getValue(),
        eventCount: events.length,
      },
    });

    await this.eventStore.saveEvents(user.getId().getValue(), events);
    user.clearUncommittedEvents();

    const duration = timer();
    logger.info('RegisterUserHandler: Command completed successfully', {
      layer: 'application',
      component: 'RegisterUserHandler',
      action: 'handle',
      requestId,
      data: { 
        userId: user.getId().getValue(),
        username: command.username,
      },
      duration,
    });

    return user.getId().getValue();
  }
}

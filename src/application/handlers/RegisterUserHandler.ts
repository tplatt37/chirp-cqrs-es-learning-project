import { RegisterUserCommand } from '../commands/RegisterUserCommand';
import { IEventStore } from '../ports/IEventStore';
import { IReadModelRepository } from '../ports/IReadModelRepository';
import { User } from '../../domain/aggregates/User';
import { Username } from '../../domain/value-objects/Username';
import { UserAlreadyExistsError } from '../../domain/errors/DomainError';

export class RegisterUserHandler {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly readModelRepository: IReadModelRepository
  ) {}

  async handle(command: RegisterUserCommand): Promise<string> {
    // Check if username already exists
    const existingUser = await this.readModelRepository.getUserProfileByUsername(
      command.username
    );
    
    if (existingUser) {
      throw new UserAlreadyExistsError(command.username);
    }

    // Create user aggregate
    const username = Username.create(command.username);
    const user = User.register(username);

    // Save events
    const events = user.getUncommittedEvents();
    await this.eventStore.saveEvents(user.getId().getValue(), events);
    user.clearUncommittedEvents();

    return user.getId().getValue();
  }
}

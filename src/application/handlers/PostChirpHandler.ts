import { PostChirpCommand } from '../commands/PostChirpCommand';
import { IEventStore } from '../ports/IEventStore';
import { IReadModelRepository } from '../ports/IReadModelRepository';
import { Chirp } from '../../domain/aggregates/Chirp';
import { UserId } from '../../domain/value-objects/UserId';
import { ChirpContent } from '../../domain/value-objects/ChirpContent';
import { UserNotFoundError } from '../../domain/errors/DomainError';

export class PostChirpHandler {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly readModelRepository: IReadModelRepository
  ) {}

  async handle(command: PostChirpCommand): Promise<string> {
    // Verify user exists
    const user = await this.readModelRepository.getUserProfile(command.authorId);
    if (!user) {
      throw new UserNotFoundError(command.authorId);
    }

    // Create chirp aggregate
    const authorId = UserId.fromString(command.authorId);
    const content = ChirpContent.create(command.content);
    const chirp = Chirp.post(authorId, content);

    // Save events
    const events = chirp.getUncommittedEvents();
    await this.eventStore.saveEvents(chirp.getId().getValue(), events);
    chirp.clearUncommittedEvents();

    return chirp.getId().getValue();
  }
}

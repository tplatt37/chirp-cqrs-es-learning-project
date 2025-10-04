import { GetUserFeedQuery } from '../queries/GetUserFeedQuery';
import { IReadModelRepository, ChirpReadModel } from '../ports/IReadModelRepository';

export class GetUserFeedHandler {
  constructor(private readonly readModelRepository: IReadModelRepository) {}

  async handle(query: GetUserFeedQuery): Promise<ChirpReadModel[]> {
    return this.readModelRepository.getUserFeed(query.userId);
  }
}

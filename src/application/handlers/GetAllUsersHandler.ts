import { GetAllUsersQuery } from '../queries/GetAllUsersQuery';
import { IReadModelRepository, UserProfileReadModel } from '../ports/IReadModelRepository';

export class GetAllUsersHandler {
  constructor(private readonly readModelRepository: IReadModelRepository) {}

  async handle(_query: GetAllUsersQuery): Promise<UserProfileReadModel[]> {
    return this.readModelRepository.getAllUsers();
  }
}

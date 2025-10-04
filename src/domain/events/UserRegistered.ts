import { BaseDomainEvent } from './DomainEvent';

export class UserRegistered extends BaseDomainEvent {
  public readonly username: string;

  constructor(userId: string, username: string, version: number) {
    super(userId, 'UserRegistered', version);
    this.username = username;
  }
}

import { BaseDomainEvent } from './DomainEvent';

export class UserUnfollowed extends BaseDomainEvent {
  public readonly followerId: string;
  public readonly followeeId: string;

  constructor(relationshipId: string, followerId: string, followeeId: string, version: number) {
    super(relationshipId, 'UserUnfollowed', version);
    this.followerId = followerId;
    this.followeeId = followeeId;
  }
}

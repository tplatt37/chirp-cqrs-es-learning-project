import { BaseDomainEvent } from './DomainEvent';

export class UserFollowed extends BaseDomainEvent {
  public readonly followerId: string;
  public readonly followeeId: string;

  constructor(relationshipId: string, followerId: string, followeeId: string, version: number) {
    super(relationshipId, 'UserFollowed', version);
    this.followerId = followerId;
    this.followeeId = followeeId;
  }
}

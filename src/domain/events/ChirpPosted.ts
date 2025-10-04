import { BaseDomainEvent } from './DomainEvent';

export class ChirpPosted extends BaseDomainEvent {
  public readonly authorId: string;
  public readonly content: string;
  public readonly postedAt: Date;

  constructor(chirpId: string, authorId: string, content: string, version: number) {
    super(chirpId, 'ChirpPosted', version);
    this.authorId = authorId;
    this.content = content;
    this.postedAt = new Date();
  }
}

import { BaseDomainEvent } from './DomainEvent';

export class ChirpDeleted extends BaseDomainEvent {
  public readonly deletedAt: Date;

  constructor(chirpId: string, version: number) {
    super(chirpId, 'ChirpDeleted', version);
    this.deletedAt = new Date();
  }
}

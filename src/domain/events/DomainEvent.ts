export interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  occurredOn: Date;
  version: number;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly eventType: string;
  public readonly occurredOn: Date;
  public readonly version: number;

  constructor(aggregateId: string, eventType: string, version: number) {
    this.eventId = crypto.randomUUID();
    this.aggregateId = aggregateId;
    this.eventType = eventType;
    this.occurredOn = new Date();
    this.version = version;
  }
}

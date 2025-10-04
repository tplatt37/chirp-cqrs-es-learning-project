import { DomainEvent } from '../../domain/events/DomainEvent';
import { IEventStore } from '../../application/ports/IEventStore';

export class InMemoryEventStore implements IEventStore {
  private events: Map<string, DomainEvent[]> = new Map();

  async saveEvents(aggregateId: string, events: DomainEvent[]): Promise<void> {
    const existingEvents = this.events.get(aggregateId) || [];
    this.events.set(aggregateId, [...existingEvents, ...events]);
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    return this.events.get(aggregateId) || [];
  }

  async getAllEvents(): Promise<DomainEvent[]> {
    const allEvents: DomainEvent[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    return allEvents.sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime());
  }
}

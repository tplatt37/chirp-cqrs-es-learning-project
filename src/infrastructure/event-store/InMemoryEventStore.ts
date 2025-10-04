import { DomainEvent } from '../../domain/events/DomainEvent';
import { IEventStore } from '../../application/ports/IEventStore';
import { logger } from '../logging/Logger';

export class InMemoryEventStore implements IEventStore {
  private events: Map<string, DomainEvent[]> = new Map();

  async saveEvents(aggregateId: string, events: DomainEvent[]): Promise<void> {
    logger.info('InMemoryEventStore: Saving events', {
      layer: 'infrastructure',
      component: 'InMemoryEventStore',
      action: 'saveEvents',
      data: { 
        aggregateId,
        eventCount: events.length,
        eventTypes: events.map(e => e.constructor.name),
      },
    });

    const existingEvents = this.events.get(aggregateId) || [];
    this.events.set(aggregateId, [...existingEvents, ...events]);

    logger.debug('InMemoryEventStore: Events saved successfully', {
      layer: 'infrastructure',
      component: 'InMemoryEventStore',
      action: 'saveEvents',
      data: { 
        aggregateId,
        totalEventsForAggregate: existingEvents.length + events.length,
      },
    });
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    logger.trace('InMemoryEventStore: Retrieving events for aggregate', {
      layer: 'infrastructure',
      component: 'InMemoryEventStore',
      action: 'getEvents',
      data: { aggregateId },
    });

    const events = this.events.get(aggregateId) || [];

    logger.debug('InMemoryEventStore: Events retrieved', {
      layer: 'infrastructure',
      component: 'InMemoryEventStore',
      action: 'getEvents',
      data: { 
        aggregateId,
        eventCount: events.length,
      },
    });

    return events;
  }

  async getAllEvents(): Promise<DomainEvent[]> {
    logger.trace('InMemoryEventStore: Retrieving all events', {
      layer: 'infrastructure',
      component: 'InMemoryEventStore',
      action: 'getAllEvents',
    });

    const allEvents: DomainEvent[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    const sortedEvents = allEvents.sort((a, b) => a.occurredOn.getTime() - b.occurredOn.getTime());

    logger.debug('InMemoryEventStore: All events retrieved', {
      layer: 'infrastructure',
      component: 'InMemoryEventStore',
      action: 'getAllEvents',
      data: { 
        totalEvents: sortedEvents.length,
        aggregateCount: this.events.size,
      },
    });

    return sortedEvents;
  }
}

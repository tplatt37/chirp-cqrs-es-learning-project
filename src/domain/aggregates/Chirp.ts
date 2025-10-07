import { ChirpId } from '../value-objects/ChirpId';
import { UserId } from '../value-objects/UserId';
import { ChirpContent } from '../value-objects/ChirpContent';
import { DomainEvent } from '../events/DomainEvent';
import { ChirpPosted } from '../events/ChirpPosted';
import { ChirpDeleted } from '../events/ChirpDeleted';
import { logger } from '../../infrastructure/logging/Logger';

export class Chirp {
  private id: ChirpId;
  private authorId: UserId;
  private content: ChirpContent;
  private postedAt: Date;
  private isDeleted: boolean;
  private version: number;
  private uncommittedEvents: DomainEvent[];

  private constructor(
    id: ChirpId,
    authorId: UserId,
    content: ChirpContent,
    postedAt: Date,
    version: number
  ) {
    this.id = id;
    this.authorId = authorId;
    this.content = content;
    this.postedAt = postedAt;
    this.isDeleted = false;
    this.version = version;
    this.uncommittedEvents = [];
  }

  static post(authorId: UserId, content: ChirpContent): Chirp {
    logger.debug('Creating new Chirp aggregate', {
      layer: 'domain',
      component: 'Chirp',
      action: 'post',
      data: { 
        authorId: authorId.getValue(),
        contentLength: content.getValue().length,
      },
    });

    const chirpId = ChirpId.create();
    const postedAt = new Date();
    const chirp = new Chirp(chirpId, authorId, content, postedAt, 0);
    
    const event = new ChirpPosted(
      chirpId.getValue(),
      authorId.getValue(),
      content.getValue(),
      chirp.version + 1
    );
    
    logger.info('Chirp aggregate created, emitting ChirpPosted event', {
      layer: 'domain',
      component: 'Chirp',
      action: 'post',
      data: { 
        chirpId: chirpId.getValue(),
        authorId: authorId.getValue(),
        content: content.getValue(),
        version: event.version,
      },
    });

    chirp.applyEvent(event);
    chirp.uncommittedEvents.push(event);
    
    return chirp;
  }

  static fromEvents(events: DomainEvent[]): Chirp {
    logger.trace('Reconstructing Chirp aggregate from events', {
      layer: 'domain',
      component: 'Chirp',
      action: 'fromEvents',
      data: { eventCount: events.length },
    });

    if (events.length === 0) {
      throw new Error('Cannot create chirp from empty event list');
    }

    const firstEvent = events[0];
    if (!firstEvent) {
      throw new Error('First event is undefined');
    }

    if (!(firstEvent instanceof ChirpPosted)) {
      throw new Error('First event must be ChirpPosted');
    }

    const chirpId = ChirpId.fromString(firstEvent.aggregateId);
    const authorId = UserId.fromString(firstEvent.authorId);
    const content = ChirpContent.create(firstEvent.content);
    const postedAt = firstEvent.postedAt;
    const chirp = new Chirp(chirpId, authorId, content, postedAt, 0);

    events.forEach(event => {
      chirp.applyEvent(event);
    });

    logger.debug('Chirp aggregate reconstructed from events', {
      layer: 'domain',
      component: 'Chirp',
      action: 'fromEvents',
      data: { 
        chirpId: chirpId.getValue(),
        authorId: authorId.getValue(),
        finalVersion: chirp.version,
      },
    });

    return chirp;
  }

  private applyEvent(event: DomainEvent): void {
    logger.trace('Applying event to Chirp aggregate', {
      layer: 'domain',
      component: 'Chirp',
      action: 'applyEvent',
      data: { 
        eventType: event.constructor.name,
        eventVersion: event.version,
      },
    });

    if (event instanceof ChirpPosted) {
      this.id = ChirpId.fromString(event.aggregateId);
      this.authorId = UserId.fromString(event.authorId);
      this.content = ChirpContent.create(event.content);
      this.postedAt = event.postedAt;
    } else if (event instanceof ChirpDeleted) {
      this.isDeleted = true;
    }
    this.version = event.version;
  }

  getId(): ChirpId {
    return this.id;
  }

  getAuthorId(): UserId {
    return this.authorId;
  }

  getContent(): ChirpContent {
    return this.content;
  }

  getPostedAt(): Date {
    return this.postedAt;
  }

  getVersion(): number {
    return this.version;
  }

  getIsDeleted(): boolean {
    return this.isDeleted;
  }

  delete(): void {
    if (this.isDeleted) {
      logger.warn('Attempt to delete already deleted chirp', {
        layer: 'domain',
        component: 'Chirp',
        action: 'delete',
        data: { chirpId: this.id.getValue() },
      });
      throw new Error('Chirp is already deleted');
    }

    logger.debug('Deleting chirp', {
      layer: 'domain',
      component: 'Chirp',
      action: 'delete',
      data: { 
        chirpId: this.id.getValue(),
        authorId: this.authorId.getValue(),
      },
    });

    const event = new ChirpDeleted(this.id.getValue(), this.version + 1);
    
    logger.info('Chirp deleted, emitting ChirpDeleted event', {
      layer: 'domain',
      component: 'Chirp',
      action: 'delete',
      data: { 
        chirpId: this.id.getValue(),
        version: event.version,
      },
    });

    this.applyEvent(event);
    this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }
}

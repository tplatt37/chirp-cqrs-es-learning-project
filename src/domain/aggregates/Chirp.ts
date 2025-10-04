import { ChirpId } from '../value-objects/ChirpId';
import { UserId } from '../value-objects/UserId';
import { ChirpContent } from '../value-objects/ChirpContent';
import { DomainEvent } from '../events/DomainEvent';
import { ChirpPosted } from '../events/ChirpPosted';

export class Chirp {
  private id: ChirpId;
  private authorId: UserId;
  private content: ChirpContent;
  private postedAt: Date;
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
    this.version = version;
    this.uncommittedEvents = [];
  }

  static post(authorId: UserId, content: ChirpContent): Chirp {
    const chirpId = ChirpId.create();
    const postedAt = new Date();
    const chirp = new Chirp(chirpId, authorId, content, postedAt, 0);
    
    const event = new ChirpPosted(
      chirpId.getValue(),
      authorId.getValue(),
      content.getValue(),
      chirp.version + 1
    );
    
    chirp.applyEvent(event);
    chirp.uncommittedEvents.push(event);
    
    return chirp;
  }

  static fromEvents(events: DomainEvent[]): Chirp {
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

    return chirp;
  }

  private applyEvent(event: DomainEvent): void {
    if (event instanceof ChirpPosted) {
      this.id = ChirpId.fromString(event.aggregateId);
      this.authorId = UserId.fromString(event.authorId);
      this.content = ChirpContent.create(event.content);
      this.postedAt = event.postedAt;
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

  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }
}

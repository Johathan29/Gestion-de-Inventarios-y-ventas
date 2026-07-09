// ============================================================
// Domain Events — Base classes and interfaces
// ============================================================

/**
 * Base class for all Domain Events.
 * Domain Events represent something that happened in the domain.
 */
export class DomainEvent {
  #eventId;
  #aggregateId;
  #eventType;
  #occurredOn;

  constructor({ aggregateId, eventType, payload = {} }) {
    if (!aggregateId) throw new Error('DomainEvent must have an aggregateId');
    if (!eventType) throw new Error('DomainEvent must have an eventType');
    
    this.#eventId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    this.#aggregateId = aggregateId;
    this.#eventType = eventType;
    this.#occurredOn = new Date();
    this.payload = payload;
  }

  get eventId() { return this.#eventId; }
  get aggregateId() { return this.#aggregateId; }
  get eventType() { return this.#eventType; }
  get occurredOn() { return this.#occurredOn; }

  toJSON() {
    return {
      eventId: this.#eventId,
      aggregateId: this.#aggregateId,
      eventType: this.#eventType,
      occurredOn: this.#occurredOn.toISOString(),
      payload: this.payload,
    };
  }
}

/**
 * Interface for Event Handlers/Subscribers.
 * Implement this to handle domain events.
 */
export class IEventHandler {
  /**
   * @param {DomainEvent} event
   */
  async handle(event) {
    throw new Error('IEventHandler.handle() must be implemented');
  }
}

/**
 * Event bus interface for publishing domain events.
 */
export class IEventBus {
  /**
   * Publish a single domain event
   * @param {DomainEvent} event
   */
  async publish(event) {
    throw new Error('IEventBus.publish() must be implemented');
  }

  /**
   * Publish multiple domain events at once
   * @param {DomainEvent[]} events
   */
  async publishAll(events) {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Subscribe to a specific event type
   * @param {string} eventType
   * @param {IEventHandler} handler
   */
  async subscribe(eventType, handler) {
    throw new Error('IEventBus.subscribe() must be implemented');
  }
}

export default { DomainEvent, IEventHandler, IEventBus };

// ============================================================
// Domain Primitives — Entity, ValueObject, Aggregate, DomainEvent
// ============================================================

import { DomainError } from './errors/index.js';

/**
 * Base class for all Domain Entities.
 * Entities have identity (id) and are mutable over time.
 */
export class Entity {
  #id;
  #domainEvents = [];

  constructor(id) {
    if (id === undefined || id === null) {
      throw new DomainError('Entity must have an identity');
    }
    this.#id = id;
  }

  get id() {
    return this.#id;
  }

  get domainEvents() {
    return [...this.#domainEvents];
  }

  addDomainEvent(event) {
    this.#domainEvents.push(event);
  }

  clearEvents() {
    this.#domainEvents = [];
  }

  equals(other) {
    if (other === null || other === undefined) return false;
    if (this.constructor !== other.constructor) return false;
    return this.#id === other.id;
  }

  toJSON() {
    return { id: this.#id };
  }
}

/**
 * Base class for Value Objects.
 * Value Objects are immutable and compared by structural equality.
 */
export class ValueObject {
  #values;

  constructor(values) {
    Object.freeze(values);
    this.#values = values;
  }

  get values() {
    return { ...this.#values };
  }

  /**
   * Structural equality check
   */
  equals(other) {
    if (other === null || other === undefined) return false;
    if (this.constructor !== other.constructor) return false;
    return JSON.stringify(this.#values) === JSON.stringify(other.#values);
  }

  toJSON() {
    return { ...this.#values };
  }

  valueOf() {
    return Object.values(this.#values).length === 1
      ? Object.values(this.#values)[0]
      : this.#values;
  }
}

/**
 * Base class for Aggregate Roots.
 * Aggregates are the transactional boundaries in the domain.
 */
export class AggregateRoot extends Entity {
  #version = 0;

  get version() {
    return this.#version;
  }

  incrementVersion() {
    this.#version++;
  }
}

export default { Entity, ValueObject, AggregateRoot };

// ============================================================
// Value Objects — Shared domain value objects
// ============================================================

import { ValueObject } from '../domain-primitives.js';

/**
 * Money Value Object — immutable, with currency support
 */
export class Money extends ValueObject {
  constructor(amount, currency = 'DOP') {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Money amount must be a valid number');
    }
    // Round to 2 decimal places
    const rounded = Math.round(amount * 100) / 100;
    super({ amount: rounded, currency });
  }

  get amount() { return this.values.amount; }
  get currency() { return this.values.currency; }

  add(other) {
    if (other.currency !== this.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other) {
    if (other.currency !== this.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor) {
    return new Money(this.amount * factor, this.currency);
  }

  isGreaterThan(other) {
    if (other.currency !== this.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return this.amount > other.amount;
  }

  isZero() {
    return this.amount === 0;
  }

  toString() {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

/**
 * Email Value Object — validates email format
 */
export class Email extends ValueObject {
  constructor(address) {
    if (!address || typeof address !== 'string') {
      throw new Error('Email must be a non-empty string');
    }
    const trimmed = address.trim().toLowerCase();
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(trimmed)) {
      throw new Error(`Invalid email format: ${address}`);
    }
    super({ address: trimmed });
  }

  get address() { return this.values.address; }
  toString() { return this.address; }
}

/**
 * Phone Value Object — E.164 format validation
 */
export class Phone extends ValueObject {
  constructor(number) {
    if (!number || typeof number !== 'string') {
      throw new Error('Phone must be a non-empty string');
    }
    // Accept +1XXXXXXXXX format
    const cleaned = number.replace(/[\s\-\(\)]/g, '');
    const PHONE_REGEX = /^\+?1?\d{10,15}$/;
    if (!PHONE_REGEX.test(cleaned)) {
      throw new Error(`Invalid phone format: ${number}`);
    }
    super({ number: cleaned });
  }

  get number() { return this.values.number; }
  toString() { return this.number; }
}

/**
 * RNC / Tax ID Value Object — Dominican Republic format
 */
export class RNC extends ValueObject {
  constructor(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('RNC must be a non-empty string');
    }
    const cleaned = value.replace(/[\s\-]/g, '');
    const RNC_REGEX = /^\d{9}$/;
    if (!RNC_REGEX.test(cleaned)) {
      throw new Error(`Invalid RNC format: ${value}. Must be 9 digits`);
    }
    super({ value: cleaned });
  }

  get value() { return this.values.value; }
  toString() { return this.value; }
}

/**
 * UUID Value Object — validates UUID v4 format
 */
export class UUID extends ValueObject {
  constructor(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('UUID must be a non-empty string');
    }
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(value)) {
      throw new Error(`Invalid UUID format: ${value}`);
    }
    super({ value });
  }

  get value() { return this.values.value; }
  toString() { return this.value; }
}

/**
 * Address Value Object
 */
export class Address extends ValueObject {
  constructor({ street, city, state, zip, country = 'DO' }) {
    if (!street || !city) {
      throw new Error('Address requires at least street and city');
    }
    super({ street, city, state: state || '', zip: zip || '', country });
  }

  get street() { return this.values.street; }
  get city() { return this.values.city; }
  get state() { return this.values.state; }
  get zip() { return this.values.zip; }
  get country() { return this.values.country; }

  toString() {
    return `${this.street}, ${this.city}${this.state ? `, ${this.state}` : ''}${this.zip ? `, ${this.zip}` : ''}`;
  }
}

/**
 * Percentage Value Object — 0-100 range
 */
export class Percentage extends ValueObject {
  constructor(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Percentage must be a valid number');
    }
    if (value < 0 || value > 100) {
      throw new Error(`Percentage must be between 0 and 100, got ${value}`);
    }
    super({ value });
  }

  get value() { return this.values.value; }
  asDecimal() { return this.value / 100; }
  toString() { return `${this.value}%`; }
}

export default { Money, Email, Phone, RNC, UUID, Address, Percentage };

// ============================================================
// Domain Errors — Typed errors for domain logic
// ============================================================

/**
 * Base Domain Error
 */
export class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error thrown when an entity is not found
 */
export class NotFoundError extends DomainError {
  constructor(entityName, id) {
    super(
      `${entityName} with id "${id}" not found`,
      'NOT_FOUND',
      { entityName, id }
    );
  }
}

/**
 * Error thrown when an invariant is violated
 */
export class InvariantError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'INVARIANT_VIOLATION', details);
  }
}

/**
 * Error thrown when a business rule is broken
 */
export class BusinessRuleError extends DomainError {
  constructor(message, ruleName, details = {}) {
    super(message, 'BUSINESS_RULE_VIOLATION', { ruleName, ...details });
  }
}

/**
 * Error thrown when a domain event handler fails
 */
export class EventHandlerError extends DomainError {
  constructor(eventType, originalError) {
    super(
      `EventHandler failed for event "${eventType}": ${originalError.message}`,
      'EVENT_HANDLER_ERROR',
      { eventType, originalMessage: originalError.message }
    );
  }
}

/**
 * Error thrown when an operation is not authorized
 */
export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized', details = {}) {
    super(message, 'UNAUTHORIZED', details);
  }
}

export default { DomainError, NotFoundError, InvariantError, BusinessRuleError, EventHandlerError, UnauthorizedError };

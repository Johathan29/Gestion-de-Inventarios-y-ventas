// ============================================================
// Domain barrel export
// ============================================================

export { Entity, ValueObject, AggregateRoot } from './domain-primitives.js';
export { DomainEvent, IEventHandler, IEventBus } from './events/index.js';
export { Money, Email, Phone, RNC, UUID, Address, Percentage } from './value-objects/index.js';
export { DomainError, NotFoundError, InvariantError, BusinessRuleError, EventHandlerError, UnauthorizedError } from './errors/index.js';
export { IRepository, IGenericRepository, ISpecification } from './repositories/index.js';

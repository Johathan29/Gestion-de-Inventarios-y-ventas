// ============================================================
// Identity Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class UserRegisteredEvent extends DomainEvent {
  constructor({ aggregateId, userId, email, name, role }) {
    super({
      aggregateId,
      eventType: 'identity.user.registered',
      payload: { userId, email, name, role },
    });
  }
}

export class UserActivatedEvent extends DomainEvent {
  constructor({ aggregateId, userId }) {
    super({ aggregateId, eventType: 'identity.user.activated', payload: { userId } });
  }
}

export class UserDeactivatedEvent extends DomainEvent {
  constructor({ aggregateId, userId }) {
    super({ aggregateId, eventType: 'identity.user.deactivated', payload: { userId } });
  }
}

export class UserPasswordChangedEvent extends DomainEvent {
  constructor({ aggregateId, userId }) {
    super({ aggregateId, eventType: 'identity.user.password_changed', payload: { userId } });
  }
}

export class UserRoleChangedEvent extends DomainEvent {
  constructor({ aggregateId, userId, role }) {
    super({ aggregateId, eventType: 'identity.user.role_changed', payload: { userId, role } });
  }
}

export class UserLoggedInEvent extends DomainEvent {
  constructor({ aggregateId, userId, ipAddress }) {
    super({ aggregateId, eventType: 'identity.user.logged_in', payload: { userId, ipAddress } });
  }
}

export class TokenRefreshedEvent extends DomainEvent {
  constructor({ aggregateId, userId }) {
    super({ aggregateId, eventType: 'identity.token.refreshed', payload: { userId } });
  }
}

export default {
  UserRegisteredEvent, UserActivatedEvent, UserDeactivatedEvent,
  UserPasswordChangedEvent, UserRoleChangedEvent, UserLoggedInEvent, TokenRefreshedEvent,
};

// ============================================================
// CRM Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class ClientCreatedEvent extends DomainEvent {
  constructor(client) {
    super({ aggregateId: client.id, eventType: 'crm.client.created', payload: {
      clientId: client.id,
      name: client.name,
      email: client.email,
    }});
  }
}

export class ClientUpdatedEvent extends DomainEvent {
  constructor(client) {
    super({ aggregateId: client.id, eventType: 'crm.client.updated', payload: {
      clientId: client.id,
      name: client.name,
    }});
  }
}

export class ClientDeactivatedEvent extends DomainEvent {
  constructor(client) {
    super({ aggregateId: client.id, eventType: 'crm.client.deactivated', payload: {
      clientId: client.id,
      name: client.name,
    }});
  }
}

export class CreditAccountCreatedEvent extends DomainEvent {
  constructor(account) {
    super({ aggregateId: account.id, eventType: 'crm.credit_account.created', payload: {
      accountId: account.id,
      clientId: account.clientId,
      accountNumber: account.accountNumber,
    }});
  }
}

export class NotificationPrefsUpdatedEvent extends DomainEvent {
  constructor(prefs) {
    super({ aggregateId: prefs.clientId, eventType: 'crm.notification_prefs.updated', payload: {
      clientId: prefs.clientId,
    }});
  }
}

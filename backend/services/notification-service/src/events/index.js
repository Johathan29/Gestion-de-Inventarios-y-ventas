// ============================================================
// Notification Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class NotificationCreatedEvent extends DomainEvent {
  constructor(notification) {
    super({
      aggregateId: notification.id,
      eventType: 'notifications.notification.created',
      payload: {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
      }
    });
  }
}

export class NotificationReadEvent extends DomainEvent {
  constructor(notificationId, userId) {
    super({
      aggregateId: notificationId,
      eventType: 'notifications.notification.read',
      payload: { notificationId, userId }
    });
  }
}

export class NotificationDeletedEvent extends DomainEvent {
  constructor(notificationId) {
    super({
      aggregateId: notificationId,
      eventType: 'notifications.notification.deleted',
      payload: { notificationId }
    });
  }
}

export class EmailSentEvent extends DomainEvent {
  constructor({ to, subject, messageId }) {
    super({
      aggregateId: messageId || `email-${Date.now()}`,
      eventType: 'notifications.email.sent',
      payload: { to, subject, messageId }
    });
  }
}

export class WhatsAppSentEvent extends DomainEvent {
  constructor({ to, messageId, type }) {
    super({
      aggregateId: messageId || `whatsapp-${Date.now()}`,
      eventType: 'notifications.whatsapp.sent',
      payload: { to, messageId, type }
    });
  }
}

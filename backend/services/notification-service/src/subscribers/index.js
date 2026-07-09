// ============================================================
// Notification Subscribers — Event Loggers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('Notification-Subscribers');

export function registerNotificationSubscribers(eventBus) {
  eventBus.subscribe('notifications.notification.created', async (event) => {
    logger.info(`Notification created: ${event.payload.title} — User: ${event.payload.userId}`);
  });

  eventBus.subscribe('notifications.notification.read', async (event) => {
    logger.info(`Notification read: ${event.payload.notificationId} — User: ${event.payload.userId}`);
  });

  eventBus.subscribe('notifications.notification.deleted', async (event) => {
    logger.info(`Notification deleted: ${event.payload.notificationId}`);
  });

  eventBus.subscribe('notifications.email.sent', async (event) => {
    logger.info(`Email sent to ${event.payload.to} — Subject: ${event.payload.subject}`);
  });

  eventBus.subscribe('notifications.whatsapp.sent', async (event) => {
    logger.info(`WhatsApp sent to ${event.payload.to} — Type: ${event.payload.type}`);
  });
}


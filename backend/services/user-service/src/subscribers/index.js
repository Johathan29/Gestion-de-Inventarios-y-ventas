// ============================================================
// CRM Subscribers — Event Loggers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('CRM-Subscribers');

export function registerCRMSubscribers(eventBus) {
  eventBus.subscribe('crm.client.created', async (event) => {
    logger.info(`Client created: ${event.payload.name} (${event.payload.clientId})`);
  });

  eventBus.subscribe('crm.client.updated', async (event) => {
    logger.info(`Client updated: ${event.payload.name} (${event.payload.clientId})`);
  });

  eventBus.subscribe('crm.client.deactivated', async (event) => {
    logger.info(`Client deactivated: ${event.payload.name} (${event.payload.clientId})`);
  });

  eventBus.subscribe('crm.credit_account.created', async (event) => {
    logger.info(`Credit account created: ${event.payload.accountNumber} — Client: ${event.payload.clientId}`);
  });

  eventBus.subscribe('crm.notification_prefs.updated', async (event) => {
    logger.info(`Notification prefs updated — Client: ${event.payload.clientId}`);
  });
}


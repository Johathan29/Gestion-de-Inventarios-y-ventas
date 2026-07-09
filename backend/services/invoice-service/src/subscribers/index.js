// ============================================================
// Billing Subscribers — Event Loggers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('Billing-Subscribers');

export function registerBillingSubscribers(eventBus) {
  eventBus.subscribe('billing.invoice.generated', async (event) => {
    logger.info(`Invoice generated: ${event.payload.invoiceNumber} — Total: ${event.payload.total}`);
  });

  eventBus.subscribe('billing.invoice.issued', async (event) => {
    logger.info(`Invoice issued: ${event.payload.invoiceNumber} — NCF: ${event.payload.ncf}`);
  });

  eventBus.subscribe('billing.invoice.paid', async (event) => {
    logger.info(`Invoice paid: ${event.payload.invoiceNumber}`);
  });

  eventBus.subscribe('billing.invoice.cancelled', async (event) => {
    logger.info(`Invoice cancelled: ${event.payload.invoiceNumber} — Reason: ${event.payload.reason}`);
  });

  eventBus.subscribe('billing.invoice.emailed', async (event) => {
    logger.info(`Invoice emailed: ${event.payload.invoiceNumber} → ${event.payload.email}`);
  });

  eventBus.subscribe('billing.ncf.assigned', async (event) => {
    logger.info(`NCF ${event.payload.ncf} assigned to invoice ${event.payload.invoiceId}`);
  });
}


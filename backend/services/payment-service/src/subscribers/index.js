// ============================================================
// Payments Subscribers — Event Loggers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('Payments-Subscribers');

export function registerPaymentsSubscribers(eventBus) {
  eventBus.subscribe('payments.payment.processed', async (event) => {
    logger.info(`Payment processed: ${event.payload.amount} via ${event.payload.paymentMethod} — Sale: ${event.payload.saleId}`);
  });

  eventBus.subscribe('payments.payment.refunded', async (event) => {
    logger.info(`Payment refunded: ${event.payload.amount} — Transaction: ${event.payload.transactionId}`);
  });

  eventBus.subscribe('payments.cash_register.opened', async (event) => {
    logger.info(`Cash register opened: ${event.payload.code} — Balance: ${event.payload.openingBalance}`);
  });

  eventBus.subscribe('payments.cash_register.closed', async (event) => {
    logger.info(`Cash register closed: ${event.payload.code} — Final: ${event.payload.finalBalance}`);
  });
}


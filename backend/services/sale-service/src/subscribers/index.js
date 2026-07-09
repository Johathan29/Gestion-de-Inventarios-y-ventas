// ============================================================
// Sales Subscribers — Event loggers & cross-service handlers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('Sales-Subscribers');

export function registerSalesSubscribers(eventBus) {
  eventBus.subscribe('sales.sale.created', async (event) => {
    logger.info(`Sale created: ${event.payload.sale.saleNumber}`);
  });

  eventBus.subscribe('sales.sale.completed', async (event) => {
    logger.info(`Sale completed: ${event.payload.saleNumber} — Total: ${event.payload.total}`);
  });

  eventBus.subscribe('sales.sale.cancelled', async (event) => {
    logger.info(`Sale cancelled: ${event.payload.saleNumber}`);
  });

  eventBus.subscribe('sales.checkout.completed', async (event) => {
    logger.info(`Checkout completed: Cart ${event.payload.cartId} → Sale ${event.payload.saleNumber}`);
  });

  eventBus.subscribe('sales.cart.updated', async (event) => {
    logger.info(`Cart updated: ${event.payload.cartId} — Items: ${event.payload.itemCount}`);
  });
}


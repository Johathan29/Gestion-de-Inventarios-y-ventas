// ============================================================
// Inventory Subscribers — Event Handlers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('inventory-subscribers');

export function registerInventorySubscribers(eventBus) {
  eventBus.subscribe('inventory.stock.entry', async (event) => {
    const { productId, warehouse, quantity, newStock } = event.payload.movement;
    logger.info(`Stock entry: +${quantity} → ${newStock}`, { productId, warehouse });
  });

  eventBus.subscribe('inventory.stock.exit', async (event) => {
    const { productId, warehouse, quantity, newStock } = event.payload.movement;
    logger.info(`Stock exit: -${quantity} → ${newStock}`, { productId, warehouse });
  });

  eventBus.subscribe('inventory.stock.adjusted', async (event) => {
    const { productId, warehouse, previousStock, newStock } = event.payload.movement;
    logger.info(`Stock adjusted: ${previousStock} → ${newStock}`, { productId, warehouse });
  });

  eventBus.subscribe('inventory.stock.transfer', async (event) => {
    logger.info(`Stock transfer completed`, {
      from: event.payload.from.warehouse,
      to: event.payload.to.warehouse,
      quantity: event.payload.from.quantity,
    });
  });

  eventBus.subscribe('inventory.stock.low_stock', async (event) => {
    const { productId, warehouse, currentStock, minStock } = event.payload;
    logger.warn(`Low stock alert`, { productId, warehouse, currentStock, minStock });
    // Future: Trigger notification
  });

  eventBus.subscribe('inventory.stock.out_of_stock', async (event) => {
    const { productId, warehouse } = event.payload;
    logger.warn(`Out of stock alert`, { productId, warehouse });
    // Future: Trigger notification
  });

  eventBus.subscribe('procurement.purchase.received', async (event) => {
    logger.info(`Purchase received → auto-create stock entries`, {
      purchaseId: event.payload.purchaseId,
      items: event.payload.items?.length,
    });
    // Future: Automatically create stock entries from received purchases
  });

  eventBus.subscribe('inventory.reservation.created', async (event) => {
    logger.info(`Reservation created`, {
      productId: event.payload.reservation.productId,
      quantity: event.payload.reservation.quantity,
      orderId: event.payload.reservation.orderId,
    });
  });
}


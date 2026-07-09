// ============================================================
// Procurement Subscribers — Event Handlers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('procurement-subscribers');

export function registerProcurementSubscribers(eventBus) {
  // Purchase events
  eventBus.subscribe('procurement.purchase.created', async (event) => {
    logger.info(`Purchase created: ${event.payload.purchaseNumber}`, { purchaseId: event.payload.id });
  });

  eventBus.subscribe('procurement.purchase.approved', async (event) => {
    logger.info(`Purchase approved: ${event.payload.purchaseNumber}`, {
      purchaseId: event.payload.purchaseId,
      total: event.payload.total,
    });
    // Future: Notify warehouse, notify supplier
  });

  eventBus.subscribe('procurement.purchase.received', async (event) => {
    logger.info(`Purchase received: ${event.payload.purchaseNumber}`, {
      purchaseId: event.payload.purchaseId,
      itemsCount: event.payload.items?.length,
    });
    // Future: Trigger inventory update, quality inspection
  });

  eventBus.subscribe('procurement.purchase.cancelled', async (event) => {
    logger.info(`Purchase cancelled: ${event.payload.purchaseNumber}`, {
      purchaseId: event.payload.purchaseId,
    });
    // Future: Notify accounting, revert inventory
  });

  // Supplier events
  eventBus.subscribe('procurement.supplier.created', async (event) => {
    logger.info(`Supplier created: ${event.payload.supplier.name}`, {
      supplierId: event.payload.supplier.id,
    });
  });

  eventBus.subscribe('procurement.supplier.updated', async (event) => {
    logger.info(`Supplier updated: ${event.payload.supplier.name}`, {
      supplierId: event.payload.supplier.id,
    });
  });
}


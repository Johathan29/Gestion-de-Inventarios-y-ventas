// ============================================================
// Sales Subscribers — Loggers & detección de stock bajo
// ============================================================
// Las notificaciones in-app y los correos se manejan de forma
// centralizada en notification-service (mismo EventBus).
// Aquí solo se loguea y se detecta stock bajo publicando
// `inventory.stock_low` para que notification-service alerte.

import { createLogger } from '@erp/common';

const logger = createLogger('Sales-Subscribers');

export function registerSalesSubscribers(eventBus, { supabase } = {}) {
  eventBus.subscribe('sales.sale.created', async (event) => {
    const p = event.payload?.sale || event.payload || {};
    logger.info(`Sale created: ${p.saleNumber || p.saleId}`);
  });

  eventBus.subscribe('sales.sale.completed', async (event) => {
    const p = event.payload?.sale || event.payload || {};
    logger.info(`Sale completed: ${p.saleNumber || p.saleId} — Total: ${p.total}`);
  });

  eventBus.subscribe('sales.sale.cancelled', async (event) => {
    const p = event.payload?.sale || event.payload || {};
    logger.info(`Sale cancelled: ${p.saleNumber || p.saleId || p.id}`);
  });

  eventBus.subscribe('sales.checkout.completed', async (event) => {
    const p = event.payload || {};
    const sale = p.sale || {};
    logger.info(`Checkout completed: ${p.saleNumber || sale.saleNumber} — Items: ${p.itemCount || sale.items?.length || 0}`);

    // Detección de stock bajo (publica evento para notification-service)
    if (supabase && sale?.items?.length) {
      await checkLowStock(supabase, eventBus, sale.items);
    }
  });

  eventBus.subscribe('sales.cart.updated', async (event) => {
    logger.info(`Cart updated: ${event.payload.cartId} — Items: ${event.payload.itemCount}`);
  });
}

/**
 * Detecta productos por debajo de su min_stock tras la venta
 * y publica `inventory.stock_low` para que notification-service alerte.
 */
async function checkLowStock(supabase, eventBus, items) {
  try {
    const seen = new Set();
    for (const item of items) {
      const productId = item.productId || item.product_id;
      if (!productId || seen.has(productId)) continue;
      seen.add(productId);

      const { data: product, error } = await supabase
        .from('products')
        .select('name, min_stock, sku')
        .eq('id', productId)
        .maybeSingle();
      if (error || !product) continue;

      // products no tiene columna stock — el stock real se agrega desde `inventory`
      const { data: invRows, error: invErr } = await supabase
        .from('inventory')
        .select('stock')
        .eq('product_id', productId)
        .is('deleted_at', null);
      if (invErr) continue;
      const currentStock = (invRows || []).reduce((sum, r) => sum + (Number(r.stock) || 0), 0);
      if (currentStock <= Number(product.min_stock || 0)) {
        await eventBus.publish({
          eventType: 'inventory.stock_low',
          aggregateId: productId,
          payload: {
            productId,
            productName: product.name,
            sku: product.sku,
            stock: currentStock,
            minStock: product.min_stock || 0,
          },
          toJSON() {
            return {
              eventId: this.eventId || `${Date.now()}-${Math.random()}`,
              aggregateId: this.aggregateId,
              eventType: this.eventType,
              occurredOn: new Date().toISOString(),
              payload: this.payload,
            };
          },
        });
        logger.warn(`Stock bajo detectado: ${product.name} (${currentStock} <= min ${product.min_stock || 0})`);
      }
    }
  } catch (err) {
    logger.error(`Error checking low stock: ${err.message}`);
  }
}



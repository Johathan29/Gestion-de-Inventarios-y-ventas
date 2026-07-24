// ============================================================
// Sales Subscribers — Event loggers & cross-service handlers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('Sales-Subscribers');

/**
 * Crea una notificación en la tabla `notifications` vía Supabase
 */
async function createInAppNotification(supabase, userId, title, message, type = 'system') {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    logger.error(`Error creating notification: ${err.message}`);
  }
}

/**
 * Envía un correo de confirmación de compra vía email-service
 */
async function sendPurchaseEmail(userEmail, userName, saleNumber, total) {
  try {
    const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3014';
    await fetch(`${EMAIL_SERVICE_URL}/api/email/purchase-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userEmail,
        userName,
        saleNumber,
        total,
      })
    });
  } catch (err) {
    logger.error(`Error sending purchase email: ${err.message}`);
  }
}

/**
 * Envía una notificación de venta vía email-service para admins
 */
async function sendSaleNotificationToAdmin(supabase, saleNumber, total) {
  try {
    const { data: admins } = await supabase
      .from('users')
      .select('email, name')
      .eq('is_active', true)
      .in('role', ['admin', 'supervisor']);

    if (admins && admins.length > 0) {
      const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3014';
      for (const admin of admins) {
        await fetch(`${EMAIL_SERVICE_URL}/api/email/sale-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: admin.email,
            adminName: admin.name || 'Admin',
            saleNumber,
            total,
          })
        }).catch(e => logger.error(`Error emailing admin ${admin.email}: ${e.message}`));
      }
    }
  } catch (err) {
    logger.error(`Error notifying admins: ${err.message}`);
  }
}

export function registerSalesSubscribers(eventBus, { supabase } = {}) {
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
    const { cart, sale } = event.payload;
    logger.info(`Checkout completed: ${sale.saleNumber} — Items: ${cart.items.length}`);

    if (supabase) {
      // Notificación in-app para el cliente
      await createInAppNotification(
        supabase,
        sale.userId,
        '¡Compra realizada con éxito!',
        `Tu compra #${sale.saleNumber} por $${Number(sale.total).toFixed(2)} ha sido procesada.`,
        'purchase'
      );

      // Notificar a admins
      await createInAppNotification(
        supabase,
        null, // null = notificación global / de sistema
        'Nueva venta realizada',
        `Venta #${sale.saleNumber} por $${Number(sale.total).toFixed(2)} — ${cart.items.length} producto(s)`,
        'sale_alert'
      );

      // Enviar correo al cliente si tenemos sus datos
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', sale.userId)
        .maybeSingle();

      if (user?.email) {
        await sendPurchaseEmail(user.email, user.name || 'Cliente', sale.saleNumber, sale.total);
      }

      // Notificar a admins por correo
      await sendSaleNotificationToAdmin(supabase, sale.saleNumber, sale.total);

      // Verificar stock bajo de los productos comprados
      try {
        for (const item of cart.items) {
          const productId = item.product_id || item.productId;
          const variantId = item.variant_id || item.variantId;

          // Obtener inventario actual del producto
          const { data: inventoryItems } = await supabase
            .from('inventory')
            .select('id, stock, warehouse, product_id, variant_id')
            .eq('product_id', productId)
            .maybeSingle();

          if (inventoryItems) {
            // Obtener el min_stock del producto
            const { data: product } = await supabase
              .from('products')
              .select('name, min_stock, sku')
              .eq('id', productId)
              .single();

            if (product && inventoryItems.stock <= product.min_stock) {
              // Notificar a admins sobre stock bajo
              await createInAppNotification(
                supabase,
                null,
                'Stock bajo detectado',
                `El producto "${product.name}" (SKU: ${product.sku}) tiene solo ${inventoryItems.stock} unidad(es) en stock (mínimo: ${product.min_stock}).`,
                'low_stock_alert'
              );

              // Enviar correo a admins sobre stock bajo
              try {
                const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3014';
                const { data: admins } = await supabase
                  .from('users')
                  .select('email, name')
                  .eq('is_active', true)
                  .in('role', ['admin', 'supervisor']);
                if (admins) {
                  for (const admin of admins) {
                    await fetch(`${EMAIL_SERVICE_URL}/api/email/restock-purchase`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        to: admin.email,
                        adminName: admin.name || 'Admin',
                        productName: product.name,
                        sku: product.sku,
                        currentStock: inventoryItems.stock,
                        minStock: product.min_stock
                      })
                    }).catch(e => logger.error(`Error emailing admin about low stock: ${e.message}`));
                  }
                }
              } catch (emailErr) {
                logger.error(`Error sending low stock email: ${emailErr.message}`);
              }
            }
          }
        }
      } catch (stockErr) {
        logger.error(`Error checking low stock: ${stockErr.message}`);
      }
    }
  });

  eventBus.subscribe('sales.cart.updated', async (event) => {
    logger.info(`Cart updated: ${event.payload.cartId} — Items: ${event.payload.itemCount}`);
  });
}


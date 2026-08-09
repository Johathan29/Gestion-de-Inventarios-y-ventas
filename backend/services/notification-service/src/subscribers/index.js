// ============================================================
// Notification Subscribers — Consumo de eventos de dominio
// ============================================================
// Centraliza TODAS las notificaciones de la plataforma:
//  - Ventas (checkout, completadas, canceladas)
//  - Inventario (stock bajo)
//  - Notificaciones internas del servicio
// Los eventos llegan vía EventBus (InMemory local o RabbitMQ
// cross-service) — publicados por el OutboxRelay desde la
// tabla transactional_outbox (publicación garantizada).

import { createLogger } from '@erp/common';

const logger = createLogger('Notification-Subscribers');

const STAFF_ROLES = ['admin', 'supervisor'];

export function registerNotificationSubscribers(eventBus, { supabase } = {}) {
  if (!supabase) {
    logger.warn('registerNotificationSubscribers: sin supabase — solo se loguearán eventos');
  }

  // ----------------------------------------------------------
  // VENTA COMPLETADA vía checkout (ecommerce)
  // ----------------------------------------------------------
  eventBus.subscribe('sales.checkout.completed', async (event) => {
    const p = event.payload || {};
    logger.info(`Checkout completado: venta ${p.saleNumber} — usuario ${p.userId}`);

    try {
      // Notificación in-app al cliente
      if (p.userId && supabase) {
        await createInAppNotification(supabase, {
          userId: p.userId,
          type: 'sale',
          title: '¡Compra confirmada! 🎉',
          message: `Tu pedido ${p.saleNumber || ''} por $${formatMoney(p.total)} fue confirmado.`,
          data: { saleId: p.saleId, saleNumber: p.saleNumber, total: p.total },
          companyId: p.companyId,
        });
      }

      // Notificación + email a staff (admin/supervisor)
      await notifyStaff(supabase, {
        title: 'Nueva venta por e-commerce',
        message: `Venta ${p.saleNumber || ''} de $${formatMoney(p.total)} (${p.itemCount || 0} artículos).`,
        data: { saleId: p.saleId, saleNumber: p.saleNumber },
        emailSubject: `Nueva venta online: ${p.saleNumber || ''}`,
        emailHtml: saleEmailHtml({
          title: 'Nueva venta por e-commerce 🛒',
          lines: [
            `Venta: <strong>${p.saleNumber || ''}</strong>`,
            `Total: <strong>$${formatMoney(p.total)}</strong>`,
            `Artículos: ${p.itemCount || 0}`,
          ],
        }),
        companyId: p.companyId,
      });
    } catch (err) {
      logger.error(`[sales.checkout.completed] ${err.message}`);
    }
  });

  // ----------------------------------------------------------
  // VENTA COMPLETADA (POS)
  // ----------------------------------------------------------
  eventBus.subscribe('sales.sale.completed', async (event) => {
    const p = event.payload?.sale || event.payload || {};
    logger.info(`Venta completada: ${p.saleNumber || p.saleId} — usuario ${p.userId}`);

    try {
      // El checkout ya notificó al cliente (sales.checkout.completed);
      // aquí solo se informa al staff para ventas POS o outbox.
      if (p.saleId && supabase && p.userId) {
        await notifyStaff(supabase, {
          title: 'Venta registrada',
          message: `Venta ${p.saleNumber} de $${formatMoney(p.total)} registrada.`,
          data: { saleId: p.saleId, saleNumber: p.saleNumber },
          emailSubject: `Venta registrada: ${p.saleNumber}`,
          emailHtml: saleEmailHtml({
            title: 'Venta registrada 💰',
            lines: [
              `Venta: <strong>${p.saleNumber}</strong>`,
              `Total: <strong>$${formatMoney(p.total)}</strong>`,
              `Método: ${p.paymentMethod || '—'}`,
            ],
          }),
          companyId: p.companyId,
        });
      }
    } catch (err) {
      logger.error(`[sales.sale.completed] ${err.message}`);
    }
  });

  // ----------------------------------------------------------
  // VENTA CANCELADA
  // ----------------------------------------------------------
  eventBus.subscribe('sales.sale.cancelled', async (event) => {
    const p = event.payload?.sale || event.payload || {};
    const saleId = p.saleId || p.id;
    const saleNumber = p.saleNumber || '';

    logger.info(`Venta cancelada: ${saleNumber || saleId}`);

    try {
      if (saleId && supabase) {
        await notifyStaff(supabase, {
          title: 'Venta cancelada ⚠️',
          message: `La venta ${saleNumber || saleId} fue cancelada.`,
          data: { saleId, saleNumber },
          emailSubject: `Venta cancelada: ${saleNumber || saleId}`,
          emailHtml: saleEmailHtml({
            title: 'Venta cancelada ⚠️',
            lines: [`Venta: <strong>${saleNumber || saleId}</strong>`],
          }),
          companyId: p.companyId,
        });
      }
    } catch (err) {
      logger.error(`[sales.sale.cancelled] ${err.message}`);
    }
  });

  // ----------------------------------------------------------
  // INVENTARIO — STOCK BAJO
  // ----------------------------------------------------------
  eventBus.subscribe('inventory.stock_low', async (event) => {
    const p = event.payload || {};
    logger.info(`Stock bajo: ${p.productName || p.productId} (${p.stock})`);

    try {
      if (supabase) {
        await notifyStaff(supabase, {
          title: 'Stock bajo 📉',
          message: `El producto "${p.productName || p.productId}" tiene ${p.stock} unidades disponibles.`,
          data: { productId: p.productId, stock: p.stock },
          companyId: p.companyId,
        });
      }
    } catch (err) {
      logger.error(`[inventory.stock_low] ${err.message}`);
    }
  });

  // ----------------------------------------------------------
  // NUEVO USUARIO REGISTRADO
  // ----------------------------------------------------------
  eventBus.subscribe('auth.user_registered', async (event) => {
    const p = event.payload || {};
    logger.info(`Usuario registrado: ${p.email || p.userId}`);

    try {
      if (supabase && p.userId) {
        await createInAppNotification(supabase, {
          userId: p.userId,
          type: 'welcome',
          title: '¡Bienvenido! 👋',
          message: 'Tu cuenta fue creada exitosamente. ¡Gracias por registrarte!',
          data: {},
          companyId: p.companyId,
        });
      }
    } catch (err) {
      logger.error(`[auth.user_registered] ${err.message}`);
    }
  });

  // ----------------------------------------------------------
  // EVENTOS INTERNOS DEL SERVICIO DE NOTIFICACIONES
  // ----------------------------------------------------------
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

  logger.info('Notification subscribers registrados (sales, inventory, auth, notifications)');
}

// ============================================================
// Helpers
// ============================================================

async function createInAppNotification(supabase, { userId, type, title, message, data, companyId }) {
  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      type: type || 'general',
      title,
      message,
      data: data || {},
      read: false,
      company_id: companyId || undefined,
    });
  if (error) throw error;
}

async function notifyStaff(supabase, { title, message, data, emailSubject, emailHtml, companyId }) {
  if (!supabase) return;
  const { data: staff, error } = await supabase
    .from('users')
    .select('id, email, name')
    .in('role', STAFF_ROLES)
    .eq('is_active', true);

  if (error) throw error;

  for (const admin of staff || []) {
    await createInAppNotification(supabase, {
      userId: admin.id,
      type: 'staff',
      title,
      message,
      data,
      companyId,
    });

    // Email (best-effort; MAILTRAP_TOKEN puede no estar configurado)
    if (emailSubject && admin.email) {
      try {
        const { EmailChannelService } = await import('../repository/index.js');
        const emailService = new EmailChannelService();
        await emailService.send({
          to: admin.email,
          subject: emailSubject,
          html: emailHtml,
          category: 'sale_notification',
        });
      } catch (emailErr) {
        logger.warn(`No se pudo enviar email a ${admin.email}: ${emailErr.message}`);
      }
    }
  }
}

function saleEmailHtml({ title, lines }) {
  const items = (lines || []).map(l => `<li style="margin:4px 0;">${l}</li>`).join('');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
      <div style="background:#7c3aed; padding:16px 24px;">
        <h2 style="margin:0; color:#fff;">${title}</h2>
      </div>
      <div style="padding:24px;">
        <ul style="list-style:none; padding:0; margin:0;">${items}</ul>
        <p style="margin-top:24px; color:#6b7280; font-size:13px;">Este mensaje fue generado automáticamente por el Sistema de Inventarios.</p>
      </div>
    </div>
  `;
}

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}



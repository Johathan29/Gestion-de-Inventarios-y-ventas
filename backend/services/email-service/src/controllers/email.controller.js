const { MailtrapClient } = require('mailtrap');
const { getSupabaseClient } = require('@inventory/shared');
const {
  welcomeClient,
  passwordReset,
  newProducts,
  purchaseConfirmation,
  newOffer,
  saleNotification,
  restockPurchase,
  systemEvent,
  orderStatusUpdate,
  registrationData
} = require('../templates/email-templates');

const supabase = getSupabaseClient();

// ─── Mailtrap Client ─────────────────────────────────────────
const mailtrapToken = process.env.MAILTRAP_TOKEN;
const senderEmail = process.env.MAILTRAP_SENDER_EMAIL || process.env.EMAIL_FROM || 'hello@demomailtrap.co';
const senderName = process.env.MAILTRAP_SENDER_NAME || process.env.EMAIL_FROM_NAME || 'Sistema de Inventarios';

let mailtrapClient = null;
let mailtrapEnabled = false;

if (mailtrapToken) {
  mailtrapClient = new MailtrapClient({ token: mailtrapToken });
  mailtrapEnabled = true;
  console.log(`[EmailService] Mailtrap configurado correctamente`);
} else {
  console.warn('[EmailService] MAILTRAP_TOKEN no configurado — los correos NO se enviarán');
}

// ─── Helper: enviar a través de Mailtrap ─────────────────────
async function sendMail({ to, subject, html, text, category }) {
  if (!mailtrapEnabled) {
    console.log(`[EmailService] Mailtrap deshabilitado. No se envió: "${subject}" a ${to}`);
    return { messageId: null, accepted: [] };
  }

  const recipients = Array.isArray(to) ? to : [{ email: to }];

  const payload = {
    from: { email: senderEmail, name: senderName },
    to: recipients,
    subject,
    category: category || 'notificacion'
  };

  if (html) payload.html = html;
  if (text) payload.text = text;

  try {
    const response = await mailtrapClient.send(payload);
    const messageId = response?.data?.[0]?.message_id || response?.message_ids?.[0] || response?.id || 'unknown';

    // Registrar envío en Supabase
    try {
      await supabase.from('email_logs').insert({
        to: recipients.map(r => r.email).join(', '),
        subject,
        status: 'sent',
        message_id: messageId,
        category: category || null,
        created_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.error('[EmailService] Error al registrar en email_logs:', logErr.message);
    }

    console.log(`[EmailService] Correo enviado: "${subject}" → ${recipients.map(r => r.email).join(', ')}`);
    return { messageId, accepted: recipients.map(r => r.email) };
  } catch (error) {
    console.error(`[EmailService] Error al enviar "${subject}" a ${recipients.map(r => r.email).join(', ')}:`, error.message);
    throw error;
  }
}

// ─── Helper: obtener usuarios por rol ────────────────────────
async function getUsersByRole(roleName) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('roles.name', roleName)
    .eq('is_active', true);

  if (error) {
    console.error(`[EmailService] Error al buscar usuarios con rol "${roleName}":`, error.message);
    return [];
  }

  // También buscar en la tabla clients si el rol es 'cliente'
  if (roleName === 'cliente') {
    const { data: clients } = await supabase
      .from('clients')
      .select('name, email')
      .not('email', 'is', null);
    if (clients) {
      const existingEmails = new Set((data || []).map(u => u.email));
      for (const c of clients) {
        if (c.email && !existingEmails.has(c.email)) {
          data.push({ id: null, name: c.name, email: c.email });
        }
      }
    }
  }

  return data || [];
}

// ─── Helper: obtener todos los admins ────────────────────────
async function getAdminEmails() {
  const { data } = await supabase
    .from('users')
    .select('name, email')
    .eq('is_active', true)
    .in('role_id', supabase.from('roles').select('id').eq('name', 'admin'));

  if (data && data.length > 0) return data;

  // Fallback: buscar por email de admin en la tabla
  const { data: fallback } = await supabase
    .from('users')
    .select('name, email')
    .eq('is_active', true);

  return fallback?.filter(u => u.email?.toLowerCase().includes('admin')) || [];
}

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS PÚBLICOS (sin autenticación, para uso interno)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/email/send
 * Envío genérico de correo (compatibilidad hacia atrás)
 */
const sendEmail = async (req, res, next) => {
  try {
    const { to, subject, html, text, category } = req.body;
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Destinatario, asunto y contenido (html o text) requeridos' }
      });
    }
    const result = await sendMail({ to, subject, html, text, category });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/email/welcome
 * Correo de bienvenida al cliente después del registro
 */
const sendWelcomeEmail = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Email y nombre requeridos' }
      });
    }
    const html = welcomeClient({ name, email });
    await sendMail({ to: email, subject: `¡Bienvenido a ${process.env.EMAIL_FROM_NAME || 'Sistema de Inventarios'}!`, html, category: 'welcome' });
    res.json({ success: true, message: 'Correo de bienvenida enviado' });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/registration-data
 * Enviar datos completos del registro al cliente
 */
const sendRegistrationDataEmail = async (req, res, next) => {
  try {
    const { email, name, phone, role } = req.body;
    if (!email || !name) {
      return res.status(400).json({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Email y nombre requeridos' }
      });
    }
    const html = registrationData({ name, email, phone, role: role || 'cliente' });
    await sendMail({ to: email, subject: 'Tus datos de registro - Sistema de Inventarios', html, category: 'registration' });
    res.json({ success: true, message: 'Datos de registro enviados' });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/password-reset
 * Correo de restablecimiento de contraseña
 */
const sendPasswordResetEmail = async (req, res, next) => {
  try {
    const { email, name, resetUrl } = req.body;
    if (!email || !resetUrl) {
      return res.status(400).json({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Email y resetUrl requeridos' }
      });
    }
    const html = passwordReset({ name: name || 'Usuario', resetUrl });
    await sendMail({ to: email, subject: 'Recuperación de Contraseña - Sistema de Inventarios', html, category: 'password_reset' });
    res.json({ success: true, message: 'Correo de recuperación enviado' });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/new-products
 * Notificar sobre nuevos productos a un destinatario específico
 * o a todos los usuarios de un rol
 */
const sendNewProductsNotification = async (req, res, next) => {
  try {
    const { products, role, email, name } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Lista de productos requerida' }
      });
    }

    if (email && name) {
      // Enviar a un destinatario específico
      const html = newProducts({ name, products, role: role || 'cliente' });
      await sendMail({ to: email, subject: `🆕 ${products.length} nuevo(s) producto(s) disponibles`, html, category: 'new_products' });
      return res.json({ success: true, message: 'Notificación enviada' });
    }

    // Enviar por rol
    const targetRole = role || 'cliente';
    const users = await getUsersByRole(targetRole);
    let sentCount = 0;

    for (const user of users) {
      const html = newProducts({ name: user.name, products, role: targetRole });
      try {
        await sendMail({ to: user.email, subject: `🆕 ${products.length} nuevo(s) producto(s) disponibles`, html, category: 'new_products' });
        sentCount++;
      } catch (err) {
        console.error(`[EmailService] Error al notificar a ${user.email}:`, err.message);
      }
    }

    res.json({ success: true, data: { sent: sentCount, total: users.length } });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/purchase-confirmation
 * Confirmación de compra para el cliente (con datos completos)
 */
const sendPurchaseConfirmation = async (req, res, next) => {
  try {
    const { sale_id } = req.body;
    if (!sale_id) {
      return res.status(400).json({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'sale_id requerido' }
      });
    }

    const { data: sale } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(name)), clients(*)')
      .eq('id', sale_id)
      .single();

    if (!sale) {
      return res.status(404).json({
        success: false, error: { code: 'NOT_FOUND', message: 'Venta no encontrada' }
      });
    }

    const clientEmail = sale.clients?.email || sale.client_email;
    const clientName = sale.clients?.name || sale.client_name || 'Cliente';

    if (!clientEmail) {
      return res.status(400).json({
        success: false, error: { code: 'NO_EMAIL', message: 'El cliente no tiene email registrado' }
      });
    }

    const items = (sale.sale_items || []).map(item => ({
      product_name: item.products?.name || item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total || item.unit_price * item.quantity
    }));

    const html = purchaseConfirmation({
      name: clientName,
      sale: {
        folio: sale.folio || sale.id,
        created_at: sale.created_at,
        payment_method: sale.payment_method,
        total: sale.total,
        items
      }
    });

    await sendMail({
      to: clientEmail,
      subject: '✅ Compra Confirmada - Sistema de Inventarios',
      html,
      category: 'purchase_confirmation'
    });

    res.json({ success: true, message: 'Confirmación de compra enviada' });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/invoice/:invoice_id
 * Enviar factura por email
 */
const sendInvoiceEmail = async (req, res, next) => {
  try {
    const { invoice_id } = req.params;
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, sales(*), clients(*)')
      .eq('id', invoice_id)
      .single();

    if (!invoice) {
      return res.status(404).json({
        success: false, error: { code: 'NOT_FOUND', message: 'Factura no encontrada' }
      });
    }

    if (!invoice.clients?.email) {
      return res.status(400).json({
        success: false, error: { code: 'NO_EMAIL', message: 'El cliente no tiene email registrado' }
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Factura ${invoice.invoice_number}</h2>
        <p>Hola ${invoice.clients.name},</p>
        <p>Adjunto encontrarás tu factura por valor de <strong>$${Number(invoice.total).toLocaleString('es-MX')}</strong>.</p>
        <p>Número de factura: ${invoice.invoice_number}</p>
        <p>Fecha: ${new Date(invoice.created_at).toLocaleDateString('es-MX')}</p>
        <hr>
        <p>¡Gracias por tu compra!</p>
      </div>
    `;

    await sendMail({
      to: invoice.clients.email,
      subject: `Factura ${invoice.invoice_number} - ${senderName}`,
      html,
      category: 'invoice'
    });

    res.json({ success: true, message: 'Factura enviada exitosamente' });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/new-offer
 * Notificar sobre una nueva oferta (vendedores, admins)
 */
const sendNewOfferNotification = async (req, res, next) => {
  try {
    const { offer, role, email, name } = req.body;
    if (!offer) {
      return res.status(400).json({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos de la oferta requeridos' }
      });
    }

    if (email && name) {
      const html = newOffer({ name, offer, role: role || 'vendedor' });
      await sendMail({ to: email, subject: `🔥 Nueva oferta: ${offer.title || offer.name || ''}`, html, category: 'new_offer' });
      return res.json({ success: true, message: 'Notificación de oferta enviada' });
    }

    const targetRole = role || 'vendedor';
    const users = await getUsersByRole(targetRole);
    let sentCount = 0;

    for (const user of users) {
      const html = newOffer({ name: user.name, offer, role: targetRole });
      try {
        await sendMail({ to: user.email, subject: `🔥 Nueva oferta: ${offer.title || offer.name || ''}`, html, category: 'new_offer' });
        sentCount++;
      } catch (err) { /* ignore */ }
    }

    // También notificar a admins si el rol no es admin
    if (targetRole !== 'admin') {
      const admins = await getAdminEmails();
      for (const admin of admins) {
        const html = newOffer({ name: admin.name, offer, role: 'admin' });
        try {
          await sendMail({ to: admin.email, subject: `🔥 Nueva oferta: ${offer.title || offer.name || ''}`, html, category: 'new_offer' });
          sentCount++;
        } catch (err) { /* ignore */ }
      }
    }

    res.json({ success: true, data: { sent: sentCount } });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/sale-notification
 * Notificar sobre una venta realizada (vendedores, admins)
 */
const sendSaleNotification = async (req, res, next) => {
  try {
    const { sale, role, email, name } = req.body;

    if (email && name) {
      const html = saleNotification({ name, sale, role: role || 'vendedor' });
      await sendMail({ to: email, subject: `💰 Venta registrada - $${Number(sale.total).toLocaleString('es-MX')}`, html, category: 'sale' });
      return res.json({ success: true, message: 'Notificación de venta enviada' });
    }

    const targetRole = role || 'vendedor';
    const users = await getUsersByRole(targetRole);
    let sentCount = 0;

    for (const user of users) {
      const html = saleNotification({ name: user.name, sale, role: targetRole });
      try {
        await sendMail({ to: user.email, subject: `💰 Venta registrada - $${Number(sale.total).toLocaleString('es-MX')}`, html, category: 'sale' });
        sentCount++;
      } catch (err) { /* ignore */ }
    }

    res.json({ success: true, data: { sent: sentCount } });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/restock-purchase
 * Notificar sobre una orden de compra para reposición (vendedores, admins)
 */
const sendRestockPurchaseNotification = async (req, res, next) => {
  try {
    const { purchase, role, email, name } = req.body;

    if (email && name) {
      const html = restockPurchase({ name, purchase, role: role || 'vendedor' });
      await sendMail({ to: email, subject: `📦 Orden de reposición #${purchase.order_number || purchase.id}`, html, category: 'restock' });
      return res.json({ success: true, message: 'Notificación de reposición enviada' });
    }

    const targetRole = role || 'vendedor';
    const users = await getUsersByRole(targetRole);
    let sentCount = 0;

    for (const user of users) {
      const html = restockPurchase({ name: user.name, purchase, role: targetRole });
      try {
        await sendMail({ to: user.email, subject: `📦 Orden de reposición #${purchase.order_number || purchase.id}`, html, category: 'restock' });
        sentCount++;
      } catch (err) { /* ignore */ }
    }

    res.json({ success: true, data: { sent: sentCount } });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/system-event
 * Notificar evento del sistema (solo admins)
 */
const sendSystemEventNotification = async (req, res, next) => {
  try {
    const { event } = req.body;
    if (!event) {
      return res.status(400).json({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos del evento requeridos' }
      });
    }

    const admins = await getAdminEmails();
    let sentCount = 0;

    for (const admin of admins) {
      const html = systemEvent({ name: admin.name, event });
      try {
        await sendMail({
          to: admin.email,
          subject: `🔔 Evento del sistema: ${event.type || event.event_type || 'Notificación'}`,
          html,
          category: 'system_event'
        });
        sentCount++;
      } catch (err) { /* ignore */ }
    }

    res.json({ success: true, data: { sent: sentCount, total: admins.length } });
  } catch (error) { next(error); }
};

/**
 * POST /api/email/order-status
 * Actualización de estado de pedido para el cliente
 */
const sendOrderStatusUpdate = async (req, res, next) => {
  try {
    const { email, name, order, status } = req.body;
    if (!email || !order || !status) {
      return res.status(400).json({
        success: false, error: { code: 'VALIDATION_ERROR', message: 'Email, datos del pedido y estado requeridos' }
      });
    }

    const html = orderStatusUpdate({ name: name || 'Cliente', order, status });
    const statusTitles = { shipped: '🚚 Pedido Enviado', delivered: '📦 Pedido Entregado', cancelled: '❌ Pedido Cancelado' };
    const subject = statusTitles[status] || `📋 Actualización de pedido #${order.folio || order.id}`;

    await sendMail({ to: email, subject, html, category: `order_${status}` });
    res.json({ success: true, message: 'Notificación de estado enviada' });
  } catch (error) { next(error); }
};

module.exports = {
  // Genéricos
  sendEmail,
  sendWelcomeEmail,
  sendRegistrationDataEmail,
  sendPasswordResetEmail,
  sendInvoiceEmail,
  sendPurchaseConfirmation,
  sendOrderStatusUpdate,
  // Por rol
  sendNewProductsNotification,
  sendNewOfferNotification,
  sendSaleNotification,
  sendRestockPurchaseNotification,
  sendSystemEventNotification
};

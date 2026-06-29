const nodemailer = require('nodemailer');
const { getSupabaseClient } = require('@inventory/shared');

const supabase = getSupabaseClient();

// Configurar transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Enviar email
 */
const sendEmail = async (req, res, next) => {
  try {
    const { to, subject, html, attachments } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Destinatario, asunto y contenido requeridos' }
      });
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Sistema'}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      attachments: attachments || []
    };

    const info = await transporter.sendMail(mailOptions);

    // Registrar envío
    await supabase.from('email_logs').insert({
      to,
      subject,
      status: 'sent',
      message_id: info.messageId,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: { messageId: info.messageId, accepted: info.accepted }
    });
  } catch (error) {
    next(error);
  }
};

/**
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

    if (!invoice || !invoice.clients?.email) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_EMAIL', message: 'El cliente no tiene email registrado' }
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Factura ${invoice.invoice_number}</h2>
        <p>Hola ${invoice.clients.name},</p>
        <p>Adjunto encontrarás tu factura por valor de <strong>$${Number(invoice.total).toLocaleString('es-CO')}</strong>.</p>
        <p>Número de factura: ${invoice.invoice_number}</p>
        <p>Fecha: ${new Date(invoice.created_at).toLocaleDateString('es-CO')}</p>
        <hr>
        <p>¡Gracias por tu compra!</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: invoice.clients.email,
      subject: `Factura ${invoice.invoice_number} - ${process.env.EMAIL_FROM_NAME}`,
      html
    });

    res.json({ success: true, message: 'Factura enviada exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Enviar confirmación de compra
 */
const sendPurchaseConfirmation = async (req, res, next) => {
  try {
    const { sale_id } = req.body;

    const { data: sale } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(name)), clients(*)')
      .eq('id', sale_id)
      .single();

    if (!sale || !sale.clients?.email) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_EMAIL', message: 'Cliente sin email' }
      });
    }

    const itemsHtml = sale.sale_items.map(item => `
      <tr>
        <td>${item.products?.name || item.product_name}</td>
        <td>${item.quantity}</td>
        <td>$${Number(item.unit_price).toLocaleString('es-CO')}</td>
        <td>$${Number(item.total).toLocaleString('es-CO')}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>¡Compra Confirmada!</h2>
        <p>Hola ${sale.clients.name},</p>
        <p>Tu compra ha sido confirmada exitosamente.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <hr>
        <h3>Total: $${Number(sale.total).toLocaleString('es-CO')}</h3>
        <p>Gracias por tu compra.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: sale.clients.email,
      subject: 'Compra Confirmada',
      html
    });

    res.json({ success: true, message: 'Confirmación enviada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendEmail, sendInvoiceEmail, sendPurchaseConfirmation };

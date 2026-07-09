// ============================================================
// Supabase Notification Repository + External Channel Services
// ============================================================

import nodemailer from 'nodemailer';
import axios from 'axios';
import { NotificationMapper } from '../mappers/index.js';

export class SupabaseNotificationRepository {
  constructor(supabase) {
    this._supabase = supabase;
  }

  async findByUser({ userId, limit = 50, offset = 0, unread }) {
    let query = this._supabase
      .from('user_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unread === 'true') query = query.eq('read', false);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(r => NotificationMapper.toDomain(r)),
      pagination: { total: count, limit, offset },
    };
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('user_notifications')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return NotificationMapper.toDomain(data);
  }

  async save(notification) {
    const persistence = NotificationMapper.toPersistence(notification);
    const { data, error } = await this._supabase
      .from('user_notifications')
      .insert(persistence)
      .select()
      .single();
    if (error) throw error;
    return NotificationMapper.toDomain(data);
  }

  async update(notification) {
    const persistence = NotificationMapper.toPersistence(notification);
    persistence.updated_at = new Date().toISOString();
    const { error } = await this._supabase
      .from('user_notifications')
      .update(persistence)
      .eq('id', notification.id);
    if (error) throw error;
    return this.findById(notification.id);
  }

  async markAllAsRead(userId) {
    const { error } = await this._supabase
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  }

  async delete(id) {
    const { error } = await this._supabase
      .from('user_notifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async saveChannels(notificationId, channels) {
    if (!channels || channels.length === 0) return;
    const { error } = await this._supabase
      .from('notification_channels')
      .insert(channels.map(ch => ({
        notification_id: notificationId,
        channel: ch,
        status: 'pending',
      })));
    if (error) throw error;
  }
}

export class EmailChannelService {
  constructor() {
    this._transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send({ to, subject, html, attachments }) {
    const info = await this._transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Sistema'}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      attachments: attachments || [],
    });
    return { messageId: info.messageId, accepted: info.accepted };
  }

  async sendInvoiceEmail(invoiceData) {
    const html = `...`; // Template resolved dynamically
    return this.send({
      to: invoiceData.clientEmail,
      subject: `Factura ${invoiceData.invoiceNumber} - ${process.env.EMAIL_FROM_NAME}`,
      html,
    });
  }
}

export class WhatsAppChannelService {
  constructor() {
    this._apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this._phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this._apiToken = process.env.WHATSAPP_API_TOKEN;
  }

  async send({ to, message, type }) {
    let payload;
    if (type === 'template') {
      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: message,
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: message },
      };
    }

    const response = await axios.post(
      `${this._apiUrl}/${this._phoneNumberId}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${this._apiToken}`, 'Content-Type': 'application/json' } }
    );

    return { messageId: response.data.messages?.[0]?.id };
  }

  async sendOrderNotification({ to, orderNumber, status, total }) {
    const statusMessages = {
      confirmed: `✅ *Pedido Confirmado* \n\nTu pedido #${orderNumber} ha sido confirmado.\nTotal: $${Number(total).toLocaleString('es-CO')}\nTe notificaremos cuando sea enviado.`,
      shipped: `🚚 *Pedido Enviado* \n\nTu pedido #${orderNumber} ha sido enviado.\nPronto recibirás actualizaciones.`,
      delivered: `📦 *Pedido Entregado* \n\nTu pedido #${orderNumber} ha sido entregado.\n¡Gracias por tu compra!`,
      promotion: `🎉 *Promoción Especial* \n\nAprovecha nuestras ofertas exclusivas.`,
    };

    const message = statusMessages[status] || `Estado de pedido #${orderNumber}: ${status}`;
    return this.send({ to, message, type: 'text' });
  }
}

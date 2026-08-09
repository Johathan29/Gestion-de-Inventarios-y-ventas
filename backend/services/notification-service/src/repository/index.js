// ============================================================
// Supabase Notification Repository + External Channel Services
// ============================================================

import { tenantStorage } from '@erp/shared-kernel';
import { MailtrapClient } from 'mailtrap';
import axios from 'axios';
import { NotificationMapper } from '../mappers/index.js';

export class SupabaseNotificationRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findByUser({ userId, limit = 50, page = 1, offset, unread, search, from_date, to_date, sort = 'recent' }) {
    // Support both legacy offset and new page-based pagination
    const effectiveOffset = offset != null ? offset : (Math.max(1, page) - 1) * limit;

    let query = this._supabase
      .from('user_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Filter: unread only
    if (unread === 'true') query = query.eq('read', false);

    // Search: title or message ilike
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`title.ilike.${term},message.ilike.${term}`);
    }

    // Date range
    if (from_date) query = query.gte('created_at', from_date);
    if (to_date) {
      // Include the whole to_date day by appending 23:59:59
      const endOfDay = to_date.includes('T') ? to_date : `${to_date}T23:59:59`;
      query = query.lte('created_at', endOfDay);
    }

    // Sorting
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'unread_first') {
      query = query.order('read', { ascending: true }).order('created_at', { ascending: false });
    } else {
      // 'recent' (default)
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(effectiveOffset, effectiveOffset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / limit);
    return {
      data: (data || []).map(r => NotificationMapper.toDomain(r)),
      pagination: { total: count, limit, offset: effectiveOffset, page: Math.floor(effectiveOffset / limit) + 1, totalPages },
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
    const token = process.env.MAILTRAP_TOKEN;
    const senderEmail = process.env.MAILTRAP_SENDER_EMAIL || process.env.EMAIL_FROM || 'hello@demomailtrap.co';
    const senderName = process.env.MAILTRAP_SENDER_NAME || process.env.EMAIL_FROM_NAME || 'Sistema de Inventarios';

    this._enabled = !!token;
    this._sender = { email: senderEmail, name: senderName };

    if (this._enabled) {
      this._client = new MailtrapClient({ token });
    } else {
      console.warn('[NotificationService] MAILTRAP_TOKEN no configurado — correos no enviados');
    }
  }

  async send({ to, subject, html, text, category }) {
    if (!this._enabled) {
      console.log(`[NotificationService] Mailtrap deshabilitado. No se envió: "${subject}"`);
      return { messageId: null, accepted: [] };
    }

    const recipients = Array.isArray(to) ? to : [{ email: to }];

    const response = await this._client.send({
      from: this._sender,
      to: recipients,
      subject,
      html: html || undefined,
      text: text || undefined,
      category: category || 'notification',
    });

    const messageId = response?.data?.[0]?.message_id || response?.message_ids?.[0] || response?.id || 'unknown';
    return { messageId, accepted: recipients.map(r => r.email) };
  }

  async sendInvoiceEmail(invoiceData) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Factura ${invoiceData.invoiceNumber}</h2>
        <p>Hola ${invoiceData.clientName},</p>
        <p>Adjunto encontrarás tu factura por valor de <strong>$${Number(invoiceData.total).toLocaleString('es-MX')}</strong>.</p>
        <p>Número de factura: ${invoiceData.invoiceNumber}</p>
        <p>Fecha: ${new Date(invoiceData.date).toLocaleDateString('es-MX')}</p>
        <hr>
        <p>¡Gracias por tu compra!</p>
      </div>
    `;
    return this.send({
      to: invoiceData.clientEmail,
      subject: `Factura ${invoiceData.invoiceNumber} - ${this._sender.name}`,
      html,
      category: 'invoice',
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

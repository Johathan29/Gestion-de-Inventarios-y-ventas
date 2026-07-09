// ============================================================
// Notification Domain — UserNotification, EmailService, WhatsAppService
// ============================================================

import { AggregateRoot } from '@erp/shared-kernel';

export const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error', 'order', 'invoice', 'promotion'];
export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'whatsapp', 'sms', 'push'];

export class UserNotification extends AggregateRoot {
  constructor({ id, userId, type, title, message, data, read, readAt, createdAt, updatedAt }) {
    super(id);
    this._userId = userId;
    this._type = type || 'info';
    this._title = title;
    this._message = message;
    this._data = data || null;
    this._read = read || false;
    this._readAt = readAt || null;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get userId() { return this._userId; }
  get type() { return this._type; }
  get title() { return this._title; }
  get message() { return this._message; }
  get data() { return this._data; }
  get read() { return this._read; }
  get readAt() { return this._readAt; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  markAsRead() {
    this._read = true;
    this._readAt = new Date();
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id, userId: this._userId, type: this._type,
      title: this._title, message: this._message, data: this._data,
      read: this._read, readAt: this._readAt,
      createdAt: this._createdAt, updatedAt: this._updatedAt,
    };
  }
}

export class EmailOptions {
  constructor({ to, subject, html, attachments }) {
    this._to = to;
    this._subject = subject;
    this._html = html;
    this._attachments = attachments || [];
  }

  get to() { return this._to; }
  get subject() { return this._subject; }
  get html() { return this._html; }
  get attachments() { return this._attachments; }
}

export class WhatsAppOptions {
  constructor({ to, message, type }) {
    this._to = to;
    this._message = message;
    this._type = type || 'text';
  }

  get to() { return this._to; }
  get message() { return this._message; }
  get type() { return this._type; }
}

// ============================================================
// Notification Use Cases
// ============================================================

import { UserNotification } from '../domain/index.js';
import {
  NotificationCreatedEvent, NotificationReadEvent, NotificationDeletedEvent,
  EmailSentEvent, WhatsAppSentEvent,
} from '../events/index.js';

export class GetNotificationUseCase {
  constructor({ notifRepo }) {
    this._notifRepo = notifRepo;
  }

  async execute({ id, userId }) {
    const notif = await this._notifRepo.findById(id);
    if (!notif || notif.userId !== userId) throw new Error('NOT_FOUND');
    return notif;
  }
}

export class ListNotificationsUseCase {
  constructor({ notifRepo }) {
    this._notifRepo = notifRepo;
  }

  async execute(query) {
    return this._notifRepo.findByUser(query);
  }
}

export class CreateNotificationUseCase {
  constructor({ notifRepo, eventBus }) {
    this._notifRepo = notifRepo;
    this._eventBus = eventBus;
  }

  async execute(input) {
    const notification = new UserNotification(input);
    const saved = await this._notifRepo.save(notification);

    if (input.channels?.length) {
      await this._notifRepo.saveChannels(saved.id, input.channels);
    }

    await this._eventBus.publish(new NotificationCreatedEvent(saved));
    return saved;
  }
}

export class MarkNotificationReadUseCase {
  constructor({ notifRepo, eventBus }) {
    this._notifRepo = notifRepo;
    this._eventBus = eventBus;
  }

  async execute({ id, userId }) {
    const notif = await this._notifRepo.findById(id);
    if (!notif || notif.userId !== userId) throw new Error('NOT_FOUND');

    notif.markAsRead();
    const saved = await this._notifRepo.update(notif);
    await this._eventBus.publish(new NotificationReadEvent(id, userId));
    return saved;
  }
}

export class MarkAllNotificationsReadUseCase {
  constructor({ notifRepo }) {
    this._notifRepo = notifRepo;
  }

  async execute(userId) {
    await this._notifRepo.markAllAsRead(userId);
  }
}

export class DeleteNotificationUseCase {
  constructor({ notifRepo, eventBus }) {
    this._notifRepo = notifRepo;
    this._eventBus = eventBus;
  }

  async execute({ id, userId }) {
    const notif = await this._notifRepo.findById(id);
    if (!notif || notif.userId !== userId) throw new Error('NOT_FOUND');

    await this._notifRepo.delete(id);
    await this._eventBus.publish(new NotificationDeletedEvent(id));
  }
}

export class SendEmailUseCase {
  constructor({ emailService, notifRepo, eventBus }) {
    this._emailService = emailService;
    this._notifRepo = notifRepo;
    this._eventBus = eventBus;
  }

  async execute(input) {
    const result = await this._emailService.send(input);

    // Log the email
    const notification = new UserNotification({
      userId: 'system',
      type: 'info',
      title: `Email: ${input.subject}`,
      message: `Sent to ${input.to}`,
      data: { messageId: result.messageId, subject: input.subject },
    });
    await this._notifRepo.save(notification);

    await this._eventBus.publish(new EmailSentEvent({ to: input.to, subject: input.subject, messageId: result.messageId }));
    return result;
  }
}

export class SendWhatsAppUseCase {
  constructor({ whatsAppService, notifRepo, eventBus }) {
    this._whatsAppService = whatsAppService;
    this._notifRepo = notifRepo;
    this._eventBus = eventBus;
  }

  async execute(input) {
    const result = await this._whatsAppService.send(input);

    const notification = new UserNotification({
      userId: 'system',
      type: 'info',
      title: `WhatsApp: ${input.type}`,
      message: `Sent to ${input.to}`,
      data: { messageId: result.messageId },
    });
    await this._notifRepo.save(notification);

    await this._eventBus.publish(new WhatsAppSentEvent({ to: input.to, messageId: result.messageId, type: input.type }));
    return result;
  }
}

export class SendOrderNotificationUseCase {
  constructor({ whatsAppService }) {
    this._whatsAppService = whatsAppService;
  }

  async execute(input) {
    return this._whatsAppService.sendOrderNotification(input);
  }
}

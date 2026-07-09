// ============================================================
// Notification Application Service — Façade
// ============================================================

import {
  ListNotificationsUseCase, CreateNotificationUseCase,
  MarkNotificationReadUseCase, MarkAllNotificationsReadUseCase, DeleteNotificationUseCase,
  SendEmailUseCase, SendWhatsAppUseCase, SendOrderNotificationUseCase,
} from '../usecases/index.js';

export class NotificationApplicationService {
  constructor({ notifRepo, emailService, whatsAppService, eventBus }) {
    this._listNotifications = new ListNotificationsUseCase({ notifRepo });
    this._createNotification = new CreateNotificationUseCase({ notifRepo, eventBus });
    this._markRead = new MarkNotificationReadUseCase({ notifRepo, eventBus });
    this._markAllRead = new MarkAllNotificationsReadUseCase({ notifRepo });
    this._deleteNotification = new DeleteNotificationUseCase({ notifRepo, eventBus });
    this._sendEmail = new SendEmailUseCase({ emailService, notifRepo, eventBus });
    this._sendWhatsApp = new SendWhatsAppUseCase({ whatsAppService, notifRepo, eventBus });
    this._sendOrderNotification = new SendOrderNotificationUseCase({ whatsAppService });
  }

  listNotifications(query) { return this._listNotifications.execute(query); }
  createNotification(input) { return this._createNotification.execute(input); }
  markRead(id, userId) { return this._markRead.execute({ id, userId }); }
  markAllRead(userId) { return this._markAllRead.execute(userId); }
  deleteNotification(id, userId) { return this._deleteNotification.execute({ id, userId }); }
  sendEmail(input) { return this._sendEmail.execute(input); }
  sendWhatsApp(input) { return this._sendWhatsApp.execute(input); }
  sendOrderNotification(input) { return this._sendOrderNotification.execute(input); }
}

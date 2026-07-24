// ============================================================
// Notification Controller — Express Routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, validate, asyncHandler } from '@erp/common';
import { ROLES } from '@erp/common';
import {
  CreateNotificationDTO, SendEmailDTO, SendWhatsAppDTO,
  SendOrderNotificationDTO, NotificationQueryDTO,
} from './DTOs/index.js';

export function createNotificationRouter(appService) {
  const router = Router();

  // ==================== USER NOTIFICATIONS ====================

  router.get('/',
    authenticate,
    validate(NotificationQueryDTO, 'query'),
    asyncHandler(async (req, res) => {
      const result = await appService.listNotifications({
        userId: req.user.id,
        ...req.validatedQuery,
      });
      res.json({ success: true, ...result });
    })
  );

  router.get('/:id',
    authenticate,
    asyncHandler(async (req, res) => {
      const notification = await appService.getNotification(req.params.id, req.user.id);
      res.json({ success: true, data: notification });
    })
  );

  router.put('/:id/read',
    authenticate,
    asyncHandler(async (req, res) => {
      await appService.markRead(req.params.id, req.user.id);
      res.json({ success: true, message: 'Notification marked as read' });
    })
  );

  router.put('/read-all',
    authenticate,
    asyncHandler(async (req, res) => {
      await appService.markAllRead(req.user.id);
      res.json({ success: true, message: 'All notifications marked as read' });
    })
  );

  router.delete('/:id',
    authenticate,
    asyncHandler(async (req, res) => {
      await appService.deleteNotification(req.params.id, req.user.id);
      res.json({ success: true, message: 'Notification deleted' });
    })
  );

  router.post('/',
    authenticate,
    authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
    validate(CreateNotificationDTO),
    asyncHandler(async (req, res) => {
      const notification = await appService.createNotification(req.validatedBody);
      res.status(201).json({ success: true, data: notification });
    })
  );

  // ==================== EMAIL ====================

  router.post('/email/send',
    authenticate,
    validate(SendEmailDTO),
    asyncHandler(async (req, res) => {
      const result = await appService.sendEmail(req.validatedBody);
      res.json({ success: true, data: result });
    })
  );

  // ==================== WHATSAPP ====================

  router.post('/whatsapp/send',
    authenticate,
    validate(SendWhatsAppDTO),
    asyncHandler(async (req, res) => {
      const result = await appService.sendWhatsApp(req.validatedBody);
      res.json({ success: true, data: result });
    })
  );

  router.post('/whatsapp/order-notification',
    authenticate,
    validate(SendOrderNotificationDTO),
    asyncHandler(async (req, res) => {
      const result = await appService.sendOrderNotification(req.validatedBody);
      res.json({ success: true, data: result });
    })
  );

  return router;
}

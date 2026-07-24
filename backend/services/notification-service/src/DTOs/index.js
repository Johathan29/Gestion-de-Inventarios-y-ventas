// ============================================================
// Notification DTOs — Zod Validation Schemas
// ============================================================

import { z } from 'zod';
import { uuidSchema } from '@erp/common';

export const CreateNotificationDTO = z.object({
  userId: uuidSchema,
  type: z.enum(['info', 'success', 'warning', 'error', 'order', 'invoice', 'promotion']).optional().default('info'),
  title: z.string().min(1, 'Title required'),
  message: z.string().min(1, 'Message required'),
  data: z.record(z.any()).optional().nullable(),
  channels: z.array(z.string()).optional(),
});

export const SendEmailDTO = z.object({
  to: z.string().email('Valid email required'),
  subject: z.string().min(1, 'Subject required'),
  html: z.string().min(1, 'HTML content required'),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    encoding: z.string().optional(),
  })).optional(),
});

export const SendInvoiceEmailDTO = z.object({
  invoiceId: uuidSchema,
});

export const SendWhatsAppDTO = z.object({
  to: z.string().min(1, 'Recipient required'),
  message: z.string().min(1, 'Message required'),
  type: z.enum(['text', 'template']).optional().default('text'),
});

export const SendOrderNotificationDTO = z.object({
  to: z.string().min(1, 'Recipient required'),
  orderNumber: z.string().min(1),
  status: z.enum(['confirmed', 'shipped', 'delivered', 'promotion']),
  total: z.number().optional(),
  message: z.string().optional(),
});

export const NotificationQueryDTO = z.object({
  limit: z.coerce.number().int().positive().optional().default(50),
  page: z.coerce.number().int().positive().optional().default(1),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  unread: z.enum(['true', 'false']).optional(),
  search: z.string().max(200).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  sort: z.enum(['recent', 'oldest', 'unread_first']).optional().default('recent'),
});

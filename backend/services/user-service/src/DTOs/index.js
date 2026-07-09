// ============================================================
// CRM DTOs — Zod Validation Schemas
// ============================================================

import { z } from 'zod';
import { uuidSchema } from '@erp/common';

export const CreateClientDTO = z.object({
  userId: uuidSchema.optional(),
  name: z.string().min(1, 'Name required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  documentType: z.string().max(20).optional().or(z.literal('')),
  documentNumber: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export const UpdateClientDTO = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  documentType: z.string().max(20).optional().nullable(),
  documentNumber: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const CreateCreditAccountDTO = z.object({
  accountNumber: z.string().min(1, 'Account number required'),
  accountType: z.string().optional().default('credito'),
  creditLimit: z.number().nonnegative().optional().default(0),
});

export const UpdateCreditAccountDTO = z.object({
  accountNumber: z.string().min(1).optional(),
  accountType: z.string().optional(),
  creditLimit: z.number().nonnegative().optional(),
});

export const UpdateNotificationPrefsDTO = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

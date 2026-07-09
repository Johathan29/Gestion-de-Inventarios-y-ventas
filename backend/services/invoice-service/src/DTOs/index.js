// ============================================================
// Billing DTOs — Zod Validation Schemas
// ============================================================

import { z } from 'zod';
import { uuidSchema, paginationSchema } from '@erp/common';

export const GenerateInvoiceDTO = z.object({
  saleId: uuidSchema,
  invoiceType: z.enum(['consumer_final', 'credit_fiscal', 'governmental', 'special', 'export', 'credit_note', 'debit_note']).optional().default('consumer_final'),
  fiscalDocumentTypeId: uuidSchema.optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const InvoiceQueryDTO = paginationSchema.extend({
  status: z.string().optional(),
  saleId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  invoiceType: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const UpdatePaymentStatusDTO = z.object({
  status: z.enum(['issued', 'paid', 'cancelled', 'voided']),
  reason: z.string().max(500).optional(),
});

export const SendEmailDTO = z.object({
  email: z.string().email().optional(),
  message: z.string().max(1000).optional(),
});

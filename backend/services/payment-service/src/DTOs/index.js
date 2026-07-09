// ============================================================
// Payments DTOs — Zod Validation Schemas
// ============================================================

import { z } from 'zod';
import { uuidSchema } from '@erp/common';

export const ProcessPaymentDTO = z.object({
  saleId: uuidSchema,
  invoiceId: uuidSchema.optional(),
  paymentMethodCode: z.string().min(1, 'Payment method required'),
  amount: z.number().positive('Amount must be positive'),
  reference: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
});

export const RefundPaymentDTO = z.object({
  transactionId: uuidSchema,
  reason: z.string().min(1, 'Reason required'),
});

export const OpenCashRegisterDTO = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  openingBalance: z.number().nonnegative().optional().default(0),
  warehouseId: uuidSchema.optional(),
});

export const CloseCashRegisterDTO = z.object({
  finalBalance: z.number().nonnegative(),
  notes: z.string().max(500).optional(),
});

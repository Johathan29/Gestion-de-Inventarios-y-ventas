// ============================================================
// Inventory DTOs — Zod Validation Schemas
// ============================================================

import { z } from 'zod';
import { uuidSchema, paginationSchema } from '@erp/common';

export const StockQueryDTO = paginationSchema.extend({
  warehouse: z.string().optional(),
  search: z.string().optional(),
  categoryId: uuidSchema.optional(),
});

export const CreateEntryDTO = z.object({
  productId: uuidSchema,
  warehouse: z.string().min(1),
  quantity: z.number().positive('Quantity must be positive'),
  unitCost: z.number().nonnegative().optional().default(0),
  notes: z.string().max(500).optional(),
  reference: z.string().max(200).optional(),
});

export const CreateExitDTO = z.object({
  productId: uuidSchema,
  warehouse: z.string().min(1),
  quantity: z.number().positive('Quantity must be positive'),
  notes: z.string().max(500).optional(),
  reference: z.string().max(200).optional(),
});

export const CreateAdjustmentDTO = z.object({
  productId: uuidSchema,
  warehouse: z.string().min(1),
  newQuantity: z.number().nonnegative('New quantity must be non-negative'),
  reason: z.string().max(500).optional(),
});

export const CreateTransferDTO = z.object({
  productId: uuidSchema,
  fromWarehouse: z.string().min(1),
  toWarehouse: z.string().min(1),
  quantity: z.number().positive('Quantity must be positive'),
  notes: z.string().max(500).optional(),
});

export const MovementQueryDTO = paginationSchema.extend({
  type: z.string().optional(),
  productId: uuidSchema.optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const CreateReservationDTO = z.object({
  productId: uuidSchema,
  warehouseId: z.string().min(1),
  quantity: z.number().positive('Quantity must be positive'),
  orderType: z.string().min(1),
  orderId: uuidSchema,
  expiresAt: z.string().optional(),
});

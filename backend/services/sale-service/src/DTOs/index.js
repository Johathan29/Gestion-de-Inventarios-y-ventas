// ============================================================
// Sales DTOs — Zod Validation Schemas
// ============================================================

import { z } from 'zod';
import { uuidSchema, paginationSchema } from '@erp/common';

export const CreateSaleItemDTO = z.object({
  productId: uuidSchema,
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional().default(0),
  variantId: uuidSchema.optional(),
});

export const CreateSaleDTO = z.object({
  clientId: uuidSchema.optional(),
  items: z.array(CreateSaleItemDTO).min(1, 'At least one item required'),
  paymentMethod: z.string().optional().default('cash'),
  notes: z.string().max(1000).optional(),
  shippingAddress: z.string().max(500).optional(),
  discount: z.number().nonnegative().optional().default(0),
  taxRate: z.number().nonnegative().optional().default(0.19),
  source: z.enum(['pos', 'ecommerce']).optional().default('pos'),
});

export const SaleQueryDTO = paginationSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
  payment: z.string().optional(),
  clientId: uuidSchema.optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const AddCartItemDTO = z.object({
  productId: uuidSchema,
  quantity: z.number().positive().optional().default(1),
  variantId: uuidSchema.optional(),
});

export const UpdateCartItemDTO = z.object({
  quantity: z.number().positive('Quantity must be positive'),
});

export const CheckoutDTO = z.object({
  shippingAddress: z.string().max(500).optional(),
  paymentMethod: z.string().optional().default('cash'),
  notes: z.string().max(1000).optional(),
  source: z.enum(['pos', 'ecommerce']).optional().default('ecommerce'),
});

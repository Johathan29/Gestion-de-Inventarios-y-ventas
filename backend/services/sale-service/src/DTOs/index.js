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

// ─── Checkout ──────────────────────────────────────────────
// Seguridad: el backend NUNCA debe recibir ni almacenar CVV / PAN completo.
// El pago se procesa con tokenización vía la pasarela (ver payment-service).
// `.strict()` hace que cualquier campo desconocido (p.ej. `cvv`, `card_number`)
// falle la validación en vez de ser descartado silenciosamente.

export const CheckoutShippingDTO = z.object({
  full_name: z.string().max(150).optional(),
  address: z.string().min(5, 'La dirección de envío es obligatoria'),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
});

export const CheckoutPaymentDTO = z
  .object({
    method: z.enum(['cash', 'card', 'transfer']).optional().default('cash'),
    savedCardId: uuidSchema.optional(),
    token: z.string().max(255).optional(), // token del PSP (idempotente), NUNCA el número/CVV
  })
  .strict();

export const CheckoutDTO = z.object({
  shipping: CheckoutShippingDTO.optional(),
  payment: CheckoutPaymentDTO.optional().default({ method: 'cash' }),
  notes: z.string().max(1000).optional(),
  source: z.enum(['pos', 'ecommerce']).optional().default('ecommerce'),
  // Retro-compatibilidad con clientes antiguos (POS / API anterior)
  shippingAddress: z.string().max(500).optional(),
  paymentMethod: z.string().max(30).optional(),
});

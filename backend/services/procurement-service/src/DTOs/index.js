// ============================================================
// Procurement DTOs — Zod Validation Schemas
// ============================================================

import { z } from 'zod';
import { uuidSchema, paginationSchema } from '@erp/common';

export const CreateSupplierDTO = z.object({
  name: z.string().min(1, 'Supplier name is required').max(200),
  contactName: z.string().max(200).optional().nullable(),
  email: z.string().email().max(150).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  paymentTerms: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const UpdateSupplierDTO = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).optional().nullable(),
  email: z.string().email().max(150).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  paymentTerms: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const SupplierQueryDTO = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.string().optional(),
});

export const CreatePurchaseItemDTO = z.object({
  productId: uuidSchema,
  productName: z.string().max(300).optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  productImage: z.string().max(500).optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
});

export const CreatePurchaseDTO = z.object({
  supplierId: uuidSchema,
  items: z.array(CreatePurchaseItemDTO).min(1, 'At least one item required'),
  notes: z.string().max(1000).optional(),
});

export const UpdatePurchaseStatusDTO = z.object({
  status: z.enum(['pending_approval', 'approved', 'received', 'cancelled']),
});

export const PurchaseQueryDTO = paginationSchema.extend({
  status: z.string().optional(),
  supplierId: uuidSchema.optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

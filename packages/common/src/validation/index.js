// ============================================================
// Zod Validation Schemas
// ============================================================

import { z } from 'zod';
import { ValidationError } from '../errors/index.js';

/**
 * Validate data against a Zod schema and return parsed data
 * @param {z.ZodSchema} schema
 * @param {*} data
 * @returns {*} Parsed and validated data
 * @throws {ValidationError}
 */
export function zodValidate(schema, data) {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const details = err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      throw new ValidationError('Validation failed', { errors: details });
    }
    throw err;
  }
}

/**
 * Create a Zod schema that validates UUID format
 */
export const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Create a Zod schema for pagination query params
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Auth schemas
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  role: z.string().optional(),
});

/**
 * Product schemas
 */
export const createProductSchema = z.object({
  name: z.string().min(2).max(255),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  cost_price: z.number().min(0).optional(),
  category_id: uuidSchema.optional(),
  brand_id: uuidSchema.optional(),
  company_id: uuidSchema.optional(),
  min_stock: z.number().int().min(0).default(0),
  unit: z.string().default('unit'),
  is_catalog_only: z.boolean().default(false),
  available_for_sale: z.boolean().default(true),
  status: z.enum(['draft', 'published', 'hidden', 'discontinued']).default('draft'),
  images: z.array(z.string().url()).default([]),
  tags: z.array(z.string()).default([]),
});

export const updateProductSchema = createProductSchema.partial();

/**
 * Sale schemas
 */
export const createSaleSchema = z.object({
  client_id: uuidSchema,
  items: z.array(z.object({
    product_id: uuidSchema,
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    discount: z.number().min(0).default(0),
  })).min(1, 'At least one item is required'),
  payment_method: z.string().default('cash'),
  shipping_address: z.string().optional(),
  shipping_method: z.string().optional(),
  notes: z.string().optional(),
  coupon_code: z.string().optional(),
});

/**
 * Purchase schemas
 */
export const createPurchaseSchema = z.object({
  supplier_id: uuidSchema,
  items: z.array(z.object({
    product_id: uuidSchema,
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
  })).min(1),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  payment_terms: z.string().optional(),
});

/**
 * Inventory schemas
 */
export const inventoryMovementSchema = z.object({
  product_id: uuidSchema,
  type: z.enum([
    'entry_purchase', 'exit_sale', 'adjustment_plus', 'adjustment_minus',
    'transfer', 'return_client', 'return_supplier', 'initial_balance',
  ]),
  quantity: z.number().int().positive(),
  warehouse_id: uuidSchema.optional(),
  warehouse_from_id: uuidSchema.optional(),
  warehouse_to_id: uuidSchema.optional(),
  reason: z.string().optional(),
  reference_type: z.string().optional(),
  reference_id: uuidSchema.optional(),
  lot: z.string().optional(),
  unit_cost: z.number().min(0).optional(),
});

/**
 * User schemas
 */
export const createUserSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().default(true),
  company_id: uuidSchema.optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
});

export default {
  zodValidate, uuidSchema, paginationSchema,
  loginSchema, registerSchema,
  createProductSchema, updateProductSchema,
  createSaleSchema, createPurchaseSchema,
  inventoryMovementSchema, createUserSchema, updateUserSchema,
};

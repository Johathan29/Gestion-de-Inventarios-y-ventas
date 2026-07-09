// ============================================================
// Catalog DTOs
// ============================================================

import { z } from 'zod';

export const CreateProductDTO = z.object({
  name: z.string().min(2).max(255),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive('Precio debe ser positivo'),
  costPrice: z.number().min(0).optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  minStock: z.number().int().min(0).default(0),
  unit: z.string().default('unit'),
  images: z.array(z.string().url()).default([]),
  tags: z.array(z.string()).default([]),
  isCatalogOnly: z.boolean().default(false),
  availableForSale: z.boolean().default(true),
  status: z.enum(['draft', 'published', 'hidden', 'discontinued']).default('draft'),
});

export const UpdateProductDTO = CreateProductDTO.partial();

export const ProductQueryDTO = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  status: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  availableForSale: z.coerce.boolean().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const CreateCategoryDTO = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
});

export const CreateBrandDTO = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export default { CreateProductDTO, UpdateProductDTO, ProductQueryDTO, CreateCategoryDTO, CreateBrandDTO };

// ============================================================
// Reporting DTOs — Zod Validation Schemas
// ============================================================

import { z } from 'zod';

export const SalesReportQueryDTO = z.object({
  start_date: z.string().min(1, 'start_date required'),
  end_date: z.string().min(1, 'end_date required'),
  group_by: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export const InventoryReportQueryDTO = z.object({
  min_stock: z.coerce.number().int().nonnegative().optional(),
  max_stock: z.coerce.number().int().nonnegative().optional(),
  category: z.string().uuid().optional(),
});

export const TopProductsQueryDTO = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.coerce.number().int().positive().optional().default(10),
});

export const ClientReportQueryDTO = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

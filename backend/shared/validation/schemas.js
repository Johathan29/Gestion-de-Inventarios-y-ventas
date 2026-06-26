const { z } = require('zod');

/**
 * Schemas de validación reutilizables
 */

// IDs
const uuidSchema = z.string().uuid('ID inválido');
const positiveIntSchema = z.number().int().positive('Debe ser un número entero positivo');

// Texto
const stringSchema = z.string().min(1, 'Requerido').max(255);
const emailSchema = z.string().email('Email inválido').max(255);
const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .max(100, 'Máximo 100 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial');
const phoneSchema = z.string().regex(/^\+?[\d\s\-()]{7,20}$/, 'Teléfono inválido');

// Números
const priceSchema = z.number().positive('El precio debe ser positivo').multipleOf(0.01);
const quantitySchema = z.number().int().nonnegative('La cantidad no puede ser negativa');
const percentageSchema = z.number().min(0).max(100);

// Fechas
const dateSchema = z.string().datetime('Fecha inválida');
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)');

// Dirección
const addressSchema = z.object({
  street: stringSchema,
  city: stringSchema,
  state: stringSchema,
  zipCode: z.string().max(20),
  country: stringSchema,
  details: z.string().max(500).optional()
});

// Paginación
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// SKU
const skuSchema = z.string().regex(/^[A-Z0-9\-]{8,20}$/, 'SKU inválido');

// Código de barras
const barcodeSchema = z.string().regex(/^\d{8,14}$/, 'Código de barras inválido');

module.exports = {
  uuidSchema,
  positiveIntSchema,
  stringSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  priceSchema,
  quantitySchema,
  percentageSchema,
  dateSchema,
  isoDateSchema,
  addressSchema,
  paginationSchema,
  skuSchema,
  barcodeSchema
};

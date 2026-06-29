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

// Auth
const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Contraseña requerida')
  })
});

const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: stringSchema,
    phone: phoneSchema.optional()
  })
});

// Producto
const createProductSchema = z.object({
  body: z.object({
    name: stringSchema,
    description: z.string().max(5000).optional().default(''),
    sku: skuSchema,
    barcode: barcodeSchema.optional(),
    price: priceSchema,
    cost_price: priceSchema.optional(),
    category_id: uuidSchema,
    brand: z.string().max(100).optional().default(''),
    unit: z.string().max(50).optional().default('unidad'),
    min_stock: quantitySchema.optional().default(0),
    max_stock: quantitySchema.optional().default(999999),
    images: z.array(z.string().url()).optional().default([]),
    featured: z.boolean().optional().default(false),
    status: z.enum(['active', 'inactive', 'draft']).optional().default('active')
  })
});

const updateProductSchema = z.object({
  body: z.object({
    name: stringSchema.optional(),
    description: z.string().max(5000).optional(),
    sku: skuSchema.optional(),
    barcode: barcodeSchema.optional(),
    price: priceSchema.optional(),
    cost_price: priceSchema.optional(),
    category_id: uuidSchema.optional(),
    brand: z.string().max(100).optional(),
    unit: z.string().max(50).optional(),
    min_stock: quantitySchema.optional(),
    max_stock: quantitySchema.optional(),
    images: z.array(z.string().url()).optional(),
    featured: z.boolean().optional(),
    status: z.enum(['active', 'inactive', 'draft']).optional()
  })
});

// Usuario
const createUserSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: stringSchema,
    phone: phoneSchema.optional(),
    role: z.string().optional().default('employee'),
    status: z.enum(['active', 'inactive']).optional().default('active')
  })
});

const updateUserSchema = z.object({
  body: z.object({
    name: stringSchema.optional(),
    phone: phoneSchema.optional(),
    role: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional()
  })
});

// Venta
const createSaleSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      product_id: uuidSchema,
      quantity: positiveIntSchema,
      price: priceSchema
    })).min(1, 'Debe tener al menos un producto'),
    payment_method: z.enum(['cash', 'credit_card', 'debit_card', 'transfer', 'nequi', 'daviplata']).optional().default('cash'),
    notes: z.string().max(1000).optional(),
    discount: z.number().min(0).max(100).optional().default(0)
  })
});

// Carrito
const addCartItemSchema = z.object({
  body: z.object({
    product_id: uuidSchema,
    quantity: positiveIntSchema
  })
});

const updateCartItemSchema = z.object({
  body: z.object({
    quantity: positiveIntSchema
  })
});

// Checkout
const checkoutSchema = z.object({
  body: z.object({
    shipping_address: addressSchema.optional(),
    payment_method: z.enum(['cash', 'credit_card', 'debit_card', 'transfer', 'nequi', 'daviplata']).optional().default('cash'),
    notes: z.string().max(1000).optional()
  })
});

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
  barcodeSchema,
  loginSchema,
  registerSchema,
  createProductSchema,
  updateProductSchema,
  createUserSchema,
  updateUserSchema,
  createSaleSchema,
  addCartItemSchema,
  updateCartItemSchema,
  checkoutSchema
};

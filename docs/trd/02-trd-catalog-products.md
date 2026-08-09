# TRD: Catalog & Products Service

## 1. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (3000)                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│            catalog-service (3003) [UNIFIED]              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Product  │ │ Category │ │  Brand   │ │  Search   │  │
│  │ Handler  │ │ Handler  │ │ Handler  │ │  Indexer  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │             │            │              │        │
│  ┌────▼─────────────▼────────────▼──────────────▼─────┐ │
│  │              Application Services                   │ │
│  │  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ ProductService│  │ ImageService │                │ │
│  │  │ (CRUD, search)│  │ (Supabase    │                │ │
│  │  │               │  │  Storage)    │                │ │
│  │  └──────────────┘  └──────────────┘                │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                  │
│  ┌────────────────────▼───────────────────────────────┐ │
│  │              Infrastructure Layer                   │ │
│  │  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │ PostgreSQL   │  │ Supabase     │                │ │
│  │  │ (products,   │  │ Storage      │                │ │
│  │  │  categories) │  │ (images)     │                │ │
│  │  └──────────────┘  └──────────────┘                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2. Database Schema

```sql
-- products (consolidada)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 19.00,
  category_id UUID REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 999999,
  unit VARCHAR(50) DEFAULT 'UN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, sku),
  UNIQUE(company_id, barcode)
);

-- categories (con jerarquía)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

-- brands
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

-- product_images
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3. Search Implementation

```typescript
// Full-text search con PostgreSQL
async function searchProducts(query: string, filters: ProductFilters) {
  const sql = `
    SELECT p.*, 
      ts_rank(
        to_tsvector('spanish', p.name || ' ' || COALESCE(p.description, '')),
        plainto_tsquery('spanish', $1)
      ) AS rank
    FROM products p
    WHERE p.company_id = $2
      AND p.deleted_at IS NULL
      AND p.is_active = true
      AND (
        to_tsvector('spanish', p.name || ' ' || COALESCE(p.description, ''))
        @@ plainto_tsquery('spanish', $1)
        OR p.sku ILIKE '%' || $1 || '%'
        OR p.barcode = $1
      )
      ${filters.category_id ? 'AND p.category_id = $3' : ''}
      ${filters.min_price ? 'AND p.price >= $4' : ''}
      ${filters.max_price ? 'AND p.price <= $5' : ''}
    ORDER BY rank DESC, p.name ASC
    LIMIT $6 OFFSET $7
  `;
  // ...
}
```

## 4. Image Upload

```typescript
// Upload a Supabase Storage
async function uploadProductImage(productId: string, file: File) {
  const ext = file.originalname.split('.').pop();
  const path = `products/${productId}/${uuid()}.${ext}`;
  
  const { data, error } = await supabase.storage
    .from('products')
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
  
  if (error) throw new StorageError(error.message);
  
  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(path);
  
  return await db.query(`
    INSERT INTO product_images (product_id, url, alt_text, is_primary)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [productId, publicUrl, file.originalname, false]);
}
```

## 5. Event Consumers

| Event | Action |
|-------|--------|
| (outgoing) ProductCreated | Inventory-service initializes stock |
| (outgoing) PriceChanged | Audit-service logs change |
| (incoming) StockUpdated | Cache invalidation |

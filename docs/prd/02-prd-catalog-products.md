# PRD: Catalog & Products Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Catalog & Products |
| **Versión** | 2.0 |
| **Estado** | Propuesta |

## 2. Problem Statement

El sistema tiene **dos servicios de catálogo/productos** superpuestos:
- `product-service` (puerto 3003) — CommonJS
- `catalog-service` (puerto 3003) — ESM, conflicto de puerto
- `catalog-api` (puerto 3013) — duplicado adicional

Esto causa inconsistencias en datos, APIs duplicadas y confusión en el frontend.

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Unificar en un solo servicio de catálogo | Servicio único puerto 3003 |
| G2 | Productos con variantes, imágenes y atributos | CRUD completo soportado |
| G3 | Multi-empresa: productos por company_id | Datos aislados por empresa |
| G4 | Búsqueda full-text | Resultados < 100ms para 10K productos |
| G5 | Imágenes via Supabase Storage | Upload/delete de imágenes funcional |

## 4. User Stories

### US-1: CRUD de Productos
**Como** admin/employee,
**Quiero** crear, editar y eliminar productos,
**Para** mantener el catálogo actualizado.

**Criterios de aceptación:**
- [ ] Campos: name, description, sku, barcode, price, cost, category_id, brand_id
- [ ] SKU único por empresa
- [ ] Barcode único (si se proporciona)
- [ ] Al eliminar: soft delete si tiene ventas asociadas
- [ ] Al eliminar: hard delete si no tiene movimiento

### US-2: Gestión de Variantes
**Como** admin,
**Quiero** crear variantes de un producto (talla, color, etc.),
**Para** manejar productos con múltiples opciones.

**Criterios de aceptación:**
- [ ] Cada variante tiene SKU, precio, stock propio
- [ ] Atributos flexibles (JSONB)
- [ ] Imágenes por variante

### US-3: Categorías y Marcas
**Como** admin,
**Quiero** gestionar categorías (árbol) y marcas,
**Para** organizar el catálogo.

**Criterios de aceptación:**
- [ ] Categorías con jerarquía (parent_id)
- [ ] Slug automático
- [ ] Imagen por categoría
- [ ] Marcas con logo y descripción

### US-4: Búsqueda y Filtros
**Como** employee/cliente,
**Quiero** buscar productos por nombre, SKU, categoría, precio,
**Para** encontrar rápidamente lo que necesito.

**Criterios de aceptación:**
- [ ] Búsqueda full-text por nombre y descripción
- [ ] Filtros: categoría, marca, precio rango, estado
- [ ] Paginación con cursor
- [ ] Resultados ordenables por precio, nombre, fecha

### US-5: Imágenes de Productos
**Como** admin,
**Quiero** subir/gestionar imágenes de productos,
**Para** que el catálogo sea visual.

**Criterios de aceptación:**
- [ ] Upload a Supabase Storage bucket `products`
- [ ] Múltiples imágenes por producto/variante
- [ ] Imagen principal (is_primary)
- [ ] Optimización automática de tamaño
- [ ] Delete cascade al eliminar producto

## 5. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/products` | Listar (paginated, filtered) | Auth |
| GET | `/api/v1/products/:id` | Detalle | Auth |
| POST | `/api/v1/products` | Crear | Admin/Employee |
| PUT | `/api/v1/products/:id` | Actualizar | Admin/Employee |
| DELETE | `/api/v1/products/:id` | Eliminar | Admin |
| GET | `/api/v1/products/search` | Búsqueda full-text | Auth |
| POST | `/api/v1/products/:id/images` | Subir imagen | Admin/Employee |
| DELETE | `/api/v1/products/:id/images/:imgId` | Eliminar imagen | Admin/Employee |
| GET | `/api/v1/categories` | Árbol de categorías | Auth |
| POST | `/api/v1/categories` | Crear categoría | Admin |
| PUT | `/api/v1/categories/:id` | Actualizar | Admin |
| DELETE | `/api/v1/categories/:id` | Eliminar | Admin |
| GET | `/api/v1/brands` | Listar marcas | Auth |
| POST | `/api/v1/brands` | Crear marca | Admin |
| GET | `/api/v1/products/:id/variants` | Listar variantes | Auth |
| POST | `/api/v1/products/:id/variants` | Crear variante | Admin/Employee |

## 6. Domain Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `ProductCreated` | POST /products | inventory-service (iniciar stock), ecommerce (indexar) |
| `ProductUpdated` | PUT /products/:id | ecommerce (re-indexar) |
| `ProductDeactivated` | DELETE /products/:id | ecommerce (remover), cart-service (limpiar) |
| `CategoryCreated` | POST /categories | ecommerce (re-indexar) |
| `PriceChanged` | PUT /products/:id (price) | audit-service |

## 7. Data Model

```sql
-- products (consolidada de ambas versiones)
-- categories (con parent_id para jerarquía)
-- brands
-- product_variants
-- product_images (NUEVA, separada de product->image_url)
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

## 8. Integration Points

- **Frontend**: Catálogo admin + tienda pública
- **Ecommerce-service**: Indexación para búsqueda pública
- **Inventory-service**: Stock por producto
- **Sale-service**: Precios al crear ventas
- **Supabase Storage**: bucket `products` para imágenes

## 9. Non-Functional Requirements

| Requisito | Target |
|-----------|--------|
| Latencia búsqueda | < 100ms p95 |
| Throughput catálogo | 200 req/s |
| Imágenes | Máx 5MB, formatos: jpg, png, webp |
| Caché | TTL 5min para catálogo público |

# PRD: Ecommerce & Online Store Bounded Context

## 1. Overview

| Campo | Valor |
|-------|-------|
| **Bounded Context** | Ecommerce & Online Store |
| **Versión** | 2.0 |
| **Estado** | Propuesta |

## 2. Problem Statement

El `ecommerce-service` (3012) se superpone con `catalog-api` (3013) y `cart-service`/`checkout-service` (ghost services). La tienda online necesita:
- Catálogo público con búsqueda
- Carrito persistente
- Checkout con reserva de stock
- Promociones y cupones
- Reviews de clientes

## 3. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Tienda pública con catálogo searchable | Búsqueda < 100ms |
| G2 | Carrito persistente por usuario | Sync entre dispositivos |
| G3 | Checkout con reserva atómica | Stock reservado durante pago |
| G4 | Sistema de promociones y cupones | Descuentos automáticos |
| G5 | Reviews verificadas | Solo compradores reales |

## 4. API Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/store/products` | Catálogo público | No |
| GET | `/api/v1/store/products/:slug` | Detalle producto | No |
| GET | `/api/v1/store/search` | Búsqueda pública | No |
| GET | `/api/v1/store/categories` | Categorías públicas | No |
| POST | `/api/v1/store/cart` | Agregar al carrito | Client |
| GET | `/api/v1/store/cart` | Ver carrito | Client |
| PUT | `/api/v1/store/cart/:itemId` | Actualizar cantidad | Client |
| DELETE | `/api/v1/store/cart/:itemId` | Quitar del carrito | Client |
| POST | `/api/v1/store/checkout` | Iniciar checkout | Client |
| POST | `/api/v1/store/checkout/confirm` | Confirmar compra | Client |
| POST | `/api/v1/store/promotions/apply` | Aplicar cupón | Client |
| GET | `/api/v1/store/promotions/active` | Promociones vigentes | No |
| POST | `/api/v1/store/reviews` | Crear review | Client |
| GET | `/api/v1/store/reviews/:productId` | Reviews de producto | No |
| GET | `/api/v1/store/banners` | Banners para carousel | No |

## 5. User Stories

### US-1: Explorar Tienda
**Como** visitante,
**Quiero** navegar el catálogo y buscar productos,
**Para** encontrar lo que necesito comprar.

### US-2: Carrito de Compras
**Como** cliente registrado,
**Quiero** agregar productos al carrito y modificar cantidades,
**Para** preparar mi compra.

### US-3: Checkout
**Como** cliente,
**Quiero** completar mi compra con dirección y pago,
**Para** recibir mi pedido.

**Criterios de aceptación:**
- [ ] Reserva de stock al iniciar checkout
- [ ] Timer de 15min para completar (libera stock)
- [ ] Cálculo de impuestos backend
- [ ] Múltiples métodos de pago
- [ ] Confirmación inmediata

### US-4: Aplicar Cupones
**Como** cliente,
**Quiero** aplicar un cupón de descuento,
**Para** obtener un precio mejor.

## 6. State Machine: Checkout

```
┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│ cart     │ →  │checkout  │ →  │ payment   │ →  │confirmed │
└──────────┘    └──────────┘    └───────────┘    └──────────┘
                    │               │
                    ▼               ▼
               ┌─────────┐    ┌──────────┐
               │ expired │    │ failed   │
               └─────────┘    └──────────┘
```

## 7. Data Model

```sql
-- carts + cart_items
-- checkout_sessions
-- promotions (NUEVA consolidada)
-- coupons + coupon_usage
-- product_reviews
-- wishlist_items
-- ecommerce_settings (singleton)
-- ecommerce_banners
-- hero_slides
-- floating_banners
```

## 8. Business Rules

1. **Stock se reserva** al iniciar checkout, se libera si expira
2. **Cupón una vez por usuario** (verificar en coupon_usage)
3. **Solo compradores reales** pueden dejar reviews
4. **Una review por producto por usuario**
5. **Promociones se aplican al momento de la compra** (no se guardan en carrito)

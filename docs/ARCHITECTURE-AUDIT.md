---
title: Architecture Audit — GIICV ERP
description: Auditoría completa de arquitectura del sistema GIICV. Incluye duplicaciones, violaciones, tablas faltantes, y plan de migración.
date: 2026-07-24
---

# 🔍 Architecture Audit — GIICV ERP

> **Fecha de auditoría:** 2026-07-24
> **Alcance:** Backend (21 servicios), Frontend (Vue 3), Base de Datos (30+ migraciones)

---

## 1. RESUMEN EJECUTIVO

| Categoría | Encontrado | Severidad |
|-----------|-----------|-----------|
| Servicios duplicados (legacy + hexagonal) | 4 pares | 🔴 CRITICAL |
| Tablas duplicadas o muertas | 5 tablas | 🔴 CRITICAL |
| Servicios ghost (sin código) | 2 servicios | 🔴 CRITICAL |
| Tablas core faltantes (ledger, outbox, etc.) | 6+ tablas | 🔴 CRITICAL |
| Políticas RLS ausentes | ~30 tablas sin RLS | 🔴 CRITICAL |
| Seguridad frontend (tarjetas en localStorage) | 1 vulnerabilidad | 🔴 CRITICAL |
| Frontend calcula precios/totales | Múltiples vistas | 🔴 CRITICAL |
| Cálculo de impuestos inconsistente | 3 implementaciones | 🔴 CRITICAL |
| Endpoints duplicados | 3+ rutas | 🟠 HIGH |
| Shared libraries duplicadas | 2 stacks | 🟠 HIGH |
| Store patterns inconsistentes | 7 stores vs llamadas directas | 🟡 MEDIUM |
| Componentes duplicados | 2 navbars, 2 profiles, 3 notificaciones | 🟡 MEDIUM |
| Archivos muertos (`.jpe`, directorios vacíos) | 3+ archivos | 🟢 LOW |

**Total de problemas encontrados: 45+**

---

## 2. BACKEND — DUPLICACIONES CRÍTICAS

### 2.1 Servicios Completamente Duplicados

| Legacy (CommonJS, flat) | Hexagonal (ESM, DDD) | Puerto | Tablas compartidas | Decisión |
|------------------------|----------------------|--------|-------------------|----------|
| `auth-service` (3001) | `identity-service` (3001) | AMBOS 3001 ⚠️ | `users`, `roles`, `audit_logs` | **Eliminar auth-service** |
| `product-service` (3003) | `catalog-service` (3003) | AMBOS 3003 ⚠️ | `products`, `categories`, `brands` | **Eliminar product-service** |
| `purchase-service` (3006) | `procurement-service` (3006) | AMBOS 3006 ⚠️ | `purchases`, `suppliers`, `inventory`, `inventory_movements` | **Eliminar purchase-service** |
| `category-service` (3004) | `catalog-service` | — | `categories` | **Eliminar category-service** (integrar en catalog) |

### 2.2 Conflictos de Configuración

| Tabla | Servicio A | Servicio B | Problema |
|-------|-----------|-----------|----------|
| `ecommerce_settings` | `config-service` | `ecommerce-service` | Ambos CRUD la misma tabla singleton |
| `hero_slides` | `config-service` | `ecommerce-service` | Ambos leen/escriben |
| `floating_banners` | `config-service` | `ecommerce-service` | Ambos CRUD |
| `tax_rates` | `config-service` | `ecommerce-service` | Ambos CRUD |
| `whatsapp_config` | `config-service` | `ecommerce-service` | Ambos CRUD |

**Decisión:** `ecommerce-service` es el owner de contenido. `config-service` maneja solo `system_config`.

### 2.3 Servicios Ghost

| Servicio | Estado | Resolución |
|----------|--------|-----------|
| `cart-service` | `package.json` existe, NO hay `src/` | **Eliminar directorio** |
| `checkout-service` | `package.json` existe, NO hay `src/` | **Eliminar directorio** |

### 2.4 Notificaciones Escritas desde Múltiples Servicios

```
sale-service     → INSERT notifications (bypass notification-service)
product-service  → INSERT notifications (bypass notification-service)
ecommerce-service→ INSERT notifications (bypass notification-service)
```

**Decisión:** TODAS las notificaciones deben pasar por `notification-service` vía domain events.

### 2.5 Shared Libraries Duplicadas

| | `@inventory/shared` (Legacy) | `@erp/common` + `@erp/shared-kernel` (Modern) |
|---|---|---|
| Module System | CommonJS | ESM |
| DB Client | Singleton | Factory |
| Auth | JWT verify inline | Middleware compartido |
| Event Bus | ❌ None | ✅ `@erp/event-bus` |

**Decisión:** Migrar todos los servicios legacy a usar `@erp/common` + `@erp/shared-kernel`. Eliminar `@inventory/shared`.

---

## 3. BASE DE DATOS — DUPLICACIONES Y PROBLEMAS

### 3.1 Tablas Duplicadas

| Tabla A | Tabla B | Problema | Resolución |
|---------|---------|----------|-----------|
| `cart` (001, legacy) | `carts` + `cart_items` (020, moderno) | Legacy sin RLS, moderno con RLS | **DROP `cart`** |
| `hero_settings` (003) | `hero_slides` (006) | Singleton vs Carousel, coexisten | **Mantener `hero_slides`**, DROP `hero_settings` |
| `system_config` (001) | `system_configurations` (026) | Dos tablas de configuración | **DROP `system_configurations`** |
| `coupons` v1 (014) | `coupons` v2 (026) | v2 nunca se creó (IF NOT EXISTS) | **ALTER `coupons`** para agregar columnas faltantes |
| `cash_registers` | `cash_registers` × 3 migraciones | 014, 026, 900 crean la misma tabla | **Unificar esquema** |

### 3.2 Tablas Faltantes (Core Architecture)

| Tabla | Prioridad | Propósito |
|-------|-----------|-----------|
| `inventory_ledger` | 🔴 CRITICAL | Ledger inmutable de movimientos de inventario |
| `inventory_balances` | 🔴 CRITICAL | Vista materializada de saldos |
| `inventory_reservations` | ✅ Ya existe (026) | Reservar stock por venta |
| `transactional_outbox` | 🟡 HIGH | Eventos confiables post-transacción |
| `branches` | 🟡 HIGH | Sucursales/empresas (multi-tenant) |
| `purchase_statuses` | 🟢 LOW | Lookup de estados de compra (ya tienen CHECK) |
| `sale_statuses` | 🟢 LOW | Lookup de estados de venta (ya tienen CHECK) |
| `debit_notes` | 🟢 LOW | Notas de débito |

### 3.3 Constraints Faltantes

| Tabla | Columna | Constraint Faltante |
|-------|---------|-------------------|
| `clients` | `email` | UNIQUE |
| `clients` | `document_number` | UNIQUE |
| `products` | `barcode` | UNIQUE |
| `inventory` | `warehouse` (VARCHAR) | FK → `warehouses.code` |
| `inventory_movements` | `warehouse` (VARCHAR) | FK → `warehouses.code` |

### 3.4 Índices Faltantes

| Tabla | Columna(s) | Query Pattern |
|-------|-----------|---------------|
| `sale_items` | `created_at` | Reportes por fecha |
| `invoices` | `created_at` | Reportes por fecha |
| `purchases` | `created_at` | Reportes por fecha |
| `inventory` | `warehouse_id` | Multi-warehouse |
| `products` | `name` (GIN) | Búsqueda ILIKE |
| `audit_logs` | `(entity, entity_id)` | Historial por entidad |
| `user_notifications` | `(user_id, read)` | Notificaciones pendientes |
| `inventory_lots` | `expiry_date` | Lotes por vencer |
| `cash_register_sessions` | `(register_id, status)` | Turno activo por caja |

---

## 4. FRONTEND — VULNERABILIDADES DE SEGURIDAD

### 🔴 CRITICAL

| # | Vulnerabilidad | Archivo | Descripción |
|---|---------------|---------|-------------|
| S1 | **Datos de tarjeta en localStorage** | `CardsView.vue`, `CheckoutView.vue` | Almacena número, CVV, expiración en texto plano |
| S2 | **Passwords hardcodeados** | `utils/testData.js` | `admin123` etc. empaquetados en bundle |
| S3 | **Auth solo frontend** | `router/index.js` | Roles verificados solo en cliente — bypassable |
| S4 | **Precios/totales calculados en frontend** | `cart.js`, `POSView.vue`, `CheckoutView.vue` | Atacante puede manipular antes de enviar |
| S5 | **Tax hardcodeado 19%** | `cart.js`, `InvoiceDetailView` | 3 implementaciones diferentes de cálculo de impuesto |

### 🟠 HIGH

| # | Vulnerabilidad | Descripción |
|---|---------------|-------------|
| S6 | `configAPI` vs `systemConfigAPI` | Dos módulos API para configuración |
| S7 | `useEcommerceConfig` vs `useEcommerceSettings` | Dos composables, doble-fetch |
| S8 | 3 implementaciones de notificaciones | `useNotifications`, `AppNavBar`, `Navbar` |
| S9 | 2 ProfileViews con diseño diferente | Admin (Aurora) vs Cliente (white) |

---

## 5. DECISIONES DE ARQUITECTURA

### 5.1 Backend → Modular Monolith (Fase 1)

Eliminar servicios legacy, mantener solo hexagonal:

```
MANTENER (ESM, Hexagonal):
✅ identity-service    → port 3001
✅ user-service        → port 3002
✅ catalog-service     → port 3003
✅ inventory-service   → port 3005
✅ procurement-service → port 3006
✅ sale-service        → port 3007
✅ report-service      → port 3008
✅ invoice-service     → port 3009
✅ notification-service→ port 3016
✅ audit-service       → port 3017 (migrar a ESM)
✅ config-service      → port 3018 (solo system_config)
✅ payment-service     → port 3019
✅ email-service       → port 3014 (migrar a ESM)
✅ whatsapp-service    → port 3015 (migrar a ESM)

ELIMINAR (Legacy, CommonJS):
🗑️ auth-service      → DUPLICADO de identity-service
🗑️ product-service   → DUPLICADO de catalog-service
🗑️ category-service  → DUPLICADO de catalog-service
🗑️ purchase-service  → DUPLICADO de procurement-service
🗑️ ecommerce-service → Migrar rutas a catalog-service o crear ecommerce-hexagonal
🗑️ cart-service      → Ghost (sin código)
🗑️ checkout-service  → Ghost (sin código)
```

### 5.2 Ownership de Tablas

| Tabla | Owner Service | Lectores Permitidos |
|-------|--------------|-------------------|
| `users` | identity-service | report-service (read) |
| `clients` | user-service | ecommerce-service (read) |
| `products` | catalog-service | sale-service (read), report-service (read) |
| `categories` | catalog-service | — |
| `brands` | catalog-service | — |
| `inventory` | inventory-service | — |
| `inventory_movements` | inventory-service | report-service (read) |
| `inventory_ledger` | inventory-service | report-service (read) |
| `inventory_reservations` | inventory-service | sale-service (via events) |
| `warehouses` | inventory-service | — |
| `purchases` | procurement-service | — |
| `suppliers` | procurement-service | — |
| `sales` | sale-service | invoice-service (read), report-service (read) |
| `invoices` | invoice-service | — |
| `notifications` | notification-service | — |

### 5.3 Base de Datos → Ledger Pattern

```
ANTES:
  UPDATE inventory SET stock = stock + 10;  ← PELIGROSO

DESPUÉS:
  INSERT INTO inventory_ledger (movement_type, quantity, ...)
  → TRIGGER actualiza inventory_balances
  → TRIGGER crea audit_log
```

---

## 6. PLAN DE MIGRACIÓN

### Migraciones a Crear

| # | Archivo | Contenido |
|---|---------|-----------|
| 027 | `027_schema_fixes.sql` | DROP tablas muertas, ALTER coupons, constraints, índices |
| 028 | `028_inventory_ledger.sql` | Tablas core: inventory_ledger, inventory_balances (materialized view), transactional_outbox, branches |
| 029 | `029_rls_policies.sql` | RLS para TODAS las tablas (completo) |
| 030 | `030_triggers_functions.sql` | Triggers: ledger sync, balance update, audit logging, state machines |

### Orden de Ejecución

```
1. Ejecutar 027 (fixes) primero — sin breaking changes
2. Ejecutar 028 (new tables) — additive only
3. Ejecutar 029 (RLS) — seguridad
4. Ejecutar 030 (triggers) — automatización
5. Verificar: NO hay ROLLBACK necesario si se ejecutan en orden
```

---

## 7. VERIFICACIÓN POST-MIGRACIÓN

```sql
-- Verificar que no hay tablas duplicadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cart', 'hero_settings', 'system_configurations');

-- Verificar RLS activado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;

-- Verificar inventory_ledger existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'inventory_ledger'
);

-- Verificar foreign keys
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
```

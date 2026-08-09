# PHASE 1 — MULTI-TENANCY (P0)

> Documento de ingeniería 02 · Estado: 🔴 **HALLAZGO CRÍTICO — EN AUDITORÍA (2026-08-09)**

## ⚠️ AUDITORÍA REAL (2026-08-09) — El aislamiento NO está operativo

Verificado con `scripts/test-database/schema-contract.mjs` (Management API v1) + pruebas de URL PostgREST:

### Hallazgo A — El proxy de tenant es un NO-OP (bug `typeof prop`)
En `packages/shared-kernel/src/index.js` (ESM) y `backend/shared/middleware/tenantClient.js` (CJS), `_wrapBuilder` tiene:

```js
get(target, prop, receiver) {
  if (typeof prop !== 'function') {   // ← BUG: prop es el NOMBRE (string)
    return Reflect.get(target, prop, receiver);
  }
```

`typeof prop` con `prop='select'` es siempre `'string'` → el Proxy **NUNCA envuelve** → `company_id` **NUNCA se inyecta** en SELECT/UPDATE/DELETE/INSERT. Prueba concluyente:

```
TEST 1 (cadena directa con .eq('company_id',...)): URL incluye company_id → 42703
TEST 2 (proxy createTenantClient):                URL NO incluye company_id → 200
```

### Hallazgo B — El núcleo ERP NO tiene company_id
`schema-contract.mjs` (125 tablas): **70 TENANT** (con company_id) · **49 UNCLASSIFIED** · 6 GLOBAL-OK · **95 violaciones**.
Tablas núcleo SIN `company_id` (imposibles de aislar): `products, categories, product_variants, inventory, inventory_movements, inventory_reservations, sale_items, purchases, purchase_items, suppliers, tax_rates, warehouses, goods_receipts, goods_receipt_items, cart_items, offers, product_reviews, user_notifications, ...` (la migración 031 solo cubrió el "Grupo B").

### Hallazgo C — Service role → RLS bypass
Todos los servicios usan `SUPABASE_SERVICE_ROLE_KEY` → RLS NO aplica → la ÚNICA defensa era el proxy (roto) o filtros explícitos `.eq('company_id', ...)`.

### Servicios con filtro EXPLÍCITO (aíslan de verdad)
cms, form-builder, site-builder, integration, platform-admin, user-service/CRM, invoice (parcial), payment (parcial).

### Servicios que dependían del proxy roto (NO aíslan)
product, category, ecommerce, email, audit, auth, sale, inventory, procurement, purchase, report, notification, config, catalog, identity, checkout, cart.

## 1. Plan de corrección (en orden)

### 1.1 Fix del proxy (bug `typeof prop`) + registro de tablas
- Corregir a `typeof target[prop] !== 'function'`.
- Inyectar `company_id` SOLO en tablas que tienen la columna (registro JSON generado por schema-contract.mjs → `packages/shared-kernel/src/tenant-tables.json` + copia en `backend/shared`).
- Falta de registro → comportamiento actual (sin filtro) + warning.

### 1.2 Migración 061 — company_id al núcleo ERP
Expand → Backfill (DEFAULT company) → Validate → Enforce (NOT NULL) → Contract (índice + RLS).
Tablas target (de UNCLASSIFIED del reporte): products, categories, product_variants, inventory, inventory_movements, inventory_reservations, sale_items, purchases, purchase_items, suppliers, tax_rates, warehouses, goods_receipts, goods_receipt_items, cart_items, offers, product_reviews, user_notifications, payment_methods?(no, global), company_activity_log? (ya tiene)...

### 1.3 Regenerar registro + reiniciar servicios + suite 54/54
- `node scripts/test-database/schema-contract.mjs --json` → regenera tenant-tables.json.
- Reiniciar servicios backend (el fix no se propaga con nodemon de src/).
- Suite 54/54 → debe seguir PASS (los datos de la suite pertenecen al DEFAULT company).

### 1.4 Brechas menores pendientes
- `brands.company_id` dudoso (verificar).
- `cms_templates/themes` global vs tenant (política).
- Mass-assignment: `sanitizeTenantPayload` en controllers.

## 2. Criterios de aceptación

```text
- URL de productos con proxy → incluye company_id (tablas con columna)
- 0 consultas a tablas tenant sin filtro (grep + test)
- suite 54/54 PASS tras reinicio
- schema-contract.mjs: 0 tablas UNCLASSIFIED sin justificación
```

## 3. Estado previo (documentación original, antes de la auditoría)
- ✅ 031 multi-tenant: company_id en "Grupo B" (users, checkout, ecommerce_settings, coupons, etc.).
- ✅ tenantStorage (AsyncLocalStorage) + tenantContext middleware.
- ⚠️ El resto de la implementación descrita abajo era teórica (proxy roto).
> Objetivo: garantizar que TODO registro TENANT responda "¿a qué company pertenece?" y que el aislamiento exista en TODAS las capas.

## 1. Estado actual (verificado)

- ✅ Migración 031: company_id en 18+ tablas + RLS + índices.
- ✅ `tenantStorage` (AsyncLocalStorage) + `createTenantClient` (Proxy auto-filtra por company_id) en shared-kernel y @inventory/shared.
- ✅ `tenantContext` middleware: `req.companyId` desde JWT → x-company-id → DEFAULT_COMPANY_ID.
- ✅ JWT incluye `company_id`, `company_name`.
- ✅ Frontend envía `x-company-id`.
- ✅ 58+ tablas con company_id (ver TENANT-OWNERSHIP-MATRIX).

## 2. Brechas identificadas

| # | Brecha | Evidencia |
|---|---|---|
| 1.1 | No existe test de contrato DB que VERIFIQUE company_id/RLS por tabla | — |
| 1.2 | `brands` — company_id dudoso (audit inconsistente) | DATABASE-AUDIT §2 |
| 1.3 | Backfill: registros creados antes de 031 pudieron quedar NULL | hotfix_002 |
| 1.4 | No hay orphan_records_report | — |
| 1.5 | `tenantClient` es la ÚNICA frontera (service role key bypasa RLS) — requiere defensa en profundidad en repos | memoria 031 |
| 1.6 | MASS ASSIGNMENT: revisar que ningún controller acepte `company_id`/`created_by` del body | auditoría pendiente |

## 3. Plan de ejecución

### 3.1 Crear `scripts/test-database/schema-contract.mjs` (P0 tool)
Valida contra la BD real:
- [ ] Toda tabla TENANT (lista de la matriz) tiene `company_id` column.
- [ ] company_id es `uuid NOT NULL` (o NULL solo si backfill pendiente documentado).
- [ ] Existe índice en `(company_id)` o compuesto.
- [ ] RLS habilitada (`relrowsecurity = true`).
- [ ] Existe policy `USING (company_id = get_current_company_id())` o equivalente.
- [ ] Reporte JSON: `schema-contract-report.json`.

### 3.2 Auditoría de masa de datos
- [ ] Query: `SELECT count(*) FROM products WHERE company_id IS NULL` (y todas las tablas TENANT).
- [ ] Si hay NULLs → `orphan_records_report.json` → backfill con regla `created_by → users.company_id` o dejar marcado.

### 3.3 Endurecer repos (defensa en profundidad)
- [ ] Inventariar repositories con `insert(req.body)` directo (patrón mass assignment).
- [ ] Crear helper `sanitizeTenantPayload(body, { allowed })` en shared-kernel que elimine `company_id`, `created_by`, `owner_id`, `is_admin`, `role`.
- [ ] Aplicar en los use cases críticos: product, sale, purchase, customer, cms, forms.

### 3.4 Verificación brands + hotfix
- [ ] `SELECT column_name FROM information_schema.columns WHERE table_name='brands'` → si falta company_id, migración 061.

### 3.5 Migración 061 (si aplica)
- [ ] `061_tenant_contract_enforcement.sql`: NOT NULL donde haya NULLs backfilleados + índices faltantes + reporte de huérfanos.

## 4. Criterios de aceptación

```text
- schema-contract.mjs: 0 tablas TENANT sin company_id
- 0 registros NULL en company_id (o reporte de huérfanos emitido)
- 0 controllers que acepten company_id del body (grep auditado)
- 54/54 E2E siguen PASS
```

## 5. Tests

- `node scripts/test-database/schema-contract.mjs` → PASS
- `node scripts/test-flows/run-full-suite.mjs` → 54/54

## 6. Riesgos

- Alto: cambiar NOT NULL sin backfill rompe inserts. → Expand → Backfill → Validate → Enforce → Contract.
- Medio: crearTenantClient podría filtrar tablas GLOBAL por error → la EXEMPT_TABLES debe incluir la matriz completa.

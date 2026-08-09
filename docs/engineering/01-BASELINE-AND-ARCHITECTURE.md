# PHASE 0 — BASELINE Y ARQUITECTURA

> Documento de ingeniería 01 · Estado: ✅ COMPLETADO

## 1. Baseline E2E (obligatorio antes de tocar nada)

Ejecutado: `2026-08-09` · `node scripts/test-flows/run-full-suite.mjs`

```text
TOTAL: 54 PASS / 0 FAIL (54)
Reporte: scripts/test-flows/report-baseline-hardening.json
```

### Resultado por flujo

| Flujo | Resultado |
|---|---|
| Setup, Proveedores, Productos, Inventario, Compras | ✅ 1/1, 2/2, 2/2, 3/3, 2/2 |
| Ventas POS, Ventas Ecommerce, Usuarios, Facturación, Reportes | ✅ 3/3, 2/2, 3/3, 4/4, 5/5 |
| Ecommerce, CRM, Dashboard, CMS, Forms, Site Builder, Integraciones, Cierre | ✅ 6/6, 4/4, 2/2, 4/4, 3/3, 3/3, 3/3, 2/2 |

**Este baseline es protegido.** Ninguna fase posterior puede romperlo.

## 2. Inventario de arquitectura real (no asumido)

### Servicios (26) y puertos

| Puerto | Servicio | Contexto acotado |
|---|---|---|
| 3000 | api-gateway | Edge: auth, rate-limit, circuit breaker, correlación |
| 3001 | auth-service | Login/register/refresh (legacy CJS) |
| 3002 | user-service / identity-service | Usuarios, clientes, CRM (hexagonal) |
| 3003 | catalog-service | Productos/categorías/marcas (hexagonal) |
| 3005 | inventory-service | Stock, movimientos, kardex (hexagonal) |
| 3006 | procurement-service | Compras/proveedores (hexagonal) |
| 3007 | sale-service | Ventas/cart/checkout (hexagonal + RPC atómico) |
| 3008 | report-service | Dashboard/reportes |
| 3009 | invoice-service | Facturas/PDF |
| 3012 | ecommerce-service | Storefront público |
| 3016 | notification-service | Notificaciones in-app + email |
| 3019 | payment-service | Transacciones de pago (mock gateway) |
| 3020 | platform-admin-service | SaaS admin |
| 3021 | cms-service | Páginas/secciones/versiones |
| 3022 | form-builder-service | Formularios/submissions |
| 3023 | site-builder-service | Temas/menús/header/footer |
| 3024 | integration-service | Webhooks/automations |

### Paquetes compartidos

- `packages/shared-kernel` — tenantStorage (AsyncLocalStorage), createTenantClient, Domain primitives, eventos
- `packages/common` — AppError, middleware (authenticate, validate), roles/permisos
- `packages/event-bus` — RabbitMQ + InMemory + OutboxRelay

### Base de datos (Supabase/PostgreSQL)

- ~65 tablas · 58 con `company_id` · 7 globales/referencia (roles, system_config, client_notification_preferences, payment_methods, fiscal_document_types, currencies, audit_field_changes)
- RLS: ~200+ políticas · Helper functions: get_current_user_id, get_current_company_id, get_current_user_role, is_platform_admin, is_company_admin
- Migraciones: 001→060 + hotfixes (031 multi-tenant, 039 RLS storefront, 049 RPC outbox, 055 outbox/payment core, 056 fix automation uuid, 057/058 service_role→platform_admin)
- Patrones: inventory_ledger append-only, FIFO layers, transactional_outbox, payment_transactions.idempotency_key, cms_page_versions

## 3. Estado por área (evaluación honesta)

| Área | Estado | Evidencia |
|---|---|---|
| Multi-tenancy | 🟢 Implementado (031) + tenantStorage + createTenantClient | Memoria repo `multi-tenant-implementation` |
| RLS | 🟢 Extensa (200+) — falta auditoría formal por tabla | Migraciones 029/039/048 |
| RBAC | 🟡 Roles + permisos JSONB; falta matriz formal y enforcement granular | 041_rbac_granular_permissions |
| IDOR | 🔴 Sin suite de pruebas | — |
| Concurrencia inventario | 🟡 Reservas existen (026), falta test de carrera | 026 enterprise audit |
| Idempotencia | 🟡 payment_transactions.idempotency_key + outbox; falta checkout idempotente | 055 |
| Pagos | 🟡 Gateway mock + estados; falta máquina de estados formal | payment-service |
| Facturación | 🟡 invoice_items NO existe — items viven en sale_items (riesgo fiscal) | memoria fase2 |
| Webhooks | 🟡 Existen (046); falta firma/SSRF/retries/dead-letter | 046 |
| Observabilidad | 🟡 correlationId + logger estructurado + health; falta request_id/trace_id estandarizado | shared/middleware |
| Audit | 🟢 audit_logs + audit-service | — |
| SaaS plans | 🟢 plans/subscriptions/features (042/050/051) | — |
| Load testing / DR | 🔴 No demostrado | — |

## 4. Decisiones de arquitectura confirmadas

1. **`inventory` es la única fuente de stock** — nunca leer `products.stock` (no existe).
2. **`service_role` ≠ `platform_admin`** — la service key es infraestructura; las RPC la mapean a platform_admin SOLO para funciones administrativas internas (057/058). Nunca exponer la key al frontend.
3. **`req.companyId` se deriva del JWT/membership** — nunca de `req.body.company_id` del cliente.
4. **sp_create_sale es la ruta atómica** de creación de venta (outbox + triggers de stock).
5. **Los triggers de stock son el único propietario del decremento** — el código de aplicación no decrementa.

## 5. Métricas objetivo (SLOs tentativos, a ajustar con load test)

| Métrica | Objetivo |
|---|---|
| API p95 | < 500 ms |
| Error rate API | < 1% |
| Catálogo p95 | < 300 ms |
| Stock nunca negativo | 0 eventos |
| Cross-tenant reads | 0 |

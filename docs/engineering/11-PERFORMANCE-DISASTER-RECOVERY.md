# PHASE 10 — PERFORMANCE + DISASTER RECOVERY (P3)

> Documento de ingeniería 11 · Estado: ⬜ PENDIENTE
> Regla: optimizar SOLO después de medir. No introducir materialized views/cache sin medición previa.

## 1. Estado actual

- ✅ Paginación server-side en listas críticas (sales, invoices, inventory, purchases, users, audit).
- ✅ 30+ índices compuestos (040), índices outbox (049), idempotency parcial (055).
- ✅ `mv_company_stats` (040) + `inventory_balances` MV.
- ✅ Redis rate limiting con fallback a memoria.
- ⚠️ Rendimiento analizado en `docs/rendimiento-analisis.mdx` (15 problemas; algunos corregidos).

## 2. Plan

### 2.1 Medición primero (k6 o script simple)
- Escenarios: 10/50/100/500/1000 usuarios en: catalog, products, search, cart, checkout, dashboard, reports, CRM, CMS.
- Métricas: p50/p95/p99, throughput, error rate, CPU, memory, DB connections, Redis/queue latency.

### 2.2 Índices faltantes (del análisis P10)
- `sales.created_at`, `sale_items.sale_id`, `inventory_movements(product_id, created_at)`, etc. — verificar con `pg_stat_user_indexes` antes.

### 2.3 Cache (solo si la medición lo justifica)
- Claves SIEMPRE con tenant: `dashboard:{company_id}`, `catalog:{company_id}:{locale}`.
- Nunca cachear sin company_id en la clave.

### 2.4 Disaster Recovery
- `docs/production/DISASTER-RECOVERY.md`: backup/restore, RPO/RTO.
- Prueba real: backup → delete entorno test → restore → verify.
- Un backup no es válido hasta probar restore.

### 2.5 Migration policy
- `docs/database/MIGRATION-POLICY.md` (creado): idempotente, auditable, backward compatible, testado.
- Cada migración prueba: fresh DB, existing DB, upgrade, rollback, integridad.

## 3. Criterios de aceptación

```text
- reporte de load test con p95 documentado y SLOs ajustados a datos reales
- restore probado
- 0 índices duplicados/ausentes en rutas críticas
- 54/54 E2E PASS
```

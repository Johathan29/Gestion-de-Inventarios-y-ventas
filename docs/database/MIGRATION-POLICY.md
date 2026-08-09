# 🗄️ MIGRATION POLICY

> Política obligatoria para TODAS las migraciones de base de datos del proyecto.

## Reglas (idempotente, auditable, backward compatible, testada, documentada)

1. **Idempotente**: `IF NOT EXISTS` / `CREATE OR REPLACE` / guards. Puede ejecutarse 2 veces sin error.
2. **Backward compatible**: nunca DROP de columnas/tablas que servicios vivos usen en una sola etapa.
3. **Estrategia Expand → Backfill → Validate → Enforce → Contract** para cambios de schema grandes:
   - **Expand**: añadir columna NULL / tabla nueva.
   - **Backfill**: poblar datos (regla clara; si es ambiguo → `orphan_records_report.json`, NO asumir).
   - **Validate**: `0 registros NULL` / conteos.
   - **Enforce**: `NOT NULL` + FK + CHECK.
   - **Contract**: índices + RLS + políticas.
4. **Naming**: `NNN_descripcion_breve.sql` (NNN = siguiente número, ej: 061).
5. **Header obligatorio** en el archivo:
   ```sql
   -- MIGRATION 061: descripción
   -- Riesgos: ...
   -- Rollback: ...
   -- Validación: ...
   ```
6. **Test obligatorio**: fresh DB + existing DB + upgrade + integridad (contar registros antes/después).
7. **Aplicación**: `scripts/apply-migration-v1.ps1 -Migration "<archivo>.sql"` (Management API v1).
   - Leer SQL con `[System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)` (PS 5.1 corrompe acentos).
8. **Checkpoint**: después de aplicar → `node scripts/test-database/schema-contract.mjs` + suite E2E.
9. **Nunca**:
   - `DROP COLUMN` sin estrategia multi-etapa.
   - `ALTER TABLE ... SET NOT NULL` sin backfill validado.
   - Añadir `company_id` sin índice.
   - Crear tabla tenant sin RLS.

## Registro de migraciones (resumen histórico)

| Rango | Contenido |
|---|---|
| 001-013 | Schema inicial + ecommerce |
| 014 | ERP enhancements (warehouses, companies, fiscal) |
| 015-025 | Variants, carts, triggers fix |
| 026-032 | Enterprise audit, ledger, RLS, multi-tenant, standard schema |
| 033-040 | Aurora platform (CMS, forms, themes, media, RLS storefront) |
| 041-048 | RBAC, SaaS plans, widgets, CRM, multi-currency, webhooks, notifications |
| 049 | Platform admin + RPC sale outbox |
| 050-051 | SaaS core + seeds |
| 052-054 | Site/form builder, CMS components, auto-deactivate stock |
| 055-056 | Outbox/payment core tables + fix automation uuid |
| 057-060 | service_role→platform_admin, fix get_all_companies |
| 061+ | ⬜ Fase 1: tenant contract enforcement · Fase 5: idempotency_keys · Fase 7: invoice_items · Fase 8: webhook_dead_letters |

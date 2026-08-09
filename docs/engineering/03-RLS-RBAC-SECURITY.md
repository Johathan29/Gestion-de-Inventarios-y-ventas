# PHASE 2 — RLS + RBAC (P0)

> Documento de ingeniería 03 · Estado: ⬜ PENDIENTE

## 1. Estado actual

- ✅ RLS extensa (~200+ políticas) en migraciones 029/039/048.
- ✅ Helper functions: `get_current_user_id()`, `get_current_company_id()`, `get_current_user_role()`, `is_platform_admin()`, `is_company_admin()`.
- ✅ `roles` con permisos JSONB por módulo (041_rbac_granular_permissions).
- ✅ 057/058: service_role → platform_admin para RPC internas (separación conceptual service_role vs platform_admin).
- ✅ Middleware `hasPermission` con flattenPermissions.
- ✅ Rate limiting: login (5 intentos→15min lockout), global, auth, api, tenant (`t:company_id`).

## 2. Brechas

| # | Brecha |
|---|---|
| 2.1 | No existe matriz RBAC formal documentada por permiso → crear `docs/security/RBAC-MATRIX.md` |
| 2.2 | No hay auditoría formal por tabla de las 4 operaciones (SELECT/INSERT/UPDATE/DELETE) |
| 2.3 | No existe test que verifique prohibición de mass-assignment de company_id/role/is_admin |
| 2.4 | `get_current_user_role()` mapea service_role → platform_admin en TODAS las funciones (ampliar solo donde aplique) |
| 2.5 | Frontend decide visibilidad por permisos (correcto UX) pero el enforcement debe verificarse en cada endpoint |

## 3. Plan

### 3.1 RBAC-MATRIX.md
- Roles reales del proyecto (roles table): admin, cajero/cashier, supervisor, cliente, etc. → mapear permisos reales del JSONB de la migración 041.
- Lista de permisos: product.*, inventory.*, sale.*, invoice.*, customer.*, crm.*, cms.*, integration.*, audit.*, ecommerce.*, platform.*

### 3.2 Script de auditoría RLS (`scripts/test-database/schema-contract.mjs` ampliado)
- Por cada tabla TENANT: 4 políticas mínimas (SELECT/INSERT/UPDATE/DELETE) o política única que cubra las 4.
- Verificar `relrowsecurity = true`.
- Reporte JSON de tablas con políticas faltantes.

### 3.3 Mass-assignment grep audit
- `grep -rn "req.body" backend/services/*/src/controllers` → detectar `insert(req.body)` / `update(req.body)` sin sanitize.
- Aplicar `sanitizeTenantPayload`.

### 3.4 Verificar enforcement por endpoint (muestreo)
- `POST /api/v1/products` con `{ company_id: <otra> }` en body → debe IGNORARSE (usar req.companyId).

## 4. Criterios de aceptación

```text
- RBAC-MATRIX.md publicado con permisos reales
- 100% tablas TENANT con RLS + policies verificadas por script
- 0 endpoints que confíen en company_id del body
- 54/54 E2E PASS
```

## 5. Documentos relacionados
- `docs/security/RBAC-MATRIX.md` · `docs/security/RLS-AUDIT.md` (generar desde script) · `docs/security/SECURITY-MODEL.md` (ya existe)

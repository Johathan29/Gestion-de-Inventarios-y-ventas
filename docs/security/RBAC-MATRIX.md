# 🔐 RBAC MATRIX — Permisos reales del proyecto

> Fuente: migración `041_rbac_granular_permissions.sql` + `backend/shared/types/roles.js` + `packages/common/src/types/index.js`.
> Fase: 2 · P0 · Verificar contra BD antes de confiar (los permisos viven en `roles.permissions` JSONB).

## Roles del sistema

| Rol | role_type | Descripción |
|---|---|---|
| admin | platform/company | Admin empresa + admin plataforma (id=1) |
| supervisor | company | Jerarquía 70 |
| cajero / cashier | company | POS |
| cliente | company | Cliente ecommerce |
| (service_role) | infra | Key de servicio — mapeado a platform_admin SOLO en RPC internas (057/058) |

## Permisos por módulo (formato JSONB real)

| Módulo | Permisos típicos |
|---|---|
| products | create, read, update, delete |
| categories | create, read, update, delete |
| inventory | read, adjust, transfer |
| sales | create, read, update, delete, cancel |
| purchases | create, read, update |
| invoices | create, read, update, delete, mark_paid |
| customers/clients | create, read, update, delete |
| crm | create, read, update, delete, move, convert |
| cms | create, read, update, delete, publish |
| forms | create, read, update, delete, publish |
| integrations | create, read, update, delete, execute |
| ecommerce | manage, read |
| audit | read |
| reports | read, export |
| users | create, read, update, delete |
| platform | access |

> ⚠️ El JSONB real de `roles` es la fuente de verdad — este documento es la matriz DERIVADA.
> Script: `SELECT name, jsonb_object_keys(permissions) AS module, permissions->name FROM roles;`

## Matriz de ejemplo (a completar con datos reales)

| Permission | Owner | Admin | Supervisor | Cajero | Cliente |
|---|---|---|---|---|---|
| product.read | ✅ | ✅ | ✅ | ✅ | — |
| product.create | ✅ | ✅ | ✅ | — | — |
| product.delete | ✅ | ✅ | — | — | — |
| inventory.adjust | ✅ | ✅ | ✅ | — | — |
| sale.create | ✅ | ✅ | ✅ | ✅ | — |
| sale.cancel | ✅ | ✅ | — | — | — |
| invoice.issue | ✅ | ✅ | ✅ | ✅ | — |
| customer.update | ✅ | ✅ | ✅ | — | — |
| crm.lead.convert | ✅ | ✅ | ✅ | — | — |
| cms.page.publish | ✅ | ✅ | — | — | — |
| integration.webhook.create | ✅ | ✅ | — | — | — |
| platform.access | ✅ (admin plataforma) | — | — | — | — |

## Reglas de enforcement

1. **Frontend**: esconde botones (UX) — NUNCA es autoridad de seguridad.
2. **Backend**: `hasPermission('product:create')` en cada ruta crítica.
3. **Database**: RLS por `get_current_company_id()` + rol.
4. **JWT**: `permissions` aplanado por `flattenPermissions()`.
5. **Mass-assignment**: `role`, `is_admin`, `permissions`, `company_id` NUNCA del body — siempre del contexto.

## Verificación

- [ ] Script: dump de `roles.permissions` real y comparar con esta matriz.
- [ ] Grep: rutas sin `hasPermission` en módulos críticos.
- [ ] Test: usuario cajero intenta `POST /cms/pages` → 403.

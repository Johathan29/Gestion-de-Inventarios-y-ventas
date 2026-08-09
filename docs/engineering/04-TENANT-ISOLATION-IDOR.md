# PHASE 3 — TENANT ISOLATION + IDOR (P0)

> Documento de ingeniería 04 · Estado: ⬜ PENDIENTE
> Objetivo: probar que Tenant B JAMÁS puede leer/escribir/borrar datos de Tenant A, ni por ID directo (IDOR).

## 1. Estado actual

- Multi-tenancy implementada (031) + tenantClient (Proxy con `.eq('company_id', ...)`).
- RLS por `get_current_company_id()`.
- NO existe suite de aislamiento → esta fase la crea.

## 2. Plan de implementación

### 2.1 Crear `scripts/test-security/test-idor.mjs`
Flujo:
1. Login admin (Tenant A = DEFAULT 0000...01).
2. Crear con A: product, customer, sale, invoice, inventory, lead, cms_page, form, webhook, automation → guardar IDs.
3. **Crear/obtener Tenant B**: (a) si existe empresa B en BD usar su company_id; (b) si no, crear empresa vía platform-admin API + usuario admin B.
4. Login como admin B.
5. Intentar desde B: `GET /api/v1/products/:idA`, `GET /sales/:idA`, `GET /invoices/:idA`, `GET /crm/leads/:idA`, `GET /cms/pages/:idA`, `GET /forms/:idA`, `GET /webhooks/:idA`, `PUT /products/:idA`, `DELETE /leads/:idA`, etc.
6. Esperado: `403` o `404`. NUNCA `200`. Escrituras: `403`/`404`. NUNCA éxito.
7. Reporte: `scripts/test-security/report-idor.json`.

### 2.2 Crear `scripts/test-security/run-tenant-isolation.mjs`
- Recorre TODAS las entidades de la matriz (products, categories, variants, inventory, purchases, sales, customers, invoices, reports, crm, cms, forms, themes, menus, webhooks, automations, dashboard).
- Para cada una: A crea → B intenta GET por ID → assert no-200.
- Métricas finales: `0 cross-tenant reads / writes / deletes`.

### 2.3 Ajustes de código que el test pueda revelar
- Endpoints que filtran por `id` sin verificar ownership → añadir `tenantStorage`/`req.companyId` en repository.
- Endpoints que reciben `company_id` del query → ignorar.

## 3. Criterios de aceptación

```text
- test-idor.mjs: 0 accesos 200 cross-tenant
- run-tenant-isolation.mjs: 0 cross-tenant reads/writes/deletes
- 54/54 E2E PASS
```

## 4. Riesgos
- Alto: si un endpoint legacy no usa tenantClient, el test lo expondrá → fix por endpoint (no global).
- Medio: crear empresa B en la BD real contamina datos → usar company de prueba y limpiar al final.

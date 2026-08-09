# ============================================================================
# GUÍA DE INTEGRACIÓN MULTI-TENANT
# ============================================================================
# Fecha: 2026-07-24
# Propósito: Documentar cómo integrar multi-tenancy en cada servicio
# ============================================================================

## 📋 RESUMEN EJECUTIVO

El sistema multi-tenant requiere **4 capas** de integración:

| Capa | Archivo | Estado |
|------|---------|--------|
| **1. SQL/Migración** | `031_multitenant_architecture.sql` | ✅ CREADO |
| **2. Middleware** | `backend/shared/middleware/tenant.js` | ✅ CREADO |
| **3. JWT (Auth)** | `auth-service/controllers` + `identity-service/usecases` | ✅ ACTUALIZADO |
| **4. Client Supabase** | `backend/shared/middleware/tenantClient.js` | ✅ CREADO |

---

## 🔧 CÓMO USAR EN CADA SERVICIO

### Patrón Básico — Cada controller

```javascript
// ANTES (sin multi-tenant):
const { getSupabaseClient } = require('@inventory/shared');
const supabase = getSupabaseClient();

const getProducts = async (req, res) => {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active');
  res.json(data);
};

// DESPUÉS (con multi-tenant):
const { createTenantClient } = require('@inventory/shared');

const getProducts = async (req, res) => {
  const tenantDb = createTenantClient(req);  // ← Solo esta línea cambia
  const { data } = await tenantDb
    .from('products')                        // ← company_id se inyecta automático
    .select('*')                             // ← .eq('company_id', req.companyId)
    .eq('status', 'active');
  res.json(data);
};
```

### Para INSERT/UPDATE — company_id se inyecta automáticamente:

```javascript
// El createTenantClient inyecta company_id en el body
const tenantDb = createTenantClient(req);
await tenantDb.from('products').insert({
  name: 'Nuevo Producto',
  price: 100
  // company_id se agrega automáticamente desde el JWT
});
```

### Para queries admin (todas las empresas):

```javascript
// Si necesitas ver TODOS los datos (solo admin):
const { getSupabaseClient } = require('@inventory/shared');
const supabase = getSupabaseClient();
// Usar supabase directamente, sin createTenantClient
const { data } = await supabase.from('products').select('*');
```

---

## 📁 ARCHIVOS CREADOS/MODIFICADOS

### 1. `backend/shared/middleware/tenant.js` — Middleware de contexto
- `tenantContext(req, res, next)` — Extrae company_id del JWT
- `withTenant(req, res, next)` — Middleware ligero
- `tenantQuery(supabase, req, table)` — Helper de query
- `verifyOwnership(supabase, req, table, id)` — Verifica pertenencia
- `injectCompanyId(req, res, next)` — Inyecta en body POST/PUT

### 2. `backend/shared/middleware/tenantClient.js` — Cliente Supabase filtrado
- `createTenantClient(req)` — Proxy que filtra automáticamente por company_id
- Exenta tablas: `users`, `roles`, `companies`, `audit_logs`

### 3. `backend/shared/middleware/auth.js` — Actualizado
- JWT claims ahora incluyen: `companyId`, `companyName`
- `req.user.companyId` se establece automáticamente

### 4. `backend/shared/index.js` — Exports actualizados
- Ahora exporta: `tenantContext`, `withTenant`, `tenantQuery`, etc.

### 5. `backend/services/auth-service/src/controllers/auth.controller.js` — JWT actualizado
- `generateAccessToken()` incluye `company_id` y `company_name` en el payload

### 6. `backend/services/identity-service/src/usecases/index.js` — JWT actualizado
- `RefreshTokenUseCase` ahora preserva `companyId` al refrescar

### 7. `database/migrations/031_multitenant_architecture.sql` — Migración SQL
- Agrega `company_id` a `users` + 18 tablas más
- Backfill de datos existentes
- RLS policies
- Índices
- Triggers automáticos

---

## 🔄 FLUJO COMPLETO

```
1. Login → auth-service genera JWT con company_id
   ↓
2. Request → auth middleware decodifica JWT → req.user.companyId
   ↓
3. tenantContext → req.companyId = req.user.companyId
   ↓
4. Controller → createTenantClient(req) → Proxy que filtra por company_id
   ↓
5. Supabase Query → SELECT * FROM products WHERE company_id = ?
   ↓
6. RLS Policy → auth.company_id() = company_id (doble protección)
```

---

## 🗄️ INSTRUCCIONES DE MIGRACIÓN SQL

### Paso 1: Ejecutar la migración 031
```sql
-- En Supabase SQL Editor:
-- Pegar contenido de database/migrations/031_multitenant_architecture.sql
-- Ejecutar en orden (BEGIN/COMMIT transacción completa)
```

### Paso 2: Verificar que TODAS las tablas tienen company_id
```sql
-- Query de verificación (incluida al final de la migración)
SELECT t.table_name,
  CASE WHEN c.column_name IS NOT NULL THEN '✅' ELSE '❌' END as has_company_id
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON t.table_name = c.table_name AND c.column_name = 'company_id'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
```

---

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **Tabla `users`**: Ahora tiene `company_id`. Un admin puede crear usuarios para cualquier empresa.
2. **Tabla `companies`**: Es la tabla central de tenants. Ya existe por migraciones anteriores.
3. **DEFAULT company_id**: `'00000000-0000-0000-0000-000000000001'` (Empresa Default)
4. **RLS Doble protección**: El middleware filtra en Node.js, RLS filtra en PostgreSQL.
5. **Tablas exentas**: `users`, `roles`, `companies`, `audit_logs` no se filtran por tenant (son tablas de sistema).
6. **JWT Issuer**: Todos los tokens usan `issuer: 'inventory-system'`
7. **Backward Compatible**: Si un JWT no tiene `company_id`, se usa el default.

---

## 🧪 TESTING

### Test 1: Login retorna company_id en JWT
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"password123"}'
# → Verificar que accessToken contiene company_id
```

### Test 2: Request filtra por empresa
```bash
curl -X GET http://localhost:3007/api/sales \
  -H "Authorization: Bearer <token_con_company_id>"
# → Solo retorna ventas de esa empresa
```

### Test 3: Cross-tenant isolation
```bash
# Con token de empresa A, intentar leer datos de empresa B
curl -X GET http://localhost:3007/api/sales/<id_empresa_B> \
  -H "Authorization: Bearer <token_empresa_A>"
# → Debe retornar 403 o vacío
```

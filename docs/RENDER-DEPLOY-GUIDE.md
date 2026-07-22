# 🚀 Deploy en Render — Guía Completa

## Arquitectura en Producción

```
┌─────────────────────────────────────┐
│         Frontend (Render)           │
│  Nginx → SPA + proxy /api/* →       │
│  ──────────────────────────────►    │
│         Backend (Render)            │
│  ┌──────────┐  ┌──────────────┐    │
│  │ API GW   │→ │ Microservicios│    │
│  │ :3000    │  │ :3001-3019   │    │
│  └──────────┘  └──────────────┘    │
│         ↓                           │
│    Supabase (PostgreSQL)            │
└─────────────────────────────────────┘
```

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `backend/Dockerfile.render` | Dockerfile del backend (todos los microservicios en 1 contenedor) |
| `backend/start-render.sh` | Script de inicio con concurrently |
| `frontend/Dockerfile.render` | Dockerfile del frontend (Vite build + Nginx) |
| `frontend/nginx.render.conf` | Nginx config con proxy `/api` → backend |
| `render.yaml` | Blueprint de Render (deploy automático) |

---

## 1. Deploy del Backend en Render

### Opción A: Usando render.yaml (Blueprint)
1. Sube el código a GitHub
2. En Render Dashboard → **New** → **Blueprint**
3. Conecta tu repo y selecciona `render.yaml`
4. Configura las variables de entorno sensibles (marcadas como `sync: false`)

### Opción B: Deploy manual
1. En Render Dashboard → **New** → **Web Service**
2. Conecta tu repo
3. Configuración:
   - **Dockerfile Path:** `backend/Dockerfile.render`
   - **Docker Context:** `.` (raíz del repo)
   - **Port:** `3000`
   - **Health Check Path:** `/health`

### Variables de Entorno del Backend

#### 🔐 Obligatorias (configurar en dashboard de Render)

```bash
# Supabase
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SUPABASE_DB_HOST=db.TU-PROYECTO.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=tu-password-db

# CORS (URL de tu frontend en Render)
CORS_ORIGIN=https://frontend-inventario.onrender.com
CORS_ORIGIN_ALTERNATE=https://frontend-inventario.onrender.com

# Email (opcional)
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
```

#### ⚡ Ya configuradas en render.yaml (no necesita cambios)

```bash
NODE_ENV=production
GATEWAY_PORT=3000
JWT_SECRET=auto-generado
JWT_REFRESH_SECRET=auto-generado
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=inventory-system
BCRYPT_SALT_ROUNDS=12
ENCRYPTION_KEY=auto-generado
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
CATALOG_SERVICE_PORT=3013
```

---

## 2. Deploy del Frontend en Render

### Opción A: Usando render.yaml
Se configura automáticamente con el blueprint.

### Opción B: Deploy manual
1. En Render Dashboard → **New** → **Web Service**
2. **Dockerfile Path:** `frontend/Dockerfile.render`
3. **Docker Context:** `.` (raíz del repo)
4. **Port:** `80`

### Variables de Entorno del Frontend

```bash
NODE_ENV=production
VITE_API_URL=/api/v1   # nginx proxy se encarga del routing
```

> **Nota:** El frontend usa nginx para probar `/api/*` → `https://backend-inventario-izo8.onrender.com`.
> No necesitas cambiar `VITE_API_URL` cuando cambies la URL del backend.

---

## 3. Puerto de Render

Render asigna un puerto automáticamente. Asegúrate de que tu app escuche en `process.env.PORT`:

- **Backend:** El gateway ya usa `process.env.GATEWAY_PORT || 3000`, pero Render necesita que se use `process.env.PORT`
- **Frontend:** Nginx escucha en puerto 80, Render lo mapea

> ⚠️ **Importante:** Render no expone puertos custom. Solo el puerto asignado por `PORT` está disponible.

---

## 4. Servicios incluidos en el backend

El `start-render.sh` ejecuta estos 18 servicios:

| Servicio | Puerto | Gateway Route |
|----------|--------|---------------|
| API Gateway | 3000 | `/api/v1/*` |
| Auth Service | 3001 | `/api/v1/auth/*` |
| User Service | 3002 | `/api/v1/users/*`, `/api/v1/clients/*` |
| Product Service | 3003 | `/api/v1/products/*` |
| Category Service | 3004 | `/api/v1/categories/*` |
| Inventory Service | 3005 | `/api/v1/inventory/*` |
| Purchase Service | 3006 | `/api/v1/purchases/*` |
| Sale Service | 3007 | `/api/v1/sales/*`, `/api/v1/cart/*`, `/api/v1/checkout/*` |
| Report Service | 3008 | `/api/v1/reports/*` |
| Invoice Service | 3009 | `/api/v1/invoices/*` |
| Ecommerce Service | 3012 | `/api/v1/ecommerce/*` |
| Catalog Service | 3013 | `/api/v1/catalog/*` |
| Email Service | 3014 | `/api/v1/email/*` |
| WhatsApp Service | 3015 | `/api/v1/whatsapp/*` |
| Notification Service | 3016 | `/api/v1/notifications/*` |
| Audit Service | 3017 | `/api/v1/audit/*` |
| Config Service | 3018 | `/api/v1/config/*` |
| Payment Service | 3019 | `/api/v1/cash-register/*` |

**Servicios EXCLUIDOS** (conflicto de puertos o manejados por otros):
- `identity-service` → conflicto con auth-service (ambos puerto 3001)
- `procurement-service` → conflicto con purchase-service (ambos puerto 3006)
- `cart-service` → manejado por sale-service
- `checkout-service` → manejado por sale-service

---

## 5. Pasos para deploy

### Prerrequisitos
- Repo en GitHub con el código actualizado
- Cuenta en Render (plan free funciona)
- Proyecto Supabase activo

### Deploy
1. **Push a GitHub:**
   ```bash
   git add .
   git commit -m "feat: add Render deployment config"
   git push origin main
   ```

2. **Crear Backend en Render:**
   - New → Web Service
   - Conectar repo
   - Dockerfile: `backend/Dockerfile.render`
   - Docker Context: `.`
   - Agregar las variables de entorno (ver sección 1)

3. **Crear Frontend en Render:**
   - New → Web Service
   - Conectar repo
   - Dockerfile: `frontend/Dockerfile.render`
   - Docker Context: `.`

4. **Actualizar CORS:**
   - En el backend, cambiar `CORS_ORIGIN` a la URL real del frontend

5. **Verificar:**
   - Backend: `https://backend-inventario-izo8.onrender.com/health`
   - Frontend: Abrir en browser y probar login

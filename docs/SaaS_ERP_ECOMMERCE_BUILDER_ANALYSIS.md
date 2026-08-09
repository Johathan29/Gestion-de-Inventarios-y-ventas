# 🔍 Análisis Completo: SaaS Multi-Tenant + ERP + E-Commerce Builder

> **Fecha:** 2026-07-25  
> **Proyecto:** Animal Store | Aurora ERP Platform  
> **Versión:** 2.0 (In Progress)  
> **Stack:** Vue 3.5 + Vite 8 + Node.js 18 + Express + Supabase PostgreSQL

---

## 📊 Resumen Ejecutivo

| Dimensión | Cumplimiento | Estado |
|-----------|-------------|--------|
| **SaaS Multi-Tenant** | 65% | 🟡 Parcial — base sólida, faltan billing y limits |
| **ERP Core** | 72% | 🟡 Parcial — ventas/inventario fuerte, falta contabilidad |
| **E-Commerce** | 68% | 🟡 Parcial — catalogo/cart/checkout listo, faltan pagos online |
| **CMS / Page Builder** | 35% | 🔴 Solo schema — sin frontend ni backend |
| **Frontend Completeness** | 82% | 🟢 Maduro — 76+ vistas, 200+ API methods |
| **Backend Completeness** | 75% | 🟡 22 servicios, pero patrones inconsistentes |
| **Database Completeness** | 78% | 🟢 130+ tablas, 39 funciones, 30+ triggers |
| **Testing / QA** | 5% | 🔴 Sin tests — ni unit, ni integration, ni E2E |

### 🎯 Calificación General: **67% / 100**

---

## 1. 🏗️ Arquitectura Backend

### 1.1 Inventario de Servicios (22 total)

```
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (3000)                       │
│         Express + http-proxy-middleware + Circuit Breaker        │
│         19 proxy targets | CORS | Rate Limiting | Correlation   │
└─────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬────┘
      │   │   │   │   │   │   │   │   │   │   │   │   │   │
      ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  LEGACY CJS SERVICES (@inventory/shared)                 │
   ├──────────────────────────────────────────────────────────┤
   │ auth(3001) │ product(3003) │ category(3004)              │
   │ purchase(3006) │ ecommerce(3012) │ email(3014)           │
   │ whatsapp(3015) │ audit(3017) │ config(3018)             │
   └──────────────────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────────────────┐
   │  HEXAGONAL ESM SERVICES (@erp/common + @erp/shared-kernel)│
   ├──────────────────────────────────────────────────────────┤
   │ user/CRM(3002) │ inventory(3005) │ sale(3007)            │
   │ report(3008) │ invoice(3009) │ catalog(3013)             │
   │ notification(3016) │ payment(3019) │ platform-admin(3020)│
   └──────────────────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────────────────┐
   │  STUB SERVICES (exist but not deployed)                  │
   ├──────────────────────────────────────────────────────────┤
   │ identity │ cart │ checkout │ procurement                  │
   └──────────────────────────────────────────────────────────┘
```

### 1.2 Patrones Arquitectónicos

| Patrón | Implementación | Estado |
|--------|---------------|--------|
| **Microservices** | 22 servicios, 19 activos en Docker | ✅ |
| **API Gateway** | Express + proxy + circuit breaker + correlation IDs | ✅ |
| **Hexagonal Architecture** | 9 servicios ESM con domain/usecases/adapters | ✅ |
| **Event-Driven** | RabbitMQ + InMemoryEventBus (dev) | ✅ Parcial |
| **Multi-Tenancy** | JWT → tenantContext → Supabase RLS | ✅ |
| **CQRS** | 2 materialized views, 8 regular views | ⬜ Pendiente |
| **Saga Pattern** | No implementado | ❌ |
| **Circuit Breaker** | 5 failures → open, 30s reset | ✅ |
| **Bulkhead** | No implementado | ❌ |
| **Retry / Backoff** | No implementado | ❌ |
| **Service Discovery** | Hardcoded localhost URLs | ⬜ Pendiente |
| **Config Server** | Env vars por servicio | ⬜ Pendiente |

### 1.3 Stack de Middleware Compartido

| Middleware | Ubicación | Función | Estado |
|-----------|-----------|---------|--------|
| `authenticate()` | shared/middleware/auth.js | JWT decode + `req.user` | ✅ |
| `authorize(...roles)` | shared/middleware/auth.js | Role-based check | ✅ |
| `requirePermission()` | shared/middleware/permissions.js | Granular RBAC (38 perms) | ✅ |
| `tenantContext` | shared/middleware/tenant.js | `req.companyId` extraction | ✅ |
| `createTenantClient()` | shared/middleware/tenantClient.js | Supabase proxy con company_id | ✅ |
| `injectCompanyId` | shared/middleware/tenant.js | Auto-inject in POST/PUT body | ✅ |
| `rateLimiter` | shared/middleware/rateLimiter.js | Redis → memory fallback | ✅ |
| `circuitBreaker` | shared/middleware/circuitBreaker.js | Service protection | ✅ |
| `correlationId` | shared/middleware/correlationId.js | Request tracing | ✅ |
| `apiResponse` | shared/middleware/apiResponse.js | Standardized responses | ✅ |
| `asyncHandler` | shared/middleware/asyncHandler.js | Error catching | ✅ |
| `validate(schema)` | shared/validation/schemas.js | Zod validation | ✅ |
| **SAGA Orchestrator** | — | Cross-service transactions | ❌ |
| **Distributed Tracing** | — | OpenTelemetry / Jaeger | ❌ |
| **Feature Flags** | — | Runtime feature toggles | ❌ |

---

## 2. 🔐 Sistema de Autenticación & Autorización

### 2.1 JWT Token Structure

```json
{
  "sub": "uuid",
  "email": "user@company.com",
  "role": "admin | supervisor | cajero | inventario | cliente",
  "role_id": 1,
  "permissions": {
    "products": ["create", "read", "update", "delete"],
    "sales": ["create", "read"],
    "inventory": ["create", "read", "update"]
  },
  "company_id": "uuid",
  "company_name": "Mi Empresa"
}
```

### 2.2 Sistema de Roles (5 roles base)

| Rol | `role_id` | Acceso | Permisos Clave |
|-----|-----------|--------|----------------|
| **Admin** | 1 | Total (incluye Platform Admin) | Todos los 38 permisos |
| **Supervisor** | 2 | Dashboard completo | Product CRUD, Inventory, Sales read, Reports |
| **Cajero** | 3 | POS + Ventas | Product read, Sale create/read, Invoice create |
| **Inventario** | 4 | Almacén | Product read/update, Inventory CRUD, Purchases |
| **Cliente** | 5 | E-Commerce | Product read, Sale read, Cart/Checkout |

### 2.3 Matriz de Permisos Granular (38 códigos)

```
user:create|read|update|delete|manage          (5)
product:create|read|update|delete              (4)
category:create|read|update|delete             (4)
inventory:create|read|update|adjust|transfer   (5)
purchase:create|read|update|cancel             (4)
sale:create|read|update|cancel                 (4)
invoice:create|read|update|send                (4)
report:read|export                             (2)
client:create|read|update                      (3)
config:read|update                             (2)
audit:read                                     (1)
ecommerce:manage                               (1)
notification:manage                            (1)
```

### 2.4 Cumplimiento SaaS Auth

| Requisito SaaS | Estado | Notas |
|---------------|--------|-------|
| JWT Authentication | ✅ | Access + Refresh tokens |
| Role-Based Access Control | ✅ | 5 roles + 38 permisos granulares |
| Multi-Company Isolation | ✅ | company_id en JWT + RLS policies |
| Password Hashing | ✅ | bcrypt |
| Rate Limiting | ✅ | 5 intentos → 15 min lockout |
| Token Refresh | ✅ | Auto-refresh en 401 interceptor |
| Session Management | ✅ | Refresh token tracking |
| Impersonation (Admin) | ✅ | Support sessions con audit log |
| **SSO / SAML / OIDC** | ❌ | Solo JWT propio |
| **MFA / 2FA** | ❌ | No implementado |
| **OAuth Social Login** | ❌ | No Google/GitHub login |
| **API Key Auth** | ⬜ Schema existe | Tabla `api_keys` pero sin backend |
| **IP Whitelisting** | ❌ | No implementado |
| **Audit Trail per Action** | ✅ | audit_logs + permission_audit_log |

---

## 3. 🏢 Multi-Tenancy — SaaS Platform

### 3.1 Arquitectura Multi-Tenant

```
┌──────────────────────────────────────────────┐
│              PLATFORM ADMIN (3020)            │
│   Global metrics │ Company mgmt │ Imperson.   │
└──────────────┬───────────────────────────────┘
               │ Unscoped Supabase client
               ▼
┌──────────────────────────────────────────────┐
│            COMPANIES TABLE                    │
│  id | name | slug | business_type_id          │
│  subscription_status | plan_id | is_active    │
│  settings | dashboard_config | logo_url       │
│  trial_ends_at | grace_period_ends_at         │
└──────┬───────────┬───────────┬───────────────┘
       │           │           │
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│Company A │ │Company B │ │Company C │
│Users     │ │Users     │ │Users     │
│Products  │ │Products  │ │Products  │
│Sales     │ │Sales     │ │Sales     │
│Inventory │ │Inventory │ │Inventory │
│Invoices  │ │Invoices  │ │Invoices  │
│CRM       │ │CRM       │ │CRM       │
└──────────┘ └──────────┘ └──────────┘
```

### 3.2 Tablas SaaS / Platform (22 tablas)

| Categoría | Tablas | Estado |
|-----------|--------|--------|
| **Core Tenant** | `companies`, `branches`, `business_types` | ✅ |
| **Business Modules** | `business_type_modules`, `business_type_features`, `business_type_templates`, `business_type_themes`, `platform_modules`, `company_modules` | ⬜ Schema solo |
| **Subscription Plans** | `saas_plans`, `plan_features`, `company_subscriptions`, `plan_changes`, `subscription_payments`, `saas_coupons` | ⬜ Schema solo |
| **Platform Admin** | `impersonation_logs`, `platform_metrics`, `company_activity_log` | ✅ Backend + Frontend |
| **Dashboard Builder** | `dashboard_widgets`, `company_dashboards`, `company_dashboard_widgets`, `widget_data_cache`, `user_dashboard_prefs`, `business_type_dashboards` | ✅ Backend + Frontend |
| **API Keys** | `api_keys`, `api_key_logs` | ⬜ Schema solo |
| **Branches / Multi-branch** | `branch_users`, `branch_schedules` | ⬜ Schema solo |

### 3.3 Cumplimiento SaaS

| Requisito SaaS Builder | Estado | Detalle |
|----------------------|--------|---------|
| Multi-tenant data isolation | ✅ | company_id + RLS + middleware |
| Company CRUD | ✅ | Create, update, toggle active, onboarding wizard |
| Subscription Plans (schema) | ⬜ | Tablas `saas_plans` + `plan_features` existen, sin backend |
| Plan-Based Feature Gating | ❌ | No hay `check_plan_limit()` enforcement en servicios |
| Plan-Based Limits (users, products) | ❌ | RPC existe pero no se invoca en servicios |
| Trial Management | ⬜ | Columnas `trial_ends_at`, `grace_period_ends_at` existen |
| Billing / Invoicing for Tenants | ❌ | No Stripe/Paddle integration |
| Usage Metering | ❌ | No API call tracking por tenant |
| Tenant Self-Service Portal | ❌ | Solo Platform Admin puede ver empresas |
| White-Label / Custom Domain | ⬜ | `slug` column exists, sin routing custom |
| Tenant Analytics | ⬜ | `platform_metrics` table existe, backend parcial |
| Support Impersonation | ✅ | Full implementation con audit trail |
| Per-Company Dashboard | ✅ | Widget catalog + per-company config |
| Per-Company Branding | ⬜ | `company_themes` table existe, sin implementación |
| Per-Company Notifications | ✅ | User notification prefs |
| Onboarding Wizard | ✅ | 5-step wizard: Info → Plan → Dashboard → Admin → Review |

---

## 4. 📦 ERP — Módulos Core

### 4.1 Matriz de Módulos ERP

| Módulo | Backend | Frontend | Estado | Prioridad |
|--------|---------|----------|--------|-----------|
| **Productos (CRUD)** | product-service ✅ | 5 vistas ✅ | 🟢 Completo | — |
| **Categorías** | category-service ✅ | 1 vista ✅ | 🟢 Completo | — |
| **Marcas** | product-service ✅ | En form ✅ | 🟢 Completo | — |
| **Variantes** | product-service ✅ | En form ✅ | 🟢 Completo | — |
| **Inventario** | inventory-service ✅ | 8 vistas ✅ | 🟢 Completo | — |
| **Kardex** | inventory-service ✅ | 1 vista ✅ | 🟢 Completo | — |
| **Almacenes** | inventory-service ✅ | Parcial | 🟡 Parcial | Alta |
| **Traspasos** | inventory-service ✅ | 1 vista ✅ | 🟢 Completo | — |
| **Ajustes Inventario** | inventory-service ✅ | 1 vista ✅ | 🟢 Completo | — |
| **Verificación Compras** | inventory-service ✅ | 1 vista ✅ | 🟢 Completo | — |
| **Ventas / POS** | sale-service ✅ | 5 vistas ✅ | 🟢 Completo | — |
| **Caja / Registers** | payment-service ✅ | 1 vista ✅ | 🟢 Completo | — |
| **Compras** | purchase-service ✅ | 3 vistas ✅ | 🟢 Completo | — |
| **Proveedores** | purchase-service ✅ | 1 vista ✅ | 🟢 Completo | — |
| **Clientes** | user-service ✅ | 2 vistas ✅ | 🟢 Completo | — |
| **Facturación** | invoice-service ✅ | 2 vistas ✅ | 🟢 Completo | — |
| **Notas de Crédito** | invoice-service ✅ | API listo | 🟡 Parcial | Media |
| **Reportes** | report-service ✅ | 7 vistas ✅ | 🟢 Completo | — |
| **Auditoría** | audit-service ✅ | 2 vistas ✅ | 🟢 Completo | — |
| **Configuración** | config-service ✅ | 1 vista ✅ | 🟢 Completo | — |
| **CRM** | user-service ✅ | 1 vista (Kanban) ✅ | 🟡 Parcial | Alta |
| **Contabilidad / CG** | ❌ | ❌ | 🔴 No existe | 🔴 Crítica |
| **Nómina / RRHH** | ❌ | ❌ | 🔴 No existe | 🔴 Crítica |
| **Activos Fijos** | ❌ | ❌ | 🔴 No existe | 🟡 Media |
| **Presupuestos** | ❌ | ❌ | 🔴 No existe | 🟡 Media |
| **Portal Proveedores** | ❌ | ❌ | 🔴 No existe | 🟡 Media |
| **Control de Calidad** | ❌ | ❌ | 🔴 No existe | 🟢 Baja |
| **Gestión de Proyectos** | ❌ | ❌ | 🔴 No existe | 🟢 Baja |

### 4.2 Flujo de Inventario (Completo ✅)

```
Compra → Verificación → Stock Pendiente → Aprobación → Stock Disponible
    │                                              │
    └── purchase_items ──→ inventory(status=pending)
                             │
                             ▼
                    inventory(status=available)
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
      Venta               Ajuste             Traspaso
   (auto-decrement)    (manual ±qty)     (warehouse→warehouse)
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
                   inventory_movements (kardex)
                             │
                             ▼
                    inventory_ledger (append-only)
                             │
                             ▼
                    inventory_balances (MV)
```

### 4.3 Flujo de Ventas (Completo ✅)

```
POS/Online → Seleccionar productos (+variantes)
           → Seleccionar cliente (o "Consumidor Final")
           → Aplicar descuentos/cupones
           → Seleccionar método de pago
           │
           ▼
    CreateSaleUseCase
           │
           ├── 1. INSERT sale
           ├── 2. INSERT sale_items (con variantes)
           ├── 3. Trigger: decrease_stock_from_sale()
           │       ├── UPDATE product_variants.stock
           │       └── UPDATE inventory.stock
           ├── 4. Create inventory_movements (exit)
           ├── 5. autoCreateInvoice()
           │       ├── Resolve client fiscal data
           │       ├── INSERT invoices
           │       └── INSERT invoice_items (from sale_items)
           └── 6. EventBus: SaleCreatedEvent
                    ├── notification-service → in-app + email
                    └── audit-service → audit_log
```

### 4.4 Flujo de Facturación Fiscal (República Dominicana)

```
invoice-service (3009)
    │
    ├── NCF (Número de Comprobante Fiscal) auto-generado
    │   ├── Secuencia por tipo: B01, B02, B03, B14, B15, B16
    │   └── auto_generate_ncf() RPC
    │
    ├── PDF Generation (pdfkit)
    │   ├── Header con datos empresa (NCF, RNC)
    │   ├── Items con subtotal/ITBIS/total
    │   ├── QR Code (qrcode library)
    │   └── Footer con leyenda fiscal
    │
    ├── Estados: issued → paid | cancelled | voided
    │
    └── Notas de Crédito/Débito
        ├── credit_notes / credit_note_items
        └── debit_notes / debit_note_items
```

---

## 5. 🛒 E-Commerce

### 5.1 Capacidades Implementadas

| Feature | Backend | Frontend | Estado |
|---------|---------|----------|--------|
| **Catálogo Público** | ecommerce-service | ProductsCatalogView | ✅ |
| **Detalle Producto** | product-service | ProductPublicDetailView | ✅ |
| **Hero Carousel** | ecommerce-service | HeroSection (carousel) | ✅ |
| **Banners Flotantes** | ecommerce-service | FloatingBanner | ✅ |
| **Ofertas / Promociones** | ecommerce-service | OffersView + OfferShowcase | ✅ |
| **Cupones** | ecommerce-service | CouponsView | ✅ |
| **Carrito de Compras** | sale-service (cart) | CartView | ✅ |
| **Checkout** | sale-service (checkout) | CheckoutView | ✅ |
| **Lista de Deseos** | user-service | WishlistView | ✅ |
| **Reseñas** | ecommerce-service | ReviewsModerationView | ✅ |
| **Configuración Tienda** | ecommerce-service | SettingsView | ✅ |
| **Tasas de Impuesto** | ecommerce-service | En SettingsView | ✅ |
| **WhatsApp Widget** | whatsapp-service | WhatsAppWidget | ✅ |
| **Formulario Contacto** | ecommerce-service | ContactForm | ✅ |
| **SEO (SSR-like)** | — | useSEO composable | ✅ |
| **Multi-Moneda** | — | currency store (10 currencies) | ✅ |
| **PWA / Offline** | ❌ | ❌ | 🔴 No |
| **Filtros Avanzados** | ⬜ Básico | ⬜ Básico | 🟡 Parcial |

### 5.2 Pasarelas de Pago

| Gateway | Estado | Notas |
|---------|--------|-------|
| Efectivo | ✅ | Pago en efectivo |
| Tarjeta | ✅ | Débito/Crédito (registro manual) |
| Transferencia | ✅ | Banco (registro manual) |
| Cheque | ✅ | Registro manual |
| Crédito | ✅ | Credit accounts por cliente |
| **Stripe** | ❌ | No integrado |
| **PayPal** | ❌ | No integrado |
| **Mercado Pago** | ❌ | No integrado |
| **Square** | ❌ | No integrado |

### 5.3 Logística / Envíos

| Feature | Estado | Notas |
|---------|--------|-------|
| Métodos de envío | ⬜ | Tabla `shipping_methods` existe, sin backend |
| Zonas de envío | ❌ | No implementado |
| Tracking de envíos | ❌ | No implementado |
| Cálculo de tarifas | ❌ | No implementado |
| Integración transportistas | ❌ | No implementado |

---

## 6. 📐 CMS / Page Builder

### 6.1 Schema Implementado (Migration 034-038)

| Tabla | Propósito | Backend | Frontend |
|-------|-----------|---------|----------|
| `cms_pages` | Páginas del sitio | ❌ | ❌ |
| `cms_page_sections` | Secciones por página | ❌ | ❌ |
| `cms_component_registry` | Componentes disponibles | ❌ | ❌ |
| `cms_component_instances` | Instancias de componentes | ❌ | ❌ |
| `cms_templates` | Templates predefinidos | ❌ | ❌ |
| `cms_page_versions` | Versionado de páginas | ❌ | ❌ |
| `cms_component_versions` | Versionado de componentes | ❌ | ❌ |
| `themes` | Temas del sitio | ❌ | ❌ |
| `company_themes` | Tema por empresa | ❌ | ❌ |
| `site_headers` | Headers del sitio | ❌ | ❌ |
| `site_navigation_menus` | Menús de navegación | ❌ | ❌ |
| `dynamic_forms` | Formularios dinámicos | ❌ | ❌ |
| `dynamic_form_fields` | Campos de formularios | ❌ | ❌ |
| `media_assets` | Gestión de medios | ❌ | ❌ |
| `custom_code_blocks` | Bloques de código custom | ❌ | ❌ |
| `url_redirects` | Redirects 301/302 | ❌ | ❌ |

### 6.2 Cumplimiento CMS Builder

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Drag & Drop Page Builder | ❌ | Solo schema, sin implementación |
| Visual Editor | ❌ | No frontend |
| Component Library | ❌ | Tabla existe, sin componentes |
| Theme System | ⬜ | Tablas `themes`, `company_themes` existen |
| Multi-Language | ⬜ | Tablas `languages`, `translations` existen (migration 045) |
| Media Library | ⬜ | Tabla `media_assets` existe |
| SEO Management | ✅ | useSEO composable en frontend |
| Custom Code Injection | ⬜ | Tabla `custom_code_blocks` existe |
| Page Versioning | ⬜ | Tabla `cms_page_versions` existe |

---

## 7. 🎨 Frontend — Capacidad y Cobertura

### 7.1 Estadísticas del Frontend

| Métrica | Cantidad |
|---------|----------|
| **Vistas totales** | ~76+ |
| **Componentes** | ~42 |
| **Stores Pinia** | 7 |
| **Composables** | 10 |
| **Módulos API** | 22 |
| **Métodos API** | ~200+ |
| **Rutas** | ~80+ |
| **Dependencias prod** | 20 |

### 7.2 Layout por Sección

```
Frontend
├── Public (/)
│   ├── LandingView
│   ├── ProductsCatalogView
│   ├── ProductPublicDetailView
│   ├── OffersProductsView
│   ├── CartView
│   └── Auth (login, register, forgot/reset password)
│
├── Client Account (/account/*)
│   ├── ProfileView
│   ├── PurchasesView
│   ├── CreditView
│   ├── NotificationsView
│   ├── WishlistView
│   ├── CardsView
│   ├── CartView
│   └── CheckoutView
│
├── Dashboard (/app/*)
│   ├── DashboardView (KPIs + Charts)
│   ├── NotificationsView + NotificationDetailView
│   │
│   ├── Products (5 vistas)
│   │   ├── ProductListView
│   │   ├── ProductFormView (create/edit)
│   │   ├── ProductDetailView
│   │   └── CategoryListView
│   │
│   ├── Inventory (8 vistas)
│   │   ├── InventoryView + InventoryDetailView
│   │   ├── MovementsView + KardexView
│   │   ├── AdjustmentsView + TransfersView
│   │   ├── VerificationView
│   │   └── InventoryList
│   │
│   ├── Sales (5 vistas)
│   │   ├── SaleListView + SaleFormView
│   │   ├── SaleDetailView
│   │   ├── POSView
│   │   └── CashRegisterView
│   │
│   ├── Purchases (3 vistas)
│   │   ├── PurchaseListView + PurchaseFormView
│   │   └── PurchaseDetailView
│   │
│   ├── Clients (2 vistas)
│   │   ├── ClientListView + ClientDetailView
│   │   └── SuppliersView
│   │
│   ├── Invoices (2 vistas)
│   │   ├── InvoiceListView + InvoiceDetailView
│   │   └── CreditNotesView (API ready)
│   │
│   ├── Reports (7 vistas)
│   │   ├── ReportsView (home)
│   │   ├── SalesReportView + InventoryReportView
│   │   ├── TopProductsView + ClientsReportView
│   │   └── CashRegisterReportView
│   │
│   ├── E-Commerce (11 vistas)
│   │   ├── EcommerceHome + SettingsView
│   │   ├── HeroSlidesView + FloatingBannersView
│   │   ├── BannersView + OffersView
│   │   ├── CouponsView + PromotionsView
│   │   ├── ReviewsModerationView
│   │   └── HeroSettingsView
│   │
│   ├── CRM (1 vista)
│   │   └── PipelineView (Kanban)
│   │
│   ├── Admin (6 vistas)
│   │   ├── UsersView + UserDetailView
│   │   ├── AuditLogView + AuditDetailView
│   │   └── ConfigView
│   │
│   └── Platform Admin (7 vistas) [role_id=1 only]
│       ├── PlatformDashboard
│       ├── CompaniesView + CompanyDetailView
│       ├── CompanyOnboardingView (5-step wizard)
│       ├── GlobalUsersView
│       └── ImpersonationLogView
│
└── 404 (NotFoundView)
```

### 7.3 Design System

| Aspecto | Implementación | Estado |
|---------|---------------|--------|
| **Framework CSS** | Tailwind CSS 4.3 | ✅ |
| **Design Language** | "Aurora" — neumorphism/glassmorphism | ✅ |
| **Dark Mode** | Toggle con CSS cascade `.dark` | ✅ |
| **Responsive** | Mobile-first, `lg:` breakpoints | ✅ |
| **Skeleton Loaders** | 8 componentes de skeleton | ✅ |
| **Animations** | GSAP ScrollTrigger + anime.js | ✅ |
| **3D Effects** | vanilla-tilt en product cards | ✅ |
| **Charts** | Chart.js 4.5 + vue-chartjs | ✅ |
| **Forms** | VeeValidate 4 + @vee-validate/rules | ✅ |
| **Modals** | Teleport + Transition + SweetAlert2 | ✅ |
| **Export** | jsPDF + XLSX + file-saver | ✅ |
| **i18n** | ❌ Strings hardcoded en español | ❌ |
| **Accessibility** | ❌ Sin ARIA labels, focus management | ❌ |
| **PWA** | ❌ Sin service worker, manifest | ❌ |
| **Image Optimization** | ❌ Sin lazy loading, WebP, CDN | ❌ |

### 7.4 Inconsistencia de Diseño (Gap Crítico)

| Módulo | Design System | Estilo |
|--------|--------------|--------|
| Dashboard / ERP views | Aurora + Nexus | Consistente ✅ |
| E-Commerce views | Aurora + Nexus | Consistente ✅ |
| **Platform Admin** | Propio (blue/slate) | ❌ Inconsistente |
| **CRM Pipeline** | Propio (scoped CSS) | ❌ Inconsistente |
| **Company Onboarding** | Propio (scoped CSS) | ❌ Inconsistente |
| **Client Account** | Aurora + Nexus | Consistente ✅ |

---

## 8. 🗄️ Base de Datos

### 8.1 Conteo de Tablas por Dominio

| Dominio | Tablas | Estado |
|---------|--------|--------|
| Auth / Identity | 8 | ✅ |
| Products / Catalog | 12 | ✅ |
| Sales / Cart | 6 | ✅ |
| Purchases | 5 | ✅ |
| Inventory | 10 | ✅ |
| Invoicing / Fiscal | 8+ | ✅ |
| E-Commerce | 12+ | ✅ |
| CRM | 9 | ✅ |
| SaaS / Platform | 22 | ⬜ Schema |
| Notifications | 4 | ✅ |
| Audit | 4 | ✅ |
| Config / System | 6+ | ✅ |
| CMS / Page Builder | 8 | ⬜ Schema |
| Themes / Navigation | ~8 | ⬜ Schema |
| Dynamic Forms | 5 | ⬜ Schema |
| Promotions (Enhanced) | 7 | ⬜ Schema |
| Media / Custom Code | 5 | ⬜ Schema |
| Webhooks / Automations | 6 | ⬜ Schema |
| Dashboard Builder | 6 | ✅ Backend + Frontend |
| I18n / Multi-Currency | ~12 | ⬜ Schema |
| Cash Registers | 3 | ✅ |
| Other | 10+ | Varies |
| **TOTAL** | **~130+** | |

### 8.2 Funciones Almacenadas (39 total)

| Categoría | Funciones | Estado |
|-----------|----------|--------|
| RBAC | 6 (check_permission, get_permissions, grant/revoke, migrate) | ✅ |
| SaaS | 1 (check_plan_limit) | ⬜ No invocado |
| Multi-Currency | 1 (fn_convert_currency) | ⬜ No invocado |
| i18n | 2 (t, get_translations_batch) | ⬜ No invocado |
| CRM | 2 (fn_move_lead_stage, fn_refresh_pipeline_metrics) | ✅ |
| Dashboard | 1 (fn_clean_widget_cache) | ✅ |
| Automations | 2 (fn_trigger_automations, fn_check_conditions) | ⬜ No invocado |
| Platform Admin | 4 (create/end support session, log_impersonation, get_platform_stats, etc.) | ✅ |
| Outbox | 1 (publish_outbox_event) | ✅ |
| Inventory | 5 (decrease/revert stock, reserve/release, FIFO) | ✅ |
| Cash Register | 2 (open/close session) | ✅ |
| Fiscal | 1 (auto_generate_ncf) | ✅ |
| Auth Helpers | 3 (company_id, user_id, user_role) | ✅ |
| Stock Alert | 1 (get_low_stock_threshold) | ✅ |
| **Activas** | **~25 de 39** | **64%** |

### 8.3 Migraciones vs Implementación

| Migración | Propósito | DB | Backend | Frontend |
|-----------|-----------|-----|---------|----------|
| 001-006 | Schema core + ecommerce | ✅ | ✅ | ✅ |
| 008-010 | Clients, suppliers, triggers | ✅ | ✅ | ✅ |
| 014-018 | ERP enhancements, invoicing | ✅ | ✅ | ✅ |
| 020-025 | Cart, variants, inventory sync | ✅ | ✅ | ✅ |
| 026-032 | Enterprise audit, ledger, RLS | ✅ | ✅ | ✅ |
| **033** | **Aurora platform core** | ✅ | ⬜ | ⬜ |
| **034** | **CMS page builder** | ✅ | ❌ | ❌ |
| **035** | **Dynamic forms** | ✅ | ❌ | ❌ |
| **036** | **Themes / navigation** | ✅ | ❌ | ❌ |
| **037** | **Enhanced promotions** | ✅ | ❌ | ❌ |
| **038** | **Media / custom code** | ✅ | ❌ | ❌ |
| 039-040 | RLS + seeds + indexes | ✅ | — | — |
| **041** | **RBAC granular** | ✅ | ✅ | ⬜ |
| **042** | **SaaS plans / subscriptions** | ✅ | ⬜ | ⬜ |
| **043** | **Dashboard widgets** | ✅ | ✅ | ✅ |
| **044** | **CRM leads / pipeline** | ✅ | ✅ | ✅ |
| **045** | **Multi-currency / i18n** | ✅ | ⬜ | ⬜ |
| **046** | **Webhooks / automations** | ✅ | ⬜ | ❌ |
| **047** | **Notifications / brands** | ✅ | ⬜ | ⬜ |
| **048** | **RLS / seeds** | ✅ | — | — |
| **049** | **Platform admin** | ✅ | ✅ | ✅ |

### 8.4 Multi-Tenancy Coverage

| Tabla | `company_id` | RLS Policy | Estado |
|-------|-------------|------------|--------|
| `products` | ✅ | ✅ SELECT/INSERT/UPDATE/DELETE | 🟢 |
| `sales` | ✅ | ✅ | 🟢 |
| `invoices` | ✅ | ✅ | 🟢 |
| `inventory` | ✅ | ✅ | 🟢 |
| `purchases` | ✅ | ✅ | 🟢 |
| `users` | ✅ | ✅ | 🟢 |
| `clients` | ✅ | ✅ | 🟢 |
| `suppliers` | ✅ | ✅ | 🟢 |
| `categories` | ✅ | ✅ | 🟢 |
| `leads` | ✅ | ✅ | 🟢 |
| `cms_pages` | ✅ | ✅ | 🟢 |
| `roles` | ❌ | ❌ (global) | ⬜ Global |
| `permissions` | ❌ | ❌ (global) | ⬜ Global |
| `saas_plans` | ❌ | ❌ (global) | ⬜ Global |
| `business_types` | ❌ | ❌ (global) | ⬜ Global |

---

## 9. 📡 Cumplimiento por Categoría SaaS Builder

### 9.1 SaaS Infrastructure

| Requisito | Estado | Score |
|-----------|--------|-------|
| Multi-tenant data isolation | ✅ | 10/10 |
| Company lifecycle (create → activate → suspend) | ✅ | 8/10 |
| Platform admin dashboard | ✅ | 8/10 |
| Impersonation / support sessions | ✅ | 9/10 |
| Per-company configuration | ✅ | 8/10 |
| Dashboard widget builder | ✅ | 7/10 |
| Business type classification | ⬜ Schema only | 3/10 |
| Subscription plan management | ⬜ Schema only | 2/10 |
| Plan-based feature gating | ❌ | 0/10 |
| Plan-based limits enforcement | ❌ | 0/10 |
| Trial / grace period management | ⬜ Columns exist | 1/10 |
| Usage metering / billing | ❌ | 0/10 |
| Stripe/Paddle integration | ❌ | 0/10 |
| Tenant self-service portal | ❌ | 0/10 |
| White-label / custom domain | ⬜ slug exists | 1/10 |
| API key management | ⬜ Schema only | 1/10 |
| **Promedio SaaS** | | **42/160 (26%)** |

### 9.2 ERP Capabilities

| Requisito | Estado | Score |
|-----------|--------|-------|
| Product management (CRUD, variants, images) | ✅ | 10/10 |
| Category / brand management | ✅ | 9/10 |
| Inventory (stock, movements, kardex) | ✅ | 10/10 |
| Multi-warehouse | ✅ (basic) | 7/10 |
| Inventory reservations | ✅ | 8/10 |
| FIFO cost tracking | ✅ | 8/10 |
| Purchase orders | ✅ | 9/10 |
| Supplier management | ✅ | 8/10 |
| Goods receipt / verification | ✅ | 9/10 |
| Sales / POS | ✅ | 10/10 |
| Cash register management | ✅ | 9/10 |
| Invoice generation (fiscal NCF) | ✅ | 10/10 |
| Credit notes / debit notes | ⬜ Schema + basic | 4/10 |
| Client management | ✅ | 9/10 |
| Credit accounts | ✅ | 8/10 |
| Reporting / analytics | ✅ | 8/10 |
| Audit trail | ✅ | 9/10 |
| CRM (pipelines, leads) | ✅ | 7/10 |
| Accounting / General Ledger | ❌ | 0/10 |
| Chart of Accounts | ❌ | 0/10 |
| Journal Entries | ❌ | 0/10 |
| Financial Statements (P&L, BS) | ❌ | 0/10 |
| HR / Payroll | ❌ | 0/10 |
| Employee management | ❌ | 0/10 |
| Budgeting | ❌ | 0/10 |
| Asset management | ❌ | 0/10 |
| **Promedio ERP** | | **152/280 (54%)** |

### 9.3 E-Commerce Builder

| Requisito | Estado | Score |
|-----------|--------|-------|
| Product catalog | ✅ | 9/10 |
| Product detail page | ✅ | 9/10 |
| Shopping cart | ✅ | 9/10 |
| Checkout flow | ✅ | 8/10 |
| Hero / banner management | ✅ | 8/10 |
| Offers / promotions | ✅ | 8/10 |
| Coupons | ✅ | 8/10 |
| Product reviews | ✅ | 8/10 |
| Wishlist | ✅ | 8/10 |
| SEO (meta, OG, JSON-LD) | ✅ | 8/10 |
| Store settings / branding | ✅ | 9/10 |
| Tax rate configuration | ✅ | 8/10 |
| Multi-currency display | ✅ (hardcoded rates) | 5/10 |
| WhatsApp integration | ✅ | 8/10 |
| Contact form | ✅ | 7/10 |
| Online payment gateways | ❌ | 0/10 |
| Shipping / logistics | ❌ | 0/10 |
| Order tracking | ❌ | 0/10 |
| Email notifications (transactional) | ✅ | 8/10 |
| Customer accounts | ✅ | 8/10 |
| Page builder / CMS | ⬜ Schema only | 2/10 |
| Theme system | ⬜ Schema only | 1/10 |
| Drag & Drop editor | ❌ | 0/10 |
| Multi-language | ⬜ Schema only | 1/10 |
| PWA / offline | ❌ | 0/10 |
| Image CDN / optimization | ❌ | 0/10 |
| Advanced product filters | ⬜ Basic | 3/10 |
| Product comparison | ❌ | 0/10 |
| Recently viewed | ❌ | 0/10 |
| **Promedio E-Commerce** | | **122/300 (41%)** |

### 9.4 Frontend Quality

| Requisito | Estado | Score |
|-----------|--------|-------|
| SPA routing | ✅ | 10/10 |
| Role-based access | ✅ | 9/10 |
| Responsive design | ✅ | 9/10 |
| Dark mode | ✅ | 8/10 |
| Loading states (skeletons) | ✅ | 9/10 |
| Error handling (UI) | ⬜ Basic | 5/10 |
| Form validation | ✅ (VeeValidate) | 8/10 |
| State management | ✅ (Pinia) | 9/10 |
| API abstraction | ✅ (Axios + interceptors) | 9/10 |
| Animations / transitions | ✅ (GSAP + anime) | 9/10 |
| Export (PDF, Excel) | ✅ | 8/10 |
| TypeScript | ❌ | 0/10 |
| Unit tests | ❌ | 0/10 |
| E2E tests (Playwright/Cypress) | ❌ | 0/10 |
| i18n / localization | ❌ | 0/10 |
| Accessibility (a11y) | ❌ | 0/10 |
| PWA / offline | ❌ | 0/10 |
| Image optimization | ❌ | 0/10 |
| Bundle analysis | ❌ | 0/10 |
| ESLint / Prettier | ⬜ Config exists | 3/10 |
| **Promedio Frontend** | | **96/200 (48%)** |

### 9.5 Backend Quality

| Requisito | Estado | Score |
|-----------|--------|-------|
| API design (RESTful) | ✅ | 9/10 |
| Input validation (Zod) | ✅ | 8/10 |
| Error handling | ✅ (asyncHandler) | 8/10 |
| Rate limiting | ✅ (Redis → memory) | 8/10 |
| CORS | ✅ (gateway only) | 7/10 |
| Health checks | ✅ (all services) | 9/10 |
| Logging | ✅ (structured JSON) | 8/10 |
| Circuit breaker | ✅ | 8/10 |
| Correlation IDs | ✅ | 9/10 |
| API documentation (Swagger) | ❌ | 0/10 |
| Unit tests | ❌ | 0/10 |
| Integration tests | ❌ | 0/10 |
| CI/CD pipeline | ❌ | 0/10 |
| Container orchestration | ✅ (Docker Compose) | 7/10 |
| Service discovery | ❌ (hardcoded) | 0/10 |
| Config server | ❌ (env vars) | 0/10 |
| Distributed tracing | ❌ | 0/10 |
| Backup strategy | ❌ | 0/10 |
| Database migrations tool | ❌ (manual SQL) | 0/10 |
| **Promedio Backend** | | **89/190 (47%)** |

---

## 10. 🔴 Gap Analysis — Lo Que Falta

### 10.1 Gaps Críticos (Alta Prioridad)

| # | Gap | Impacto | Esfuerzo | Módulos Afectados |
|---|-----|---------|----------|-------------------|
| 1 | **Sin tests** (unit + integration + E2E) | 🔴 | 🔴 Alto | Todo |
| 2 | **Sin CI/CD pipeline** | 🔴 | 🟡 Medio | DevOps |
| 3 | **Sin pasarelas de pago online** | 🔴 | 🔴 Alto | E-Commerce |
| 4 | **Sin contabilidad / CG** | 🔴 | 🔴 Alto | ERP |
| 5 | **Sin billing SaaS (Stripe)** | 🔴 | 🔴 Alto | SaaS |
| 6 | **Plan limits no enforced** | 🔴 | 🟡 Medio | SaaS |
| 7 | **CMS/Page Builder sin backend ni frontend** | 🔴 | 🔴 Alto | CMS |
| 8 | **API sin documentación** | 🟡 | 🟡 Medio | Backend |

### 10.2 Gaps Medianos (Media Prioridad)

| # | Gap | Impacto | Esfuerzo |
|---|-----|---------|----------|
| 9 | Sin TypeScript en frontend | 🟡 | 🔴 Alto |
| 10 | Sin i18n (solo español) | 🟡 | 🟡 Medio |
| 11 | Sin MFA / 2FA | 🟡 | 🟡 Medio |
| 12 | Sin OAuth social login | 🟡 | 🟡 Medio |
| 13 | Sin shipping / logistics | 🟡 | 🔴 Alto |
| 14 | Sin order tracking | 🟡 | 🟡 Medio |
| 15 | Dual shared library (CJS vs ESM) | 🟡 | 🟡 Medio |
| 16 | Sin Service Discovery | 🟡 | 🟡 Medio |
| 17 | Sin Distributed Tracing | 🟡 | 🟡 Medio |
| 18 | Inconsistencia de design system | 🟡 | 🟡 Medio |
| 19 | Currency rates hardcoded | 🟡 | 🟢 Bajo |
| 20 | Tax rate hardcoded en cart store | 🟡 | 🟢 Bajo |
| 21 | Sin RRHH / Nómina | 🟡 | 🔴 Alto |
| 22 | Sin Webhooks implementation | 🟡 | 🟡 Medio |
| 23 | Sin Automations implementation | 🟡 | 🟡 Medio |
| 24 | Sin RBAC UI (assign permissions) | 🟡 | 🟡 Medio |

### 10.3 Gaps Menores (Baja Prioridad)

| # | Gap | Impacto | Esfuerzo |
|---|-----|---------|----------|
| 25 | Sin PWA / offline | 🟢 | 🟡 Medio |
| 26 | Sin Accessibility (a11y) | 🟢 | 🟡 Medio |
| 27 | Sin WebSocket / real-time | 🟢 | 🟡 Medio |
| 28 | Sin image optimization / CDN | 🟢 | 🟢 Bajo |
| 29 | Sin product comparison | 🟢 | 🟢 Bajo |
| 30 | Sin recently viewed | 🟢 | 🟢 Bajo |
| 31 | Sin navbar search functionality | 🟢 | 🟢 Bajo |
| 32 | HelloWorld.vue boilerplate | 🟢 | 🟢 Bajo |
| 33 | Sin bundle analysis | 🟢 | 🟢 Bajo |
| 34 | Sin SSO / SAML | 🟢 | 🔴 Alto |

---

## 11. 📊 Scorecard Final por Dominio

```
╔══════════════════════════════════════════════════════════════╗
║                    SCORECARD FINAL                           ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  SaaS Multi-Tenant ──────────────── 42/160 (26%)  🔴        ║
║  ├── Data Isolation              ████████████████████ 100%   ║
║  ├── Company Lifecycle           ████████████████░░░░  80%   ║
║  ├── Platform Admin              ████████████████░░░░  80%   ║
║  ├── Subscription Billing        █░░░░░░░░░░░░░░░░░░░  5%   ║
║  ├── Plan Feature Gating         ░░░░░░░░░░░░░░░░░░░░  0%   ║
║  └── Tenant Self-Service         ░░░░░░░░░░░░░░░░░░░░  0%   ║
║                                                              ║
║  ERP Core ───────────────────────── 152/280 (54%)  🟡       ║
║  ├── Products & Catalog          ████████████████████ 100%   ║
║  ├── Inventory & Warehouse       ████████████████░░░░  80%   ║
║  ├── Sales & POS                 ████████████████████ 100%   ║
║  ├── Purchases & Suppliers       ██████████████████░░  90%   ║
║  ├── Invoicing (Fiscal)          ████████████████████ 100%   ║
║  ├── Reporting                   ████████████████░░░░  80%   ║
║  ├── CRM                         ██████████████░░░░░░  70%   ║
║  ├── Accounting / GL             ░░░░░░░░░░░░░░░░░░░░  0%   ║
║  └── HR / Payroll                ░░░░░░░░░░░░░░░░░░░░  0%   ║
║                                                              ║
║  E-Commerce ─────────────────────── 122/300 (41%)  🟡       ║
║  ├── Product Catalog              ████████████████░░░░  80%   ║
║  ├── Cart & Checkout              ████████████████░░░░  80%   ║
║  ├── Promotions & Coupons         ████████████████░░░░  80%   ║
║  ├── Content (CMS)               ██░░░░░░░░░░░░░░░░░░  10%   ║
║  ├── Payment Gateways            ░░░░░░░░░░░░░░░░░░░░  0%   ║
║  ├── Shipping                    ░░░░░░░░░░░░░░░░░░░░  0%   ║
║  └── Theme / Page Builder        ██░░░░░░░░░░░░░░░░░░  10%   ║
║                                                              ║
║  Frontend Quality ───────────────── 96/200 (48%)  🟡        ║
║  ├── Features & Views            ████████████████████ 100%   ║
║  ├── Design System (Aurora)      ████████████████░░░░  80%   ║
║  ├── State Management            ██████████████████░░  90%   ║
║  ├── Testing                     ░░░░░░░░░░░░░░░░░░░░  0%   ║
║  └── TypeScript / i18n / a11y    ░░░░░░░░░░░░░░░░░░░░  0%   ║
║                                                              ║
║  Backend Quality ────────────────── 89/190 (47%)  🟡        ║
║  ├── API Design                  ██████████████████░░  90%   ║
║  ├── Security & Auth             ████████████████░░░░  80%   ║
║  ├── Observability               ██████████████░░░░░░  70%   ║
║  ├── Testing                     ░░░░░░░░░░░░░░░░░░░░  0%   ║
║  └── DevOps / CI/CD              ░░░░░░░░░░░░░░░░░░░░  0%   ║
║                                                              ║
║  Database ───────────────────────── 130+/200 (65%)  🟡      ║
║  ├── Schema Completeness          ██████████████████░░  90%   ║
║  ├── Multi-Tenant RLS             ████████████████░░░░  80%   ║
║  ├── Stored Procedures            ██████████████░░░░░░  64%   ║
║  ├── Migrations Tooling           █░░░░░░░░░░░░░░░░░░░  5%   ║
║  └── Backup Strategy              ░░░░░░░░░░░░░░░░░░░░  0%   ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📊 SCORE GLOBAL: 631/1330 (47%)                            ║
║  🏆 CALIFICACIÓN: C+ (Funcional pero incompleto)            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 12. 🗺️ Roadmap de Completación

### Fase 1: Fundamentos (2-3 semanas)
1. ⬜ **CI/CD Pipeline** — GitHub Actions con lint + test + build + deploy
2. ⬜ **Testing Framework** — Vitest (unit) + Playwright (E2E)
3. ⬜ **API Documentation** — Swagger/OpenAPI para todos los servicios
4. ⬜ **Database Migrations Tool** — Knex o similar (reemplazar SQL manual)
5. ⬜ **Error Boundaries** — Vue errorHandler + global error page
6. ⬜ **Fix inconsistencies** — Tax rate hardcoded, currency hardcoded

### Fase 2: SaaS Billing (3-4 semanas)
7. ⬜ **Stripe Integration** — Checkout sessions, subscriptions, webhooks
8. ⬜ **Plan Limits Enforcement** — Invocar `check_plan_limit()` en servicios
9. ⬜ **Trial Management** — Auto-suspend after trial_ends_at
10. ⬜ **Tenant Self-Service Portal** — Company settings, billing, usage
11. ⬜ **Usage Metering** — API calls, storage, users count per tenant
12. ⬜ **Invoice Billing to Tenants** — Monthly invoices via Stripe

### Fase 3: E-Commerce Payments (2-3 semanas)
13. ⬜ **Stripe Checkout** — Online payment in cart checkout
14. ⬜ **PayPal Integration** — Alternative payment method
15. ⬜ **Shipping Zones** — Define zones + rates
16. ⬜ **Order Tracking** — Status page + email notifications
17. ⬜ **Advanced Filters** — Category, price range, attributes, brand

### Fase 4: CMS / Page Builder (4-6 semanas)
18. ⬜ **Page Builder Backend** — CRUD for cms_pages, sections, components
19. ⬜ **Visual Editor Frontend** — Drag & drop interface
20. ⬜ **Component Library** — Text, Image, Video, Gallery, CTA, Testimonial
21. ⬜ **Theme System** — Apply themes per company
22. ⬜ **Media Library** — Upload, manage, insert into pages

### Fase 5: ERP Completo (4-6 semanas)
23. ⬜ **Accounting Module** — Chart of accounts, journal entries, GL
24. ⬜ **Financial Statements** — P&L, Balance Sheet, Cash Flow
25. ⬜ **HR Module** — Employees, departments, attendance
26. ⬜ **Payroll** — Salary calculation, deductions, payslips
27. ⬜ **Budgeting** — Budget plans vs actuals

### Fase 6: Quality & DX (ongoing)
28. ⬜ **TypeScript Migration** — Frontend (gradual)
29. ⬜ **i18n** — vue-i18n with Spanish + English
30. ⬜ **Accessibility** — ARIA labels, focus management, screen reader
31. ⬜ **PWA** — Service worker, manifest, offline support
32. ⬜ **WebSocket / Real-time** — Notifications, inventory alerts
33. ⬜ **Unify shared libraries** — Merge `@inventory/shared` + `@erp/*`

---

## 13. 💡 Recomendaciones

### Prioridad Inmediata (Next Sprint)
1. **Testing** — Sin tests, cualquier cambio puede romper funcionalidad existente. Empezar con Vitest para use cases críticos (CreateSale, autoCreateInvoice, checkout).
2. **Fix Hardcoded Values** — Tax rate `0.19` en cart store y currency rates hardcoded rompen la multi-tenancy.
3. **API Documentation** — Swagger/OpenAPI es esencial para la integración de pagos y CMS.
4. **Design Consistency** — Unificar Platform Admin, CRM Pipeline, y Onboarding con Aurora design system.

### Prioridad a Corto Plazo (1-2 meses)
5. **Stripe Integration** — Sin pagos online, el e-commerce es solo un catálogo.
6. **Plan Enforcement** — Las tablas de planes existen pero nada las respeta.
7. **CI/CD** — Deploy manual es riesgoso para producción.

### Prioridad a Mediano Plazo (2-4 meses)
8. **CMS/Page Builder** — El schema está listo (7 tablas), falta todo el stack.
9. **Accounting Module** — Requerido para cualquier ERP serio.
10. **Testing Completo** — Unit + Integration + E2E coverage > 60%.

---

## 14. 🏁 Conclusión

El proyecto **Aurora ERP Platform** tiene una **base sólida** en:
- ✅ Arquitectura de microservices con API Gateway
- ✅ Multi-tenancy real con RLS en 70+ tablas
- ✅ ERP core completo (ventas, inventario, compras, facturación fiscal)
- ✅ E-Commerce funcional (catálogo, cart, checkout, SEO)
- ✅ Frontend maduro (76+ vistas, 200+ API methods, dark mode, responsive)
- ✅ RBAC granular con 38 permisos y 5 roles

Los gaps principales son:
- 🔴 **Testing total** — El mayor riesgo del proyecto
- 🔴 **Pagos online** — Sin Stripe/PayPal, el e-commerce no es transaccional
- 🔴 **Billing SaaS** — Las tablas existen pero no hay integración de cobros
- 🔴 **CMS/Page Builder** — Solo schema SQL, sin implementación
- 🔴 **Contabilidad** — Requerido para ERP completo

**Calificación: C+ (47%)** — Funcional para demos y uso interno, requiere trabajo significativo para ser un SaaS Builder production-ready.

---

*Documento generado automáticamente el 2026-07-25 por análisis del codebase completo.*

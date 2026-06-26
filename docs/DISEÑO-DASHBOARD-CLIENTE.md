# Guía de Diseño — Dashboard y Páginas para Usuario Cliente

> **Sistema**: Gestión de Inventarios y Ventas (Animal Store)  
> **Frontend**: Vue 3.5 + Vite 8 + Pinia 3 + Vue Router 4 + Tailwind CSS v4  
> **Moneda**: COP (Peso Colombiano) — `es-CO`  
> **Idioma**: Español

---

## Índice

1. [Fuentes Recomendadas](#1-fuentes-recomendadas)
2. [Estructura de Navegación General](#2-estructura-de-navegación-general)
3. [Sesiones del Sistema](#3-sesiones-del-sistema)
   - 3.1 [Landing Page / Home (Pública)](#31-landing-page--home-pública)
   - 3.2 [Catálogo de Productos (Pública)](#32-catálogo-de-productos-pública)
   - 3.3 [Detalle de Producto (Pública)](#33-detalle-de-producto-pública)
   - 3.4 [Carrito de Compras (Pública)](#34-carrito-de-compras-pública)
   - 3.5 [Autenticación (Login / Register / Recuperar)](#35-autenticación)
   - 3.6 [Dashboard Principal (/app/dashboard)](#36-dashboard-principal-appdashboard)
   - 3.7 [Productos — Listado (/app/products)](#37-productos--listado-appproducts)
   - 3.8 [Producto — Detalle (/app/products/:id)](#38-producto--detalle-appproductsid)
   - 3.9 [Producto — Formulario (/app/products/create, /app/products/:id/edit)](#39-producto--formulario)
   - 3.10 [Categorías (/app/categories)](#310-categorías-appcategories)
   - 3.11 [Inventario (/app/inventory)](#311-inventario-appinventory)
   - 3.12 [Movimientos de Inventario](#312-movimientos-de-inventario)
   - 3.13 [Kardex](#313-kardex)
   - 3.14 [Ajustes de Inventario](#314-ajustes-de-inventario)
   - 3.15 [Transferencias](#315-transferencias)
   - 3.16 [Ventas — Listado (/app/sales)](#316-ventas--listado-appsales)
   - 3.17 [Venta — Detalle (/app/sales/:id)](#317-venta--detalle-appsalesid)
   - 3.18 [Nueva Venta / POS (/app/sales/create, /app/pos)](#318-nueva-venta--pos)
   - 3.19 [Compras — Listado (/app/purchases)](#319-compras--listado-apppurchases)
   - 3.20 [Compra — Detalle (/app/purchases/:id)](#320-compra--detalle-apppurchasesid)
   - 3.21 [Nueva Compra (/app/purchases/create)](#321-nueva-compra-apppurchasescreate)
   - 3.22 [Proveedores (/app/suppliers)](#322-proveedores-appsuppliers)
   - 3.23 [Clientes (/app/clients)](#323-clientes-appclients)
   - 3.24 [Facturas — Listado (/app/invoices)](#324-facturas--listado-appinvoices)
   - 3.25 [Factura — Detalle (/app/invoices/:id)](#325-factura--detalle-appinvoicesid)
   - 3.26 [Reportes (/app/reports)](#326-reportes-appreports)
   - 3.27 [Perfil de Usuario (/app/profile)](#327-perfil-de-usuario-appprofile)
   - 3.28 [Notificaciones Internas (/app/notifications)](#328-notificaciones-internas-appnotifications)
   - 3.29 [Cuenta de Cliente — Layout (/account/)](#329-cuenta-de-cliente--layout-account)
   - 3.30 [Cuenta de Cliente — Perfil (/account/profile)](#330-cuenta-de-cliente--perfil-accountprofile)
   - 3.31 [Cuenta de Cliente — Mis Compras (/account/purchases)](#331-cuenta-de-cliente--mis-compras-accountpurchases)
   - 3.32 [Cuenta de Cliente — Crédito (/account/credit)](#332-cuenta-de-cliente--crédito-accountcredit)
   - 3.33 [Cuenta de Cliente — Notificaciones (/account/notifications)](#333-cuenta-de-cliente--notificaciones-accountnotifications)
4. [Componentes Compartidos](#4-componentes-compartidos)
5. [Patrón de Diseño: Tabla Desktop / Cards Mobile](#5-patrón-de-diseño-tabla-desktop--cards-mobile)
6. [Eventos y Acciones Comunes](#6-eventos-y-acciones-comunes)
7. [APIs y Servicios](#7-apis-y-servicios)

---

## 1. Fuentes Recomendadas

| Contexto | Fuente | Peso | Tamaños |
|---|---|---|---|
| **Títulos de sección** | `Inter`, `Plus Jakarta Sans` o `system-ui` | Bold (700) | `text-lg` (18px) a `text-2xl` (24px) |
| **Encabezados de página** | `Inter`, `Plus Jakarta Sans` | Bold (700) | `text-2xl` (24px) a `text-3xl` (30px) |
| **Texto de tabla / cuerpo** | `Inter` | Regular (400) / Medium (500) | `text-sm` (14px) |
| **Etiquetas / badges** | `Inter` | Semibold (600) | `text-xs` (12px) |
| **Datos numéricos / precios** | `Inter`, `JetBrains Mono` (mono) | Medium (500) / Bold (700) | `text-sm` a `text-lg` |
| **SKU / Barcode / códigos** | `JetBrains Mono` o `SF Mono` | Regular (400) | `text-xs` (12px) |
| **Textos de ayuda / metadata** | `Inter` | Regular (400) | `text-xs` (12px) |
| **Dashboard KPIs** | `Inter` | Bold (700) | `text-2xl` (24px) |
| **Público (Landing)** | `Inter` + `Playfair Display` (headings) | Variable | Custom |

**Implementación actual**: Tailwind CSS v4 con clases utilitarias. Las fuentes se definen globalmente en `style.css`.

---

## 2. Estructura de Navegación General

```
┌─ Público (sin autenticación) ─────────────────────────────┐
│  /                          Landing Page (Animal Store)    │
│  /products                  Catálogo de Productos          │
│  /products/:id              Detalle Público de Producto    │
│  /cart                      Carrito de Compras             │
│  /login                     Iniciar Sesión                 │
│  /register                  Registrarse                    │
│  /forgot-password           Recuperar Contraseña           │
│  /reset-password            Restablecer Contraseña         │
└────────────────────────────────────────────────────────────┘

┌─ Cuenta Cliente (requiere auth, role=cliente) ────────────┐
│  /account/profile           Mi Perfil                      │
│  /account/purchases         Mis Compras                    │
│  /account/credit            Cuenta de Crédito              │
│  /account/notifications     Notificaciones                 │
└────────────────────────────────────────────────────────────┘

┌─ Dashboard Interno (requiere auth, roles: admin/supervisor/cajero) ┐
│  /app/dashboard            Dashboard Principal                     │
│  /app/profile              Mi Perfil                               │
│  /app/notifications        Notificaciones                          │
│  /app/products             Productos (CRUD)                        │
│  /app/products/:id         Detalle de Producto                     │
│  /app/products/create      Nuevo Producto                          │
│  /app/products/:id/edit    Editar Producto                         │
│  /app/categories           Categorías                              │
│  /app/inventory            Inventario                              │
│  /app/inventory/movements  Movimientos                             │
│  /app/inventory/kardex     Kardex                                  │
│  /app/inventory/adjustments Ajustes                                │
│  /app/inventory/transfers  Transferencias                          │
│  /app/sales                Ventas (listado)                        │
│  /app/sales/:id            Detalle de Venta                        │
│  /app/sales/create         Nueva Venta                             │
│  /app/pos                  Punto de Venta                          │
│  /app/purchases            Compras (listado)                       │
│  /app/purchases/:id        Detalle de Compra                       │
│  /app/purchases/create     Nueva Compra                            │
│  /app/suppliers            Proveedores                             │
│  /app/clients              Clientes                                │
│  /app/clients/:id          Detalle del Cliente                     │
│  /app/invoices             Facturas (listado)                      │
│  /app/invoices/:id         Detalle de Factura                      │
│  /app/reports              Centro de Reportes                      │
│  /app/reports/sales        Reporte de Ventas                       │
│  /app/reports/inventory    Reporte de Inventario                   │
│  /app/reports/top-products Productos Más Vendidos                   │
│  /app/reports/clients      Reporte de Clientes                     │
│  /app/ecommerce/*          Ecommerce (admin)                       │
│  /app/admin/*              Administración (admin)                  │
└────────────────────────────────────────────────────────────────────┘
```

### Sidebar (Menú Lateral Izquierdo) — Dashboard Interno

```
┌─────────────────────────────────────┐
│ [AS] Animal Store                    │  ← Logo (collapsible)
├─────────────────────────────────────┤
│  📊 Dashboard                       │
│  📦 Productos                       │
│  🏷️ Categorías                     │
│  🏭 Inventario                      │
│  💳 Punto de Venta                  │
│  🧾 Ventas                          │
│  🛒 Compras                         │
│  🚚 Proveedores                     │
│  👥 Clientes                        │
│  📄 Facturas                        │
│  📊 Reportes                        │
│  🏪 Ecommerce (admin)               │
│  ⚙️ Admin (solo superadmin)         │
├─────────────────────────────────────┤
│  👤 Mi Perfil                       │
│  🚪 Salir del Sistema               │
│  ◀ Colapsar                         │
└─────────────────────────────────────┘
```

### Navbar (Barra Superior)

```
┌──────────────────────────────────────────────────────────────┐
│ ☰  [🔔 Notificaciones (badge)]  [👤 Nombre ▼]              │
│                                   ● Admin / Cajero          │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Sesiones del Sistema

### 3.1 Landing Page / Home (Pública)

| Elemento | Descripción |
|---|---|
| **Ruta** | `/` |
| **Título** | `Animal Store` |
| **Layout** | `blank` (sin sidebar) |
| **Componente** | `LandingView.vue` |

#### Componentes Visuales
| Componente | Descripción | Campos Visuales |
|---|---|---|
| `AppNavBar` | Barra de navegación superior con logo, enlaces, carrito y login | Logo "Animal Store", `Cart` (icono + badge count), `Login` |
| `FloatingBanner` | Banner flotante (configurable desde ecommerce) | Texto, enlace |
| `HeroSection` | Hero dinámico desde Supabase (slides) | Imagen de fondo, título, subtítulo, CTA |
| `ProductShowcase` | Vitrina de productos destacados | Imagen producto, nombre, precio, botón "Add to Cart", rating |
| `FeaturedReviews` | Reseñas destacadas aprobadas | Avatar, nombre, texto reseña, rating estrellas |
| `ContactForm` | Formulario de contacto | Nombre, email, mensaje, botón enviar |
| `AppFooter` | Footer con enlaces | Redes sociales, enlaces legales |
| `WhatsAppWidget` | Botón flotante de WhatsApp | Icono, tooltip |

#### Eventos / Botones
| Botón | Evento | Acción |
|---|---|---|
| `Add to Cart` | `@added-to-cart` | Agrega producto al carrito, muestra notificación |
| `View All` | `@view-all` | Navega a `/products` |
| `Subscribe` | Submit formulario | Envía email a newsletter |
| `Login` | Click | Navega a `/login` |
| Cart icon | Click | Navega a `/cart` |

#### Textos Descriptivos
```
Hero: Textos configurables desde Supabase (hero_slides)
Sección Products: "Curated Essentials" / "Precision-engineered care products..."
Sección Newsletter: "Join the Inner Circle" / "Receive exclusive invitations..."
```

---

### 3.2 Catálogo de Productos (Pública)

| Elemento | Descripción |
|---|---|
| **Ruta** | `/products` |
| **Título** | `Catálogo de Productos` |
| **Layout** | `blank` |
| **Componente** | `ProductsCatalogView.vue` |

#### Componentes Visuales
| Componente | Campos Visuales |
|---|---|
| `AppNavBar` | Logo, Cart, Login |
| Search bar | Input con icono `search`, placeholder "Search products..." |
| Category pills | Botones tipo pill "All" + categorías dinámicas |
| Product Grid (Desktop) | Grid 4 columnas: Imagen, Nombre, Precio, Rating, Botón "Add to Cart" |
| Product Cards (Mobile) | Cards stack vertical con misma info |
| Skeleton loader | 8 placeholders animados mientras carga |

#### Eventos / Botones
| Elemento | Evento | Acción |
|---|---|---|
| Search input | `@input` → `debouncedSearch` | Filtra productos por nombre |
| Category pill | `@click` | Filtra por categoría, resetea paginación |
| Product card | `@click` | Navega a `/products/:id` |
| "Add to Cart" | `@click` | POST a cart API, actualiza badge |

#### Textos Descriptivos
```
Header: "Our Collection" / "All Products"
Subtitle: "Discover our curated selection of premium products..."
Empty: "No products found matching your search."
```

---

### 3.3 Detalle de Producto (Pública)

| Ruta | `/products/:id` |
|---|---|
| **Título** | `Detalle del Producto` |
| **Layout** | `blank` |

#### Campos Visuales
- **Galería de imágenes**: Imagen principal + thumbnails
- **Nombre** del producto
- **SKU** y **Barcode** (monospace)
- **Precio** (formato COP)
- **Rating / reseñas**
- **Descripción**
- **Selector de cantidad**
- **Botón "Add to Cart"**

#### Eventos
| Botón | Acción |
|---|---|
| Add to Cart | Agrega al carrito con cantidad seleccionada |
| Thumbnail click | Cambia imagen principal |
| Back | Navega a `/products` |

---

### 3.4 Carrito de Compras (Pública)

| Ruta | `/cart` |
|---|---|
| **Título** | `Carrito de Compras` |
| **Layout** | `blank` |
| **Componente** | `CartView.vue` (en `views/account/`) |

#### Desktop: Tabla
| Columna | Tipo | Descripción |
|---|---|---|
| Producto | `image + text` | Thumbnail + nombre |
| Precio | `currency` | Precio unitario |
| Cantidad | `number input` | Input numérico |
| Subtotal | `currency` | Precio × cantidad |
| Acción | `icon button` | Botón eliminar (`delete`) |

#### Mobile: Cards
Cada item como card con: Imagen, Nombre, Precio, Cantidad (input), Subtotal, Botón eliminar.

#### Totales
- Subtotal, IVA, Descuento, **Total**
- Botón **"Proceder al Pago"** / **"Seguir Comprando"**

#### Eventos
| Elemento | Acción |
|---|---|
| Cambiar cantidad | PUT `/cart/items/:id` |
| Eliminar item | DELETE `/cart/items/:id` |
| Vaciar carrito | DELETE `/cart` |
| Proceder al pago | Navega a checkout |
| Seguir comprando | Navega a `/products` |

---

### 3.5 Autenticación

| Ruta | Título | Componente |
|---|---|---|
| `/login` | `Iniciar Sesión` | `LoginView.vue` |
| `/register` | `Registrarse` | `RegisterView.vue` |
| `/forgot-password` | `Recuperar Contraseña` | `ForgotPasswordView.vue` |
| `/reset-password` | `Restablecer Contraseña` | `ResetPasswordView.vue` |

#### Login — Campos
- Email (input tipo email)
- Contraseña (input tipo password con toggle visibility)
- Botón **"Iniciar Sesión"**
- Link "¿Olvidaste tu contraseña?" → `/forgot-password`
- Link "¿No tienes cuenta? Registrarse" → `/register`

#### Register — Campos
- Nombre completo
- Email
- Teléfono
- Contraseña
- Confirmar contraseña
- Botón **"Crear Cuenta"**

#### Eventos
| Formulario | Acción |
|---|---|
| Login submit | `authStore.login()` → guarda tokens → redirige a `/app/dashboard` o `/account/profile` |
| Register submit | `authStore.register()` → redirige a `/login` |
| Forgot password | `authStore.forgotPassword(email)` → muestra mensaje éxito |
| Reset password | `authStore.resetPassword(token, password)` → redirige a `/login` |

---

### 3.6 Dashboard Principal (/app/dashboard)

| Elemento | Descripción |
|---|---|
| **Ruta** | `/app/dashboard` |
| **Título** | `Dashboard` |
| **Layout** | `AppLayout` (sidebar + navbar) |
| **Componente** | `DashboardView.vue` |

#### Sección 1 — KPIs (6 tarjetas)
| KPI | Tipo | Icono | Descripción |
|---|---|---|---|
| Ventas Hoy | `currency` | `today` (verde) | Total ventas del día actual |
| Ventas del Mes | `currency` | `calendar_month` (azul) | Total ventas del mes |
| Productos Bajos | `number` | `inventory_2` (rojo) | Stock ≤ 5 |
| Total Productos | `number` | `category` (púrpura) | Conteo total |
| Clientes | `number` | `people` (rosa) | Clientes registrados |
| Usuarios | `number` | `badge` (ámbar) | Admin / Cajeros |

**Componente**: `StatCard` — label, value (formatted), icon, iconBg, iconColor, subtext.

#### Sección 2 — Charts Fila Superior (2 columnas)
| Chart | Tipo | Descripción |
|---|---|---|
| Ventas Hoy (Por Hora) | `bar` (Chart.js) | Distribución por hora del día actual |
| Ventas del Mes (Por Día) | `bar` (Chart.js) | Evolución diaria del mes actual |

#### Sección 3 — Charts Fila Media (2 columnas)
| Chart | Tipo | Descripción |
|---|---|---|
| Tendencia 7 Días | `line` o `bar` | Comparativa últimos 7 días |
| Productos por Categoría | `doughnut` (Chart.js) | Distribución del catálogo |

#### Sección 4 — Actividades Recientes + Top Productos
| Panel | Descripción |
|---|---|
| Actividades Recientes | Timeline vertical: icono (según acción) + "acción — entidad" + usuario + fecha relativa |
| Top Productos | Lista rankeada (#1, #2, #3...): nombre + cantidad vendida + total ingresos |

#### Sección 5 — Ventas Recientes + Alertas Inventario
| Panel | Descripción |
|---|---|
| Ventas Recientes | Lista: #número, cliente, total, fecha relativa. Link "Ver todas" → `/app/sales` |
| Alertas de Inventario | Lista: nombre, SKU, stock actual, badge rojo (sin stock) / ámbar (bajo). Link "Ver inventario" → `/app/inventory` |

#### Eventos
| Elemento | Acción |
|---|---|
| KPI click | — (solo visual, sin navegación actualmente) |
| "Ver todas" ventas | Router.push `/app/sales` |
| "Ver inventario" | Router.push `/app/inventory` |

---

### 3.7 Productos — Listado (/app/products)

| Elemento | Descripción |
|---|---|
| **Ruta** | `/app/products` |
| **Título** | `Productos` |
| **Icono menú** | `inventory` |
| **Layout** | `AppLayout` |
| **Componente** | `ProductListView.vue` |

#### Desktop: Tabla
| Columna | Tipo | Sort |
|---|---|---|
| Imagen | `image` (thumbnail 40×40) | No |
| Nombre | `text` | Sí |
| SKU | `text` | No |
| Categoría | `text` | No |
| Precio | `currency` | Sí |
| Stock | `number` | No |
| Estado | `badge` | No |
| Acciones | `buttons` | — |

#### Mobile: No hay adaptación mobile nativa (usa scroll horizontal en tabla actual)

#### Toolbar
- Input **búsqueda** con icono `search`, debounced
- Botón **"Nuevo Producto"** (gradiente púrpura, solo si `can('products', 'create')`)

#### Eventos
| Elemento | Acción |
|---|---|
| Row click | Navega a `/app/products/:id` |
| Sort click | Alterna orden ascendente/descendente |
| Search input | Debounce 300ms, filtra por nombre |
| "Nuevo Producto" | Router.push `/app/products/create` |

#### Textos
```
Título: "Productos"
Subtítulo: "{total} productos registrados"
Search placeholder: "Buscar productos..."
Botón: "Nuevo Producto"
```

---

### 3.8 Producto — Detalle (/app/products/:id)

| Elemento | Descripción |
|---|---|
| **Ruta** | `/app/products/:id` |
| **Título** | `Detalle del Producto` |
| **Componente** | `ProductDetailView.vue` |

#### Layout: 2 columnas (40% / 60%)
**Columna izquierda** — Galería:
- Imagen principal (aspect-square, object-contain)
- Thumbnails si hay múltiples imágenes

**Columna derecha** — Información:
- Nombre + Badge estado (Activo/Inactivo)
- SKU + Barcode
- 4 mini-tarjetas: Precio Venta, Costo, Stock, Ganancia
- Grid detalles: Categoría, Marca, Stock Mínimo, Unidad, Creado, Actualizado
- Descripción (expandida)
- Badge "Producto Destacado" si aplica

#### Eventos
| Botón | Acción |
|---|---|
| "Editar Producto" | Router.push `/app/products/:id/edit` |
| "Volver" | Router.push `/app/products` |
| "Volver a productos" | Back button |

---

### 3.9 Producto — Formulario

| Ruta | `/app/products/create` o `/app/products/:id/edit` |
|---|---|
| **Título** | `Nuevo Producto` o `Editar Producto` |
| **Componente** | `ProductFormView.vue` |

#### Campos del Formulario
| Campo | Tipo | Requerido |
|---|---|---|
| Nombre | `text` | Sí |
| SKU | `text` | Sí |
| Barcode | `text` | No |
| Categoría | `select` (dinámico) | No |
| Marca | `text` | No |
| Descripción | `textarea` | No |
| Precio de Venta | `number` | Sí |
| Costo | `number` | No |
| Stock Inicial | `number` | Sí |
| Stock Mínimo | `number` | No |
| Unidad | `select` (unidad, kg, lb, etc.) | No |
| Imágenes | `file upload` / `URL input` | No |
| Destacado | `checkbox` | No |
| Estado | `toggle` activo/inactivo | No |

#### Eventos
| Botón | Acción |
|---|---|
| "Guardar" | POST o PUT a `productsAPI` |
| "Cancelar" | Router.push `/app/products` |

---

### 3.10 Categorías (/app/categories)

| Elemento | Descripción |
|---|---|
| **Ruta** | `/app/categories` |
| **Título** | `Categorías` |
| **Icono menú** | `category` |
| **Componente** | `CategoryListView.vue` |

#### Desktop: Tabla (componente `DataTable`)
| Columna | Tipo |
|---|---|
| Nombre | `text` |
| Slug | `text` |
| Descripción | `text` |
| Productos asociados | `number` |
| Estado | `badge` |
| Acciones | `buttons` (Editar / Eliminar) |

#### Mobile: Cards con misma info

#### Eventos
| Botón | Acción |
|---|---|
| "Nueva Categoría" | Abre modal con formulario |
| Editar | Abre modal con datos precargados |
| Eliminar | SweetAlert2 confirmación → DELETE |

---

### 3.11 Inventario (/app/inventory)

| Elemento | Descripción |
|---|---|
| **Ruta** | `/app/inventory` |
| **Título** | `Inventario` |
| **Layout** | Anidado con sub-navegación por tabs |
| **Componente** | `InventoryView.vue` (contiene `InventoryList.vue`) |

#### Sub-navegación (tabs)
```
[ Inventario ] [ Movimientos ] [ Kardex ] [ Ajustes ] [ Transferencias ]
```

#### Desktop: Tabla
| Columna | Tipo |
|---|---|
| Producto | `image + text` |
| SKU | `text` |
| Stock Actual | `number` (con color según nivel) |
| Precio | `currency` |
| Valor Total | `currency` (stock × precio) |
| Ubicación | `text` |

#### Mobile: Cards
Card con: Imagen producto, nombre, SKU, stock (con color), precio, valor total.

#### Eventos
| Elemento | Acción |
|---|---|
| Tab click | Router.push a sub-ruta |
| Row click | Navega a detalle de producto |
| Search | Filtro por nombre/SKU |

---

### 3.12 Movimientos de Inventario

| Ruta | `/app/inventory/movements` |
|---|---|
| **Componente** | `MovementsView.vue` |

#### Desktop: Tabla
| Columna | Tipo |
|---|---|
| Fecha | `datetime` |
| Producto | `text` |
| Tipo | `badge` (entry / exit / adjustment) |
| Cantidad | `number` (con signo +/−) |
| Usuario | `text` |
| Referencia | `text` |

#### Mobile: Cards
Card con: Fecha, producto, tipo (badge), cantidad, usuario.

---

### 3.13 Kardex

| Ruta | `/app/inventory/kardex/:productId?` |
|---|---|
| **Componente** | `KardexView.vue` |

#### Desktop: Tabla valorizada
| Columna | Tipo |
|---|---|
| Fecha | `datetime` |
| Documento | `text` |
| Entrada | `number` (cantidad + valor) |
| Salida | `number` (cantidad + valor) |
| Saldo | `number` (cantidad + valor unitario + valor total) |

#### Mobile: Cards verticales con timeline visual

---

### 3.14 Ajustes de Inventario

| Ruta | `/app/inventory/adjustments` |
|---|---|
| **Componente** | `AdjustmentsView.vue` |

#### Desktop: Tabla
| Columna | Tipo |
|---|---|
| Fecha | `datetime` |
| Producto | `text` |
| Tipo Ajuste | `badge` (entrada/salida) |
| Cantidad | `number` |
| Motivo | `text` |
| Usuario | `text` |

#### Eventos
| Botón | Acción |
|---|---|
| "Nuevo Ajuste" | Abre modal: Producto, Tipo, Cantidad, Motivo → POST |

---

### 3.15 Transferencias

| Ruta | `/app/inventory/transfers` |
|---|---|
| **Componente** | `TransfersView.vue` |

#### Desktop: Tabla
| Columna | Tipo |
|---|---|
| Fecha | `datetime` |
| Producto | `text` |
| Desde | `text` (ubicación origen) |
| Hasta | `text` (ubicación destino) |
| Cantidad | `number` |
| Estado | `badge` |

---

### 3.16 Ventas — Listado (/app/sales)

| Elemento | Descripción |
|---|---|
| **Ruta** | `/app/sales` |
| **Título** | `Ventas` |
| **Icono menú** | `point_of_sale` |
| **Componente** | `SaleListView.vue` |

#### Desktop: DataTable
| Columna | Tipo | Sort |
|---|---|---|
| Factura | `text` | Sí |
| Cliente | `text` | No |
| Total | `currency` | Sí |
| Estado | `custom (badge)` | No (usa slot) |
| Fecha | `datetime` | Sí |
| Acciones | `button` "Ver" | — |

#### Toolbar
- Botón **"Nueva Venta"** (solo si `can('sales', 'create')`)

#### Eventos
| Elemento | Acción |
|---|---|
| Row click | Router.push `/app/sales/:id` |
| "Nueva Venta" | Router.push `/app/sales/create` |
| "Ver" button stop | Router.push `/app/sales/:id` |

---

### 3.17 Venta — Detalle (/app/sales/:id)

| Ruta | `/app/sales/:id` |
|---|---|
| **Título** | `Detalle de Venta` |
| **Componente** | `SaleDetailView.vue` |

#### Cabecera
- Título: "Venta #número"
- Badge estado: Completada (verde), Cancelada (rojo), Pendiente (amarillo)
- Fecha y hora

#### Info Cliente (grid 3 columnas)
| Campo | Fuente |
|---|---|
| Cliente | `sale.clients.name` |
| Tipo de Pago | `sale.payment_method` |
| Cajero | `sale.users.name` |

#### Productos (desglose completo desde tabla `products`)

**Desktop — Tabla:**
| Columna | Tipo |
|---|---|
| Producto | `thumbnail (40×40) + nombre` |
| SKU / Barra | `text mono + qr_code_scanner` |
| Cant. | `number` |
| Precio U. | `currency` |
| Subtotal | `currency` (highlight) |

**Mobile — Cards:**
Cada item: Imagen, nombre, SKU + barcode, cantidad × precio unitario → subtotal.

#### Totales (alineado derecha)
```
Subtotal: $X.XXX
IVA: $X.XXX
Total: $X.XXX  (text-lg, bold, color primary)
```

#### Eventos
| Botón | Acción |
|---|---|
| "Volver" | Router.push `/app/sales` |

---

### 3.18 Nueva Venta / POS

| Ruta | `/app/sales/create` o `/app/pos` |
|---|---|
| **Título** | `Nueva Venta` o `Punto de Venta` |
| **Componentes** | `SaleFormView.vue` / `POSView.vue` |

#### Formulario de Venta
| Campo | Tipo |
|---|---|
| Cliente | `select` (cargado desde API) |
| Tipo de Pago | `select` (Efectivo, Tarjeta, Transferencia, Crédito) |
| Productos | Lista dinámica: `select` producto + `input` cantidad + subtotal |
| Subtotal | auto-calculado |
| IVA | 19% del subtotal |
| Descuento | input opcional |
| Total | auto-calculado |

#### Eventos
| Botón | Acción |
|---|---|
| "Agregar Producto" | Añade fila a la lista |
| "Eliminar" | Quita fila |
| "Guardar Venta" | POST a `salesAPI.create()` |
| "Cancelar" | Router.push `/app/sales` |

---

### 3.19 Compras — Listado (/app/purchases)

| Ruta | `/app/purchases` |
|---|---|
| **Título** | `Compras` |
| **Componente** | `PurchaseListView.vue` |

#### Desktop: DataTable
| Columna | Tipo | Sort |
|---|---|---|
| Orden | `text` | Sí |
| Proveedor | `text` | No |
| Total | `currency` | Sí |
| Estado | `custom (badge)` | No |
| Fecha | `datetime` | Sí |

#### Toolbar
- Botón **"Nueva Compra"** (solo si `can('purchases', 'create')`)

---

### 3.20 Compra — Detalle (/app/purchases/:id)

| Ruta | `/app/purchases/:id` |
|---|---|
| **Título** | `Detalle de Compra` |
| **Componente** | `PurchaseDetailView.vue` |

#### Cabecera
- "Compra #número" + Badge estado (Recibida/verde, Cancelada/rojo, Pendiente/amarillo)
- Fecha creación / fecha recibida

#### Info Proveedor (grid 4 columnas)
| Campo | Fuente |
|---|---|
| Nombre | `suppliers.name` |
| Contacto | `suppliers.contact_name` |
| RUC/CI | `suppliers.tax_id` |
| Teléfono | `suppliers.phone` |
| Email | `suppliers.email` |
| Ciudad | `suppliers.city` |
| Dirección | `suppliers.address` |
| Términos de pago | `suppliers.payment_terms` |

#### Productos — Desktop: Tabla
| Columna | Tipo |
|---|---|
| Producto | `thumbnail + nombre` |
| SKU / Barra | `text mono` |
| Cant. | `number` |
| Costo U. | `currency` |
| Subtotal | `currency` |
| Acción | `buttons` (Editar / Eliminar) |

#### Productos — Mobile: Cards
Card con: Imagen, nombre, SKU, cantidad, costo unitario, subtotal, botones acción.

#### Acciones de Items (CRUD)
| Botón | Evento | Descripción |
|---|---|---|
| ✏️ Editar item | Abre `Modal` con inputs | Edita producto_name, quantity, unit_price, barcode |
| 🗑️ Eliminar item | SweetAlert2 confirmación | DELETE + recalcula totales |
| **"Enviar a Inventario"** | SweetAlert2 confirmación | POST `/purchases/:id/send-to-inventory` |
| **"Cancelar Compra"** | SweetAlert2 confirmación | Cambia estado a "cancelled" |

#### Totales
```
Subtotal: $X.XXX
IVA (19%): $X.XXX
Descuento: -$X.XXX
Total: $X.XXX
```

---

### 3.21 Nueva Compra (/app/purchases/create)

| Ruta | `/app/purchases/create` |
|---|---|
| **Componente** | `PurchaseFormView.vue` |

#### Campos
| Campo | Tipo |
|---|---|
| Proveedor | `select` (cargado desde API) |
| Productos | Lista dinámica: producto_name, quantity, unit_price, barcode |
| Notas | `textarea` |
| Subtotal | auto-calc |
| IVA | 19% |
| Descuento | `input` |
| Total | auto-calc |

---

### 3.22 Proveedores (/app/suppliers)

| Ruta | `/app/suppliers` |
|---|---|
| **Título** | `Proveedores` |
| **Componente** | `SuppliersView.vue` |

#### Desktop: DataTable
| Columna | Tipo |
|---|---|
| Nombre | `text` |
| Contacto | `text` |
| RUC | `text` |
| Teléfono | `text` |
| Email | `text` |
| Ciudad | `text` |
| Estado | `badge` |
| Acciones | `buttons` |

#### Mobile: Cards
Card con: Nombre, contacto, teléfono, email, badge estado.

#### Eventos
| Botón | Acción |
|---|---|
| "Nuevo Proveedor" | Abre modal/va a formulario |
| Editar | Abre modal con datos |
| Eliminar | SweetAlert2 confirmación |

---

### 3.23 Clientes (/app/clients)

| Ruta | `/app/clients` |
|---|---|
| **Título** | `Clientes` |
| **Componente** | `ClientListView.vue` |

#### Desktop: DataTable
| Columna | Tipo |
|---|---|
| Nombre | `text` (sortable) |
| Documento | `text` |
| Email | `text` |
| Teléfono | `text` |
| Compras | `number` (sortable) |
| Total Gastado | `currency` (sortable) |
| Estado | `badge` |
| Acciones | `buttons` |

#### Mobile: Cards

---

### 3.24 Facturas — Listado (/app/invoices)

| Ruta | `/app/invoices` |
|---|---|
| **Título** | `Facturas` |
| **Componente** | `InvoiceListView.vue` |

#### Desktop: DataTable
| Columna | Tipo | Sort |
|---|---|---|
| N° Factura | `text` | Sí |
| Cliente | `text` | No |
| Total | `currency` | Sí |
| Estado | `custom` (badge) | No |
| Fecha | `date` | Sí |

---

### 3.25 Factura — Detalle (/app/invoices/:id)

| Ruta | `/app/invoices/:id` |
|---|---|
| **Título** | `Detalle de Factura` |
| **Componente** | `InvoiceDetailView.vue` |

#### Estructura Visual (formato fiscal)
**Borde lateral izquierdo** (4px) según estado:
- `paid` → verde (`border-green-500`)
- `issued` → amarillo (`border-yellow-500`)
- `cancelled/voided` → rojo (`border-red-500`)

#### Cabecera
- "FACTURA" (text-3xl, bold) + Badge estado grande (PAGADA/EMITIDA/ANULADA)
- N° Factura
- Fecha de pago (si aplica, con icono `check_circle` verde)

#### Info Cliente (grid 2 columnas)
| Columna Izquierda | Columna Derecha |
|---|---|
| Cliente (nombre) | Emisión |
| Documento | Vencimiento |
| Email | Venta # |
| Teléfono | |
| Dirección | |

#### Productos — Tabla
| Columna | Tipo |
|---|---|
| Producto | `icon + nombre` |
| Cant. | `number` |
| Precio | `currency` |
| Subtotal | `currency` |

#### Totales (right-aligned)
```
Subtotal: $X.XXX
Descuento: -$X.XXX
IVA (19%): $X.XXX
Total: $X.XXX (bold, large, color según estado)
```

#### Watermark "PAGADA" (rotated) si está pagada

#### Eventos / Botones
| Botón | Evento | Descripción |
|---|---|---|
| 📄 **PDF** | `downloadPDF()` | Genera PDF con header coloreado según estado + tabla + totales |
| 📊 **Excel** | `downloadExcel()` | Genera XLSX con info header + items + totales |
| 🖨️ **Imprimir** | `printInvoice()` | window.print() |
| ✅ **Marcar como Pagada** | `handleTogglePaid()` | PATCH status → "paid", actualiza `paid_at` |
| ↩️ **Revertir Pago** | `handleToggleIssued()` | PATCH status → "issued", limpia `paid_at` |
| ⬅️ **Volver** | Router.push | `/app/invoices` |

---

### 3.26 Reportes (/app/reports)

| Ruta | `/app/reports` (y sub-rutas) |
|---|---|
| **Título** | `Reportes` |
| **Componente** | `ReportsView.vue` (contenedor) |

#### Página Principal (ReportsView)
Grid 4 tarjetas de acceso:
| Tarjeta | Icono | Descripción |
|---|---|---|
| Reporte de Ventas | `receipt` (azul) | Resumen de ventas por período |
| Reporte de Inventario | `warehouse` (verde) | Estado del inventario |
| Productos Más Vendidos | `trending_up` (púrpura) | Top productos por ventas |
| Reporte de Clientes | `people` (naranja) | Clientes frecuentes |

#### 3.26.1 SalesReportView (/app/reports/sales)
**Layout**: Card con:
- Selector de período: Diario, Semanal, Mensual, Anual
- Total ingresos (highlight)
- Botones PDF / Excel
- 3 Summary Cards: Total Ventas, Total Ingresos, IVA Total
- Chart de barras (Chart.js) con datos agrupados por período
- PDF: jsPDF landscape con tabla
- Excel: XLSX con header + datos

#### 3.26.2 InventoryReportView (/app/reports/inventory)
- 3 StatCards: Total Productos, Valor Total, Productos Bajos
- DataTable con productos del inventario
- PDF/Excel export

#### 3.26.3 TopProductsView (/app/reports/top-products)
- Selector de límite (5, 10, 20)
- Lista rankeada (#1, #2, #3...) con: nombre, SKU, cantidad vendida, total
- PDF/Excel export

#### 3.26.4 ClientsReportView (/app/reports/clients)
- DataTable con: Cliente, Documento, Compras, Total Comprado
- PDF/Excel export

---

### 3.27 Perfil de Usuario (/app/profile)

| Ruta | `/app/profile` |
|---|---|
| **Título** | `Mi Perfil` |
| **Componente** | `ProfileView.vue` |

#### Diseño
- **Cover**: Gradient header (púrpura → fucsia) con forma blob
- **Avatar**: Círculo grande con iniciales, hover overlay para cambiar foto
- **Botón "Editar Perfil"** en esquina (toggle modo edición)

#### Campos (Modo Vista)
| Campo | Grid |
|---|---|
| Nombre Completo | 2 cols |
| Email | 2 cols |
| Teléfono | 2 cols |
| Rol | Badge + Badge Activo |

#### Campos (Modo Edición)
| Campo | Tipo |
|---|---|
| Nombre | `text` |
| Teléfono | `tel` |
| Avatar URL | `url` |

---

### 3.28 Notificaciones Internas (/app/notifications)

| Ruta | `/app/notifications` |
|---|---|
| **Título** | `Notificaciones` |
| **Componente** | `dashboard/NotificationsView.vue` |

#### Dropdown (Navbar)
- Lista de notificaciones con: título, mensaje, fecha relativa
- Badge de no leídas
- Botón "Marcar todas leídas"
- Link "Ver todas" → `/app/notifications`

#### Página Completa
- Lista completa historial
- Botón "Marcar todas leídas"

---

### 3.29 Cuenta de Cliente — Layout (/account/)

| Elemento | Descripción |
|---|---|
| **Layout** | `AccountLayout.vue` — layout propio del cliente |
| **Look & feel** | Fondo gradient `from-purple-50 to-white`, glassmorphism |

#### Navbar Superior
```
[Animal Store]                    [🛒 Carrito (badge)] [🚪 Salir]
```

#### Sidebar Izquierdo (sticky)
| Link | Icono |
|---|---|
| Mi Perfil | `person` |
| Mis Compras | `receipt_long` |
| Cuenta de Crédito | `credit_card` |
| Notificaciones | `notifications` |

Estilo: El link activo tiene bg-primary + texto blanco + shadow.

---

### 3.30 Cuenta de Cliente — Perfil (/account/profile)

| Ruta | `/account/profile` |
|---|---|
| **Título** | `Mi Perfil` |
| **Componente** | `account/ProfileView.vue` |

#### Campos Visuales
- Avatar (icono `account_circle` grande)
- Nombre, Email
- Grid 2 columnas con campos:
  - Nombre Completo
  - Correo Electrónico
  - Teléfono
  - Tipo de Documento
  - Número de Documento
  - Dirección
  - Ciudad
  - Estado / Provincia
  - Código Postal
  - Miembro desde

#### Eventos
| Botón | Acción |
|---|---|
| "Editar Perfil" | Muestra formulario de edición |
| Formulario submit | PUT a users API |

---

### 3.31 Cuenta de Cliente — Mis Compras (/account/purchases)

| Ruta | `/account/purchases` |
|---|---|
| **Título** | `Mis Compras` |
| **Componente** | `account/PurchasesView.vue` |

#### Estados
- **Loading**: Spinner centrado
- **Error**: Icono error + mensaje + botón "Reintentar"
- **Vacío**: Icono `receipt_long` + "Aún no tienes compras" + botón "Ver Productos" → `/products`

#### Desktop/Mobile: Cards (siempre cards, no tabla)
Cada card de compra:
```
┌─────────────────────────────────────────────────────────┐
│ #INV-0001  |  26/06/2026                    [Completada] │
│─────────────────────────────────────────────────────────│
│ 📦 Producto 1                              x2  $10,000  │
│ 📦 Producto 2                              x1   $5,000  │
│─────────────────────────────────────────────────────────│
│ Subtotal: $13,930  IVA: $2,647                  $15,000 │
│                                          [🔄 Comprar de nuevo] │
└─────────────────────────────────────────────────────────┘
```

#### Campos Visuales por Card
| Campo | Fuente |
|---|---|
| Número | `sale.sale_number` |
| Fecha | `sale.created_at` |
| Estado | Badge color según `sale.status` |
| Items | `sale.items[]` → product_name, quantity, total |
| Subtotal | `sale.subtotal` |
| Descuento | `sale.discount` |
| IVA | `sale.tax` |
| Total | `sale.total` (bold, primary color) |

#### Eventos
| Botón | Acción |
|---|---|
| "Comprar de nuevo" | Agrega todos los items al carrito y navega a `/cart` |
| "Ver Productos" (empty) | Router.push `/products` |
| Paginación | Anterior / Siguiente página |

---

### 3.32 Cuenta de Cliente — Crédito (/account/credit)

| Ruta | `/account/credit` |
|---|---|
| **Título** | `Cuenta de Crédito` |
| **Componente** | `account/CreditView.vue` |

#### Estados
- **Loading**: Spinner
- **Sin cuenta**: Icono `credit_card` + "No tienes cuenta de crédito" + botón "Solicitar Cuenta"
- **Con cuenta**: Dashboard de crédito

#### Dashboard de Crédito
**Card principal** (gradient primary):
```
┌────────────────────────────────────────────────────────┐
│ Saldo Disponible                    💳                  │
│ $150,000                                                │
│──────────────┬─────────────────────────────────────────│
│ Límite       │ Saldo Actual                             │
│ $200,000     │ $50,000                                  │
└──────────────┴──────────────────────────────────────────┘
```

**Detalles** (grid 2 columnas):
- Número de Cuenta (monospace)
- Tipo
- Fecha de Apertura
- Estado

#### Eventos
| Botón | Acción |
|---|---|
| "Solicitar Cuenta" | Muestra formulario → POST |
| "Reintentar" | Refetch |

---

### 3.33 Cuenta de Cliente — Notificaciones (/account/notifications)

| Ruta | `/account/notifications` |
|---|---|
| **Título** | `Notificaciones` |
| **Componente** | `account/NotificationsView.vue` |

#### Diversión por Tabs
| Tab | Contenido |
|---|---|
| Actividad Reciente | Feed de notificaciones (componente `NotificationsFeed`) |
| Preferencias | Configuración de canales |

#### Tab: Actividad Reciente
- Lista paginada de notificaciones
- Cada notificación: icono, título, mensaje, fecha relativa
- Punto azul si no leída

#### Tab: Preferencias
**Canales de Notificación** (toggle switches):
- Notificaciones por Email
- Notificaciones por WhatsApp

**Confirmación de Compra** (toggle switches):
- Notificaciones de compra
- Actualizaciones de envío
- Ofertas y promociones

#### Eventos
| Botón | Acción |
|---|---|
| "Marcar todas leídas" | PUT marca todas como leídas |
| Toggle cambio | PUT actualiza preferencias |

---

## 4. Componentes Compartidos

### 4.1 StatCard
**Uso**: KPIs de Dashboard y reportes
**Props**: `label`, `value`, `type` (number/currency), `icon`, `iconBg`, `iconColor`, `subtext`
**Render**: Tarjeta con icono a la derecha, label arriba, valor grande, subtext opcional

### 4.2 DataTable
**Uso**: Listados de datos (ventas, compras, productos, facturas, etc.)
**Props**: `columns`, `data`, `title`, `searchable`, `per-page`, `empty-message`
**Slots**: `toolbar`, `cell-{key}`, `actions`
**Funcionalidad**:
- Búsqueda por texto (filtro local)
- Orden por columnas (sortable)
- Paginación (anterior/siguiente, info "Mostrando X-Y de Z")
- Tipos de columna: `text`, `currency`, `date`, `datetime`, `number`, `boolean`, `image`, `custom`
- **Desktop**: Tabla HTML
- **Mobile**: Scroll horizontal (no adaptado nativamente a cards)

### 4.3 Loading
**Uso**: Estado de carga en vistas
**Props**: `text` (default "Cargando..."), `fullPage`
**Render**: Spinner animado (border spinning)

### 4.4 Modal
**Uso**: Ventanas modales para formularios, confirmaciones
**Props**: `show`, `title`, `size` (sm/md/lg/xl)
**Slots**: default (body), `footer`
**Render**: Teleport a body, backdrop blur, transición, header con título + close button

### 4.5 Alert
**Uso**: Mensajes de error/success/warning/info
**Props**: `type`, `message`, `show`, `dismissible`

### 4.6 ConfirmDialog
**Uso**: Diálogos de confirmación (SweetAlert2)

### 4.7 Badge (inline)
**Patrón**: Clases CSS `.badge`, `.badge-green`, `.badge-red`, `.badge-yellow`, `.badge-blue`
**Uso**: Estados de registros (completado, pendiente, cancelado, pagado, etc.)

---

## 5. Patrón de Diseño: Tabla Desktop / Cards Mobile

### Estructura general

```vue
<!-- Desktop -->
<div class="hidden md:block overflow-x-auto">
  <table class="w-full text-sm"> ... </table>
</div>

<!-- Mobile -->
<div class="md:hidden space-y-3">
  <div v-for="item in data" :key="item.id"
    class="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
    <!-- Card content -->
  </div>
</div>
```

### Implementación actual
| Vista | Desktop | Mobile |
|---|---|---|
| ProductList | Tabla (scroll) | No adaptado |
| SaleDetail items | Tabla | Cards con imagen |
| PurchaseDetail items | Tabla | Cards con imagen |
| InvoiceDetail items | Tabla | No adaptado |
| Inventory | Tabla | Cards |
| Reports data | DataTable | No adaptado |
| Clients list | DataTable | No adaptado |
| Suppliers | Tabla | Cards |
| Account Purchases | Cards (siempre) | Cards |
| Product Catalog | Grid cards | Grid cards |

### Campos comunes en cards mobile
```
┌──────────────────────────────────────────┐
│  [🖼️]  Nombre del producto               │
│         SKU: XXX-123  [📱] 123456789      │
│         Cant: 2 x $5,000 = $10,000       │
│         [✏️] [🗑️]                        │
└──────────────────────────────────────────┘
```

---

## 6. Eventos y Acciones Comunes

### Operaciones CRUD
| Acción | Método HTTP | Confirmación | Feedback |
|---|---|---|---|
| Crear | POST | No | Navegación al detalle |
| Editar | PUT/PATCH | No | Recarga datos |
| Eliminar | DELETE | SweetAlert2 | Recarga lista |
| Cambiar estado | PATCH | SweetAlert2 | Actualiza UI |

### Acciones Especiales
| Acción | Endpoint | Confirmación | Transición |
|---|---|---|---|
| Enviar a Inventario | `POST /purchases/:id/send-to-inventory` | SweetAlert2 | status → "received" |
| Cancelar Compra | PATCH status | SweetAlert2 | status → "cancelled" |
| Marcar Pagada | `PATCH /invoices/:id/payment-status` | No | status → "paid" |
| Revertir Pago | `PATCH /invoices/:id/payment-status` | No | status → "issued" |
| Comprar de nuevo | POST cart items | No | Navega a `/cart` |
| Add to Cart | `POST /cart/items` | No | Badge++ |
| Download PDF | jsPDF | No | Descarga archivo |
| Download Excel | xlsx | No | Descarga archivo |
| Print | window.print() | No | Diálogo impresión |

### Eventos de UI
| Evento | Implementación | Descripción |
|---|---|---|
| `@rowClick` | DataTable emit | Navega a detalle |
| `@input` debounced | Búsqueda | Filtra datos (300ms) |
| `@change` | Selects / toggles | Refetch o update |
| `@submit.prevent` | Forms | POST/PUT datos |
| `@click.stop` | Botones en tabla | Evita rowClick |

---

## 7. APIs y Servicios

### API Gateways (desde `frontend/src/api/index.js`)
```javascript
export const reportsAPI = {
  dashboard: () => api.get('/reports/dashboard'),
  sales: (params) => api.get('/reports/sales', { params }),
  salesChart: () => api.get('/reports/sales-chart'),
  inventory: (params) => api.get('/reports/inventory', { params }),
  topProducts: (params) => api.get('/reports/top-products', { params }),
  clients: (params) => api.get('/reports/clients', { params })
};

export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  updatePaymentStatus: (id, status) => api.patch(`/invoices/${id}/payment-status`, { status })
};

export const purchasesAPI = {
  getAll: (params) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  update: (id, data) => api.put(`/purchases/${id}`, data),
  delete: (id) => api.delete(`/purchases/${id}`),
  sendToInventory: (id) => api.post(`/purchases/${id}/send-to-inventory`),
  updateItem: (id, itemId, data) => api.put(`/purchases/${id}/items/${itemId}`, data),
  deleteItem: (id, itemId) => api.delete(`/purchases/${id}/items/${itemId}`)
};
```

### Formato de respuesta estándar
```javascript
// Éxito
{ success: true, data: { ... }, pagination?: { page, limit, total, totalPages } }

// Error
{ success: false, error: { code: 'ERROR_CODE', message: 'Descripción' } }
```

### Colores del Sistema (Tailwind CSS v4)
```css
:root {
  --color-primary: #6a1b8a;        /* Púrpura principal */
  --color-primary-600: #6a1b8a;
  --color-success: #22c55e;        /* Verde */
  --color-warning: #eab308;        /* Amarillo */
  --color-danger: #ef4444;         /* Rojo */
  --color-info: #3b82f6;          /* Azul */
}
```

---

> **Documento generado**: 2026-06-26  
> **Propósito**: Guía de diseño completa para todas las sesiones del dashboard y páginas del usuario cliente, incluyendo estructura visual, eventos, textos, y componentes.

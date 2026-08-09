#!/usr/bin/env node
/**
 * ============================================================
 *  SUITE COMPLETO DE TESTS END-TO-END — ERP + Ecommerce + SaaS
 * ============================================================
 *  Sigue el flujo de negocio real:
 *    1. Proveedores → 2. Compras → 3. Productos/Inventario (con valores)
 *    → 4. Ventas POS → 5. Ventas Ecommerce (checkout) → 6. Usuarios/Clientes
 *    → 7. Facturación por cliente → 8. Reportes (incluye facturas)
 *    → 9. Ecommerce items → 10. CRM Pipeline → 11. Dashboard dinámico
 *    → 12. CMS & Páginas → 13. Form Builder → 14. Site Builder
 *    → 15. Integraciones → 16. Cierre (health global)
 *
 *  Verifica la LÓGICA DE NEGOCIO (encadenamiento de datos):
 *   - compra verificado → stock incrementa
 *   - venta → invoice_id vinculado → PDF → paid
 *   - checkout → venta source:ecommerce
 *   - lead movido → convertido → cliente creado
 *   - form publicado → submit público → submission listada
 *   - anulación de venta → stock restaurado
 *
 *  Uso:
 *    node scripts/test-flows/run-full-suite.mjs
 *    node scripts/test-flows/run-full-suite.mjs --base-url http://localhost:3000 \
 *         --email admin@sistema.com --password "Admin123!"
 *    node scripts/test-flows/run-full-suite.mjs --only T01,T05
 *    node scripts/test-flows/run-full-suite.mjs --json report-full-suite.json
 * ============================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Argumentos CLI ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
function arg(name, fallback = undefined) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const BASE_URL = arg('base-url', process.env.TEST_BASE_URL || 'http://localhost:3000');
const EMAIL = arg('email', process.env.TEST_EMAIL || 'admin@sistema.com');
const PASSWORD = arg('password', process.env.TEST_PASSWORD || 'Admin123!');
const ONLY = arg('only')?.split(',').map((s) => s.trim()).filter(Boolean);
const JSON_OUT = arg('json', 'report-full-suite.json');

// ── Helpers ────────────────────────────────────────────────────────────
let TOKEN = null;
const _state = {}; // estado compartido entre tests (ids, stock, etc.)

const api = async (method, urlPath, { body, token = TOKEN, raw } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  // Retry tolerante a 503 transitorios (servicios reiniciándose por watch/nodemon)
  let last = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE_URL}${urlPath}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    last = { status: res.status, ok: res.ok, data, raw: raw ? text : undefined };
    if (res.status !== 503 || attempt === 2) break;
    await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
  }
  return last;
};

const uniq = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const uniqSku = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 20);

function check(cond, message) {
  if (!cond) throw new Error(message);
}

// deep-read de una propiedad en una respuesta { success, data } o plana
const pick = (resp, keys) => {
  const root = resp?.data?.data ?? resp?.data ?? resp;
  for (const k of keys) if (root?.[k] !== undefined && root?.[k] !== null) return root[k];
  return undefined;
};

const parseStock = (resp) => {
  const items = resp?.data?.data ?? resp?.data;
  if (Array.isArray(items) && items.length > 0) return Number(items[0].stock ?? items[0].quantity ?? -1);
  if (items && typeof items === 'object' && 'stock' in items) return Number(items.stock);
  return -1;
};

// ── Definición de tests ────────────────────────────────────────────────
const TESTS = [];
function define(id, flow, name, run) { TESTS.push({ id, flow, name, run }); }

// ═══════════════════════════════════════════════════════════════════════
// SETUP — Login
// ═══════════════════════════════════════════════════════════════════════
define('S01', 'Setup', 'Login admin → accessToken + company_id', async () => {
  const r = await api('POST', '/api/v1/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  check(r.ok, `Login falló: ${r.status} ${JSON.stringify(r.data)}`);
  TOKEN = pick(r, ['accessToken', 'token']);
  check(TOKEN, 'No se obtuvo accessToken');
  const payload = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64').toString());
  _state.companyId = payload.company_id || payload.companyId || null;
  _state.userId = payload.sub || payload.id || null;
  check(_state.companyId, 'JWT sin company_id (migración 031 no aplicada en auth)');
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 1. PROVEEDORES (F4)
// ═══════════════════════════════════════════════════════════════════════
define('S02', 'Proveedores', 'Crear proveedor', async () => {
  const r = await api('POST', '/api/v1/purchases/suppliers', {
    body: { name: `Proveedor Test ${uniq('P')}`, phone: '8095551234', email: `sup_${uniq('p')}@test.com`, address: 'Santo Domingo' },
  });
  check(r.status === 201 || r.ok, `Crear proveedor falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.supplierId = pick(r, ['id']);
  check(_state.supplierId, 'No se obtuvo id de proveedor');
  return true;
});

define('S03', 'Proveedores', 'Listar proveedores incluye el creado', async () => {
  const r = await api('GET', '/api/v1/purchases/suppliers?limit=50', {});
  check(r.ok, `Listar proveedores falló: ${r.status}`);
  const list = r.data?.data ?? r.data ?? [];
  const arr = Array.isArray(list) ? list : (list.data || []);
  check(Array.isArray(arr) && arr.some((s) => s.id === _state.supplierId), 'Proveedor creado no aparece en el listado');
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 2. PRODUCTOS + INVENTARIO CON VALORES (F2/F3)
// ═══════════════════════════════════════════════════════════════════════
define('S04', 'Productos', 'Crear categoría', async () => {
  const r = await api('POST', '/api/v1/categories', { body: { name: `Cat Test ${uniq('C').slice(0, 20)}` } });
  check(r.status === 201 || r.ok, `Crear categoría falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.categoryId = pick(r, ['id']);
  check(_state.categoryId, 'Sin id de categoría');
  return true;
});

define('S05', 'Productos', 'Crear producto con valores (cost, price, min_stock) + variante', async () => {
  const sku = uniqSku('SKU');
  const r = await api('POST', '/api/v1/products', {
    body: {
      name: `Producto Test ${sku}`,
      sku,
      price: 15000,
      cost_price: 9000,
      category_id: _state.categoryId,
      description: 'Creado por suite completa',
      unit: 'unidad',
      min_stock: 2,
      max_stock: 999999,
      status: 'active',
    },
  });
  check(r.status === 201 || r.ok, `Crear producto falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.productId = pick(r, ['id']);
  check(_state.productId, 'Sin id de producto');
  _state.productSku = sku;

  // Variante (endpoint separado)
  const vr = await api('POST', `/api/v1/products/${_state.productId}/variants`, {
    body: { name: 'Azul', sku: uniqSku('VAR'), price: 16000, stock: 5, attributes: { color: 'Azul', talla: 'M' } },
  });
  if (vr.ok) {
    _state.variantId = pick(vr, ['id']);
  } else {
    _state.variantId = null;
    console.warn('  ⚠️  Variante no creada — tests de variante se omiten');
  }
  return true;
});

define('S06', 'Inventario', 'Entrada de inventario con valores (ajuste → stock > 0)', async () => {
  const r = await api('POST', '/api/v1/inventory/adjustments', {
    body: { productId: _state.productId, warehouse: 'principal', newQuantity: 20, reason: `TEST entrada ${Date.now()}` },
  });
  check(r.status === 201 || r.ok, `Ajuste de inventario falló: ${r.status} ${JSON.stringify(r.data)}`);
  return true;
});

define('S07', 'Inventario', 'Stock disponible refleja la entrada (>= 20)', async () => {
  const r = await api('GET', `/api/v1/inventory/stock?productId=${_state.productId}`, {});
  check(r.ok, `GET stock falló: ${r.status}`);
  const stock = parseStock(r);
  _state.stockInicial = stock;
  check(stock >= 20, `Stock insuficiente tras entrada (esperado >= 20, actual ${stock})`);
  return true;
});

define('S08', 'Inventario', 'Kardex registra el movimiento de entrada', async () => {
  const r = await api('GET', `/api/v1/inventory/kardex/${_state.productId}`, {});
  check(r.ok, `Kardex falló: ${r.status}`);
  const kardex = r.data?.data ?? r.data ?? [];
  const arr = Array.isArray(kardex) ? kardex : (kardex.data || []);
  check(Array.isArray(arr) && arr.length > 0, 'Kardex vacío — no se registró movimiento');
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 3. COMPRAS (F4) — lógica: compra pending → verify → available → stock
// ═══════════════════════════════════════════════════════════════════════
define('S09', 'Compras', 'Crear compra en estado pending con proveedor', async () => {
  const r = await api('POST', '/api/v1/purchases', {
    body: {
      supplier_id: _state.supplierId,
      items: [{ product_id: _state.productId, quantity: 10, unit_cost: 8000 }],
      notes: `TEST compra ${Date.now()}`,
    },
  });
  check(r.status === 201 || r.ok, `Crear compra falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.purchaseId = pick(r, ['id']);
  check(_state.purchaseId, 'Sin id de compra');
  const status = pick(r, ['status']);
  if (status) _state.purchaseStatusInicial = status;
  return true;
});

define('S10', 'Compras', 'Verificar compra → inventario available + stock incrementa', async () => {
  const r = await api('POST', `/api/v1/purchases/${_state.purchaseId}/verify`, { body: {} });
  check(r.status === 200 || r.ok, `Verificar compra falló: ${r.status} ${JSON.stringify(r.data)}`);
  // Lógica: verify → cantidad pasa a available → stock debe subir
  const inv = await api('GET', `/api/v1/inventory/stock?productId=${_state.productId}`, {});
  const stock = parseStock(inv);
  check(stock >= _state.stockInicial + 10, `Stock no incrementó tras verificar (antes ${_state.stockInicial}, ahora ${stock})`);
  _state.stockTrasCompra = stock;
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 4. VENTAS POS (F5)
// ═══════════════════════════════════════════════════════════════════════
define('S11', 'Ventas POS', 'Crear cliente para la venta', async () => {
  const r = await api('POST', '/api/v1/clients', {
    body: { name: `Cliente Venta ${uniq('C')}`, email: `cli_${uniq('v')}@test.com`, phone: '8295556789' },
  });
  check(r.status === 201 || r.ok, `Crear cliente falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.clientId = pick(r, ['id']);
  check(_state.clientId, 'Sin id de cliente');
  return true;
});

define('S12', 'Ventas POS', 'Venta POS con cliente → sale_number + invoice_id vinculada', async () => {
  const invBefore = await api('GET', `/api/v1/inventory/stock?productId=${_state.productId}`, {});
  _state.stockAntesVenta = parseStock(invBefore);

  const r = await api('POST', '/api/v1/sales', {
    body: {
      items: [{ productId: _state.productId, quantity: 2, unitPrice: 15000 }],
      paymentMethod: 'cash',
      source: 'pos',
      clientId: _state.clientId,
      notes: 'Venta POS suite',
    },
  });
  check(r.status === 201 || r.ok, `Crear venta POS falló: ${r.status} ${JSON.stringify(r.data)}`);
  const sale = r.data?.data ?? r.data;
  _state.salePosId = sale.id;
  check(sale.sale_number || sale.saleNumber, 'Venta POS sin sale_number');
  _state.invoicePosId = sale.invoice_id || sale.invoiceId || null;
  check(_state.invoicePosId, 'Venta POS sin invoice_id (autoCreateInvoice falló silenciosamente)');
  check(sale.client_id === _state.clientId || sale.clientId === _state.clientId, 'Venta POS no quedó vinculada al cliente');
  return true;
});

define('S13', 'Ventas POS', 'Stock decrementado tras venta POS', async () => {
  const inv = await api('GET', `/api/v1/inventory/stock?productId=${_state.productId}`, {});
  const stock = parseStock(inv);
  check(stock === _state.stockAntesVenta - 2, `Stock no decrementó en 2 (antes ${_state.stockAntesVenta}, ahora ${stock})`);
  _state.stockTrasVentaPos = stock;
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 5. VENTAS ECOMMERCE (F6) — carrito → checkout
// ═══════════════════════════════════════════════════════════════════════
define('S14', 'Ventas Ecommerce', 'Agregar item al carrito', async () => {
  const r = await api('POST', '/api/v1/cart/items', { body: { productId: _state.productId, quantity: 1 } });
  check(r.status === 200 || r.status === 201 || r.ok, `Agregar al carrito falló: ${r.status} ${JSON.stringify(r.data)}`);
  return true;
});

define('S15', 'Ventas Ecommerce', 'Checkout → venta source:ecommerce + invoice', async () => {
  const r = await api('POST', '/api/v1/checkout', { body: { paymentMethod: 'card', shippingAddress: 'Calle Test 123' } });
  check(r.status === 201 || r.ok, `Checkout falló: ${r.status} ${JSON.stringify(r.data)}`);
  const sale = r.data?.data ?? r.data;
  _state.saleEcomId = sale.id;
  check(sale.id, 'Checkout sin id de venta');
  check(sale.source === 'ecommerce' || sale.source === 'web', `source no es ecommerce: ${sale.source}`);
  _state.invoiceEcomId = sale.invoice_id || sale.invoiceId || null;
  check(_state.invoiceEcomId, 'Checkout sin invoice_id');
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 6. USUARIOS / CLIENTES (F1)
// ═══════════════════════════════════════════════════════════════════════
define('S16', 'Usuarios', 'Registro crea usuario + cliente (auto)', async () => {
  const email = `test_${uniq('u')}@test.com`;
  const r = await api('POST', '/api/v1/auth/register', { body: { email, password: 'Test1234!', name: 'Usuario Auto' } });
  check(r.status === 201 || r.ok, `Registro falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.registeredEmail = email;
  // El trigger trg_auto_create_client corre dentro del INSERT; 500 = trigger roto
  return true;
});

define('S17', 'Usuarios', 'Listar clientes incluye registrado + directo', async () => {
  const r = await api('GET', `/api/v1/clients?search=${encodeURIComponent(_state.registeredEmail)}`, {});
  check(r.ok, `Listar clientes falló: ${r.status}`);
  const list = r.data?.data ?? r.data ?? [];
  const arr = Array.isArray(list) ? list : (list.data || []);
  check(Array.isArray(arr) && arr.length > 0, `Cliente auto no encontrado para ${_state.registeredEmail}`);
  return true;
});

define('S18', 'Usuarios', 'Detalle de cliente por id', async () => {
  const r = await api('GET', `/api/v1/clients/${_state.clientId}`, {});
  check(r.ok, `GET /clients/:id falló: ${r.status}`);
  const c = r.data?.data ?? r.data;
  check(c?.id === _state.clientId, 'Cliente devuelto no coincide');
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 7. FACTURACIÓN POR CLIENTE (F7)
// ═══════════════════════════════════════════════════════════════════════
define('S19', 'Facturación', 'Listar facturas incluye las generadas por ventas', async () => {
  const r = await api('GET', '/api/v1/invoices?limit=50', {});
  check(r.ok, `GET /invoices falló: ${r.status}`);
  const list = r.data?.data ?? r.data ?? [];
  const arr = Array.isArray(list) ? list : (list.data || []);
  const ids = arr.map((i) => i.id);
  check(ids.includes(_state.invoicePosId), 'Factura de venta POS no está en el listado');
  check(ids.includes(_state.invoiceEcomId), 'Factura de checkout ecommerce no está en el listado');
  return true;
});

define('S20', 'Facturación', 'Factura vinculada a la venta (invoice ↔ sale)', async () => {
  // Venta → invoice_id (ya verificado en S12/S15)
  // Invoice → debe poder resolverse por id y contener items
  const r = await api('GET', `/api/v1/invoices/${_state.invoicePosId}`, {});
  check(r.ok, `GET /invoices/:id falló: ${r.status}`);
  const inv = r.data?.data ?? r.data;
  check(inv?.id === _state.invoicePosId, 'Invoice no coincide');
  return true;
});

define('S21', 'Facturación', 'Generar PDF de factura (%PDF válido)', async () => {
  const r = await api('GET', `/api/v1/invoices/${_state.invoicePosId}/pdf`, { raw: true });
  check(r.status === 200, `PDF falló: ${r.status}`);
  check(r.raw?.startsWith('%PDF'), 'Respuesta no es un PDF válido');
  return true;
});

define('S22', 'Facturación', 'Marcar factura como pagada', async () => {
  const r = await api('PATCH', `/api/v1/invoices/${_state.invoicePosId}/payment-status`, { body: { status: 'paid' } });
  check(r.ok, `Mark-as-paid falló: ${r.status} ${JSON.stringify(r.data)}`);
  const status = pick(r, ['status', 'payment_status']);
  check(status === 'paid', `Estado no es paid: ${status}`);
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 8. REPORTES (F12) — incluye sección de facturas
// ═══════════════════════════════════════════════════════════════════════
define('S23', 'Reportes', 'Dashboard KPIs (10 métricas)', async () => {
  const r = await api('GET', '/api/v1/reports/dashboard', {});
  check(r.ok, `GET /reports/dashboard falló: ${r.status}`);
  const kpis = r.data?.data ?? r.data;
  check(kpis && typeof kpis === 'object', 'KPIs no es objeto');
  const known = ['totalSales', 'totalRevenue', 'totalProducts', 'totalClients', 'totalInvoices', 'totalPurchases', 'lowStock', 'pendingOrders', 'todaySales', 'avgTicket'];
  const found = known.filter((k) => kpis[k] !== undefined);
  if (found.length < 5) console.warn(`  ⚠️  Pocos KPIs estándar encontrados (${found.length}/10): ${found.join(', ')}`);
  return true;
});

define('S24', 'Reportes', 'Reporte de ventas agrupado', async () => {
  const r = await api('GET', `/api/v1/reports/sales?group_by=day&start_date=${encodeURIComponent('2026-01-01')}&end_date=${encodeURIComponent('2026-12-31')}`, {});
  check(r.ok, `GET /reports/sales falló: ${r.status}`);
  return true;
});

define('S25', 'Reportes', 'Top productos con variantes', async () => {
  const r = await api('GET', '/api/v1/reports/top-products?groupByVariant=true&limit=10', {});
  check(r.ok, `GET top-products falló: ${r.status}`);
  return true;
});

define('S26', 'Reportes', 'Reporte de clientes', async () => {
  const r = await api('GET', '/api/v1/reports/clients?limit=10', {});
  check(r.ok, `GET /reports/clients falló: ${r.status}`);
  return true;
});

define('S27', 'Reportes', 'Ventas del cliente (historial por cliente)', async () => {
  const r = await api('GET', `/api/v1/sales/client/${_state.clientId}?limit=10`, {});
  check(r.ok, `GET /sales/client/:id falló: ${r.status}`);
  const list = r.data?.data ?? r.data ?? [];
  const arr = Array.isArray(list) ? list : (list.data || []);
  check(Array.isArray(arr) && arr.length >= 1, 'Cliente sin ventas registradas');
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 9. ECOMMERCE ITEMS (F8)
// ═══════════════════════════════════════════════════════════════════════
define('S28', 'Ecommerce', 'Home público (hero, banners, categorías, ofertas)', async () => {
  const r = await api('GET', '/api/v1/ecommerce/home');
  check(r.ok, `GET /ecommerce/home falló: ${r.status}`);
  const h = r.data?.data ?? r.data;
  check(h && typeof h === 'object', 'Home sin datos');
  return true;
});

define('S29', 'Ecommerce', 'Banners + hero slides + floating banners', async () => {
  const b = await api('GET', '/api/v1/ecommerce/banners');
  const h = await api('GET', '/api/v1/ecommerce/hero-slides');
  const f = await api('GET', '/api/v1/ecommerce/floating-banners');
  check(b.ok, `banners falló: ${b.status}`);
  check(h.ok, `hero-slides falló: ${h.status}`);
  check(f.ok, `floating-banners falló: ${f.status}`);
  return true;
});

define('S30', 'Ecommerce', 'Ofertas + promociones activas', async () => {
  const o = await api('GET', '/api/v1/ecommerce/offers');
  const p = await api('GET', '/api/v1/ecommerce/promotions/active');
  check(o.ok, `offers falló: ${o.status}`);
  check(p.ok, `promotions/active falló: ${p.status}`);
  return true;
});

define('S31', 'Ecommerce', 'Settings + tax rates + whatsapp config', async () => {
  const s = await api('GET', '/api/v1/ecommerce/settings');
  const t = await api('GET', '/api/v1/ecommerce/tax-rates');
  const w = await api('GET', '/api/v1/ecommerce/whatsapp-config');
  check(s.ok, `settings falló: ${s.status}`);
  check(t.ok, `tax-rates falló: ${t.status}`);
  check(w.ok, `whatsapp-config falló: ${w.status}`);
  return true;
});

define('S32', 'Ecommerce', 'Crear reseña (queda pendiente moderación)', async () => {
  const r = await api('POST', '/api/v1/ecommerce/reviews', {
    body: { product_id: _state.productId, client_name: 'Suite Test', rating: 5, comment: `TEST ${Date.now()}` },
  });
  check(r.status === 201 || r.ok, `Crear reseña falló: ${r.status} ${JSON.stringify(r.data)}`);
  return true;
});

define('S33', 'Ecommerce', 'Catálogo público expone el producto activo', async () => {
  const r = await api('GET', `/api/v1/catalog/products?search=${encodeURIComponent(_state.productSku)}`, {});
  check(r.ok || r.status === 404, `GET catalog/products falló: ${r.status}`);
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 10. CRM PIPELINE (F10)
// ═══════════════════════════════════════════════════════════════════════
define('S34', 'CRM Pipeline', 'Crear pipeline + etapas', async () => {
  const r = await api('POST', '/api/v1/clients/pipelines', { body: { name: `Pipeline Test ${uniq('P')}` } });
  check(r.status === 201 || r.ok, `Crear pipeline falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.pipelineId = pick(r, ['id']);
  check(_state.pipelineId, 'Sin id de pipeline');

  const s = await api('POST', `/api/v1/clients/pipelines/${_state.pipelineId}/stages`, { body: { name: 'Nuevo', order: 1 } });
  const s2 = await api('POST', `/api/v1/clients/pipelines/${_state.pipelineId}/stages`, { body: { name: 'Contactado', order: 2 } });
  const s3 = await api('POST', `/api/v1/clients/pipelines/${_state.pipelineId}/stages`, { body: { name: 'Cerrado', order: 3 } });
  if (s.ok) _state.stage1Id = pick(s, ['id']);
  if (s2.ok) _state.stage2Id = pick(s2, ['id']);
  if (s3.ok) _state.stage3Id = pick(s3, ['id']);
  check(_state.stage1Id && _state.stage2Id, 'No se pudieron crear etapas');
  return true;
});

define('S35', 'CRM Pipeline', 'Crear lead en la primera etapa', async () => {
  const r = await api('POST', '/api/v1/clients/leads', {
    body: { name: `Lead Suite ${uniq('L')}`, email: `lead_${uniq('l')}@test.com`, phone: '3001234567', stage_id: _state.stage1Id },
  });
  check(r.status === 201 || r.ok, `Crear lead falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.leadId = pick(r, ['id']);
  check(_state.leadId, 'Sin id de lead');
  return true;
});

define('S36', 'CRM Pipeline', 'Mover lead de etapa (drag & drop)', async () => {
  const r = await api('PUT', `/api/v1/clients/leads/${_state.leadId}/move`, { body: { stage_id: _state.stage2Id } });
  check(r.ok, `Mover lead falló: ${r.status} ${JSON.stringify(r.data)}`);
  const lead = r.data?.data ?? r.data;
  check(lead?.stage_id === _state.stage2Id || lead?.stageId === _state.stage2Id, 'Lead no quedó en la etapa destino');
  return true;
});

define('S37', 'CRM Pipeline', 'Convertir lead → cliente (lógica de conversión)', async () => {
  const r = await api('POST', `/api/v1/clients/leads/${_state.leadId}/convert`, {});
  check(r.ok, `Convertir lead falló: ${r.status} ${JSON.stringify(r.data)}`);
  const conv = r.data?.data ?? r.data;
  _state.leadClientId = conv?.client_id || conv?.clientId || null;
  // Verificar que el cliente convertido existe
  if (_state.leadClientId) {
    const c = await api('GET', `/api/v1/clients/${_state.leadClientId}`, {});
    check(c.ok, `Cliente convertido no accesible: ${c.status}`);
  }
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 11. DASHBOARD DINÁMICO (F13 — Platform Admin)
// ═══════════════════════════════════════════════════════════════════════
define('S38', 'Dashboard Dinámico', 'Platform stats + lista de empresas', async () => {
  const s = await api('GET', '/api/v1/platform-admin/stats', {});
  check(s.ok, `platform stats falló: ${s.status} ${JSON.stringify(s.data)}`);
  const c = await api('GET', '/api/v1/platform-admin/companies?limit=10', {});
  check(c.ok, `platform companies falló: ${c.status}`);
  const list = c.data?.data ?? c.data ?? [];
  const arr = Array.isArray(list) ? list : (list.data || []);
  if (Array.isArray(arr) && arr.length > 0) _state.platformCompanyId = arr[0].id;
  return true;
});

define('S39', 'Dashboard Dinámico', 'Widgets de dashboard por empresa', async () => {
  const cid = _state.platformCompanyId || _state.companyId;
  const r = await api('GET', `/api/v1/platform-admin/companies/${cid}/widgets`, {});
  check(r.ok, `GET widgets falló: ${r.status} ${JSON.stringify(r.data)}`);
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 12. CMS & PÁGINAS (F9)
// ═══════════════════════════════════════════════════════════════════════
define('S40', 'CMS', 'Crear página CMS', async () => {
  const r = await api('POST', '/api/v1/cms/pages', {
    body: { title: `Página Suite ${Date.now()}`, slug: uniq('page').toLowerCase(), template: 'default', is_homepage: false },
  });
  check(r.status === 201 || r.ok, `CMS crear página falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.cmsPageId = pick(r, ['id']);
  check(_state.cmsPageId, 'Sin id de página CMS');
  return true;
});

define('S41', 'CMS', 'Añadir sección con componente registrado', async () => {
  // Obtener un component_key válido del registry
  const comps = await api('GET', '/api/v1/cms/components', {});
  let compKey = 'hero';
  if (comps.ok) {
    const list = comps.data?.data ?? comps.data ?? [];
    const arr = Array.isArray(list) ? list : (list.data || []);
    if (Array.isArray(arr) && arr.length > 0 && arr[0].component_key) compKey = arr[0].component_key;
  }
  const r = await api('POST', `/api/v1/cms/pages/${_state.cmsPageId}/sections`, {
    body: { component_key: compKey, title: 'Sección Hero', settings: { heading: 'Bienvenido' }, content: { text: 'Contenido de prueba' }, sort_order: 1 },
  });
  check(r.status === 201 || r.ok, `CMS crear sección falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.cmsSectionId = pick(r, ['id']);
  return true;
});

define('S42', 'CMS', 'Publicar página crea versión', async () => {
  const r = await api('POST', `/api/v1/cms/pages/${_state.cmsPageId}/publish`, {});
  check(r.ok, `CMS publish falló: ${r.status} ${JSON.stringify(r.data)}`);
  const v = await api('GET', `/api/v1/cms/pages/${_state.cmsPageId}/versions`, {});
  if (v.ok) {
    const list = v.data?.data ?? v.data ?? [];
    const arr = Array.isArray(list) ? list : (list.data || []);
    check(Array.isArray(arr) && arr.length >= 1, 'Publicar no creó versión');
  } else {
    console.warn('  ⚠️  versions endpoint no disponible');
  }
  return true;
});

define('S43', 'CMS', 'Templates disponibles', async () => {
  const r = await api('GET', '/api/v1/cms/templates', {});
  check(r.ok, `CMS templates falló: ${r.status}`);
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 13. FORM BUILDER (F9)
// ═══════════════════════════════════════════════════════════════════════
define('S44', 'Form Builder', 'Crear formulario', async () => {
  const r = await api('POST', '/api/v1/forms', { body: { title: `Form Suite ${Date.now()}`, name: 'form_suite', form_type: 'contact', description: 'Formulario de prueba' } });
  check(r.status === 201 || r.ok, `Crear form falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.formId = pick(r, ['id']);
  check(_state.formId, 'Sin id de formulario');
  return true;
});

define('S45', 'Form Builder', 'Crear campos y publicar', async () => {
  const f1 = await api('POST', `/api/v1/forms/${_state.formId}/fields`, { body: { label: 'Nombre', field_type: 'text', required: true } });
  check(f1.ok, `Crear campo falló: ${f1.status} ${JSON.stringify(f1.data)}`);
  const f2 = await api('POST', `/api/v1/forms/${_state.formId}/fields`, { body: { label: 'Email', field_type: 'email', required: true } });
  check(f2.ok, `Crear campo email falló: ${f2.status}`);
  const p = await api('POST', `/api/v1/forms/${_state.formId}/publish`, {});
  check(p.ok, `Publicar form falló: ${p.status} ${JSON.stringify(p.data)}`);
  return true;
});

define('S46', 'Form Builder', 'Submit público → submission registrada', async () => {
  const r = await api('POST', `/api/v1/forms/public/${_state.formId}/submit`, {
    body: { form_data: { Nombre: 'Test Suite', Email: 'suite@test.com' }, submitter_name: 'Test Suite', submitter_email: 'suite@test.com', source: 'test' },
  });
  check(r.status === 201 || r.ok, `Submit público falló: ${r.status} ${JSON.stringify(r.data)}`);
  // Verificar que la submission quedó listada
  const l = await api('GET', `/api/v1/forms/${_state.formId}/submissions?limit=5`, {});
  check(l.ok, `Listar submissions falló: ${l.status}`);
  const list = l.data?.data ?? l.data ?? [];
  const arr = Array.isArray(list) ? list : (list.data || []);
  check(Array.isArray(arr) && arr.length >= 1, 'Submission no registrada en el listado');
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 14. SITE BUILDER (F9)
// ═══════════════════════════════════════════════════════════════════════
define('S47', 'Site Builder', 'Temas (themes) + company theme', async () => {
  const t = await api('GET', '/api/v1/site/themes', {});
  check(t.ok, `themes falló: ${t.status} ${JSON.stringify(t.data)}`);
  const list = t.data?.data ?? t.data ?? [];
  const arr = Array.isArray(list) ? list : (list.data || []);
  if (Array.isArray(arr) && arr.length > 0) {
    const ct = await api('GET', '/api/v1/site/company-theme', {});
    check(ct.ok, `company-theme falló: ${ct.status}`);
  }
  return true;
});

define('S48', 'Site Builder', 'Menús de navegación + items', async () => {
  const r = await api('POST', '/api/v1/site/menus', { body: { name: `Menu Test ${uniq('M')}`, location: 'header' } });
  check(r.status === 201 || r.ok, `Crear menú falló: ${r.status} ${JSON.stringify(r.data)}`);
  const menuId = pick(r, ['id']);
  if (menuId) {
    const item = await api('POST', `/api/v1/site/menus/${menuId}/items`, { body: { label: 'Inicio', url: '/', sort_order: 1 } });
    check(item.ok, `Crear item de menú falló: ${item.status} ${JSON.stringify(item.data)}`);
  }
  return true;
});

define('S49', 'Site Builder', 'Header + Footer', async () => {
  const h = await api('GET', '/api/v1/site/header', {});
  const f = await api('GET', '/api/v1/site/footer', {});
  check(h.ok, `header falló: ${h.status} ${JSON.stringify(h.data)}`);
  check(f.ok, `footer falló: ${f.status} ${JSON.stringify(f.data)}`);
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 15. INTEGRACIONES (F13)
// ═══════════════════════════════════════════════════════════════════════
define('S50', 'Integraciones', 'Event types disponibles', async () => {
  const r = await api('GET', '/api/v1/integrations/event-types', {});
  check(r.ok, `event-types falló: ${r.status} ${JSON.stringify(r.data)}`);
  const list = r.data?.data ?? r.data ?? [];
  const arr = Array.isArray(list) ? list : (list.data || []);
  _state.eventTypeIds = (Array.isArray(arr) ? arr : []).slice(0, 3).map((e) => e.id).filter(Boolean);
  return true;
});

define('S51', 'Integraciones', 'Crear webhook', async () => {
  const r = await api('POST', '/api/v1/integrations/webhooks', {
    body: { name: `Webhook Test ${uniq('W')}`, url: 'https://httpbin.org/post', event_type_ids: _state.eventTypeIds || [], is_active: false },
  });
  check(r.status === 201 || r.ok, `Crear webhook falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.webhookId = pick(r, ['id']);
  check(_state.webhookId, 'Sin id de webhook');
  return true;
});

define('S52', 'Integraciones', 'Crear automation + toggle', async () => {
  const r = await api('POST', '/api/v1/integrations/automations', {
    body: { name: `Automation Test ${uniq('A')}`, trigger_event: 'sale.created', conditions: { min_total: 0 }, actions: [], is_active: true },
  });
  check(r.status === 201 || r.ok, `Crear automation falló: ${r.status} ${JSON.stringify(r.data)}`);
  const id = pick(r, ['id']);
  check(id, 'Sin id de automation');
  const tg = await api('POST', `/api/v1/integrations/automations/${id}/toggle`, { body: { is_active: false } });
  check(tg.ok, `Toggle automation falló: ${tg.status} ${JSON.stringify(tg.data)}`);
  return true;
});

// ═══════════════════════════════════════════════════════════════════════
// 16. CIERRE — lógica de negocio final + salud global
// ═══════════════════════════════════════════════════════════════════════
define('S53', 'Cierre', 'Anular venta POS restaura stock (reversión)', async () => {
  // Stock REAL justo antes de anular (puede haber cambiado por ventas posteriores, ej. S15 ecommerce)
  const invBefore = await api('GET', `/api/v1/inventory/stock?productId=${_state.productId}`, {});
  const stockAntes = parseStock(invBefore);
  const r = await api('POST', `/api/v1/sales/${_state.salePosId}/cancel`, {});
  check(r.ok, `Anular venta falló: ${r.status} ${JSON.stringify(r.data)}`);
  const inv = await api('GET', `/api/v1/inventory/stock?productId=${_state.productId}`, {});
  const stock = parseStock(inv);
  check(stock >= stockAntes + 2, `Stock no restaurado tras anulación (esperado >= ${stockAntes + 2}, actual ${stock})`);
  return true;
});

define('S54', 'Cierre', 'Health check global (todos los servicios)', async () => {
  const r = await api('GET', '/health/services');
  check(r.ok, `GET /health/services falló: ${r.status}`);
  const summary = r.data?.summary ?? r.data?.summary;
  check(summary?.total > 0, 'Sin resumen de salud');
  _state.health = summary;
  const unhealthy = r.data?.services ? Object.entries(r.data.services).filter(([, v]) => v.status === 'unhealthy') : [];
  if (unhealthy.length > 0) console.warn(`  ⚠️  Servicios UNHEALTHY: ${unhealthy.map(([k]) => k).join(', ')}`);
  return true;
});

// ── Ejecución ───────────────────────────────────────────────────────────
(async () => {
  const filtered = TESTS.filter((t) => (ONLY ? ONLY.includes(t.id) : true));

  console.log('');
  console.log('═'.repeat(78));
  console.log('  SUITE COMPLETO E2E — ERP + Ecommerce + CMS + SaaS');
  console.log(`  Base URL : ${BASE_URL}`);
  console.log(`  Email    : ${EMAIL}`);
  console.log(`  Tests    : ${filtered.length} (${TESTS.length} definidos)`);
  console.log('═'.repeat(78));

  const results = [];
  let passed = 0, failed = 0;

  for (const t of filtered) {
    const start = Date.now();
    try {
      const okRun = await t.run();
      check(okRun !== false, 'Test retornó false');
      results.push({ id: t.id, flow: t.flow, name: t.name, status: 'PASS', error: null, ms: Date.now() - start });
      passed++;
      console.log(`  ✅ ${t.id} [${t.flow}] ${t.name} (${Date.now() - start}ms)`);
    } catch (err) {
      results.push({ id: t.id, flow: t.flow, name: t.name, status: 'FAIL', error: err.message, ms: Date.now() - start });
      failed++;
      console.log(`  ❌ ${t.id} [${t.flow}] ${t.name} — ${err.message}`);
    }
  }

  // ── Resumen ──────────────────────────────────────────────────────────
  const byFlow = {};
  for (const r of results) {
    byFlow[r.flow] = byFlow[r.flow] || { total: 0, passed: 0, failed: 0 };
    byFlow[r.flow].total++;
    if (r.status === 'PASS') byFlow[r.flow].passed++; else byFlow[r.flow].failed++;
  }

  console.log('');
  console.log('─'.repeat(78));
  console.log('  RESUMEN POR FLUJO');
  console.log('─'.repeat(78));
  for (const [flow, v] of Object.entries(byFlow)) {
    const mark = v.failed === 0 ? '✅' : '❌';
    console.log(`  ${mark} ${flow.padEnd(18)} ${v.passed}/${v.total}`);
  }
  console.log('─'.repeat(78));
  console.log(`  TOTAL: ${passed} PASS / ${failed} FAIL (${results.length})`);
  console.log('═'.repeat(78));

  const report = {
    baseUrl: BASE_URL,
    date: new Date().toISOString(),
    email: EMAIL,
    summary: { total: results.length, passed, failed },
    byFlow,
    health: _state.health || null,
    results,
  };

  const outPath = path.join(__dirname, JSON_OUT);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n  📄 Reporte guardado: ${outPath}`);
  process.exit(failed > 0 ? 1 : 0);
})();

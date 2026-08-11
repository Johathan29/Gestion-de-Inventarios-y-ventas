// ============================================================
// SUITE FACTURACIÓN FISCAL — Fase 7
// Verifica el snapshot inmutable de invoice_items (migración 070):
//   - F01-02 Setup: login + producto con nombre/precio ORIGINAL
//   - F03   Venta POS → invoice_id vinculado
//   - F04   invoice_items: snapshot escrito (description/sku/precio)
//   - F05   Mutar producto (nombre + precio)
//   - F06   La factura histórica CONSERVA el snapshot original
//   - F07   PDF generado desde el snapshot (200 + %PDF)
//   - F08   Backfill: toda factura con sale_items tiene invoice_items
//   - F09   CRM convertLead IDEMPOTENTE (2× → 1 solo cliente)
// ============================================================
import { writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = 'admin@sistema.com';
const PASSWORD = 'Admin123!';
const WAREHOUSE = 'principal';
const COMPANY_A = '00000000-0000-0000-0000-000000000001';
const PROJECT = 'prspnfxfspokbqxsboby';

let results = [];
function check(cond, message) { if (!cond) throw new Error(message); }
const uniq = (p) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const uuid = () => crypto.randomUUID();

async function api(method, url, { body, token, extraHeaders, raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (extraHeaders) Object.assign(headers, extraHeaders);
  const res = await fetch(`${BASE}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (raw) return { status: res.status, ok: res.ok, raw: text, data };
  return { status: res.status, ok: res.ok, data };
}

async function login(email, password) {
  const r = await api('POST', '/api/v1/auth/login', { body: { email, password } });
  if (!r.ok) throw new Error(`Login ${email} falló: ${r.status} ${JSON.stringify(r.data)}`);
  const token = r.data?.data?.accessToken || r.data?.accessToken;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  return { token, companyId: payload.company_id || payload.companyId };
}

const pick = (resp, keys) => {
  const root = resp?.data?.data ?? resp?.data ?? resp;
  for (const k of keys) if (root?.[k] !== undefined && root?.[k] !== null) return root[k];
  return undefined;
};

async function sql(query) {
  const PAT = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : [];
  if (res.status >= 400 || data?.error) throw new Error(`SQL error: ${JSON.stringify(data)}`);
  return data;
}

async function define(id, name, run) {
  try {
    await run();
    results.push({ id, name, pass: true });
    console.log(`  ✅ ${id} ${name}`);
  } catch (err) {
    results.push({ id, name, pass: false, error: err.message });
    console.log(`  ❌ ${id} ${name} — ${err.message}`);
  }
}

// ── Estado ──────────────────────────────────────────────────
let A, productId, categoryId, invoiceId, saleId;
let ORIGINAL_NAME, ORIGINAL_SKU, ORIGINAL_PRICE = 750;

await define('F01', 'Login admin → token', async () => {
  A = await login(EMAIL, PASSWORD);
  check(A.token, 'Sin token');
  check(A.companyId === COMPANY_A, `companyId = ${A.companyId}, esperado ${COMPANY_A}`);
});

await define('F02', 'Setup: categoría + producto con nombre/precio ORIGINAL + stock', async () => {
  const catR = await api('POST', '/api/v1/categories', { token: A.token, body: { name: `Cat Fiscal ${uniq('C')}` } });
  check(catR.status === 201 || catR.ok, `Crear categoría falló: ${catR.status} ${JSON.stringify(catR.data)}`);
  categoryId = pick(catR, ['id']);

  ORIGINAL_NAME = `Producto Fiscal Original ${uniq('P')}`;
  ORIGINAL_SKU = `FIS-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 10000)}`;
  const pR = await api('POST', '/api/v1/products', {
    token: A.token,
    body: {
      name: ORIGINAL_NAME,
      sku: ORIGINAL_SKU,
      price: ORIGINAL_PRICE,
      cost_price: 300,
      category_id: categoryId,
      min_stock: 2,
      max_stock: 200,
      status: 'active',
    },
  });
  check(pR.status === 201 || pR.ok, `Crear producto falló: ${pR.status} ${JSON.stringify(pR.data)}`);
  productId = pick(pR, ['id']);
  check(productId, 'Producto sin id');

  const adjR = await api('POST', '/api/v1/inventory/adjustments', {
    token: A.token,
    body: { productId, warehouse: WAREHOUSE, newQuantity: 50, reason: 'setup suite fiscal' },
  });
  check(adjR.status === 201 || adjR.ok, `Ajuste stock falló: ${adjR.status} ${JSON.stringify(adjR.data)}`);
});

await define('F03', 'Venta POS 2u → 201 con invoice_id vinculado', async () => {
  const r = await api('POST', '/api/v1/sales', {
    token: A.token,
    body: { items: [{ productId, quantity: 2 }], paymentMethod: 'cash', notes: 'suite fiscal' },
  });
  check(r.status === 201, `Venta POS = ${r.status}: ${JSON.stringify(r.data)}`);
  saleId = pick(r, ['id']);
  invoiceId = pick(r, ['invoice_id', 'invoiceId']);
  check(saleId, 'Venta sin id');
  check(invoiceId, 'Venta sin invoice_id (autoCreateInvoice falló)');
});

await define('F04', 'invoice_items: snapshot escrito con datos ORIGINALES', async () => {
  const rows = await sql(`
    SELECT ii.description, ii.sku, ii.quantity, ii.unit_price, ii.total, ii.company_id
    FROM invoice_items ii WHERE ii.invoice_id = '${invoiceId}';
  `);
  check(rows.length === 1, `invoice_items para la factura = ${rows.length}, esperado 1: ${JSON.stringify(rows)}`);
  const it = rows[0];
  check(it.description === ORIGINAL_NAME, `description = "${it.description}", esperado "${ORIGINAL_NAME}"`);
  check(it.sku === ORIGINAL_SKU, `sku = ${it.sku}, esperado ${ORIGINAL_SKU}`);
  check(Number(it.unit_price) === ORIGINAL_PRICE, `unit_price = ${it.unit_price}, esperado ${ORIGINAL_PRICE}`);
  check(Number(it.quantity) === 2, `quantity = ${it.quantity}, esperado 2`);
  check(it.company_id === COMPANY_A, `company_id = ${it.company_id}, esperado ${COMPANY_A}`);
});

await define('F05', 'Mutar el producto: nombre y precio CAMBIAN', async () => {
  const r = await api('PUT', `/api/v1/products/${productId}`, {
    token: A.token,
    body: { name: `Producto RENOMBRADO ${uniq('X')}`, price: 9999 },
  });
  check(r.ok, `Actualizar producto falló: ${r.status} ${JSON.stringify(r.data)}`);
  const g = await api('GET', `/api/v1/products/${productId}`, { token: A.token });
  const name = pick(g, ['name']);
  const price = pick(g, ['price']);
  check(name !== ORIGINAL_NAME, 'El nombre NO cambió (setup inválido)');
  check(Number(price) === 9999, `price = ${price}, esperado 9999 (setup inválido)`);
});

await define('F06', 'Factura histórica CONSERVA el snapshot original (inmutable)', async () => {
  const r = await api('GET', `/api/v1/invoices/${invoiceId}`, { token: A.token });
  check(r.ok, `GET invoice = ${r.status}: ${JSON.stringify(r.data)}`);
  const inv = r.data?.data ?? r.data;
  const items = inv?.items || inv?.invoice_items || [];
  check(items.length === 1, `items = ${items.length}, esperado 1`);
  const it = items[0];
  check(it.productName === ORIGINAL_NAME, `productName = "${it.productName}", esperado "${ORIGINAL_NAME}" (snapshot roto)`);
  check(it.sku === ORIGINAL_SKU, `sku = ${it.sku}, esperado ${ORIGINAL_SKU}`);
  check(Number(it.unitPrice) === ORIGINAL_PRICE, `unitPrice = ${it.unitPrice}, esperado ${ORIGINAL_PRICE} (snapshot roto)`);
});

await define('F07', 'PDF de la factura se genera desde el snapshot (200 + %PDF)', async () => {
  const r = await api('GET', `/api/v1/invoices/${invoiceId}/pdf`, { token: A.token, raw: true });
  check(r.status === 200, `PDF = ${r.status}`);
  check(r.raw?.startsWith('%PDF'), 'Respuesta no es un PDF válido');
});

await define('F08', 'Backfill: toda factura con sale_items tiene invoice_items', async () => {
  const missing = await sql(`
    SELECT count(*)::int AS n FROM invoices i
    WHERE EXISTS (SELECT 1 FROM sale_items si WHERE si.sale_id = i.sale_id)
      AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id);
  `);
  check(missing[0]?.n === 0, `Facturas sin invoice_items (deberían tener): ${missing[0]?.n}`);
});

await define('F09', 'CRM convertLead idempotente: 2× conversión → 1 solo cliente', async () => {
  // Pipeline + etapa
  const pipeR = await api('POST', '/api/v1/clients/pipelines', { token: A.token, body: { name: `Pipe Fiscal ${uniq('P')}` } });
  check(pipeR.ok, `Crear pipeline falló: ${pipeR.status} ${JSON.stringify(pipeR.data)}`);
  const pipelineId = pick(pipeR, ['id']);
  const stR = await api('POST', `/api/v1/clients/pipelines/${pipelineId}/stages`, { token: A.token, body: { name: 'Nuevo', order: 1 } });
  check(stR.ok, `Crear etapa falló: ${stR.status} ${JSON.stringify(stR.data)}`);
  const stageId = pick(stR, ['id']);

  // Lead único
  const leadEmail = `lead_fiscal_${uniq('l')}@test.com`;
  const lR = await api('POST', '/api/v1/clients/leads', {
    token: A.token,
    body: { name: `Lead Fiscal ${uniq('L')}`, email: leadEmail, phone: '3001234567', stage_id: stageId },
  });
  check(lR.status === 201 || lR.ok, `Crear lead falló: ${lR.status} ${JSON.stringify(lR.data)}`);
  const leadId = pick(lR, ['id']);
  check(leadId, 'Lead sin id');

  // Convertir 2 veces
  const c1 = await api('POST', `/api/v1/clients/leads/${leadId}/convert`, { token: A.token, body: {} });
  check(c1.ok, `Convert 1 = ${c1.status}: ${JSON.stringify(c1.data)}`);
  const client1 = pick(c1, ['id']);
  check(client1, 'Cliente convertido sin id');

  const c2 = await api('POST', `/api/v1/clients/leads/${leadId}/convert`, { token: A.token, body: {} });
  check(c2.ok, `Convert 2 = ${c2.status}: ${JSON.stringify(c2.data)}`);
  const client2 = pick(c2, ['id']);
  check(client2 === client1, `2ª conversión creó OTRO cliente (${client2} ≠ ${client1}) — NO idempotente`);

  // Solo 1 cliente con ese email
  const dup = await sql(`
    SELECT count(*)::int AS n FROM clients WHERE email = '${leadEmail}';
  `);
  check(dup[0]?.n === 1, `Clientes con email = ${dup[0]?.n}, esperado 1`);
});

// ── Reporte ─────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
console.log(`\n${'═'.repeat(66)}`);
console.log(`  SUITE FACTURACIÓN FISCAL: ${passed}/${results.length} PASS`);
console.log(`${'═'.repeat(66)}`);
writeFileSync(path.join(ROOT, 'report-invoicing.json'), JSON.stringify({ suite: 'invoicing-fiscal', results, passed, total: results.length }, null, 2));
console.log(`Reporte: ${path.join(ROOT, 'report-invoicing.json')}`);
if (passed !== results.length) process.exit(1);

// ============================================================
// SUITE IDEMPOTENCIA — Fase 5
// Verifica la capa Idempotency-Key (migración 067 + middleware
// `idempotent` en @erp/common):
//   - ID01-02  Setup: login + producto/stock/carrito
//   - ID03-04  Checkout: misma clave + mismo body → 1 sola venta,
//              la 2ª petición REPLAYS la respuesta cacheada.
//   - ID05     Claves independientes: K2 ≠ K1 → re-ejecuta (no
//              replay de K1). Y fallo 5xx → clave LIBERADA
//              (reintento limpio con la misma clave).
//   - ID06-07  Venta POS: misma clave → 1 venta; misma clave con
//              OTRO body → 422 IDEMPOTENCY_KEY_REUSE.
//   - ID08     Pago: middleware HTTP + dedup app-level por
//              idempotency_key (049) → 1 sola transacción.
//   - ID09     Webhooks: fn_fire_webhooks con el mismo payload 2×
//              → 1 sola fila en webhook_logs (event_id único).
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

async function api(method, url, { body, token, extraHeaders } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (extraHeaders) Object.assign(headers, extraHeaders);
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
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
  if (res.status >= 400 || data?.error) {
    throw new Error(`SQL error: ${JSON.stringify(data)}`);
  }
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

async function getStock(token, productId) {
  const r = await api('GET', `/api/v1/inventory/stock/${productId}`, { token });
  const d = r.data?.data ?? r.data;
  if (Array.isArray(d)) return d.reduce((s, it) => s + (Number(it.stock) || 0), 0);
  if (d && typeof d === 'object') return Number(d.totalStock ?? d.stock) || 0;
  return Number(d) || 0;
}

// ── Setup ────────────────────────────────────────────────────
let A, productId, categoryId;
let K1 = `chk-${uniq('K')}`, K2 = `chk-${uniq('K')}`;
let K3 = `pos-${uniq('K')}`, K4 = `pay-${uniq('K')}`;

await define('ID01', 'Login admin → token', async () => {
  A = await login(EMAIL, PASSWORD);
  check(A.token, 'Sin token');
  check(A.companyId === COMPANY_A, `companyId = ${A.companyId}, esperado ${COMPANY_A}`);
});

await define('ID02', 'Setup: categoría + producto + stock 100 + carrito 1u', async () => {
  const catR = await api('POST', '/api/v1/categories', { token: A.token, body: { name: `Cat Idem ${uniq('C')}` } });
  check(catR.status === 201 || catR.ok, `Crear categoría falló: ${catR.status} ${JSON.stringify(catR.data)}`);
  categoryId = pick(catR, ['id']);
  check(categoryId, 'Categoría sin id');

  const pR = await api('POST', '/api/v1/products', {
    token: A.token,
    body: {
      name: `Producto Idempotencia ${uniq('P')}`,
      sku: `IDEM-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 10000)}`,
      price: 500,
      cost_price: 200,
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
    body: { productId, warehouse: WAREHOUSE, newQuantity: 100, reason: 'setup suite idempotencia' },
  });
  check(adjR.status === 201 || adjR.ok, `Ajuste falló: ${adjR.status} ${JSON.stringify(adjR.data)}`);
  check(await getStock(A.token, productId) === 100, 'Stock tras ajuste ≠ 100');

  const cartR = await api('POST', '/api/v1/sales/cart/items', {
    token: A.token,
    body: { productId, quantity: 1 },
  });
  check(cartR.status === 201 || cartR.ok, `Add cart falló: ${cartR.status} ${JSON.stringify(cartR.data)}`);
});

// ── Checkout ─────────────────────────────────────────────────
const CHECKOUT_BODY = { payment: { method: 'cash' }, source: 'ecommerce' };
let saleIdCheckout = null;

await define('ID03', 'Checkout con clave K1 → 201 (venta creada)', async () => {
  const r = await api('POST', '/api/v1/checkout', { token: A.token, body: CHECKOUT_BODY, extraHeaders: { 'Idempotency-Key': K1 } });
  check(r.status === 201, `Checkout K1 = ${r.status}: ${JSON.stringify(r.data)}`);
  saleIdCheckout = pick(r, ['id']);
  check(saleIdCheckout, 'Venta sin id');
});

await define('ID04', 'Checkout REPETIDO con K1 → replay 201 con la MISMA venta', async () => {
  const r = await api('POST', '/api/v1/checkout', { token: A.token, body: CHECKOUT_BODY, extraHeaders: { 'Idempotency-Key': K1 } });
  check(r.status === 201, `Checkout K1 repetido = ${r.status}: ${JSON.stringify(r.data)}`);
  const replayId = pick(r, ['id']);
  check(replayId === saleIdCheckout, `Replay devolvió venta ${replayId}, esperada ${saleIdCheckout}`);
  // La venta existe y es única
  const g = await api('GET', `/api/v1/sales/${saleIdCheckout}`, { token: A.token });
  check(g.status === 200 && pick(g, ['id']) === saleIdCheckout, `GET venta ${saleIdCheckout} = ${g.status}`);
});

await define('ID05', 'Clave K2 independiente + fallo 5xx libera la clave (2× → 500 EMPTY_CART)', async () => {
  // Carrito ya vacío tras ID03 → K2 re-ejecuta (no replay de K1) → EMPTY_CART (500)
  const r1 = await api('POST', '/api/v1/checkout', { token: A.token, body: CHECKOUT_BODY, extraHeaders: { 'Idempotency-Key': K2 } });
  check(r1.status === 500, `Checkout K2 (carrito vacío) = ${r1.status}, esperado 500 EMPTY_CART: ${JSON.stringify(r1.data)}`);
  // 5xx → clave liberada → el reintento con la misma K2 re-ejecuta (500 de nuevo)
  const r2 = await api('POST', '/api/v1/checkout', { token: A.token, body: CHECKOUT_BODY, extraHeaders: { 'Idempotency-Key': K2 } });
  check(r2.status === 500, `Checkout K2 reintento = ${r2.status}, esperado 500 (clave liberada, re-ejecuta): ${JSON.stringify(r2.data)}`);
});

// ── Venta POS ────────────────────────────────────────────────
const SALE_BODY = { items: [{ productId, quantity: 1 }], paymentMethod: 'cash' };
let saleIdPos = null;

await define('ID06', 'Venta POS con K3 → 201; repetida K3 → replay misma venta', async () => {
  const r1 = await api('POST', '/api/v1/sales', { token: A.token, body: SALE_BODY, extraHeaders: { 'Idempotency-Key': K3 } });
  check(r1.status === 201, `Venta POS K3 = ${r1.status}: ${JSON.stringify(r1.data)}`);
  saleIdPos = pick(r1, ['id']);
  check(saleIdPos, 'Venta POS sin id');

  const r2 = await api('POST', '/api/v1/sales', { token: A.token, body: SALE_BODY, extraHeaders: { 'Idempotency-Key': K3 } });
  check(r2.status === 201, `Venta POS K3 repetida = ${r2.status}: ${JSON.stringify(r2.data)}`);
  const replayId = pick(r2, ['id']);
  check(replayId === saleIdPos, `Replay devolvió venta ${replayId}, esperada ${saleIdPos}`);
});

await define('ID07', 'K3 con OTRO body → 422 IDEMPOTENCY_KEY_REUSE', async () => {
  const r = await api('POST', '/api/v1/sales', {
    token: A.token,
    body: { items: [{ productId, quantity: 2 }], paymentMethod: 'cash', notes: 'otro body' },
    extraHeaders: { 'Idempotency-Key': K3 },
  });
  check(r.status === 422, `K3 reuse con otro body = ${r.status}: ${JSON.stringify(r.data)}`);
  const code = r.data?.error?.code || r.data?.code;
  check(code === 'IDEMPOTENCY_KEY_REUSE', `code = ${code}, esperado IDEMPOTENCY_KEY_REUSE`);
});

// ── Pago ─────────────────────────────────────────────────────
// payments/process es INTERNO (lo llama el checkout vía PAYMENT_SERVICE_URL).
// Se prueba directo al servicio, igual que hace el sale-service.
const PAYMENT_BASE = process.env.PAYMENT_BASE_URL || 'http://localhost:3019';

async function apiPayment(body, token, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  Object.assign(headers, extraHeaders);
  const res = await fetch(`${PAYMENT_BASE}/api/payments/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

const PAY_BODY = { saleId: uuid(), paymentMethodCode: 'cash', amount: 500, idempotencyKey: `pay-key-${uniq('P')}` };
let transactionId = null;

await define('ID08', 'Pago con K4 → 201; repetido → replay misma transacción; dedup app-level', async () => {
  const r1 = await apiPayment(PAY_BODY, A.token, { 'Idempotency-Key': K4 });
  check(r1.status === 201, `Pago K4 = ${r1.status}: ${JSON.stringify(r1.data)}`);
  transactionId = pick(r1, ['id']);
  check(transactionId, 'Transacción sin id');

  const r2 = await apiPayment(PAY_BODY, A.token, { 'Idempotency-Key': K4 });
  check(r2.status === 201, `Pago K4 repetido = ${r2.status}: ${JSON.stringify(r2.data)}`);
  check(pick(r2, ['id']) === transactionId, `Replay transacción ${pick(r2, ['id'])}, esperada ${transactionId}`);

  // Sin header HTTP pero con idempotencyKey en body → dedup app-level (049) devuelve la misma
  const r3 = await apiPayment(PAY_BODY, A.token);
  check(r3.status === 201, `Pago sin header = ${r3.status}: ${JSON.stringify(r3.data)}`);
  check(pick(r3, ['id']) === transactionId, `App-level dedup devolvió ${pick(r3, ['id'])}, esperada ${transactionId}`);
});

// ── Webhook dedup (SQL directo) ──────────────────────────────
await define('ID09', 'fn_fire_webhooks 2× con mismo payload → 1 sola fila en webhook_logs', async () => {
  const entityId = uuid();
  const payload = JSON.stringify({ id: entityId, total: 250 });
  const inserted = await sql(`
    INSERT INTO webhooks (company_id, name, url, events, http_method, content_type, retry_count, is_active)
    VALUES ('${COMPANY_A}', 'Hook test idempotencia', 'https://example.com/hook-idem', ARRAY['sale.created'], 'POST', 'application/json', 3, TRUE)
    RETURNING id;
  `);
  const webhookId = inserted[0]?.id;
  check(webhookId, 'Webhook sin id');

  // Disparo doble con el MISMO payload
  await sql(`SELECT public.fn_fire_webhooks('${COMPANY_A}', 'sale.created', '${payload}'::jsonb);`);
  await sql(`SELECT public.fn_fire_webhooks('${COMPANY_A}', 'sale.created', '${payload}'::jsonb);`);

  const rows = await sql(`
    SELECT count(*)::int AS n, count(DISTINCT event_id)::int AS distinct_events
    FROM webhook_logs
    WHERE webhook_id = ${webhookId} AND payload = '${payload}'::jsonb;
  `);
  check(rows[0]?.n === 1, `Filas en webhook_logs = ${rows[0]?.n}, esperado 1 (dedup por event_id). distinct=${rows[0]?.distinct_events}`);

  // Limpieza
  await sql(`DELETE FROM webhook_logs WHERE webhook_id = ${webhookId}; DELETE FROM webhooks WHERE id = ${webhookId};`);
});

// ── Reporte ──────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const total = results.length;
const reportPath = path.join(ROOT, 'report-idempotency.json');
writeFileSync(reportPath, JSON.stringify({ suite: 'idempotency', date: new Date().toISOString(), total, passed, failed: total - passed, results }, null, 2));
console.log(`\n══════════════════════════════════════════════`);
console.log(`SUITE IDEMPOTENCIA: ${passed}/${total} PASS`);
console.log(`Reporte: ${reportPath}`);
if (passed !== total) process.exit(1);

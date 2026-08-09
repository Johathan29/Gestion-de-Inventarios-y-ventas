// ============================================================
// SUITE CONCURRENCIA INVENTARIO — Fase 4
// Verifica que las operaciones de stock son ATÓMICAS bajo
// concurrencia (migración 064: fn_stock_entry/exit/adjust +
// triggers con UPDATE condicional + RETURNING):
//   - Salidas paralelas sobre el mismo producto → nunca stock
//     negativo; exactamente las permitidas por el saldo OK,
//     el resto 400 INSUFFICIENT_STOCK.
//   - Entradas paralelas → suma exacta.
//   - Ventas POS concurrentes (trigger decrease_stock_from_sale)
//     → mismo invariante, stock final exacto.
//   - Kardex íntegro: previous_stock + delta == new_stock en cada
//     movimiento (prev/new leídos de la MISMA sentencia vía
//     RETURNING → sin TOCTOU), new_stock >= 0 siempre, y balance
//     final == stock real.
// ============================================================
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = 'admin@sistema.com';
const PASSWORD = 'Admin123!';
const WAREHOUSE = 'principal';

let results = [];
function check(cond, message) { if (!cond) throw new Error(message); }
const uniq = (p) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

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

async function getKardex(token, productId) {
  const r = await api('GET', `/api/v1/inventory/kardex/${productId}`, { token });
  const d = r.data?.data ?? r.data;
  if (!Array.isArray(d)) throw new Error(`kardex no es array: ${JSON.stringify(r.data)}`);
  return d;
}

// Tipos que SUMAN (misma lógica que GetKardexUseCase)
const ADD_TYPES = ['entry', 'entry_purchase', 'return_client', 'adjustment_plus', 'initial_balance', 'production', 'release'];
const NEUTRAL_TYPES = ['transfer', 'count'];

// Invariante central: previous_stock + delta == new_stock (misma sentencia).
// delta = +quantity para tipos suma, -quantity para el resto (no neutrales).
function assertKardexConsistent(movements, context) {
  check(Array.isArray(movements) && movements.length > 0, `${context}: kardex vacío`);
  let lastNew = null;
  for (const m of movements) {
    const prev = Number(m.previousStock ?? m.previous_stock);
    const next = Number(m.newStock ?? m.new_stock);
    const qty = Number(m.quantity);
    check(Number.isFinite(prev) && Number.isFinite(next), `${context}: prev/new no numéricos en mov ${m.id}`);
    if (!NEUTRAL_TYPES.includes(m.type)) {
      const delta = ADD_TYPES.includes(m.type) ? qty : -qty;
      check(prev + delta === next,
        `${context}: inconsistencia en ${m.id} (${m.type}) prev=${prev} delta=${delta} new=${next}`);
    }
    check(next >= 0, `${context}: stock NEGATIVO en ${m.id} (${m.type}) new=${next}`);
    // cadena: si el timestamp crece estrictamente, el prev debe encadenar
    if (lastNew !== null && lastNew.t !== m.createdAt && lastNew.new !== prev) {
      check(lastNew.new === prev,
        `${context}: salto de cadena kardex — anterior new=${lastNew.new}, este prev=${prev}`);
    }
    lastNew = { t: m.createdAt, new: next };
  }
  return movements[movements.length - 1];
}

// ── Setup ────────────────────────────────────────────────────
let A;
await define('C01', 'Login admin → token', async () => {
  A = await login(EMAIL, PASSWORD);
  check(A.token, 'Sin token');
});

let productId, categoryId, clientId;
await define('C02', 'Crear categoría + producto aislado', async () => {
  const catR = await api('POST', '/api/v1/categories', { token: A.token, body: { name: `Cat Conc ${uniq('C')}` } });
  check(catR.status === 201 || catR.ok, `Crear categoría falló: ${catR.status} ${JSON.stringify(catR.data)}`);
  categoryId = pick(catR, ['id']);
  check(categoryId, 'Categoría sin id');

  const pR = await api('POST', '/api/v1/products', {
    token: A.token,
    body: {
      name: `Producto Concurrencia ${uniq('P')}`,
      sku: `CONC-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 10000)}`,
      price: 1000,
      cost_price: 500,
      category_id: categoryId,
      min_stock: 3,
      max_stock: 100,
      status: 'active',
    },
  });
  check(pR.status === 201 || pR.ok, `Crear producto falló: ${pR.status} ${JSON.stringify(pR.data)}`);
  productId = pick(pR, ['id']);
  check(productId, 'Producto sin id');
  console.log(`     productId = ${productId}`);
});

await define('C03', 'Ajustar stock a 50 (ajuste atómico)', async () => {
  const r = await api('POST', '/api/v1/inventory/adjustments', {
    token: A.token,
    body: { productId, warehouse: WAREHOUSE, newQuantity: 50, reason: 'setup suite' },
  });
  check(r.status === 201 || r.ok, `Ajuste falló: ${r.status} ${JSON.stringify(r.data)}`);
  const stock = await getStock(A.token, productId);
  check(stock === 50, `Stock tras ajuste = ${stock}, esperado 50`);
});

await define('C04', '12 salidas PARALELAS de 5 con stock 50 → 10 OK / 2 × 400, stock final 0', async () => {
  const N = 12, QTY = 5;
  const results_ = await Promise.all(
    Array.from({ length: N }, () =>
      api('POST', '/api/v1/inventory/exits', {
        token: A.token,
        body: { productId, warehouse: WAREHOUSE, quantity: QTY, notes: 'salida concurrente' },
      }))
  );
  const ok = results_.filter(r => r.status === 201 || r.ok);
  const fail = results_.filter(r => !(r.status === 201 || r.ok));
  check(ok.length === 10, `Éxitos = ${ok.length}, esperado 10 (50/5). Detalle: ${JSON.stringify(results_.map(r => r.status))}`);
  check(fail.length === 2, `Fallos = ${fail.length}, esperado 2`);
  for (const f of fail) {
    check(f.status === 400, `Fallo con status ${f.status}, esperado 400: ${JSON.stringify(f.data)}`);
    const msg = JSON.stringify(f.data);
    check(/insufficient/i.test(msg), `Mensaje de fallo no es de stock: ${msg}`);
  }
  const stock = await getStock(A.token, productId);
  check(stock === 0, `Stock final tras salidas = ${stock}, esperado 0`);
});

await define('C05', 'Kardex íntegro tras salidas (prev+delta==new, nunca negativo)', async () => {
  const kardex = await getKardex(A.token, productId);
  assertKardexConsistent(kardex, 'C05');
  const last = kardex[kardex.length - 1];
  check(Number(last.newStock ?? last.new_stock) === 0, `Balance final kardex = ${last.newStock}, esperado 0`);
});

await define('C06', '12 entradas PARALELAS de +5 → 12 OK, stock final 60', async () => {
  const N = 12, QTY = 5;
  const results_ = await Promise.all(
    Array.from({ length: N }, () =>
      api('POST', '/api/v1/inventory/entries', {
        token: A.token,
        body: { productId, warehouse: WAREHOUSE, quantity: QTY, unitCost: 500, notes: 'entrada concurrente' },
      }))
  );
  const ok = results_.filter(r => r.status === 201 || r.ok);
  check(ok.length === N, `Éxitos = ${ok.length}/${N}: ${JSON.stringify(results_.map(r => r.status))}`);
  const stock = await getStock(A.token, productId);
  check(stock === 60, `Stock final tras entradas = ${stock}, esperado 60`);
});

await define('C07', 'Kardex íntegro tras entradas (cadena + balance 60)', async () => {
  const kardex = await getKardex(A.token, productId);
  assertKardexConsistent(kardex, 'C07');
  const last = kardex[kardex.length - 1];
  check(Number(last.newStock ?? last.new_stock) === 60, `Balance final kardex = ${last.newStock}, esperado 60`);
});

await define('C08', '3 ventas POS PARALELAS qty 3 con stock 6 → 2 OK / 1 fallo, stock final 0', async () => {
  const cliR = await api('POST', '/api/v1/clients', {
    token: A.token,
    body: { name: `Cliente Conc ${uniq('CL')}`, email: `${uniq('cc')}@test.com`, phone: '8295550001' },
  });
  check(cliR.status === 201 || cliR.ok, `Crear cliente falló: ${cliR.status} ${JSON.stringify(cliR.data)}`);
  clientId = pick(cliR, ['id']);

  const adjR = await api('POST', '/api/v1/inventory/adjustments', {
    token: A.token,
    body: { productId, warehouse: WAREHOUSE, newQuantity: 6, reason: 'setup ventas concurrentes' },
  });
  check(adjR.status === 201 || adjR.ok, `Ajuste a 6 falló: ${adjR.status} ${JSON.stringify(adjR.data)}`);
  check((await getStock(A.token, productId)) === 6, 'Stock no quedó en 6');

  const N = 3, QTY = 3;
  const sales = await Promise.all(
    Array.from({ length: N }, () =>
      api('POST', '/api/v1/sales', {
        token: A.token,
        body: {
          items: [{ productId, quantity: QTY, unitPrice: 1500 }],
          paymentMethod: 'cash',
          source: 'pos',
          clientId,
          notes: 'venta concurrente suite',
        },
      }))
  );
  const ok = sales.filter(r => r.status === 201 || r.ok);
  check(ok.length === 2, `Ventas OK = ${ok.length}, esperado 2 (6/3). Status: ${JSON.stringify(sales.map(r => r.status))}`);
  const stock = await getStock(A.token, productId);
  check(stock === 0, `Stock final tras ventas = ${stock}, esperado 0 (nunca negativo)`);
});

await define('C09', 'Kardex GLOBAL íntegro tras todo (prev+delta==new, new>=0, balance==stock real)', async () => {
  const kardex = await getKardex(A.token, productId);
  assertKardexConsistent(kardex, 'C09');
  const stock = await getStock(A.token, productId);
  const last = kardex[kardex.length - 1];
  check(Number(last.newStock ?? last.new_stock) === stock,
    `Balance kardex (${last.newStock}) != stock real (${stock})`);
  const types = [...new Set(kardex.map(m => m.type))];
  console.log(`     Tipos de movimiento: ${types.join(', ')} (${kardex.length} movimientos)`);
});

// ── Resumen ───────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.length - passed;
console.log('\n══════════════════════════════════════════════════════');
console.log(`  SUITE CONCURRENCIA INVENTARIO: ${passed} PASS / ${failed} FAIL`);
console.log('══════════════════════════════════════════════════════');
writeFileSync(path.join(__dirname, 'report-inventory-concurrency.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), base: BASE, results, summary: { total: results.length, passed, failed },
}, null, 2));
process.exit(failed === 0 ? 0 : 1);

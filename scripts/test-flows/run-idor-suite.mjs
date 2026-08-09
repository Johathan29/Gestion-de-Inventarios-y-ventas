// ============================================================
// SUITE IDOR + AISLAMIENTO TENANT — Fase 3
// Verifica que un usuario de empresa B NO puede leer/escribir
// datos de empresa A a través del gateway, y viceversa.
//   - Lectura cruzada (GET por id, listados) → 404/empty
//   - Escritura cruzada (PUT/DELETE) → 404/403
//   - Header spoofing x-company-id → ignorado (JWT manda)
//   - Sanity: cada tenant opera solo en sus datos
// ============================================================
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL_A = 'admin@sistema.com';
const PASSWORD_A = 'Admin123!';
const EMAIL_B = 'adminb@test.com';
const PASSWORD_B = 'Admin123!';

let results = [];
function check(cond, message) { if (!cond) throw new Error(message); }

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
  return { token, companyId: payload.company_id || payload.companyId, role: payload.role };
}

// deep-read de una propiedad en { success, data } o plana
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

// ── Setup ─────────────────────────────────────────────────────
let A, B;
await define('I01', 'Login A (admin@sistema.com) → companyId A', async () => {
  A = await login(EMAIL_A, PASSWORD_A);
  check(A.token, 'Sin token A');
  console.log(`     companyId A = ${A.companyId}`);
});
await define('I02', 'Login B (adminb@test.com) → companyId B ≠ A', async () => {
  B = await login(EMAIL_B, PASSWORD_B);
  check(B.token, 'Sin token B');
  check(B.companyId !== A.companyId, `companyId B igual a A: ${B.companyId}`);
  console.log(`     companyId B = ${B.companyId}`);
});

// ── Datos de referencia en A ──────────────────────────────────
let productAId, categoryAId, clientAId, invoiceAId, productBId;
await define('I03', 'A crea categoría de referencia', async () => {
  const r = await api('POST', '/api/v1/categories', { token: A.token, body: { name: `Cat IDOR A ${Date.now()}` } });
  check(r.ok, `POST categoría A: ${r.status} ${JSON.stringify(r.data).slice(0,200)}`);
  categoryAId = pick(r, ['id']);
  check(categoryAId, 'Sin id de categoría A');
});
await define('I04', 'A crea producto de referencia', async () => {
  const sku = `IDOR-A-${Date.now().toString(36).toUpperCase()}`;
  const r = await api('POST', '/api/v1/products', {
    token: A.token,
    body: { name: 'Producto IDOR A', sku, price: 100, cost_price: 50, category_id: categoryAId, min_stock: 0, max_stock: 999999, status: 'active' },
  });
  check(r.ok, `POST producto A: ${r.status} ${JSON.stringify(r.data).slice(0,200)}`);
  productAId = pick(r, ['id']);
  check(productAId, 'Sin id de producto A');
});
await define('I05', 'A crea cliente de referencia', async () => {
  const r = await api('POST', '/api/v1/clients', {
    token: A.token,
    body: { name: `Cliente IDOR A ${Date.now()}`, email: `idor_a_${Date.now()}@test.com`, phone: '8090000001' },
  });
  check(r.ok, `POST cliente A: ${r.status} ${JSON.stringify(r.data).slice(0,200)}`);
  clientAId = pick(r, ['id']);
  check(clientAId, 'Sin id de cliente A');
});
await define('I06', 'A obtiene invoiceId de referencia (primera factura)', async () => {
  const r = await api('GET', '/api/v1/invoices?limit=5', { token: A.token });
  const list = r.data?.data?.data ?? r.data?.data ?? [];
  check(Array.isArray(list) && list.length > 0, `Sin facturas en A: ${r.status}`);
  invoiceAId = list[0].id;
  check(invoiceAId, 'Sin invoiceId');
});

// ── Aislamiento de LECTURA (B no ve datos de A) ───────────────
await define('I07', 'B NO puede leer producto de A por id (404)', async () => {
  const r = await api('GET', `/api/v1/products/${productAId}`, { token: B.token });
  check(r.status === 404 || r.status === 403 || (r.ok && !pick(r, ['id'])),
    `GET producto A con token B → ${r.status} (debe ser 404/403 o vacío)`);
});
await define('I08', 'B listando productos NO ve el de A', async () => {
  const r = await api('GET', '/api/v1/products?limit=200', { token: B.token });
  const list = r.data?.data?.data ?? r.data?.data ?? [];
  check(!list.some(p => p.id === productAId), `Listado de B incluye producto de A (${productAId})`);
});
await define('I09', 'B NO puede leer categoría de A (404)', async () => {
  const r = await api('GET', `/api/v1/categories/${categoryAId}`, { token: B.token });
  check(r.status === 404 || r.status === 403 || (r.ok && !pick(r, ['id'])),
    `GET categoría A con token B → ${r.status}`);
});
await define('I10', 'B NO puede leer cliente de A por id (404)', async () => {
  const r = await api('GET', `/api/v1/clients/${clientAId}`, { token: B.token });
  check(r.status === 404 || r.status === 403 || (r.ok && !pick(r, ['id'])),
    `GET cliente A con token B → ${r.status}`);
});
await define('I11', 'B NO puede leer factura de A (404)', async () => {
  const r = await api('GET', `/api/v1/invoices/${invoiceAId}`, { token: B.token });
  check(r.status === 404 || r.status === 403 || (r.ok && !pick(r, ['id'])),
    `GET factura A con token B → ${r.status}`);
});

// ── Aislamiento de ESCRITURA (B no modifica datos de A) ───────
await define('I12', 'B NO puede actualizar producto de A (404/403)', async () => {
  const r = await api('PUT', `/api/v1/products/${productAId}`, { token: B.token, body: { name: 'HACK', price: 1 } });
  check(r.status === 404 || r.status === 403, `PUT producto A con token B → ${r.status} (debe ser 404/403)`);
});
await define('I13', 'B NO puede eliminar/descontinuar producto de A (404/403)', async () => {
  const r = await api('DELETE', `/api/v1/products/${productAId}`, { token: B.token });
  check(r.status === 404 || r.status === 403, `DELETE producto A con token B → ${r.status} (debe ser 404/403)`);
});

// ── Sanity: B opera en SU tenant ──────────────────────────────
await define('I14', 'B crea producto en SU empresa (201, company_id=B)', async () => {
  // B necesita su propia categoría (createProductSchema exige category_id)
  const catR = await api('POST', '/api/v1/categories', { token: B.token, body: { name: `Cat IDOR B ${Date.now()}` } });
  check(catR.ok, `POST categoría B: ${catR.status} ${JSON.stringify(catR.data).slice(0,200)}`);
  const catBId = pick(catR, ['id']);
  const sku = `IDOR-B-${Date.now().toString(36).toUpperCase()}`;
  const r = await api('POST', '/api/v1/products', {
    token: B.token,
    body: { name: 'Producto IDOR B', sku, price: 200, cost_price: 80, category_id: catBId, min_stock: 0, max_stock: 999999, status: 'active' },
  });
  check(r.ok, `POST producto B: ${r.status} ${JSON.stringify(r.data).slice(0,200)}`);
  productBId = pick(r, ['id']);
  check(productBId, 'Sin id de producto B');
  const payload = JSON.parse(Buffer.from(B.token.split('.')[1], 'base64').toString());
  check(payload.company_id === B.companyId, 'JWT B no coincide con companyId B');
});
await define('I15', 'A NO ve el producto de B por id (404)', async () => {
  const r = await api('GET', `/api/v1/products/${productBId}`, { token: A.token });
  check(r.status === 404 || r.status === 403 || (r.ok && !pick(r, ['id'])),
    `GET producto B con token A → ${r.status}`);
});
await define('I16', 'A listando productos NO ve el de B', async () => {
  const r = await api('GET', '/api/v1/products?limit=500', { token: A.token });
  const list = r.data?.data?.data ?? r.data?.data ?? [];
  check(!list.some(p => p.id === productBId), `Listado de A incluye producto de B (${productBId})`);
});
await define('I17', 'B puede leer SU producto (sanity)', async () => {
  const r = await api('GET', `/api/v1/products/${productBId}`, { token: B.token });
  check(r.ok && pick(r, ['id']) === productBId, `GET producto B con token B → ${r.status}`);
});

// ── Header spoofing x-company-id ──────────────────────────────
await define('I18', 'A + header x-company-id=B → sigue viendo SOLO datos de A', async () => {
  const r = await api('GET', '/api/v1/products?limit=500', { token: A.token, extraHeaders: { 'x-company-id': B.companyId } });
  const list = r.data?.data?.data ?? r.data?.data ?? [];
  check(!list.some(p => p.id === productBId), `Spoof: A con header B vio producto de B`);
  check(list.some(p => p.id === productAId), `Spoof: A con header B perdió sus propios productos`);
});
await define('I19', 'B + header x-company-id=A → sigue viendo SOLO datos de B', async () => {
  const r = await api('GET', '/api/v1/products?limit=500', { token: B.token, extraHeaders: { 'x-company-id': A.companyId } });
  const list = r.data?.data?.data ?? r.data?.data ?? [];
  check(!list.some(p => p.id === productAId), `Spoof: B con header A vio producto de A`);
  check(list.some(p => p.id === productBId), `Spoof: B con header A perdió sus propios productos`);
});

// ── Resumen ───────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.length - passed;
console.log('\n══════════════════════════════════════════════════════');
console.log(`  SUITE IDOR + AISLAMIENTO TENANT: ${passed} PASS / ${failed} FAIL`);
console.log('══════════════════════════════════════════════════════');
writeFileSync(path.join(__dirname, 'report-idor-suite.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), base: BASE, results, summary: { total: results.length, passed, failed },
}, null, 2));
process.exit(failed === 0 ? 0 : 1);

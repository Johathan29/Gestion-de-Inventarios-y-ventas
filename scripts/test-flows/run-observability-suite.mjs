// ============================================================================
// SUITE OBSERVABILIDAD FASE 9 — request_id/trace_id, métricas Prometheus,
//   /health/live + /health/ready, audit_logs inmutable con correlación
// ============================================================================
//   O01 Login → body y headers con request_id/trace_id
//   O02 x-request-id propio → eco en body y headers
//   O03 GET /metrics → texto Prometheus (requests_total, histograma, uptime)
//   O04 GET /health/live → 200 + requestId
//   O05 GET /health/ready → 200/503 tolerado, database + webhookQueue poblados
//   O06 audit_logs: columnas request_id/trace_id existen (SQL)
//   O07 audit_logs inmutable: UPDATE/DELETE bloqueados 42501 + fn_purge segura
//   O08 Evento de auditoría guarda request_id (correlación end-to-end)
//   O09 Error 404 → error.request_id / error.trace_id presentes
//   O10 Métrica de negocio: checkout OK → aurora_checkout_success_total >= 1
// ============================================================================

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sistema.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin123!';
const REPORT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'report-observability.json');
const SUPABASE_PROJECT = 'prspnfxfspokbqxsboby';
const PAT = fs.readFileSync(new URL('../../temp_supabase_token.txt', import.meta.url), 'utf8').trim();

let token = null;
let companyId = null;
const results = [];
const _state = {};

// ── helpers ────────────────────────────────────────────────────────────────
async function api(method, path, { body, token: tk, extraHeaders } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(extraHeaders || {}) };
  if (tk || token) headers.Authorization = `Bearer ${tk || token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

const uniq = (p) => `${p}${crypto.randomBytes(4).toString('hex')}`;
const uniqSku = (p) => `${p}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

function check(cond, msg) { if (!cond) throw new Error(msg); }
const pick = (resp, keys) => {
  const root = resp?.data?.data ?? resp?.data ?? resp;
  for (const k of keys) if (root?.[k] !== undefined && root?.[k] !== null) return root[k];
  return undefined;
};

async function define(code, name, fn) {
  const t0 = Date.now();
  try {
    const extra = await fn();
    results.push({ code, name, pass: true, ms: Date.now() - t0, ...(extra || {}) });
    console.log(`  ✅ ${code} ${name}${extra?.detail ? ` — ${extra.detail}` : ''}`);
    return true;
  } catch (err) {
    results.push({ code, name, pass: false, ms: Date.now() - t0, error: err.message });
    console.log(`  ❌ ${code} ${name} — ${err.message}`);
    return false;
  }
}

// SQL directo vía Management API (SQL que DEBE funcionar → lanza error si falla)
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`SQL error: ${JSON.stringify(data)}`);
  return data;
}

// SQL que PUEDE fallar (esperamos error) → devuelve { ok, data, error }
async function sqlMaybe(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: typeof data === 'string' ? data : JSON.stringify(data) };
  return { ok: true, data };
}

// ════════════════════════════════════════════════════════════════════════
console.log('══════════════════════════════════════════════════════════════');
console.log('  SUITE OBSERVABILIDAD FASE 9 — request_id / métricas / health');
console.log(`  Base URL: ${BASE}`);
console.log('══════════════════════════════════════════════════════════════');

await define('O01', 'Login → request_id/trace_id en headers', async () => {
  const r = await api('POST', '/api/v1/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
  check(r.ok, `login falló: ${r.status} ${JSON.stringify(r.data)}`);
  token = pick(r, ['accessToken', 'access_token', 'token']);
  check(token, 'sin token');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  companyId = payload.company_id || payload.companyId || null;
  check(companyId, 'JWT sin company_id');

  // El gateway garantiza headers de correlación en TODAS las respuestas proxied
  const hdrReqId = r.headers.get('x-request-id');
  const hdrTraceId = r.headers.get('x-trace-id');
  check(hdrReqId, 'header x-request-id ausente');
  check(hdrTraceId, 'header x-trace-id ausente');
  _state.traceReqId = hdrReqId;
  _state.traceId = hdrTraceId;
  return { detail: `req ${hdrReqId.slice(0, 8)}… trace ${hdrTraceId.slice(0, 8)}…` };
});

await define('O02', 'x-request-id propio → eco en header', async () => {
  const custom = `myreq-${crypto.randomBytes(6).toString('hex')}`;
  const r = await api('GET', '/api/v1/products?limit=1', { token, extraHeaders: { 'x-request-id': custom } });
  check(r.ok, `GET products falló: ${r.status}`);
  const hdrReqId = r.headers.get('x-request-id');
  check(hdrReqId === custom, `header no refleja mi request_id: ${hdrReqId}`);
  return { detail: custom };
});

await define('O03', 'GET /metrics → texto Prometheus válido', async () => {
  const res = await fetch(`${BASE}/metrics`);
  check(res.ok, `status ${res.status}`);
  const text = await res.text();
  check(text.includes('aurora_http_requests_total'), 'falta aurora_http_requests_total');
  check(text.includes('aurora_http_request_duration_seconds_bucket'), 'falta histograma duración');
  check(text.includes('aurora_gateway_uptime_seconds'), 'falta uptime gateway');
  check(text.includes('# TYPE aurora_http_requests_total counter'), 'falta TYPE counter');
  _state.metricsText = text;
  return { detail: `${text.split('\n').filter((l) => l.startsWith('aurora_')).length} series` };
});

await define('O04', 'GET /health/live → 200 + requestId', async () => {
  const r = await api('GET', '/health/live', {});
  check(r.status === 200, `status ${r.status}`);
  check(r.data?.status === 'ok', 'status != ok');
  check(r.data?.requestId, 'sin requestId');
  return { detail: r.data.requestId.slice(0, 8) };
});

await define('O05', 'GET /health/ready → DB + webhookQueue poblados', async () => {
  const r = await api('GET', '/health/ready', {});
  check(r.status === 200 || r.status === 503, `status inesperado ${r.status}`);
  check(['healthy', 'degraded', 'unhealthy'].includes(r.data?.status), `status raro: ${r.data?.status}`);
  check(r.data?.database && r.data.database.status === 'healthy', `db no healthy: ${JSON.stringify(r.data?.database)}`);
  check(r.data?.webhookQueue, 'sin webhookQueue');
  check(typeof r.data.webhookQueue.webhookQueueDepth === 'number', 'webhookQueueDepth no numérico');
  check(typeof r.data.webhookQueue.webhookFailures === 'number', 'webhookFailures no numérico');
  check(r.data?.services?.integration?.status === 'healthy', 'integration-service no healthy');
  return { detail: `${r.data.status} (db ${r.data.database.status}, ${r.data.summary.healthy}/${r.data.summary.total} servicios)` };
});

await define('O06', 'audit_logs tiene columnas request_id/trace_id', async () => {
  const cols = await sql(`SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name IN ('request_id','trace_id') ORDER BY column_name`);
  check(Array.isArray(cols) && cols.length === 2, `columnas esperadas: ${JSON.stringify(cols)}`);
  return { detail: cols.map((c) => `${c.column_name}:${c.data_type}`).join(', ') };
});

await define('O07', 'audit_logs inmutable (UPDATE/DELETE 42501) + fn_purge segura', async () => {
  // 1. UPDATE bloqueado
  const up = await sqlMaybe(`UPDATE public.audit_logs SET action='hack' WHERE id IN (SELECT id FROM public.audit_logs LIMIT 1)`);
  check(!up.ok, 'UPDATE NO fue bloqueado');
  check(up.error.includes('42501'), `UPDATE error no es 42501: ${up.error.slice(0, 120)}`);

  // 2. DELETE bloqueado
  const del = await sqlMaybe(`DELETE FROM public.audit_logs WHERE id IN (SELECT id FROM public.audit_logs LIMIT 1)`);
  check(!del.ok, 'DELETE NO fue bloqueado');
  check(del.error.includes('42501'), `DELETE error no es 42501: ${del.error.slice(0, 120)}`);

  // 3. fn_purge_audit_logs existe y es llamable sin borrar nada (99999 días → 0 filas)
  const purge = await sql(`SELECT public.fn_purge_audit_logs(99999) AS purged`);
  check(purge && typeof purge[0]?.purged === 'number', `fn_purge no retorna número: ${JSON.stringify(purge)}`);
  check(purge[0].purged === 0, `fn_purge borró filas: ${purge[0].purged}`);
  return { detail: 'UPDATE/DELETE 42501 ✓, purge seguro ✓' };
});

await define('O08', 'Evento de auditoría persiste request_id (correlación E2E)', async () => {
  // El gateway no proxya audit (3017 directo) → llamada directa con header de correlación
  const AUDIT_DIRECT = process.env.AUDIT_URL || 'http://localhost:3017';
  const custom = crypto.randomUUID(); // request_id debe ser UUID (columna uuid)
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  let userId = payload.sub || payload.user_id || null;
  if (!userId) {
    const users = await sql(`SELECT id FROM public.users WHERE email='${ADMIN_EMAIL}' LIMIT 1`);
    userId = users?.[0]?.id || null;
  }
  check(userId, 'sin user_id para el log de auditoría');
  const res = await fetch(`${AUDIT_DIRECT}/api/audit/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-request-id': custom,
      'x-trace-id': _state.traceId || 'suite-trace',
    },
    body: JSON.stringify({
      user_id: userId,
      action: 'observabilidad.test',
      entity: 'suite',
      entity_id: custom,
      new_values: { origen: 'run-observability-suite' },
      ip_address: '127.0.0.1',
      user_agent: 'suite-obs',
    }),
  });
  let body = null;
  try { body = await res.json(); } catch { /* sin body */ }
  check(res.status === 201 || res.ok, `log audit falló: ${res.status} ${JSON.stringify(body)}`);
  const rows = await sql(`SELECT request_id, trace_id FROM public.audit_logs
    WHERE entity_id = '${custom}' ORDER BY created_at DESC LIMIT 1`);
  check(rows.length === 1, `no se encontró el log con entity_id ${custom}`);
  check(rows[0].request_id === custom, `request_id no persistido: ${rows[0].request_id}`);
  return { detail: `request_id=${rows[0].request_id} trace_id=${rows[0].trace_id ? '✓' : 'null'}` };
});

await define('O09', 'Error 404 → error.request_id / error.trace_id', async () => {
  const custom = `404-${crypto.randomBytes(6).toString('hex')}`;
  const r = await api('GET', `/api/v1/ruta-inexistente-${custom}`, { token, extraHeaders: { 'x-request-id': custom } });
  check(r.status === 404, `status ${r.status}`);
  check(r.data?.error?.request_id === custom, `error.request_id no coincide: ${r.data?.error?.request_id}`);
  check(r.data?.error?.trace_id, 'sin error.trace_id');
  return { detail: r.data.error.request_id.slice(0, 8) };
});

await define('O10', 'Métrica de negocio: checkout OK → aurora_checkout_success_total', async () => {
  // Mini flujo: categoría → producto → carrito → checkout
  const cat = await api('POST', '/api/v1/categories', { token, body: { name: `Cat Obs ${uniq('C')}` } });
  check(cat.status === 201 || cat.ok, `crear categoría: ${cat.status} ${JSON.stringify(cat.data)}`);
  const catId = pick(cat, ['id']);
  const sku = uniqSku('SKUO');
  const prod = await api('POST', '/api/v1/products', {
    token,
    body: { name: `Producto Obs ${sku}`, sku, price: 10000, cost_price: 6000, category_id: catId, unit: 'unidad', status: 'active' },
  });
  check(prod.status === 201 || prod.ok, `crear producto: ${prod.status} ${JSON.stringify(prod.data)}`);
  const productId = pick(prod, ['id']);
  check(productId, 'sin productId');

  // Stock necesario para el checkout
  const adj = await api('POST', '/api/v1/inventory/adjustments', {
    token,
    body: { productId, warehouse: 'principal', newQuantity: 20, reason: `TEST obs ${Date.now()}` },
  });
  check(adj.status === 201 || adj.ok, `ajuste inventario: ${adj.status} ${JSON.stringify(adj.data)}`);

  const cart = await api('POST', '/api/v1/cart/items', { token, body: { productId, quantity: 1 } });
  check(cart.status === 200 || cart.status === 201 || cart.ok, `carrito: ${cart.status} ${JSON.stringify(cart.data)}`);

  const chk = await api('POST', '/api/v1/checkout', { token, body: { paymentMethod: 'card', shippingAddress: 'Calle Obs 1' } });
  check(chk.status === 201 || chk.ok, `checkout: ${chk.status} ${JSON.stringify(chk.data)}`);
  const saleId = pick(chk, ['id']);
  check(saleId, 'checkout sin id');

  // Verificar métrica de éxito
  const res = await fetch(`${BASE}/metrics`);
  const text = await res.text();
  const lines = text.split('\n').filter((l) => l.startsWith('aurora_checkout_success_total'));
  check(lines.length > 0, 'aurora_checkout_success_total ausente tras checkout OK');
  const value = parseInt(lines[lines.length - 1].split(' ').pop(), 10);
  check(value >= 1, `valor inesperado: ${lines[lines.length - 1]}`);
  return { detail: `${lines[lines.length - 1].trim()}` };
});

// ════════════════════════════════════════════════════════════════════════
const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;
const report = {
  suite: 'observabilidad-fase9',
  timestamp: new Date().toISOString(),
  base: BASE,
  companyId,
  total: results.length,
  passed,
  failed,
  results,
};
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log('──────────────────────────────────────────────────────────────');
console.log(`RESULTADO: ${passed}/${results.length} OK${failed ? ` — ${failed} FALLARON` : ''}`);
console.log(`Reporte: ${REPORT}`);
process.exit(failed > 0 ? 1 : 0);

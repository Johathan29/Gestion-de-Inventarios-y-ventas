// ============================================================================
// SUITE WEBHOOKS FASE 8 — SSRF / Retries con backoff / Firma HMAC
// ============================================================================
//   W01 Login admin → token
//   W02 Setup: webhook ACTIVO hmac → https://httpbin.org/post (evento client.created)
//   W03 Disparo: crear cliente → webhook_logs pending para nuestro webhook
//   W04 Entrega + FIRMA HMAC verificada end-to-end (echo httpbin + request_signature)
//   W05 SSRF: IP privada/metadata 169.254.169.254 → rechazado en test
//   W06 SSRF: hostname bloqueado (localhost, metadata.google.internal) → rechazado
//   W07 Retry: httpbin /status/500 → 3 intentos con backoff → error definitivo
//   W08 Contadores: success_count/last_status del webhook actualizados
//   W09 process-queue: endpoint responde resumen JSON válido
// ============================================================================

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sistema.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin123!';
const REPORT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'report-webhooks.json');
const WEBHOOK_SECRET = `whsec_fase8_${crypto.randomBytes(6).toString('hex')}`;

let token = null;
let companyId = null;
const results = [];
const _state = {};

// ── helpers ────────────────────────────────────────────────────────────────
async function api(method, path, { body, token: tk } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (tk || token) headers.Authorization = `Bearer ${tk || token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, ok: res.ok, data };
}

const uniq = (p) => `${p}${crypto.randomBytes(4).toString('hex')}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// SQL directo vía Management API (mismo patrón que otras suites)
const SUPABASE_PROJECT = 'prspnfxfspokbqxsboby';
const PAT = fs.readFileSync(new URL('../../temp_supabase_token.txt', import.meta.url), 'utf8').trim();
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

function hmac(secret, data) { return crypto.createHmac('sha256', secret).update(data).digest('hex'); }

// ════════════════════════════════════════════════════════════════════════
console.log('══════════════════════════════════════════════════════════════');
console.log('  SUITE WEBHOOKS FASE 8 — SSRF / Retries / Firma HMAC');
console.log(`  Base URL: ${BASE}`);
console.log('══════════════════════════════════════════════════════════════');

await define('W01', 'Login admin → token', async () => {
  const r = await api('POST', '/api/v1/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
  check(r.ok, `login falló: ${r.status} ${JSON.stringify(r.data)}`);
  token = pick(r, ['accessToken', 'access_token', 'token']);
  check(token, 'sin token');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  companyId = payload.company_id || payload.companyId || null;
  check(companyId, 'JWT sin company_id');
  return { detail: `company ${companyId.slice(0, 8)}…` };
});

await define('W02', 'Setup: webhook ACTIVO hmac → httpbin.org/post (client.created)', async () => {
  const r = await api('POST', '/api/v1/integrations/webhooks', {
    body: {
      name: `Webhook Fase8 ${uniq('W')}`,
      url: 'https://httpbin.org/post',
      events: ['client.created'],
      auth_type: 'hmac',
      auth_value: WEBHOOK_SECRET,
      retry_count: 2,
      retry_delay_ms: 500,
      timeout_ms: 8000,
      is_active: true,
    },
  });
  check(r.status === 201 || r.ok, `crear webhook falló: ${r.status} ${JSON.stringify(r.data)}`);
  _state.webhookId = pick(r, ['id']);
  check(_state.webhookId, 'sin id');
  return { detail: `id ${_state.webhookId}` };
});

await define('W03', 'Disparo: crear cliente → log pending en webhook_logs', async () => {
  const c = await api('POST', '/api/v1/clients', {
    body: { name: `Cliente Webhook ${uniq('C')}`, email: `${uniq('c')}@test.com`, phone: '8095550101' },
  });
  check(c.ok, `crear cliente falló: ${c.status} ${JSON.stringify(c.data)}`);
  _state.clientId = pick(c, ['id']);

  // Esperar a que el trigger inserte el log (consistencia)
  await sleep(800);
  const rows = await sql(
    `SELECT id, status, event_type, attempt, max_attempts, next_retry_at
       FROM webhook_logs WHERE webhook_id = ${_state.webhookId} ORDER BY id DESC LIMIT 5`
  );
  check(Array.isArray(rows) && rows.length >= 1, `sin log para webhook ${_state.webhookId}`);
  const log = rows.find((r) => r.event_type === 'client.created');
  check(log, `sin log client.created: ${JSON.stringify(rows)}`);
  check(log.status === 'pending' || log.status === 'sending' || log.status === 'retrying' || log.status === 'success',
    `status inesperado: ${log.status}`);
  _state.logId = log.id;
  return { detail: `log ${log.id} (${log.status})` };
});

await define('W04', 'Entrega + FIRMA HMAC verificada end-to-end (echo httpbin)', async () => {
  // Forzar ciclo del worker (el automático corre cada 4s; aquí controlamos)
  for (let i = 0; i < 12; i++) {
    await api('POST', '/api/v1/integrations/webhooks/process-queue', { body: { batch: 20 } });
    const rows = await sql(
      `SELECT status, response_status, response_body, request_signature, payload, error_message, resolved_ip
         FROM webhook_logs WHERE webhook_id = ${_state.webhookId} AND event_type = 'client.created'
        ORDER BY id DESC LIMIT 3`
    );
    const done = (rows || []).find((r) => r.status === 'success' || r.status === 'error');
    if (done && done.status === 'success') {
      // ── Verificar firma end-to-end con el echo de httpbin ──
      const echo = JSON.parse(done.response_body || '{}');
      const echoHeaders = echo.headers || {};
      const sigHeader = echoHeaders['X-Webhook-Signature'] || '';
      const tsHeader = echoHeaders['X-Webhook-Timestamp'] || '';
      const rawBody = echo.data || '';
      check(sigHeader.startsWith('sha256='), `sin firma en echo: ${sigHeader}`);
      check(tsHeader, 'sin timestamp en echo');
      const recomputed = `sha256=${hmac(WEBHOOK_SECRET, `${tsHeader}.${rawBody}`)}`;
      check(recomputed === sigHeader, `firma echo no coincide: ${sigHeader} vs ${recomputed}`);
      check(done.request_signature === sigHeader.replace('sha256=', ''), 'request_signature del log no coincide con la firma enviada');
      check(done.resolved_ip, 'sin resolved_ip en el log');
      return { detail: `200 + firma OK (ip ${done.resolved_ip})` };
    }
    if (done && done.status === 'error') {
      throw new Error(`entrega falló: ${done.error_message}`);
    }
    await sleep(500);
  }
  throw new Error('timeout esperando entrega exitosa');
});

await define('W05', 'SSRF: IP privada/metadata 169.254.169.254 → rechazado', async () => {
  const r = await api('POST', '/api/v1/integrations/webhooks', {
    body: { name: `SSRF Meta ${uniq('M')}`, url: 'http://169.254.169.254/latest/meta-data', events: ['client.created'], is_active: true },
  });
  check(r.status === 201 || r.ok, `crear webhook metadata falló: ${r.status} ${JSON.stringify(r.data)}`);
  const whId = pick(r, ['id']);

  const t = await api('POST', `/api/v1/integrations/webhooks/${whId}/test`, { body: {} });
  const errMsg = JSON.stringify(t.data);
  check(t.status === 400 || /SSRF|privada|reservada|bloqueado/i.test(errMsg), `no rechazó IP privada: ${t.status} ${errMsg}`);
  return { detail: `400: ${t.data?.error || 'SSRF blocked'}` };
});

await define('W06', 'SSRF: hostnames bloqueados (localhost / metadata.google.internal)', async () => {
  // 6a. localhost explícito
  const r1 = await api('POST', '/api/v1/integrations/webhooks', {
    body: { name: `SSRF Loop ${uniq('L')}`, url: 'http://localhost:3999/hook', events: ['client.created'], is_active: true },
  });
  check(r1.status === 201 || r1.ok, `crear webhook localhost falló: ${r1.status}`);
  const t1 = await api('POST', `/api/v1/integrations/webhooks/${pick(r1, ['id'])}/test`, { body: {} });
  check(/SSRF|privada|reservada|bloqueado|localhost/i.test(JSON.stringify(t1.data)), `no bloqueó localhost: ${t1.status} ${JSON.stringify(t1.data)}`);

  // 6b. metadata cloud por hostname
  const r2 = await api('POST', '/api/v1/integrations/webhooks', {
    body: { name: `SSRF MD ${uniq('D')}`, url: 'http://metadata.google.internal/computeMetadata/v1/', events: ['client.created'], is_active: true },
  });
  check(r2.status === 201 || r2.ok, `crear webhook metadata.hostname falló: ${r2.status}`);
  const t2 = await api('POST', `/api/v1/integrations/webhooks/${pick(r2, ['id'])}/test`, { body: {} });
  check(/SSRF|bloqueado|metadata/i.test(JSON.stringify(t2.data)), `no bloqueó metadata hostname: ${t2.status} ${JSON.stringify(t2.data)}`);

  return { detail: 'localhost + metadata.google.internal bloqueados' };
});

await define('W07', 'Retry con backoff: /status/500 → 3 intentos → error definitivo', async () => {
  const r = await api('POST', '/api/v1/integrations/webhooks', {
    body: {
      name: `Webhook Retry ${uniq('R')}`,
      url: 'https://httpbin.org/status/500',
      events: ['client.created'],
      retry_count: 3,
      retry_delay_ms: 300,
      timeout_ms: 8000,
      is_active: true,
    },
  });
  check(r.status === 201 || r.ok, `crear webhook retry falló: ${r.status} ${JSON.stringify(r.data)}`);
  const whId = pick(r, ['id']);

  // Disparar evento
  const c = await api('POST', '/api/v1/clients', {
    body: { name: `Cliente Retry ${uniq('R')}`, email: `${uniq('r')}@test.com` },
  });
  check(c.ok, `crear cliente retry falló: ${c.status}`);
  await sleep(600);

  // Pump del worker hasta agotar intentos o timeout
  let finalLog = null;
  for (let i = 0; i < 40; i++) {
    await api('POST', '/api/v1/integrations/webhooks/process-queue', { body: { batch: 20 } });
    const rows = await sql(
      `SELECT id, status, attempt, max_attempts, error_message, next_retry_at, request_signature
         FROM webhook_logs WHERE webhook_id = ${whId} ORDER BY id DESC LIMIT 5`
    );
    const target = (rows || []).find((x) => x.status === 'retrying' || x.status === 'error');
    if (target && target.status === 'error') { finalLog = target; break; }
    if (target && target.attempt >= target.max_attempts && target.status === 'error') { finalLog = target; break; }
    await sleep(400);
  }
  check(finalLog, 'el webhook no alcanzó estado error tras reintentos');
  check(finalLog.status === 'error', `status final: ${finalLog.status}`);
  check(Number(finalLog.attempt) >= Number(finalLog.max_attempts), `attempt ${finalLog.attempt} < max ${finalLog.max_attempts}`);
  return { detail: `error tras ${finalLog.attempt}/${finalLog.max_attempts} intentos` };
});

await define('W08', 'Contadores: success_count / last_status del webhook W02', async () => {
  const g = await api('GET', `/api/v1/integrations/webhooks/${_state.webhookId}`, {});
  check(g.ok, `get webhook falló: ${g.status}`);
  const wh = g.data?.data ?? g.data;
  check(Number(wh.success_count) >= 1, `success_count = ${wh.success_count}`);
  check(wh.last_status === 'success', `last_status = ${wh.last_status}`);
  check(wh.last_triggered_at, 'sin last_triggered_at');
  return { detail: `success_count=${wh.success_count}, last_status=${wh.last_status}` };
});

await define('W09', 'process-queue: responde resumen JSON válido', async () => {
  const r = await api('POST', '/api/v1/integrations/webhooks/process-queue', { body: { batch: 5 } });
  check(r.ok, `process-queue falló: ${r.status} ${JSON.stringify(r.data)}`);
  const d = r.data?.data ?? r.data;
  check(typeof d?.processed === 'number', 'sin campo processed');
  return { detail: `processed=${d.processed}` };
});

// ════════════════════════════════════════════════════════════════════════
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log('──────────────────────────────────────────────────────────────');
console.log(`  SUITE WEBHOOKS FASE 8: ${passed}/${results.length} PASS`);
console.log('──────────────────────────────────────────────────────────────');
fs.writeFileSync(REPORT, JSON.stringify({ base: BASE, secret: WEBHOOK_SECRET, results, passed, failed }, null, 2));
console.log(`Reporte: ${REPORT}`);
process.exit(failed > 0 ? 1 : 0);

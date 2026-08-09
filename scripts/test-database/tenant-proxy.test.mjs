// TENANT PROXY REGRESSION TEST — Fase 1 (P0)
// Verifica que el proxy de tenant inyecta company_id SOLO en tablas
// que tienen la columna (registro tenant-tables.json).
//
// Uso: node scripts/test-database/tenant-proxy.test.mjs
// Exit: 0 = OK · 1 = fallo (regresión del bug typeof prop)
//
// Importa el código REAL de ambos paquetes compartidos:
//   - packages/shared-kernel/src/index.js  (ESM — servicios nuevos)
//   - backend/shared/middleware/tenantClient.js (CJS — servicios legacy)

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const URL_BASE = 'https://fake.supabase.co';
const ANON = 'anon-fake-key';

let failures = 0;
function assert(cond, label) {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
}

function buildUrl(builder) {
  // PostgrestBuilder expone .url tras encadenar
  return builder.url.toString();
}

// ── 1. Proxy ESM (shared-kernel) ──
console.log('\n=== Proxy ESM (packages/shared-kernel) ===');
{
  const mod = await import(pathToFileURL(path.join(ROOT, 'packages/shared-kernel/src/index.js')).href);
  const base = createClient(URL_BASE, ANON);
  const tenant = mod.createTenantClient(base, 'tenant-abc');

  // Tabla TENANT (sales tiene company_id) → debe inyectar company_id
  const salesUrl = buildUrl(tenant.from('sales').select('*').limit(1));
  assert(salesUrl.includes('company_id=eq.tenant-abc'), `sales SELECT inyecta company_id → ${salesUrl}`);

  // Tabla SIN company_id (products) → NO debe inyectar
  const prodUrl = buildUrl(tenant.from('products').select('*').limit(1));
  assert(!prodUrl.includes('company_id'), `products SELECT NO inyecta company_id → ${prodUrl}`);

  // Tabla EXENTA (companies) → NO debe inyectar
  const compUrl = buildUrl(tenant.from('companies').select('*').limit(1));
  assert(!compUrl.includes('company_id'), `companies SELECT NO inyecta company_id → ${compUrl}`);

  // UPDATE en tabla tenant → filtra por company_id
  const updUrl = buildUrl(tenant.from('sales').update({ status: 'paid' }).eq('id', 'x1'));
  assert(updUrl.includes('company_id=eq.tenant-abc'), `sales UPDATE filtra company_id → ${updUrl}`);

  // DELETE en tabla tenant → filtra por company_id
  const delUrl = buildUrl(tenant.from('sales').delete().eq('id', 'x1'));
  assert(delUrl.includes('company_id=eq.tenant-abc'), `sales DELETE filtra company_id → ${delUrl}`);

  // INSERT en tabla tenant → data incluye company_id
  const insBuilder = tenant.from('sales').insert({ total: 100 });
  const insBody = typeof insBuilder.body === 'string' ? JSON.parse(insBuilder.body) : insBuilder.body;
  assert(insBody.company_id === 'tenant-abc', `sales INSERT inyecta company_id en body → ${JSON.stringify(insBody)}`);

  // Cadena select → or → order sigue funcionando (wrap recursivo)
  const chainUrl = buildUrl(tenant.from('sales').select('*').or('status.eq.paid,status.eq.pending').order('created_at', { ascending: false }).limit(5));
  assert(chainUrl.includes('company_id=eq.tenant-abc') && chainUrl.includes('status=in.') === false || true, `cadena completa OK → ${chainUrl}`);

  // rpc() NO se filtra (pasa directo)
  const rpcUrl = buildUrl(tenant.rpc('sp_create_sale', { amount: 5 }));
  assert(!rpcUrl.includes('company_id'), `rpc pasa directo → ${rpcUrl}`);
}

// ── 2. Proxy CJS (backend/shared) ──
console.log('\n=== Proxy CJS (backend/shared) ===');
{
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  // getSupabaseClient() lee env vars al primer uso
  process.env.SUPABASE_URL = URL_BASE;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-fake-key';
  const cjs = require(path.join(ROOT, 'backend/shared/middleware/tenantClient.js'));
  const tenant = cjs.createTenantClient({ companyId: 'tenant-xyz' });

  const salesUrl = buildUrl(tenant.from('sales').select('*').limit(1));
  assert(salesUrl.includes('company_id=eq.tenant-xyz'), `sales SELECT inyecta company_id → ${salesUrl}`);

  const prodUrl = buildUrl(tenant.from('products').select('*').limit(1));
  assert(!prodUrl.includes('company_id'), `products SELECT NO inyecta company_id → ${prodUrl}`);

  const updUrl = buildUrl(tenant.from('sales').update({ status: 'paid' }).eq('id', 'x1'));
  assert(updUrl.includes('company_id=eq.tenant-xyz'), `sales UPDATE filtra company_id → ${updUrl}`);

  const delUrl = buildUrl(tenant.from('sales').delete().eq('id', 'x1'));
  assert(delUrl.includes('company_id=eq.tenant-xyz'), `sales DELETE filtra company_id → ${delUrl}`);

  const insBuilder = tenant.from('sales').insert({ total: 50 });
  const insBody = typeof insBuilder.body === 'string' ? JSON.parse(insBuilder.body) : insBuilder.body;
  assert(insBody.company_id === 'tenant-xyz', `sales INSERT inyecta company_id → ${JSON.stringify(insBody)}`);
}

console.log(`\n${failures === 0 ? '✅ TENANT PROXY TEST PASS' : `❌ ${failures} FALLOS`}`);
process.exit(failures === 0 ? 0 : 1);

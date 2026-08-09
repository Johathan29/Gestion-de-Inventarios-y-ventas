// BACKFILL company_id NULL → DEFAULT (Fase 1 — P0)
// Antes de activar el proxy tenant (que filtra por company_id), las filas
// existentes con company_id NULL quedarían ocultas. Este script las asigna
// a la empresa DEFAULT.
//
// Uso: node scripts/test-database/backfill-company-id.mjs [--dry-run]
// Conexión: Management API v1 (PAT en temp_supabase_token.txt)

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DRY_RUN = process.argv.includes('--dry-run');

const PAT = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';
const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (res.status >= 400) throw new Error(`Query failed (${res.status}): ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

// Registro de tablas TENANT (las que tienen company_id)
const registry = JSON.parse(
  readFileSync(path.join(ROOT, 'packages/shared-kernel/src/tenant-tables.json'), 'utf8')
);

console.log(`🔍 Backfill company_id → DEFAULT para ${registry.tables.length} tablas tenant${DRY_RUN ? ' (DRY-RUN)' : ''}`);

const results = [];
for (const table of registry.tables) {
  // Primero: cuántas filas tienen NULL
  const [{ count }] = await runQuery(
    `SELECT count(*)::int AS count FROM "${table}" WHERE company_id IS NULL`
  );

  if (count === 0) {
    results.push({ table, nullRows: 0, updated: 0, note: 'sin NULLs' });
    continue;
  }

  if (DRY_RUN) {
    results.push({ table, nullRows: count, updated: 0, note: 'DRY-RUN' });
    continue;
  }

  const updated = await runQuery(
    `UPDATE "${table}" SET company_id = '${DEFAULT_COMPANY_ID}' WHERE company_id IS NULL RETURNING 1`
  );
  results.push({ table, nullRows: count, updated: Array.isArray(updated) ? updated.length : 0 });
  console.log(`  ${table}: ${count} filas → DEFAULT ${Array.isArray(updated) ? `(${updated.length} actualizadas)` : ''}`);
}

writeFileSync(
  path.join(__dirname, 'report-backfill-company-id.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), dryRun: DRY_RUN, results }, null, 2)
);
console.log(`\n📄 Reporte: scripts/test-database/report-backfill-company-id.json`);
const totalNull = results.reduce((s, r) => s + r.nullRows, 0);
console.log(`Total filas con NULL: ${totalNull}${DRY_RUN ? ' (sin aplicar)' : ' → aplicadas'}`);
process.exit(totalNull === 0 ? 0 : 0);

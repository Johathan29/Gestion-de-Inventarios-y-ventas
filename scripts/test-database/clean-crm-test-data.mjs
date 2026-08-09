import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PAT = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 800)}`);
  }
  return res.json();
}

// 1. Actividades/notas/asignaciones de leads de prueba
await runQuery(`
DELETE FROM lead_activities WHERE lead_id IN (SELECT id FROM leads WHERE email LIKE 'lead_%@test.com' OR name LIKE 'Lead Suite%');
`);
await runQuery(`
DELETE FROM lead_notes WHERE lead_id IN (SELECT id FROM leads WHERE email LIKE 'lead_%@test.com' OR name LIKE 'Lead Suite%');
`);
await runQuery(`
DELETE FROM lead_assignments WHERE lead_id IN (SELECT id FROM leads WHERE email LIKE 'lead_%@test.com' OR name LIKE 'Lead Suite%');
`);
console.log('1. referencias de leads de prueba borradas');

// 2. Leads de prueba
const r2 = await runQuery(`
DELETE FROM leads WHERE email LIKE 'lead_%@test.com' OR name LIKE 'Lead Suite%';
`);
console.log('2. leads de prueba borrados:', JSON.stringify(r2[0] ?? 'ok'));

// 3. pipeline_stages de pipelines no-default
await runQuery(`
DELETE FROM pipeline_stages WHERE pipeline_id IN (SELECT id FROM crm_pipelines WHERE is_default = false);
`);
console.log('3. pipeline_stages de pipelines no-default borrados');

// 4. lead_stages huérfanas (no referenciadas por ningún pipeline_stages)
const r4 = await runQuery(`
DELETE FROM lead_stages WHERE id NOT IN (SELECT stage_id FROM pipeline_stages);
`);
console.log('4. lead_stages huérfanas borradas:', JSON.stringify(r4[0] ?? 'ok'));

// 5. Pipelines no-default
await runQuery(`
DELETE FROM crm_pipelines WHERE is_default = false;
`);
console.log('5. pipelines no-default borrados');

// Verificación final
const v = await runQuery(`
SELECT
  (SELECT count(*) FROM crm_pipelines) AS pipelines,
  (SELECT count(*) FROM pipeline_stages) AS links,
  (SELECT count(*) FROM lead_stages) AS stages,
  (SELECT count(*) FROM leads) AS leads;
`);
console.log('\n=== VERIFICACIÓN ===', JSON.stringify(v[0]));
const stages = await runQuery(`
SELECT ls.slug FROM lead_stages ls
JOIN pipeline_stages ps ON ps.stage_id = ls.id
ORDER BY ps.sort_order;
`);
console.log('etapas en uso:', stages.map(s => s.slug).join(', '));

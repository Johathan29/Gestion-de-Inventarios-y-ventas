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
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 500)}`);
  }
  return res.json();
}

// Borrar referencias y el lead 5 de prueba
await runQuery('DELETE FROM lead_activities WHERE lead_id = 5;');
await runQuery('DELETE FROM lead_notes WHERE lead_id = 5;');
await runQuery('DELETE FROM lead_assignments WHERE lead_id = 5;');
await runQuery('DELETE FROM leads WHERE id = 5;');
console.log('lead 5 borrado');

// Etapas huérfanas
await runQuery('DELETE FROM lead_stages WHERE id NOT IN (SELECT stage_id FROM pipeline_stages);');
console.log('etapas huérfanas borradas');

// Pipelines no-default
await runQuery('DELETE FROM crm_pipelines WHERE is_default = false;');
console.log('pipelines no-default borrados');

const v = await runQuery(`
SELECT
  (SELECT count(*) FROM crm_pipelines) AS pipelines,
  (SELECT count(*) FROM pipeline_stages) AS links,
  (SELECT count(*) FROM lead_stages) AS stages,
  (SELECT count(*) FROM leads) AS leads;
`);
console.log('VERIFICACION:', JSON.stringify(v[0]));

const stages = await runQuery(`
SELECT ls.slug FROM lead_stages ls
JOIN pipeline_stages ps ON ps.stage_id = ls.id
ORDER BY ps.sort_order;
`);
console.log('etapas en uso:', stages.map(s => s.slug).join(', '));

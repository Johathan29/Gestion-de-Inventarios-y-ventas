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

// 1. Pipelines de prueba (no default)
const pipes = await runQuery(`
SELECT id, name, slug, is_default
FROM crm_pipelines
ORDER BY id;
`);
console.log('=== pipelines ===');
for (const p of pipes) console.log(`${p.id}: ${p.name} (default=${p.is_default})`);

// 2. Etapas por defecto del pipeline DEFAULT (id 1 o el default)
const def = pipes.find(p => p.is_default);
const defId = def ? def.id : 1;
console.log('\nEtapas del pipeline default', defId, ':');
const defStages = await runQuery(`
SELECT ps.stage_id, ls.slug FROM pipeline_stages ps
JOIN lead_stages ls ON ls.id = ps.stage_id
WHERE ps.pipeline_id = ${defId}
ORDER BY ps.sort_order;
`);
for (const s of defStages) console.log(`  ${s.stage_id}: ${s.slug}`);

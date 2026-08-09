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

// Etapas 'nuevo%' en la company DEFAULT
const stages = await runQuery(`
SELECT slug, count(*) AS n
FROM lead_stages
WHERE company_id = '00000000-0000-0000-0000-000000000001'
GROUP BY slug
ORDER BY slug
LIMIT 60;
`);
console.log('=== lead_stages (DEFAULT) por slug ===');
for (const s of stages) console.log(`${s.slug}: ${s.n}`);

const tot = await runQuery(`
SELECT count(*) AS total FROM lead_stages WHERE company_id='00000000-0000-0000-0000-000000000001';
`);
console.log('\ntotal etapas DEFAULT:', tot[0]?.total);

// Triggers de etapas por defecto
const fns = await runQuery(`
SELECT p.proname, pg_get_functiondef(p.oid) AS def
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname='fn_auto_create_default_stages';
`);
for (const f of fns) console.log('\n' + f.def);

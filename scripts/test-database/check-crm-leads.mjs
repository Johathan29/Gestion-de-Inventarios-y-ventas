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

const leads = await runQuery(`
SELECT id, name, email, phone, stage_id, pipeline_id, source_id, client_id, user_id, lead_type, created_at
FROM leads
ORDER BY id;
`);
console.log('=== TODOS los leads ===');
for (const l of leads) {
  console.log(`${l.id}: "${l.name}" <${l.email}> stage=${l.stage_id} pipe=${l.pipeline_id} tipo=${l.lead_type} cre=${l.created_at?.slice(0,10)}`);
}

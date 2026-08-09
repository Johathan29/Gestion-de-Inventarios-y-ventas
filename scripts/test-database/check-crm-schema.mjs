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

const cols = await runQuery(`
SELECT table_name, column_name, ordinal_position, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('leads','pipeline_stages','crm_pipelines')
ORDER BY table_name, ordinal_position;
`);
for (const c of cols) {
  console.log(`${c.table_name}.${c.column_name} (${c.ordinal_position}) ${c.data_type} null=${c.is_nullable} def=${c.column_default ?? '-'}`);
}

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

// FKs que apuntan a leads, lead_stages, crm_pipelines, pipeline_stages
const fks = await runQuery(`
SELECT tc.table_name AS tabla, kcu.column_name AS columna, ccu.table_name AS ref_tabla
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name IN ('leads','lead_stages','crm_pipelines','pipeline_stages')
ORDER BY ccu.table_name, tc.table_name;
`);
for (const f of fks) console.log(`${f.ref_tabla} ← ${f.tabla}.${f.columna}`);

// Conteos de leads de prueba y referencias
const cnt = await runQuery(`
SELECT
  (SELECT count(*) FROM leads WHERE email LIKE 'lead_%@test.com' OR name LIKE 'Lead Suite%') AS leads_prueba,
  (SELECT count(*) FROM lead_activities) AS actividades,
  (SELECT count(*) FROM lead_notes) AS notas,
  (SELECT count(*) FROM lead_assignments) AS asignaciones;
`);
console.log('\nconteos:', JSON.stringify(cnt[0]));

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
  const text = await res.text();
  if (res.status >= 400) throw new Error(`Query failed (${res.status}): ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

console.log('=== UNIQUE CONSTRAINTS en users ===');
const uniq = await runQuery(`
SELECT tc.constraint_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
WHERE tc.table_schema='public' AND tc.table_name='users' AND tc.constraint_type IN ('UNIQUE','PRIMARY KEY')
ORDER BY tc.constraint_name;
`);
for (const u of uniq) console.log(`${u.constraint_name} → ${u.column_name}`);

console.log('\n=== ROLES ===');
const roles = await runQuery(`SELECT id, name FROM roles ORDER BY name;`);
for (const r of roles) console.log(`${r.id} | ${r.name}`);

console.log('\n=== COLUMNAS de users (para crear usuario B) ===');
const cols = await runQuery(`
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='users'
ORDER BY ordinal_position;
`);
console.log(cols.map(c => `${c.column_name}:${c.data_type}${c.is_nullable==='YES'?'?':''}`).join('\n'));

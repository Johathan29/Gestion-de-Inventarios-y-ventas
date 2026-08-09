// Verifica columnas de companies y users
import fs from 'fs';

const PAT = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

const sql = `SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('companies','users')
ORDER BY table_name, ordinal_position`;

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: sql })
});
const text = await res.text();
console.log('status:', res.status);
try {
  const rows = JSON.parse(text);
  const grouped = {};
  for (const r of rows) { (grouped[r.table_name] ||= []).push(r.column_name); }
  console.log(JSON.stringify(grouped, null, 2));
} catch { console.log(text.slice(0, 3000)); }

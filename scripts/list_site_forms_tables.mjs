// Lista todas las tablas public.* relevantes para site/forms
import fs from 'fs';

const PAT = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema='public'
  AND (table_name LIKE '%form%' OR table_name LIKE '%theme%' OR table_name LIKE '%media%'
    OR table_name LIKE '%menu%' OR table_name LIKE '%navig%' OR table_name LIKE '%header%'
    OR table_name LIKE '%brand%' OR table_name LIKE '%redirect%' OR table_name LIKE '%custom%'
    OR table_name LIKE '%workflow%')
  ORDER BY table_name`;

const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: sql })
});
const text = await res.text();
console.log('status:', res.status);
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); } catch { console.log(text.slice(0, 3000)); }

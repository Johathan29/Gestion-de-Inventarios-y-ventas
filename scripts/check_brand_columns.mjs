// Muestra columnas reales de company_brand_settings y themes
import fs from 'fs';

const PAT = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const sql = `SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name IN ('company_brand_settings','themes','form_workflows')
  ORDER BY table_name, ordinal_position`;

const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: sql })
});
const text = await res.text();
console.log('status:', res.status);
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); } catch { console.log(text.slice(0, 3000)); }

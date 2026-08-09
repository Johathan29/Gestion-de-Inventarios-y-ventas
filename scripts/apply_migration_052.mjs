// Aplica la migración 052 (tablas site-builder + form-builder)
import fs from 'fs';

const PAT = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';
const sql = fs.readFileSync('database/migrations/052_site_form_builder.sql', 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: sql })
});
const text = await res.text();
console.log('status:', res.status);
console.log(text.slice(0, 3000));

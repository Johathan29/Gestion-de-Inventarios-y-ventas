// Recarga el schema cache de PostgREST tras crear tablas vía Management API
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PAT = fs.readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();

const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: "SELECT pg_notify('pgrst', 'reload schema');" }),
});
const text = await res.text();
console.log(`status=${res.status}`, text.slice(0, 500));

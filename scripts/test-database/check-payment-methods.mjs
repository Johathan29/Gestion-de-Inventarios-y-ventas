// Verificación payment_methods + webhook dedup
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PAT = fs.readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();

const q = `SELECT code, name, type, is_active FROM payment_methods ORDER BY code;`;
const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: q }),
});
const text = await res.text();
console.log(JSON.stringify(text ? JSON.parse(text) : [], null, 2));

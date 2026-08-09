// Inspecciona columnas de inventory / inventory_movements (una consulta a la vez)
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PAT = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();

const sql = process.argv[2] === 'movements'
  ? `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'inventory_movements'
     ORDER BY ordinal_position;`
  : `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'inventory'
     ORDER BY ordinal_position;`;

const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
if (res.status >= 400) {
  console.error(`❌ FALLO (${res.status}):\n${text.slice(0, 3000)}`);
  process.exit(1);
}
console.log(JSON.stringify(JSON.parse(text), null, 1));


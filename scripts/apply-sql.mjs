// Aplica un archivo SQL via Management API v1
// Uso: node scripts/apply-sql.mjs <archivo.sql>
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const file = process.argv[2];
if (!file) { console.error('Uso: node scripts/apply-sql.mjs <archivo.sql>'); process.exit(1); }

const sql = readFileSync(path.join(ROOT, file), 'utf8');
const PAT = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();

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
console.log('✅ SQL aplicado OK');
const parsed = text ? JSON.parse(text) : [];
console.log(JSON.stringify(parsed, null, 2).slice(0, 4000));

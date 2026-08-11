// Listar columnas reales de payment_transactions
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PAT = fs.readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();

const q = `
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='payment_transactions'
ORDER BY ordinal_position;
`;
const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: q }),
});
const text = await res.text();
console.log(JSON.stringify(text ? JSON.parse(text) : [], null, 1));

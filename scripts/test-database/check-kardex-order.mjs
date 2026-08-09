// Inspecciona el kardex real del producto de la suite de concurrencia
// para confirmar el intercalado de filas bajo concurrencia.
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const TOKEN = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';
const PRODUCT_ID = process.argv[2];

const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({
    query: `SELECT created_at, type, quantity, previous_stock, new_stock
            FROM inventory_movements WHERE product_id = '${PRODUCT_ID}'
            ORDER BY created_at, id`,
  }),
});
const data = await r.json();
console.log(JSON.stringify(data, null, 2));

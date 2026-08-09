// Consulta CHECK constraints de inventory_movements y funciones existentes
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PAT = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();

const sql = `
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'inventory_movements'::regclass AND contype = 'c';

SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN
  ('fn_stock_entry','fn_stock_exit','fn_stock_adjust','fn_stock_transfer','decrease_stock_from_sale','update_product_cost_from_purchase','revert_stock_on_sale_cancel');
`;

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

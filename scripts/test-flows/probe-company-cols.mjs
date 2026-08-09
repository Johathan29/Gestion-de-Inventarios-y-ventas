// Sonda: ¿qué tablas tienen company_id? (multi-tenancy de productos)
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const PAT = fs.readFileSync(path.resolve(__dirname, '../../temp_supabase_token.txt'), 'utf8').trim();

const run = async () => {
  const tables = [
    'products', 'categories', 'inventory', 'sales', 'sale_items', 'clients',
    'carts', 'cart_items', 'invoices', 'invoice_items', 'inventory_movements',
    'offers', 'product_variants', 'purchases', 'purchase_items', 'users', 'companies',
  ].map(t => `'${t}'`).join(',');
  const q = `select c.table_name, c.column_name
             from information_schema.columns c
             where c.table_schema = 'public'
               and c.column_name in ('company_id','user_id','client_id')
               and c.table_name in (${tables})
             order by c.table_name, c.column_name`;
  const r = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const j = await r.json();
  console.log(JSON.stringify(j, null, 1));
  process.exit(0);
};
run().catch(e => { console.error('ERR', e.message); process.exit(1); });

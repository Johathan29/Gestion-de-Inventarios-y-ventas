// Verificación schema facturación (Fase 7): invoices, sale_items, invoice_items
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const TOKEN = fs.readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

const sql = `
SELECT c.table_name, c.column_name, c.data_type, c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema='public'
  AND c.table_name IN ('invoices','sale_items','sales','leads','invoice_items')
ORDER BY c.table_name, c.ordinal_position;
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const data = await res.json();
if (!Array.isArray(data)) { console.log(JSON.stringify(data, null, 2)); process.exit(1); }

const grouped = {};
for (const row of data) {
  (grouped[row.table_name] ||= []).push(`${row.column_name}:${row.data_type}${row.is_nullable === 'YES' ? '' : '!NOT NULL'}`);
}
for (const [t, cols] of Object.entries(grouped)) {
  console.log(`\n═══ ${t} ═══`);
  console.log(cols.join('\n'));
}
if (!grouped.invoice_items) console.log('\n⚠️ invoice_items NO EXISTE');

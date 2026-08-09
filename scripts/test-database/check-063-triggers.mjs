import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PAT = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (res.status >= 400) throw new Error(`Query failed (${res.status}): ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

const TABLES = [
  'cash_movements','cash_register_sessions','cash_registers','clients','cms_page_templates',
  'cms_templates','dynamic_form_fields','ecommerce_settings','email_logs','invoices',
  'ncf_sequences','notification_channels','notification_templates','sales','site_navigation_items',
  'themes','transactional_outbox','users','whatsapp_config',
];

const r = await runQuery(`
SELECT c.relname AS tabla,
       count(*) FILTER (WHERE tg.tgfoid = 'auto_assign_company_id()'::regprocedure) AS auto_trg,
       count(*) FILTER (WHERE tg.tgname = 'trg_auto_company_id') AS named_trg
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_trigger tg ON tg.tgrelid = c.oid AND NOT tg.tgisinternal
WHERE n.nspname='public' AND c.relkind='r'
  AND c.relname IN (${TABLES.map(t => `'${t}'`).join(',')})
GROUP BY c.relname ORDER BY c.relname;
`);
for (const row of r) {
  console.log(`${row.tabla.padEnd(28)} auto_assign=${row.auto_trg} trg_named=${row.named_trg} ${row.auto_trg === 0 ? '⚠️ SIN TRIGGER' : ''}`);
}

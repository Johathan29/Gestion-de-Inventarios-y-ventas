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

const NOT_NULL_TABLES = [
  'cash_movements','cash_register_sessions','cash_registers','clients','cms_page_templates',
  'cms_templates','dynamic_form_fields','ecommerce_settings','email_logs','invoices',
  'ncf_sequences','notification_channels','notification_templates','sales','site_navigation_items',
  'themes','transactional_outbox','users','whatsapp_config',
];

// 1) Conteo de NULLs y total por tabla
const nulls = await runQuery(`
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema='public' AND column_name='company_id'
  AND table_name IN (${NOT_NULL_TABLES.map(t => `'${t}'`).join(',')});
`);

for (const t of NOT_NULL_TABLES) {
  const r = await runQuery(`SELECT count(*) AS total, count(*) FILTER (WHERE company_id IS NULL) AS nulos FROM public.${t};`);
  console.log(`${t.padEnd(28)} total=${r[0].total} nulos=${r[0].nulos}`);
}

// 2) Políticas existentes en las 26 tablas sin cobertura completa
console.log('\n=== POLÍTICAS EXISTENTES (tablas que fallan policies) ===');
const pol = await runQuery(`
SELECT c.relname AS tabla, p.polname, p.polcmd
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('api_key_logs','automation_logs','cash_movements','cash_register_sessions',
    'cash_registers','clients','cms_component_versions','cms_page_versions','company_themes',
    'custom_code_blocks','dynamic_form_fields','dynamic_form_submissions','dynamic_forms',
    'integration_logs','invoices','media_assets','notification_history','payment_transactions',
    'sales','site_headers','site_navigation_items','site_navigation_menus','themes',
    'transactional_outbox','url_redirects','webhook_logs')
ORDER BY c.relname, p.polname;
`);
const byTable = {};
for (const p of pol) (byTable[p.tabla] ||= []).push(`${p.polname}[${p.polcmd}]`);
for (const [t, ps] of Object.entries(byTable)) console.log(`${t.padEnd(28)} → ${ps.join(', ')}`);
const missing = ['api_key_logs','automation_logs','cash_movements','cash_register_sessions','cash_registers','clients','cms_component_versions','cms_page_versions','company_themes','custom_code_blocks','dynamic_form_fields','dynamic_form_submissions','dynamic_forms','integration_logs','invoices','media_assets','notification_history','payment_transactions','sales','site_headers','site_navigation_items','site_navigation_menus','themes','transactional_outbox','url_redirects','webhook_logs'].filter(t => !byTable[t]);
console.log('\nSin NINGUNA política:', missing.join(', '));

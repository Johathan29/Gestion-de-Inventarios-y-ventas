// Verificación migración 070 (Fase 7 invoice_items)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const TOKEN = fs.readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

const sql = `
SELECT 'tabla' AS k, 'invoice_items' AS v WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema='public' AND table_name='invoice_items')
UNION ALL
SELECT 'columnas', string_agg(column_name, ',') FROM information_schema.columns
  WHERE table_schema='public' AND table_name='invoice_items'
UNION ALL
SELECT 'indices', string_agg(indexname, ',') FROM pg_indexes
  WHERE schemaname='public' AND tablename='invoice_items'
UNION ALL
SELECT 'filas_backfill', count(*)::text FROM invoice_items
UNION ALL
SELECT 'rls', relrowsecurity::text FROM pg_class WHERE oid = 'invoice_items'::regclass
UNION ALL
SELECT 'policy', count(*)::text FROM pg_policies WHERE schemaname='public' AND tablename='invoice_items'
UNION ALL
SELECT 'trigger', count(*)::text FROM pg_trigger
  WHERE tgrelid='invoice_items'::regclass AND tgname='trg_auto_company_id';
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));

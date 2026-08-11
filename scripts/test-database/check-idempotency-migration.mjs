// Verificación rápida migración 067 (Fase 5 idempotencia)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const TOKEN = fs.readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

const sql = `
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('idempotency_keys','webhook_logs')
UNION ALL
SELECT 'fn: ' || p.proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'fn_idempotency%'
UNION ALL
SELECT 'col: webhook_logs.event_id' WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='webhook_logs' AND column_name='event_id')
UNION ALL
SELECT 'idx: ' || indexname FROM pg_indexes
WHERE schemaname='public' AND indexname IN ('uq_idempotency_company_key','uq_webhook_logs_webhook_event');
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));

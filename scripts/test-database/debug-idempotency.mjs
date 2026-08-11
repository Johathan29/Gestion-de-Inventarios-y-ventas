// Debug ID08 + ID09: métodos de pago disponibles y dedup webhook
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PAT = fs.readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();

async function sql(query) {
  const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  console.log('→', query.slice(0, 180).replace(/\s+/g, ' '));
  console.log(JSON.stringify(text ? JSON.parse(text) : [], null, 1).slice(0, 1200));
  return text ? JSON.parse(text) : [];
}

// Métodos de pago existentes
await sql(`SELECT code, name, is_active FROM payment_methods ORDER BY code LIMIT 20;`);

// Simular ID09 paso a paso
const webhook = await sql(`
  INSERT INTO webhooks (company_id, name, url, events, http_method, content_type, retry_count, is_active)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Debug hook', 'https://example.com/debug', ARRAY['sale.created'], 'POST', 'application/json', 3, TRUE)
  RETURNING id, company_id, events, is_active;
`);
const whId = webhook[0]?.id;
console.log('webhookId =', whId);

const payload = '{"id":"33333333-3333-3333-3333-333333333333","total":250}';
await sql(`SELECT public.fn_fire_webhooks('00000000-0000-0000-0000-000000000001', 'sale.created', '${payload}'::jsonb);`);

const logs = await sql(`
  SELECT id, webhook_id, event_type, event_id, status, payload::text AS payload
  FROM webhook_logs WHERE webhook_id = ${whId};
`);
console.log('logs =', JSON.stringify(logs, null, 1));

// Limpieza
await sql(`DELETE FROM webhook_logs WHERE webhook_id = ${whId}; DELETE FROM webhooks WHERE id = ${whId};`);

// Imprime columnas/required de tablas clave desde OpenAPI
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const URL = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_KEY;

const r = await fetch(`${URL}/rest/v1/`, { headers: { apikey: K, Authorization: `Bearer ${K}` } });
const o = await r.json();
const defs = o.definitions;

for (const t of ['clients', 'leads', 'webhooks', 'automation_rules', 'automation_actions', 'automation_logs', 'pipeline_stages', 'lead_stages', 'tasks', 'lead_activities']) {
  const d = defs[t];
  if (!d) { console.log(`--- ${t}: NO DEFINITION`); continue; }
  console.log(`--- ${t} ---`);
  console.log('cols:', Object.keys(d.properties).join(', '));
  if (d.required?.length) console.log('required:', d.required.join(', '));
}
process.exit(0);

// Diagnóstico: tipos de columnas vía errores tipados de PostgREST
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../backend/.env');
const env = {};
for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
  const line = raw.replace(/\r$/, '');
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
}

const URL = env.SUPABASE_URL + '/rest/v1';
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function probe(label, path2, query = '') {
  try {
    const res = await fetch(`${URL}${path2}${query ? '?' + query : ''}`, { headers: H });
    const text = await res.text();
    console.log(`\n--- ${label} [${res.status}] ---`);
    console.log(text.substring(0, 300));
  } catch (e) {
    console.log(`\n--- ${label} --- FETCH ERROR: ${e.message}`);
  }
}

// 1) Tablas existen? (limit 1)
await probe('crm_pipelines select *', '/crm_pipelines', 'select=*&limit=1');
await probe('leads select *', '/leads', 'select=*&limit=1');
await probe('lead_stages select *', '/lead_stages', 'select=*&limit=1');
await probe('webhooks select *', '/webhooks', 'select=*&limit=1');
await probe('webhook_event_types select *', '/webhook_event_types', 'select=*&limit=1');
await probe('automation_rules select *', '/automation_rules', 'select=*&limit=1');
await probe('company_dashboard_widgets select *', '/company_dashboard_widgets', 'select=*&limit=1');
await probe('product_reviews select *', '/product_reviews', 'select=*&limit=1');
await probe('dynamic_form_submissions select *', '/dynamic_form_submissions', 'select=*&limit=1');

// 2) Tipos: filtrar company_id con UUID → si es integer, PostgREST da error de tipo
const uuid = '00000000-0000-0000-0000-000000000001';
await probe('crm_pipelines company_id=eq.UUID (tipo?)', '/crm_pipelines', `select=company_id&company_id=eq.${uuid}&limit=1`);
await probe('leads company_id=eq.UUID (tipo?)', '/leads', `select=company_id&company_id=eq.${uuid}&limit=1`);
await probe('webhooks company_id=eq.UUID (tipo?)', '/webhooks', `select=company_id&company_id=eq.${uuid}&limit=1`);
await probe('webhook_event_types company_id=eq.UUID (tipo?)', '/webhook_event_types', `select=company_id&company_id=eq.${uuid}&limit=1`);
await probe('automation_rules company_id=eq.UUID (tipo?)', '/automation_rules', `select=company_id&company_id=eq.${uuid}&limit=1`);
await probe('company_dashboard_widgets company_id=eq.UUID (tipo?)', '/company_dashboard_widgets', `select=company_id&company_id=eq.${uuid}&limit=1`);
await probe('product_reviews product_id=eq.UUID (tipo?)', '/product_reviews', `select=product_id&product_id=eq.${uuid}&limit=1`);

// 3) RPCs: probar invocación real
await probe('rpc get_platform_stats', '/rpc/get_platform_stats', '');
await probe('rpc increment_form_submission_count', '/rpc/increment_form_submission_count', '');

// 4) Roles y permisos del admin
await probe('roles select *', '/roles', 'select=*&order=id.asc');
await probe('admin user + rol', '/users', 'select=id,email,role_id,roles(name,permissions)&email=eq.admin@sistema.com');

// 5) Tablas CRM y automatización
await probe('pipeline_stages select *', '/pipeline_stages', 'select=*&limit=1');
await probe('lead_sources select *', '/lead_sources', 'select=*&limit=1');
await probe('webhook_events select *', '/webhook_events', 'select=*&limit=1');
await probe('automation_actions select *', '/automation_actions', 'select=*&limit=1');
await probe('crm_pipeline_stages select *', '/crm_pipeline_stages', 'select=*&limit=1');

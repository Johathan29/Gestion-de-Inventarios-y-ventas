// Diagnóstico final: RPCs y tablas de platform-admin + tablas de formularios
// Uso: node diagnose-final.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const sb = createClient(URL, SERVICE_KEY);

async function probeRpc(name, args = {}) {
  const { data, error } = await sb.rpc(name, args);
  console.log(`--- rpc ${name} [${error ? 'ERR' : 'OK'}] ---`);
  if (error) console.log(JSON.stringify({ code: error.code, message: error.message }));
  else console.log(JSON.stringify(data).slice(0, 300));
}

async function probeTable(name, extra = 'limit=1') {
  const res = await fetch(`${URL}/rest/v1/${name}?select=*&${extra}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const text = await res.text();
  console.log(`--- ${name} [${res.status}] ---`);
  console.log(text.slice(0, 300));
}

// RPCs usados por platform-admin
await probeRpc('get_all_companies', { p_search: null, p_status: null, p_limit: 1, p_offset: 0 });
await probeRpc('get_company_details', { p_company_id: '00000000-0000-0000-0000-000000000001' });
await probeRpc('create_support_session', { p_target_company_id: '00000000-0000-0000-0000-000000000001', p_reason: 'probe' });
await probeRpc('end_support_session', { p_session_id: 1 });
await probeRpc('update_company_dashboard_config', { p_company_id: '00000000-0000-0000-0000-000000000001', p_config: {} });

// Tablas de platform-admin
await probeTable('impersonation_logs');
await probeTable('support_sessions');
await probeTable('business_types');
await probeTable('dashboard_widgets');
await probeTable('companies');

// Tablas de form-builder
await probeTable('dynamic_forms');
await probeTable('dynamic_form_fields');
await probeTable('dynamic_form_submissions');

// Tabla invoices
await probeTable('invoices');
await probeTable('invoice_items');

process.exit(0);

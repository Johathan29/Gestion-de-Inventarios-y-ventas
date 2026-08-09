// Diagnóstico: reproduce la creación de cliente Supabase de integration/platform-admin/form-builder
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', URL ? 'OK' : 'MISSING');
console.log('SERVICE_KEY:', SERVICE_KEY ? 'OK' : 'MISSING');
console.log('ANON_KEY:', ANON_KEY ? 'OK' : 'MISSING');
console.log('ROLE_KEY:', ROLE_KEY ? 'OK' : 'MISSING');

// 1) Simular platform-admin: service key + user JWT en Authorization header
try {
  const login = await fetch(`${process.env.GATEWAY_PORT ? `http://localhost:${process.env.GATEWAY_PORT}` : 'http://localhost:3000'}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
  });
  const loginData = await login.json();
  const token = loginData?.accessToken || loginData?.data?.accessToken;
  console.log('\nLogin OK, token length:', token?.length);

  // platform-admin style
  try {
    const c1 = createClient(URL, SERVICE_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const r1 = await c1.rpc('get_platform_stats');
    console.log('platform-admin rpc get_platform_stats:', r1.error ? `ERROR: ${r1.error.message}` : `OK ${JSON.stringify(r1.data)?.slice(0, 100)}`);
  } catch (e) {
    console.log('platform-admin createClient/rpc THREW:', e.message);
  }

  // integration style: anon key + user JWT
  try {
    const c2 = createClient(URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } });
    const r2 = await c2.from('webhook_event_types').select('*').eq('is_active', true).limit(3);
    console.log('integration event-types:', r2.error ? `ERROR: ${r2.error.message}` : `OK rows=${r2.data?.length}`);
  } catch (e) {
    console.log('integration createClient/query THREW:', e.message);
  }

  // form-builder style: role key, sin Authorization de usuario
  try {
    const c3 = createClient(URL, ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const r3 = await c3.rpc('increment_form_submission_count', { form_id_param: '00000000-0000-0000-0000-000000000000' });
    console.log('form-builder rpc increment_form_submission_count:', r3.error ? `ERROR: ${r3.error.message}` : `OK`);
  } catch (e) {
    console.log('form-builder rpc THREW:', e.message);
  }

  // RPC exists?
  try {
    const c4 = createClient(URL, ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const r4 = await c4.rpc('get_platform_stats');
    console.log('rpc get_platform_stats (service role):', r4.error ? `ERROR: ${r4.error.message}` : `OK`);
  } catch (e) {
    console.log('rpc get_platform_stats THREW:', e.message);
  }
} catch (e) {
  console.log('Login falló:', e.message);
}

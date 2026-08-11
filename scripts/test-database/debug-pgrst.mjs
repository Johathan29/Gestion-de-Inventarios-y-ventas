// Debug: probar PostgREST directo para payment_methods / payment_transactions
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const envText = fs.readFileSync(path.join(ROOT, 'backend/.env'), 'utf8');
const getEnv = (k) => {
  const m = envText.split('\n').find(l => l.trim().startsWith(k + '='));
  return m ? m.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : process.env[k];
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_ANON_KEY');
console.log('URL:', SUPABASE_URL, 'KEY len:', SERVICE_KEY?.length);

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// 1. payment_methods simple
const r1 = await sb.from('payment_methods').select('*').eq('code', 'cash').single();
console.log('payment_methods:', r1.error ? `ERROR ${r1.error.code}: ${r1.error.message}` : `OK ${r1.data?.code}`);

// 2. payment_transactions simple
const r2 = await sb.from('payment_transactions').select('*').limit(1);
console.log('payment_transactions:', r2.error ? `ERROR ${r2.error.code}: ${r2.error.message}` : `OK count=${r2.data?.length}`);

// 3. payment_transactions con join embebido
const r3 = await sb.from('payment_transactions').select('*, payment_methods(name, type)').limit(1);
console.log('join:', r3.error ? `ERROR ${r3.error.code}: ${r3.error.message}` : `OK count=${r3.data?.length}`);

// 4. payment_methods desde el client con RLS de tenant (query service-role directo sin proxy)
const r4 = await sb.from('payment_transactions').insert({ company_id: '00000000-0000-0000-0000-000000000001', reference_type: 'sale', reference_id: '11111111-1111-1111-1111-111111111111', payment_method: 'cash', amount: 1, status: 'completed' }).select().single();
console.log('insert test:', r4.error ? `ERROR ${r4.error.code}: ${r4.error.message}` : `OK ${r4.data?.id}`);
if (!r4.error) await sb.from('payment_transactions').delete().eq('id', r4.data.id);

// Debug: flujo completo ProcessPaymentUseCase (proxy tenant + repos)
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const envText = fs.readFileSync(path.join(ROOT, 'backend/.env'), 'utf8');
const getEnv = (k) => {
  const m = envText.split('\n').find(l => l.trim().startsWith(k + '='));
  return m ? m.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : process.env[k];
};
process.env.SUPABASE_URL = getEnv('SUPABASE_URL');
process.env.SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_ANON_KEY');
process.env.JWT_SECRET = getEnv('JWT_SECRET') || 'default-secret';

const { createSupabaseClient, createTenantClient, tenantStorage } = await import(
  pathToFileURL(path.join(ROOT, 'packages/shared-kernel/src/index.js')).href
);

const base = createSupabaseClient();
const tenant = createTenantClient(base, '00000000-0000-0000-0000-000000000001');

await tenantStorage.run({ supabase: tenant, companyId: '00000000-0000-0000-0000-000000000001' }, async () => {
  // 1. findByCode('cash')
  const r1 = await tenant.from('payment_methods').select('*').eq('code', 'cash').single();
  console.log('1 findByCode:', r1.error ? `ERROR ${r1.error.code}: ${r1.error.message}` : `OK ${r1.data?.code}`);

  // 2. findByIdempotencyKey con join
  const r2 = await tenant.from('payment_transactions').select('*, payment_methods(name, type)').eq('idempotency_key', 'debug-key').maybeSingle();
  console.log('2 findByIdempotencyKey:', r2.error ? `ERROR ${r2.error.code}: ${r2.error.message}` : `OK ${r2.data}`);

  // 3. insert (save) con proxy tenant
  const r3 = await tenant.from('payment_transactions')
    .insert({
      sale_id: '22222222-2222-2222-2222-222222222222',
      payment_method_id: r1.data?.id,
      payment_method_name: 'Efectivo',
      amount: 1,
      reference: '',
      status: 'completed',
      processed_by: null,
      notes: '',
      idempotency_key: 'debug-key-2',
    })
    .select()
    .single();
  console.log('3 insert:', r3.error ? `ERROR ${r3.error.code}: ${r3.error.message}` : `OK ${r3.data?.id}`);
  if (!r3.error) {
    await tenant.from('payment_transactions').delete().eq('id', r3.data.id);
  }

  // 4. updateStatus
  const r4 = await tenant.from('payment_transactions').update({ status: 'refunded' }).eq('id', '00000000-0000-0000-0000-000000000000');
  console.log('4 update:', r4.error ? `ERROR ${r4.error.code}: ${r4.error.message}` : `OK`);
});

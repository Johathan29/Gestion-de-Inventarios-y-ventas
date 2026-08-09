// Sonda: crear función probe_jwt_role, llamarla con service key, limpiarla
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const PAT = fs.readFileSync(path.resolve(__dirname, '../../temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

const mgmt = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return { status: r.status, text: (await r.text()).slice(0, 400) };
};

const createSql = `CREATE OR REPLACE FUNCTION public.probe_jwt_role() RETURNS text
LANGUAGE sql SECURITY DEFINER AS $fn$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true)::json->>'role', ''), 'NO_CLAIM')
       || '|'
       || COALESCE(current_setting('request.jwt.claims', true)::json->>'company_id', 'no_cid');
$fn$;`;

console.log('create:', JSON.stringify(await mgmt(createSql)));

// Recargar schema cache de PostgREST
console.log('reload:', JSON.stringify(await mgmt("NOTIFY pgrst, 'reload schema';")));

// Recrear sonda (tras reload)
await mgmt(createSql);

// Llamar vía PostgREST con la service key
const r = await fetch(`${URL}/rest/v1/rpc/probe_jwt_role`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: '{}',
});
console.log('service key claim:', r.status, (await r.text()).slice(0, 300));

// get_user_role existe — ver su definición
const def = await mgmt(`SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_user_role';`);
console.log('get_user_role def:', def.text.slice(0, 800));

// get_platform_stats de nuevo tras reload
const r2 = await fetch(`${URL}/rest/v1/rpc/get_platform_stats`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: '{}',
});
console.log('get_platform_stats:', r2.status, (await r2.text()).slice(0, 200));

// Limpiar
console.log('drop:', JSON.stringify(await mgmt('DROP FUNCTION IF EXISTS public.probe_jwt_role();')));
process.exit(0);

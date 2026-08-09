// Diagnóstico de esquema real de la BD (solo lectura)
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../backend/.env');
const env = {};
for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
  const line = raw.replace(/\r$/, '');
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
}

async function tryConnect({ host, port, database, user, password }) {
  const client = new pg.Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    console.log(`CONECTADO ${user}@${host}/${database} (pass len: ${(password || '').length})`);
    return client;
  } catch (err) {
    console.log(`Falló ${user}@${host} (pass len ${(password || '').length}):`, err.message.substring(0, 60));
    return null;
  }
}

const candidates = [
  { host: 'db.prspnfxfspokbqxsboby.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: '' },
  { host: 'db.prspnfxfspokbqxsboby.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: 'sb_secret_s3HnYYKmd9lLiVBd5dQNrA_IOPHPu9Q' },
  { host: 'db.prspnfxfspokbqxsboby.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: 'postgres' },
  { host: env.SUPABASE_DB_HOST, port: parseInt(env.SUPABASE_DB_PORT || '5432', 10), database: env.SUPABASE_DB_NAME, user: env.SUPABASE_DB_USER, password: env.SUPABASE_DB_PASSWORD || '' },
];

let client = null;
for (const c of candidates) {
  client = await tryConnect(c);
  if (client) break;
}
if (!client) { console.error('No se pudo conectar'); process.exit(1); }

const queries = [
  ['companies.id type', `SELECT data_type FROM information_schema.columns WHERE table_name='companies' AND column_name='id'`],
  ['crm_pipelines columns', `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='crm_pipelines' ORDER BY ordinal_position`],
  ['leads columns', `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='leads' ORDER BY ordinal_position`],
  ['lead_stages columns', `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='lead_stages' ORDER BY ordinal_position`],
  ['RPC increment_form_submission_count existe', `SELECT proname FROM pg_proc WHERE proname='increment_form_submission_count'`],
  ['RPC get_platform_stats existe', `SELECT proname FROM pg_proc WHERE proname='get_platform_stats'`],
  ['tabla webhooks', `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='webhooks' ORDER BY ordinal_position`],
  ['tabla webhook_event_types', `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='webhook_event_types' ORDER BY ordinal_position`],
  ['tabla automation_rules', `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='automation_rules' ORDER BY ordinal_position`],
  ['tabla companies existe', `SELECT count(*) FROM information_schema.tables WHERE table_name='companies'`],
  ['companies count', `SELECT count(*) FROM companies`],
  ['default company', `SELECT id, name FROM companies LIMIT 3`],
];

for (const [label, sql] of queries) {
  try {
    const res = await client.query(sql);
    console.log(`\n=== ${label} ===`);
    console.log(JSON.stringify(res.rows, null, 1));
  } catch (e) {
    console.log(`\n=== ${label} === ERROR: ${e.message}`);
  }
}

await client.end();

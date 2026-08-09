// Diagnóstico de triggers/columnas que rompen el flujo de registro
// Uso: node scripts/db-diagnose.mjs
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../backend/.env');
const env = {};
for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
  const line = raw.replace(/\r$/, '');
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
}

console.log('Conectando a:', env.SUPABASE_DB_HOST, ':', env.SUPABASE_DB_PORT, '/', env.SUPABASE_DB_NAME);
console.log('user:', env.SUPABASE_DB_USER, '| pass len:', (env.SUPABASE_DB_PASSWORD || '').length, '| user len:', (env.SUPABASE_DB_USER || '').length);
console.log('keys con DB_:', Object.keys(env).filter((k) => k.includes('DB')).join(', '));

const serviceRoleKey = 'sb_secret_s3HnYYKmd9lLiVBd5dQNrA_IOPHPu9Q';

async function tryConnect(password) {
  const client = new pg.Client({
    host: env.SUPABASE_DB_HOST,
    port: parseInt(env.SUPABASE_DB_PORT || '5432', 10),
    database: env.SUPABASE_DB_NAME,
    user: env.SUPABASE_DB_USER,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    console.log('CONECTADO con password len:', password.length);
    return client;
  } catch (err) {
    console.log('Falló con password len', password.length, ':', err.message.substring(0, 80));
    return null;
  }
}

let client = await tryConnect('');
if (!client) client = await tryConnect(serviceRoleKey);
if (!client) client = await tryConnect('postgres');
if (!client) { console.error('No se pudo conectar'); process.exit(1); }

async function main() {
  await client.connect();
  console.log('=== 1. Triggers en clients ===');
  const trg = await client.query(`
    SELECT tgname, pg_get_triggerdef(t.oid) AS def
    FROM pg_trigger t
    WHERE NOT t.tgisinternal AND tgrelid = 'clients'::regclass
  `);
  for (const r of trg.rows) console.log(`- ${r.tgname}: ${r.def}`);

  console.log('\n=== 2. ¿clients tiene company_id? ===');
  const col = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name='clients' ORDER BY ordinal_position
  `);
  console.log(col.rows.map((r) => r.column_name).join(', '));

  console.log('\n=== 3. Triggers en sales / form submissions ===');
  for (const t of ['sales', 'dynamic_form_submissions', 'users', 'invoices']) {
    const r = await client.query(`
      SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgrelid = $1::regclass
    `, [t]);
    console.log(`${t}: ${r.rows.map((x) => x.tgname).join(', ') || '(sin triggers)'}`);
  }

  console.log('\n=== 4. Funciones con NEW.company_id ===');
  const fns = await client.query(`
    SELECT proname FROM pg_proc
    WHERE prosrc LIKE '%NEW.company_id%'
  `);
  console.log(fns.rows.map((r) => r.proname).join(', ') || '(ninguna)');

  await client.end();
}

main().catch(async (e) => { console.error('ERROR:', e); try { await client.end(); } catch {} process.exit(1); });

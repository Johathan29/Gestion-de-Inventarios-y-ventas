/**
 * Aplica la migración 049 (RPC sp_create_sale + outbox helpers + idempotency_key)
 * vía conexión directa a Postgres (Supabase).
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  host: 'db.prspnfxfspokbqxsboby.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
};

// La service role key ya está referenciada en apply_migration_pg.mjs
const serviceRoleKey = 'sb_secret_s3HnYYKmd9lLiVBd5dQNrA_IOPHPu9Q';

async function tryConnect(password) {
  const client = new pg.Client({ ...config, password });
  try {
    await client.connect();
    console.log('Conectado OK (password length:', password.length + ')');
    return client;
  } catch (err) {
    console.log('Conexión fallida:', err.message.substring(0, 120));
    try { await client.end(); } catch (e) {}
    return null;
  }
}

async function main() {
  const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '049_sale_rpc_outbox.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log('SQL length:', sql.length);

  let client = await tryConnect('');
  if (!client) client = await tryConnect(serviceRoleKey);
  if (!client) client = await tryConnect('postgres');
  if (!client) {
    console.log('❌ No se pudo conectar a la base de datos.');
    process.exit(1);
  }

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migración 049 aplicada correctamente.');

    // Verificación
    const rpc = await client.query(
      "SELECT proname FROM pg_proc WHERE proname IN ('sp_create_sale','sp_get_pending_outbox','sp_mark_outbox_published','sp_mark_outbox_failed') ORDER BY proname"
    );
    console.log('Funciones creadas:', rpc.rows.map((r) => r.proname).join(', '));
    const col = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='payment_transactions' AND column_name='idempotency_key'"
    );
    console.log('Columna idempotency_key:', col.rows.length ? 'OK' : 'FALTA');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.log('❌ Error aplicando migración:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();

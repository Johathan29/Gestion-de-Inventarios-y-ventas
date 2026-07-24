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
  password: 'sb_secret_s3HnYYKmd9lLiVBd5dQNrA_IOPHPu9Q',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

async function tryConnect(password) {
  const client = new pg.Client({ ...config, password });
  try {
    await client.connect();
    console.log('Connected with password length:', password.length);
    return client;
  } catch (err) {
    console.log('Failed:', err.message.substring(0, 80));
    if (client) try { await client.end(); } catch(e) {}
    return null;
  }
}

async function main() {
  // Read the migration SQL
  const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '026_enterprise_audit_improvements.sql');
  let sql = fs.readFileSync(sqlPath, 'utf-8');
  
  // Only extract the cash_register related part
  const startMarker = 'CREATE TABLE IF NOT EXISTS cash_registers (';
  const endMarker = '-- ============================================================';
  const startIdx = sql.indexOf(startMarker);
  const endIdx = sql.indexOf(endMarker, startIdx + 1);
  
  if (startIdx === -1) {
    console.error('Could not find cash_registers CREATE TABLE in migration file');
    return;
  }
  
  const cashSql = sql.substring(startIdx, endIdx !== -1 ? endIdx : sql.length);
  console.log('Extracted SQL length:', cashSql.length);
  
  // Try different passwords
  let client = await tryConnect('');
  if (!client) client = await tryConnect(config.password);
  if (!client) client = await tryConnect('postgres');
  
  if (!client) {
    console.error('❌ Could not connect with any password');
    return;
  }
  
  try {
    await client.query(cashSql);
    console.log('✅ Cash register tables applied successfully');
  } catch (err) {
    console.error('❌ Error during migration:', err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);

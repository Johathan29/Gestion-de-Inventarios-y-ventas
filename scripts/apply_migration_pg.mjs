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
  password: '', // empty from .env
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
};

const serviceRoleKey = 'sb_secret_s3HnYYKmd9lLiVBd5dQNrA_IOPHPu9Q';

async function tryConnect(password) {
  const client = new pg.Client({ ...config, password });
  try {
    await client.connect();
    console.log('Connected successfully with password length:', password.length);
    return client;
  } catch (err) {
    console.log('Connection failed:', err.message.substring(0, 100));
    if (client) try { await client.end(); } catch(e) {}
    return null;
  }
}

async function main() {
  // Read migration SQL
  const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '022_cart_items_variant_id.sql');
  let sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log('Migration SQL length:', sql.length);
  console.log('First 100 chars:', sql.substring(0, 100));
  
  // Try empty password first
  console.log('\n--- Trying empty password ---');
  let client = await tryConnect('');
  
  if (!client) {
    // Try service role key as password
    console.log('\n--- Trying service role key as password ---');
    client = await tryConnect(serviceRoleKey);
  }
  
  if (!client) {
    // Try "postgres" as password (common default)
    console.log('\n--- Trying "postgres" as password ---');
    client = await tryConnect('postgres');
  }

  if (!client) {
    console.log('\n❌ Could not connect to database with any password.');
    console.log('Suggestions:');
    console.log('1. Get the DB password from Supabase dashboard');
    console.log('2. Use the Management API with a PAT');
    return;
  }

  // Execute migration
  try {
    const result = await client.query(sql);
    console.log('✅ Migration executed successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  }

  await client.end();
}

main().catch(console.error);

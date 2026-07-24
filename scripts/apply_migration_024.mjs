import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '..', 'database', 'migrations', '024_sale_items_variant_support.sql');
const sql = readFileSync(sqlPath, 'utf8');

const supabase = createClient(
  'https://prspnfxfspokbqxsboby.supabase.co',
  'sb_secret_s3HnYYKmd9lLiVBd5dQNrA_IOPHPu9Q'
);

async function checkMigrationApplied() {
  // Check if variant_id column exists in sale_items
  const { data, error } = await supabase
    .from('sale_items')
    .select('variant_id')
    .limit(1);

  if (error && error.message?.includes('column')) {
    return false; // column doesn't exist
  }
  // If no error or different error, column likely exists
  if (!error) return true;
  // Check error details
  if (error.message?.includes('variant_id')) return false;
  return true; // assume it exists
}

async function main() {
  console.log('Checking if migration 024 is already applied...');
  
  try {
    const { data: testData, error: testError } = await supabase
      .from('sale_items')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('Cannot access sale_items table:', testError.message);
    } else {
      console.log('sale_items table exists');
    }
  } catch (e) {
    console.log('Error accessing sale_items:', e.message);
  }

  // Try using the Supabase REST endpoint for SQL
  console.log('\n--- Executing migration via REST API ---');
  
  try {
    const response = await fetch('https://prspnfxfspokbqxsboby.supabase.co/rest/v1/rpc/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'sb_publishable_clpzp2IxmGG_meNU739Qog_iUg9McHN',
        'Authorization': 'Bearer sb_secret_s3HnYYKmd9lLiVBd5dQNrA_IOPHPu9Q',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.length > 1000 ? text.substring(0, 1000) + '...' : text);
  } catch (fetchErr) {
    console.log('REST endpoint failed:', fetchErr.message);
  }

  // Alternative: use Supabase JS client with raw query
  console.log('\n--- Trying via exec_sql RPC ---');
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
    if (error) {
      console.log('exec_sql failed:', error.message);
    } else {
      console.log('exec_sql succeeded:', JSON.stringify(data).substring(0, 200));
    }
  } catch (e) {
    console.log('exec_sql error:', e.message);
  }
}

main().catch(console.error);

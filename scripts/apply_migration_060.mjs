// Aplica migración 060: fix get_all_companies (products sin company_id)
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const PAT = fs.readFileSync(path.resolve(__dirname, '../temp_supabase_token.txt'), 'utf8').trim();
const sql = fs.readFileSync(path.resolve(__dirname, '../database/migrations/060_fix_get_all_companies_product_count.sql'), 'utf8');

const run = async () => {
  const r = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const j = await r.json();
  console.log('060 status:', r.status, JSON.stringify(j));
  process.exit(0);
};
run().catch(e => { console.error('ERR', e.message); process.exit(1); });

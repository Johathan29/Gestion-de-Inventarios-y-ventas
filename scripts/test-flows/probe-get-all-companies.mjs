// Sonda: definición de get_all_companies (p.company_id no existe → 400 en S38)
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const PAT = fs.readFileSync(path.resolve(__dirname, '../../temp_supabase_token.txt'), 'utf8').trim();

const run = async () => {
  const q = `select pg_get_functiondef(p.oid) as def
             from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'get_all_companies'`;
  const r = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const j = await r.json();
  if (r.ok) {
    console.log('DEF:\n' + (j[0]?.def || JSON.stringify(j)));
  } else {
    console.log(r.status, JSON.stringify(j));
  }
  process.exit(0);
};
run().catch(e => { console.error('ERR', e.message); process.exit(1); });

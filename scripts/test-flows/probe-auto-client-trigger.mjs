// Sonda: definición del trigger trg_auto_create_client y función asociada
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const PAT = fs.readFileSync(path.resolve(__dirname, '../../temp_supabase_token.txt'), 'utf8').trim();

const run = async () => {
  const q = `select pg_get_triggerdef(t.oid) as trigdef, pg_get_functiondef(p.oid) as fndef
             from pg_trigger t
             join pg_proc p on p.oid = t.tgfoid
             where t.tgname = 'trg_auto_create_client'`;
  const r = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const j = await r.json();
  if (r.ok && j[0]) {
    console.log('TRIGGER:\n' + j[0].trigdef);
    console.log('FUNCTION:\n' + j[0].fndef);
  } else {
    console.log(r.status, JSON.stringify(j));
  }
  process.exit(0);
};
run().catch(e => { console.error('ERR', e.message); process.exit(1); });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });
const PAT = fs.readFileSync(path.resolve(__dirname, '../../temp_supabase_token.txt'), 'utf8').trim();

const mgmt = async (query) => {
  const r = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return { status: r.status, text: (await r.text()).slice(0, 3000) };
};

console.log('--- triggers on leads ---');
console.log((await mgmt("SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='public.leads'::regclass AND NOT tgisinternal")).text);

console.log('--- automation_logs cols ---');
console.log((await mgmt("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name='automation_logs' ORDER BY ordinal_position")).text);
process.exit(0);

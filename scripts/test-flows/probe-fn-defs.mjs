import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });
const PAT = fs.readFileSync(path.resolve(__dirname, '../../temp_supabase_token.txt'), 'utf8').trim();
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

const mgmt = async (query) => {
  const r = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return { status: r.status, text: (await r.text()).slice(0, 4000) };
};

console.log('=== is_platform_admin ===');
console.log((await mgmt("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='is_platform_admin'")).text);
console.log('=== get_current_user_role ===');
console.log((await mgmt("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='get_current_user_role'")).text);
console.log('=== get_platform_stats ===');
console.log((await mgmt("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='get_platform_stats'")).text);
process.exit(0);

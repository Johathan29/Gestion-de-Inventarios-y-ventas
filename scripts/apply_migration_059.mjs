import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const PAT = fs.readFileSync(path.resolve(__dirname, '../temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

const sql = fs.readFileSync(path.resolve(__dirname, '../database/migrations/059_automation_trigger_integer_overload.sql'), 'utf8');

const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
console.log('059 status:', r.status, (await r.text()).slice(0, 500));
process.exit(0);

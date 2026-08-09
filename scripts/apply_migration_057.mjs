// Aplica la migración 057 vía Management API de Supabase
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAT = fs.readFileSync(path.resolve(__dirname, '../temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';
const sql = fs.readFileSync(path.resolve(__dirname, '../database/migrations/057_platform_hotfix_service_role.sql'), 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${PAT}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log(`[${res.status}]`, text.slice(0, 1000));
process.exit(res.ok ? 0 : 1);

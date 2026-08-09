// Consulta la definición del trigger de fecha del kardex y el default de created_at
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const TOKEN = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({
    query: `SELECT tgname, pg_get_triggerdef(t.oid) AS def
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'inventory_movements' AND NOT t.tgisinternal
            UNION ALL
            SELECT 'column_default', column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'inventory_movements' AND column_name = 'created_at'`,
  }),
});
const data = await r.json();
console.log(JSON.stringify(data, null, 2));

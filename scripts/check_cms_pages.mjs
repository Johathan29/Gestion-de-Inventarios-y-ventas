import fs from 'fs';
const token = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const sql = `SELECT id, title, slug, is_published, deleted_at, updated_at FROM public.cms_pages ORDER BY updated_at DESC;`;

fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql })
}).then(async r => {
  const t = await r.text();
  const rows = JSON.parse(t);
  console.log(JSON.stringify(rows, null, 2));
}).catch(e => console.log('ERR', e.message));

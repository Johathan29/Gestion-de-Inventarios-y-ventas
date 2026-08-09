import fs from 'fs';
const token = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const sql = `ALTER TABLE public.cms_page_versions ALTER COLUMN content_snapshot DROP NOT NULL;`;
const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql })
});
console.log('STATUS:', res.status, 'BODY:', (await res.text()).substring(0, 200));

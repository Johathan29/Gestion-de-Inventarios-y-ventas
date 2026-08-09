import fs from 'fs';
const token = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const sql = `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('cms_pages','cms_page_sections','cms_component_registry','cms_component_instances','cms_page_versions') ORDER BY table_name, ordinal_position;`;

fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql })
}).then(async r => {
  const t = await r.text();
  const rows = JSON.parse(t);
  const by = {};
  rows.forEach(x => { (by[x.table_name] = by[x.table_name] || []).push(x.column_name); });
  Object.entries(by).forEach(([t, c]) => console.log(t + ': ' + c.join(', ')));
}).catch(e => console.log('ERR', e.message));

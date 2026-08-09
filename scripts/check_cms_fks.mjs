import fs from 'fs';
const token = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const sql = `SELECT conrelid::regclass AS tbl, a.attname AS col, confrelid::regclass AS ref, conname
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype='f' AND conrelid IN ('cms_pages'::regclass, 'cms_page_sections'::regclass, 'cms_component_instances'::regclass, 'cms_component_registry'::regclass, 'cms_page_versions'::regclass);`;
const res = await fetch('https://api.supabase.com/v1/projects/prspnfxfspokbqxsboby/database/query', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql })
});
const rows = JSON.parse(await res.text());
rows.forEach(x => console.log(`${x.tbl}.${x.col} -> ${x.ref}  (${x.conname})`));

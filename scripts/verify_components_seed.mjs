// Verifica el seed de cms_component_registry (migración 053)
import fs from 'fs';

const PAT = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

const sql = `
SELECT key, name, category, is_active
FROM public.cms_component_registry
WHERE key IN ('hero','cta','divider','text','features','faq','stats','testimonials','image','gallery','video','logos','products','contact','html')
ORDER BY category, key;
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: sql })
});
const text = await res.text();
console.log('status:', res.status);
console.log(text.slice(0, 4000));

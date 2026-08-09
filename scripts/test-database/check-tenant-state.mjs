import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PAT = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

async function runQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (res.status >= 400) throw new Error(`Query failed (${res.status}): ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

console.log('=== COMPANIES ===');
const companies = await runQuery(`SELECT id, name, slug, is_active FROM companies ORDER BY name;`);
for (const c of companies) console.log(`${c.id} | "${c.name}" | slug=${c.slug} | active=${c.is_active}`);

console.log('\n=== USERS (id, email, company_id, role, activo) ===');
const users = await runQuery(`
SELECT u.id, u.email, u.name, u.company_id, r.name AS role, u.is_active
FROM users u LEFT JOIN roles r ON r.id = u.role_id
ORDER BY u.email;
`);
for (const u of users) console.log(`${u.id} | ${u.email} | "${u.name}" | company=${u.company_id} | role=${u.role} | active=${u.is_active}`);

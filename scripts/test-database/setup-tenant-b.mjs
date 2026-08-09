import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PAT = readFileSync(path.join(ROOT, 'temp_supabase_token.txt'), 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

const COMPANY_B = '00000000-0000-0000-0000-000000000002';

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

// 1. Columnas de companies
const cols = await runQuery(`
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='companies' ORDER BY ordinal_position;
`);
console.log('companies cols:', cols.map(c => `${c.column_name}${c.is_nullable==='YES'?'?':''}`).join(', '));

// 2. Crear empresa B si no existe
const existC = await runQuery(`SELECT id FROM companies WHERE id = '${COMPANY_B}';`);
if (existC.length === 0) {
  await runQuery(`
  INSERT INTO companies (id, name, slug, ruc, is_active)
  VALUES ('${COMPANY_B}', 'Empresa B Test', 'empresa-b-test', '99999999999-B', true)
  ON CONFLICT (id) DO NOTHING;
  `);
  console.log('Empresa B creada');
} else {
  console.log('Empresa B ya existe');
}

// 3. Hash de Admin123!
const hash = bcrypt.hashSync('Admin123!', 12);

// 4. Crear usuario B (admin) si no existe
const existU = await runQuery(`SELECT id FROM users WHERE email = 'adminb@test.com';`);
if (existU.length === 0) {
  await runQuery(`
  INSERT INTO users (email, password_hash, name, role_id, is_active, company_id, email_verified)
  VALUES ('adminb@test.com', '${hash}', 'Admin B', 1, true, '${COMPANY_B}', true)
  ON CONFLICT (email) DO NOTHING;
  `);
  console.log('Usuario B creado (adminb@test.com / Admin123!)');
} else {
  console.log('Usuario B ya existe');
}

// 5. Verificar
const v = await runQuery(`
SELECT u.email, u.company_id, r.name AS role, u.is_active
FROM users u LEFT JOIN roles r ON r.id = u.role_id
WHERE u.email = 'adminb@test.com';
`);
console.log('Verificación usuario B:', JSON.stringify(v[0]));

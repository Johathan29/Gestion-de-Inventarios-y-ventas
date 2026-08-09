// Verifica triggers activos que escriben en tablas objetivo de 062
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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 800)}`);
  }
  return res.json();
}

// 1. Triggers activos que insertan en inventory / inventory_movements / sale_items / purchase_items / product_variants / inventory_reservations
const triggers = await runQuery(`
SELECT tg.tgname AS trigger_name,
       c.relname AS tabla,
       p.proname AS funcion
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
JOIN pg_proc p ON p.oid = tg.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT tg.tgisinternal
ORDER BY c.relname, tg.tgname;
`);
console.log('=== TRIGGERS ACTIVOS ===');
for (const t of triggers) {
  console.log(`${t.tabla} → ${t.funcion} (${t.trigger_name})`);
}

// 2. Columnas de inventory_movements
const cols = await runQuery(`
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='inventory_movements'
ORDER BY ordinal_position;
`);
console.log('\n=== inventory_movements columnas ===');
for (const c of cols) console.log(`${c.column_name} ${c.data_type} nullable=${c.is_nullable} def=${c.column_default ?? '-'}`);

// 3. ¿inventory_ledger existe?
const ledger = await runQuery(`
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='inventory_ledger' ORDER BY ordinal_position;
`);
console.log('\n=== inventory_ledger ===');
console.log(ledger.length ? ledger.map(c => c.column_name).join(', ') : '(no existe)');

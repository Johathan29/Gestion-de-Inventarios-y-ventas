// SCHEMA CONTRACT TEST — Fase 1 (P0)
// Valida que TODAS las tablas TENANT cumplan el contrato multi-tenant:
//   [C1] company_id presente (UUID)
//   [C2] company_id con índice
//   [C3] company_id NOT NULL (o NULL solo con justificación documentada)
//   [C4] RLS habilitada (relrowsecurity = true)
//   [C5] Políticas que cubren SELECT/INSERT/UPDATE/DELETE
// Y que las tablas GLOBAL estén en la allowlist explícita.
//
// Uso: node scripts/test-database/schema-contract.mjs [--json]
// Salida: console + scripts/test-database/report-schema-contract.json
// Exit code: 0 = contrato OK · 1 = violaciones
//
// Conexión: Management API v1 (PAT en temp_supabase_token.txt) — la conexión
// TCP directa (5432) está bloqueada desde esta red.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname; // scripts/test-database/
const ROOT = path.resolve(__dirname, '../..');

// ---------- CONFIG ----------
// Tablas globales/referencia SIN company_id (correctas por diseño)
const GLOBAL_TABLES_ALLOWLIST = new Set([
  'roles',
  'system_config',
  'client_notification_preferences',
  'payment_methods',
  'fiscal_document_types',
  'currencies',
  'audit_field_changes',
]);

const EXCLUDE_TABLES = new Set([
  'schema_migrations',
  '_prisma_migrations',
  'supabase_migrations',
]);

// ---------- CLIENT (Management API v1) ----------
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

// ---------- QUERIES ----------
const Q_TABLES = `
  SELECT t.table_name
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name
`;

const Q_COMPANY_COLUMNS = `
  SELECT c.relname AS table_name,
         col.column_name, col.data_type, col.is_nullable,
         c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN information_schema.columns col
    ON col.table_schema = 'public' AND col.table_name = c.relname
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND col.column_name = 'company_id'
  ORDER BY c.relname
`;

const Q_INDEXES = `
  SELECT tablename, indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND (indexdef ILIKE '%"company_id"%' OR indexdef ILIKE '%company_id%')
  ORDER BY tablename
`;

const Q_POLICIES = `
  SELECT c.relname AS table_name,
         p.polname,
         p.polcmd
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
  ORDER BY c.relname, p.polname
`;

const CMD_MAP = { r: 'SELECT', a: 'INSERT', w: 'UPDATE', d: 'DELETE', '*': 'ALL' };
const ALL_CMDS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

// ---------- MAIN ----------
async function main() {
  const writeJson = process.argv.includes('--json');
  console.log(`📡 Conectando a Management API v1 (proyecto ${PROJECT})...`);

  const [tables, cols, indexes, policies] = await Promise.all([
    runQuery(Q_TABLES),
    runQuery(Q_COMPANY_COLUMNS),
    runQuery(Q_INDEXES),
    runQuery(Q_POLICIES),
  ]);

  // Índices por tabla
  const idxByTable = {};
  for (const i of indexes) (idxByTable[i.tablename] ||= []).push(i.indexname);

  // Políticas por tabla (cmd mapeado)
  const polByTable = {};
  for (const p of policies) (polByTable[p.table_name] ||= []).push(CMD_MAP[p.polcmd] || p.polcmd);

  // Columnas company_id por tabla (+ RLS)
  const colByTable = {};
  for (const c of cols) colByTable[c.table_name] = c;

  const report = { generatedAt: new Date().toISOString(), tables: {}, summary: {} };
  let violations = 0;

  for (const { table_name } of tables) {
    if (EXCLUDE_TABLES.has(table_name)) continue;
    const col = colByTable[table_name];
    const entry = { classification: 'UNKNOWN', checks: {} };

    if (col) {
      entry.classification = 'TENANT';
      entry.checks.company_id = { ok: col.data_type === 'uuid', type: col.data_type, nullable: col.is_nullable === 'YES' };
      if (!entry.checks.company_id.ok) violations++;

      const idxs = idxByTable[table_name] || [];
      entry.checks.company_id_index = { ok: idxs.length > 0, indexes: idxs };
      if (idxs.length === 0) violations++;

      entry.checks.company_id_not_null = {
        ok: col.is_nullable === 'NO',
        note: col.is_nullable === 'YES' ? 'nullable — justificar en TENANT-OWNERSHIP-MATRIX' : undefined,
      };

      entry.checks.rls_enabled = { ok: col.relrowsecurity === true };
      if (col.relrowsecurity !== true) violations++;

      const covered = new Set();
      for (const cmd of polByTable[table_name] || []) {
        if (cmd === 'ALL') ALL_CMDS.forEach((c) => covered.add(c));
        else covered.add(cmd);
      }
      const missing = ALL_CMDS.filter((c) => !covered.has(c));
      entry.checks.policies = {
        ok: missing.length === 0,
        covered: [...covered],
        missing,
        count: (polByTable[table_name] || []).length,
      };
      if (missing.length > 0) violations++;
    } else {
      entry.classification = GLOBAL_TABLES_ALLOWLIST.has(table_name) ? 'GLOBAL-OK' : 'UNCLASSIFIED';
      entry.checks.company_id = { ok: true, note: 'tabla sin company_id (global/referencia)' };
      entry.checks.rls_enabled = { ok: true, note: 'se valida RLS por separado (tablas sin company_id)' };
      if (entry.classification === 'UNCLASSIFIED') {
        entry.checks.warning = 'Tabla sin company_id NO está en la allowlist global — revisar si debe ser tenant';
        violations++;
      }
    }

    report.tables[table_name] = entry;
  }

  const classes = {};
  for (const t of Object.values(report.tables)) classes[t.classification] = (classes[t.classification] || 0) + 1;
  report.summary = {
    totalTables: Object.keys(report.tables).length,
    classifications: classes,
    violations,
    pass: violations === 0,
  };

  // Salida consola
  console.log('\n========== SCHEMA CONTRACT REPORT ==========');
  for (const [name, t] of Object.entries(report.tables)) {
    const fail = Object.entries(t.checks).filter(([, c]) => c.ok === false).map(([k]) => k);
    const mark = fail.length === 0 ? '✅' : '❌';
    console.log(`${mark} ${name.padEnd(42)} [${t.classification}]${fail.length ? ' → ' + fail.join(', ') : ''}`);
  }
  console.log('\n---------------------------------------------');
  console.log(`Tablas: ${report.summary.totalTables} | ${JSON.stringify(classes)}`);
  console.log(report.summary.pass ? '✅ CONTRATO CUMPLIDO' : `❌ VIOLACIONES: ${violations}`);

  if (writeJson) {
    mkdirSync(OUT_DIR, { recursive: true });
    const out = path.join(OUT_DIR, 'report-schema-contract.json');
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`📄 Reporte: ${out}`);

    // ── Generar registro de tablas TENANT para los proxies ──
    // Los proxies (packages/shared-kernel + backend/shared) solo inyectan
    // company_id en estas tablas (las que tienen la columna).
    const tenantTables = Object.entries(report.tables)
      .filter(([, t]) => t.classification === 'TENANT')
      .map(([name]) => name)
      .sort();
    const registry = { generatedAt: new Date().toISOString(), tables: tenantTables };
    const targets = [
      path.join(ROOT, 'packages', 'shared-kernel', 'src', 'tenant-tables.json'),
      path.join(ROOT, 'backend', 'shared', 'tenant-tables.json'),
    ];
    for (const t of targets) {
      mkdirSync(path.dirname(t), { recursive: true });
      writeFileSync(t, JSON.stringify(registry, null, 2) + '\n');
      console.log(`📄 Registro tenant-tables: ${t} (${tenantTables.length} tablas)`);
    }
  }

  process.exit(report.summary.pass ? 0 : 1);
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });

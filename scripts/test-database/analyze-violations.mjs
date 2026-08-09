import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const report = JSON.parse(readFileSync(path.join(__dirname, 'report-schema-contract.json'), 'utf8'));

const byCheck = {};
for (const [table, t] of Object.entries(report.tables)) {
  if (t.classification !== 'TENANT') continue;
  for (const [check, res] of Object.entries(t.checks)) {
    if (res.ok === false) {
      (byCheck[check] ||= []).push(table);
    }
  }
}

console.log('=== VIOLACIONES POR CHECK ===');
for (const [check, tables] of Object.entries(byCheck)) {
  console.log(`\n[${check}] (${tables.length})`);
  console.log(tables.map(t => `  - ${t}`).join('\n'));
}

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const U = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_KEY;

const r = await fetch(U + '/rest/v1/', { headers: { apikey: K, Authorization: 'Bearer ' + K } });
const t = await r.text();

// definitions block
const defStart = t.indexOf('"definitions"');
console.log('definitions at:', defStart, 'total len:', t.length);

for (const tbl of ['leads']) {
  const key = `"${tbl}":{`;
  const i = t.indexOf(key, defStart);
  if (i < 0) { console.log('=== ' + tbl + ' === NOT FOUND'); continue; }
  const seg = t.slice(i, i + 2600);
  console.log('=== ' + tbl + ' ===');
  console.log(seg);
  console.log();
}
process.exit(0);

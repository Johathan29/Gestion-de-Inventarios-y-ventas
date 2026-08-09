// Diagnóstico: inspeccionar respuesta OpenAPI de PostgREST
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../backend/.env');
const env = {};
for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
  const line = raw.replace(/\r$/, '');
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
}

const URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

const res = await fetch(`${URL}/`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
console.log('Status:', res.status);
const text = await res.text();
console.log('Content-Type:', res.headers.get('content-type'));
console.log('Longitud:', text.length);
console.log('Primeros 500 chars:', text.substring(0, 500));

writeFileSync(path.resolve(__dirname, 'openapi-spec.json'), text);
console.log('\nSpec guardada en openapi-spec.json');

const res2 = await fetch(`${URL}/?apikey=${KEY}`, { headers: { Authorization: `Bearer ${KEY}` } });
const t2 = await res2.text();
console.log('\nCon apikey en query:', res2.status, t2.substring(0, 200));

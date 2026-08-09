// ¿Qué rol ve PostgREST con la service key vs JWT de app?
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function probe(label, authHeader) {
  const res = await fetch(`${URL}/rest/v1/rpc/get_current_user_role`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: authHeader, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const text = await res.text();
  console.log(`--- ${label} [${res.status}] ---`);
  console.log(text.slice(0, 200));
}

await probe('service key', `Bearer ${SERVICE_KEY}`);

// Login como admin y usar su JWT
const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
});
const lj = await login.json();
console.log('login status:', login.status, lj.access_token ? 'token OK' : JSON.stringify(lj).slice(0, 200));
if (lj.access_token) {
  await probe('admin JWT (auth) ', `Bearer ${lj.access_token}`);
  // app login (gateway) para ver el JWT de la app
  const app = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
  });
  const aj = await app.json();
  const token = aj?.data?.accessToken || aj?.data?.token || aj?.accessToken;
  console.log('app login status:', app.status, token ? 'token OK' : JSON.stringify(aj).slice(0, 200));
  if (token) await probe('admin JWT (app)  ', `Bearer ${token}`);
}
process.exit(0);

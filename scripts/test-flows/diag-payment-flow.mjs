import fs from 'fs';
import fetch from 'node-fetch';
const token = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const baseUrl = 'http://localhost:3000';

async function login() {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
  });
  return res.json();
}

async function test() {
  const loginData = await login();
  const token = loginData.data?.token || loginData.data?.accessToken;
  if (!token) {
    console.error('login failed', loginData);
    return;
  }
  console.log('login ok');

  const res = await fetch(`${baseUrl}/api/v1/sales/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-company-id': '00000000-0000-0000-0000-000000000001',
    },
    body: JSON.stringify({
      payment: { method: 'cash' },
      notes: 'Prueba pago cash'
    }),
  });
  const body = await res.text();
  console.log('status', res.status, body);
}

await test();

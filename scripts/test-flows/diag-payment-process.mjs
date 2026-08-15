import fetch from 'node-fetch';
import fs from 'fs';

const baseUrl = 'http://localhost:3000';
const paymentUrl = 'http://localhost:3019';

async function login() {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
  });
  return res.json();
}

async function processPayment(token) {
  const payload = {
    saleId: '00000000-0000-0000-0000-000000000010',
    paymentMethodCode: 'cash',
    amount: 10.00,
    reference: 'diag-cash',
    notes: 'Diagnóstico payment process',
    idempotencyKey: 'diag-payment-process-1'
  };

  const res = await fetch(`${paymentUrl}/api/payments/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-company-id': '00000000-0000-0000-0000-000000000001',
    },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.text() };
}

(async () => {
  const loginData = await login();
  console.log('login data', loginData);
  const token = loginData.data?.accessToken || loginData.data?.token || loginData.data?.access_token;
  if (!token) {
    console.error('Login failed');
    process.exit(1);
  }
  const result = await processPayment(token);
  console.log('payment result', result.status, result.body);
})();

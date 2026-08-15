import fetch from 'node-fetch';

const gatewayUrl = 'http://localhost:3000';
const paymentUrl = 'http://localhost:3019';

async function login() {
  const res = await fetch(`${gatewayUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
  });
  return res.json();
}

async function processPayment(token, paymentMethodCode, payload) {
  const res = await fetch(`${paymentUrl}/api/payments/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-company-id': '00000000-0000-0000-0000-000000000001',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

(async () => {
  const loginData = await login();
  const token = loginData.data?.accessToken || loginData.data?.token || loginData.data?.access_token;
  if (!token) {
    console.error('Login failed', loginData);
    process.exit(1);
  }

  console.log('Authenticated, token prefix:', token.slice(0, 20));

  const cashResult = await processPayment(token, 'cash', {
    saleId: '00000000-0000-0000-0000-000000000011',
    paymentMethodCode: 'cash',
    amount: 15.00,
    reference: 'diag-cash',
    notes: 'Diag cash payment',
    idempotencyKey: 'diag-cash-1'
  });
  console.log('CASH result', cashResult);

  const cardResult = await processPayment(token, 'card', {
    saleId: '00000000-0000-0000-0000-000000000012',
    paymentMethodCode: 'card',
    amount: 25.00,
    reference: 'diag-card',
    notes: 'Diag card payment',
    idempotencyKey: 'diag-card-1',
    token: 'tok_visa'
  });
  console.log('CARD result', cardResult);
})();

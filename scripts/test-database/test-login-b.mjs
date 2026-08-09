// Prueba login con usuario de empresa B (sin fix aún)
const BASE = 'http://localhost:3000';

async function tryLogin(email, password) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(`LOGIN ${email} → HTTP ${res.status}`);
  if (res.ok && body.data?.accessToken) {
    const payload = JSON.parse(Buffer.from(body.data.accessToken.split('.')[1], 'base64url').toString('utf8'));
    console.log(`  ✅ accessToken OK | company_id en JWT = ${payload.company_id} | role=${payload.role}`);
    return body.data.accessToken;
  }
  console.log(`  ❌ ${JSON.stringify(body.error || body).slice(0, 200)}`);
  return null;
}

// Login A (control, debe funcionar)
const tokenA = await tryLogin('admin@sistema.com', 'Admin123!');

// Login B (debe fallar si el bug está presente)
const tokenB = await tryLogin('adminb@test.com', 'Admin123!');

console.log('\nRESULTADO:');
console.log(tokenB ? '⚠️ Login B FUNCIONÓ (no hay bug o ya aplicado)' : '🐛 Login B FALLÓ → confirma bug: login filtra por company_id=DEFAULT');

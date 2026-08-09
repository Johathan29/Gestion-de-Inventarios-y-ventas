// Sonda: S18 (GET /clients/:id), S27 (GET /sales/client/:id), S11 (POST /clients)
const BASE = 'http://localhost:3000';
const login = async () => {
  const r = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
  });
  const j = await r.json();
  return j.data.accessToken;
};

const run = async () => {
  const t = await login();
  const H = { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };

  // 1. Listar clientes para obtener un id
  const list = await fetch(`${BASE}/api/v1/clients?limit=3`, { headers: H });
  const listJ = await list.json().catch(() => ({}));
  console.log('GET /clients [%s]', list.status, JSON.stringify(listJ).slice(0, 300));
  const clientId = listJ.data?.[0]?.id || listJ.data?.data?.[0]?.id || listJ.data?.clients?.[0]?.id;

  if (clientId) {
    const det = await fetch(`${BASE}/api/v1/clients/${clientId}`, { headers: H });
    console.log('GET /clients/:id [%s]', det.status, (await det.text()).slice(0, 500));
    const sh = await fetch(`${BASE}/api/v1/sales/client/${clientId}`, { headers: H });
    console.log('GET /sales/client/:id [%s]', sh.status, (await sh.text()).slice(0, 500));
  } else {
    console.log('No se encontró clientId, lista completa:', JSON.stringify(listJ).slice(0, 800));
  }

  // 2. POST /clients (S11)
  const post = await fetch(`${BASE}/api/v1/clients`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ name: `Cliente Sonda ${Date.now()}`, email: `sonda${Date.now()}@test.com`, phone: '555-0100' }),
  });
  console.log('POST /clients [%s]', post.status, (await post.text()).slice(0, 400));
  process.exit(0);
};
run().catch(e => { console.error('ERR', e.message); process.exit(1); });

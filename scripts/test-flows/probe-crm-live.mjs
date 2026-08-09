// Probe CRM en vivo — paso a paso
const BASE = 'http://localhost:3000/api/v1';

const login = async () => {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
  });
  const text = await r.text();
  console.log('login:', r.status, text.slice(0, 300));
  const j = JSON.parse(text);
  return j.token || j.accessToken || (j.data && (j.data.token || j.data.accessToken));
};

const call = async (method, path, body) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  console.log(`${method} ${path}:`, r.status, text.slice(0, 300));
  try { return { status: r.status, data: JSON.parse(text) }; } catch { return { status: r.status, data: null }; }
};

const TOKEN = await login();
console.log('TOKEN ok:', !!TOKEN, TOKEN ? TOKEN.slice(0, 30) + '...' : '');

const p = await call('POST', '/clients/pipelines', { name: 'Pipeline Live ' + Date.now() });
const pid = p.data?.data?.id || p.data?.id;
console.log('pipeline id:', pid);

let stageId = null;
if (pid) {
  const s = await call('POST', `/clients/pipelines/${pid}/stages`, { name: 'Nuevo', order: 1 });
  stageId = s.data?.data?.id || s.data?.id;
  console.log('stage id:', stageId);
}

if (pid && stageId) {
  await call('POST', '/clients/leads', { name: 'Lead Live', email: `leadlive${Date.now()}@test.com`, phone: '3001234567', stage_id: stageId });
}
process.exit(0);

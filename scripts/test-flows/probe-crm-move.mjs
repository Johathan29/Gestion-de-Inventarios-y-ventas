// Probe moveStage + convertToClient en vivo
const BASE = 'http://localhost:3000/api/v1';

const login = async () => {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
  });
  const j = await r.json();
  return j.data.accessToken;
};

const call = async (method, path, body) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  console.log(`${method} ${path}:`, r.status, text.slice(0, 350));
  try { return { status: r.status, data: JSON.parse(text) }; } catch { return { status: r.status, data: null }; }
};

const TOKEN = await login();

// Crear pipeline + 2 etapas + lead
const p = await call('POST', '/clients/pipelines', { name: 'Pipe Move ' + Date.now() });
const pid = p.data?.data?.id || p.data?.id;
const s1 = await call('POST', `/clients/pipelines/${pid}/stages`, { name: 'Nuevo', order: 1 });
const s2 = await call('POST', `/clients/pipelines/${pid}/stages`, { name: 'Contactado', order: 2 });
const stage1 = s1.data?.data?.id || s1.data?.id;
const stage2 = s2.data?.data?.id || s2.data?.id;

const l = await call('POST', '/clients/leads', { name: 'Lead Move', email: `move${Date.now()}@test.com`, phone: '3009998877', stage_id: stage1 });
const leadId = l.data?.data?.id || l.data?.id;

if (leadId && stage2) {
  await call('PUT', `/clients/leads/${leadId}/move`, { stage_id: stage2 });
  await call('POST', `/clients/leads/${leadId}/convert`, {});
  await call('POST', `/clients/leads/${leadId}/activities`, { activity_type: 'note', subject: 'Llamada inicial', description: 'Primer contacto' });
  await call('POST', `/clients/leads/${leadId}/notes`, { content: 'Nota de prueba' });
  await call('GET', `/clients/leads/${leadId}`, {});
}
process.exit(0);

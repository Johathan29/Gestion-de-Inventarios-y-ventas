// Test PUT /api/v1/cms/pages/:id via gateway
const base = 'http://localhost:3000/api/v1';

async function login() {
  const r = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' })
  });
  const j = await r.json();
  if (!j.success) throw new Error('login failed: ' + JSON.stringify(j));
  return j.data.accessToken;
}

const token = await login();
const pageId = '54b4b6fd-8454-4f9b-b1e3-31fdc27dbcc7';

const r = await fetch(`${base}/cms/pages/${pageId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  body: JSON.stringify({ slug: 'pagina-desde-dashboard', title: 'Página desde Dashboard' })
});
console.log('status:', r.status);
console.log(await r.text());

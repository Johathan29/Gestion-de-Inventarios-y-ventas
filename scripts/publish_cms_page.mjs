// Publish "Página desde Dashboard" and verify public list
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

const r = await fetch(`${base}/cms/pages/${pageId}/publish`, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
});
const j = await r.json();
console.log('publish status:', r.status);
console.log('publish:', JSON.stringify({ success: j.success, is_published: j.data?.is_published, version: j.data?.version, message: j.message }));

const r2 = await fetch(base + '/cms/public/pages');
const j2 = await r2.json();
console.log('public pages:', JSON.stringify((j2.data || []).map(p => ({ title: p.title, slug: p.slug }))));

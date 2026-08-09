// Test public CMS endpoints via gateway (no auth required)
const base = 'http://localhost:3000/api/v1';

const r1 = await fetch(base + '/cms/public/pages');
console.log('GET /cms/public/pages ->', r1.status);
console.log(JSON.stringify(await r1.json(), null, 2));

const r2 = await fetch(base + '/cms/preview/pagina-de-prueba');
console.log('GET /cms/preview/pagina-de-prueba ->', r2.status);
const j2 = await r2.json();
console.log(JSON.stringify({ success: j2.success, title: j2.data?.title, slug: j2.data?.slug, is_published: j2.data?.is_published, sections: (j2.data?.sections || []).map(s => ({ key: s.component_key, title: s.title })) }, null, 2));

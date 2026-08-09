// Sonda: flujo "Mis Compras" de cliente — registro → carrito → checkout → /sales/my-sales
const BASE = 'http://localhost:3000';
const uniq = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const run = async () => {
  // 1. Buscar un producto activo con stock (admin)
  const login = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@sistema.com', password: 'Admin123!' }),
  });
  const { data: adminData } = await login.json();
  const adminToken = adminData.accessToken;

  const prodRes = await fetch(`${BASE}/api/v1/products?status=active&limit=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const prodJ = await prodRes.json();
  const products = prodJ.data?.data ?? prodJ.data ?? [];
  const product = products.find(p => Number(p.stock || 0) > 0) || products[0];
  if (!product) { console.log('Sin productos activos'); process.exit(0); }
  console.log('Producto:', product.id, product.name, 'stock:', product.stock);

  // 2. Registrar cliente nuevo (devuelve token)
  const email = `cli_${uniq('e')}@test.com`;
  const reg = await fetch(`${BASE}/api/v1/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Cliente Compras', email, password: 'Test1234!', phone: '3001112233' }),
  });
  const regJ = await reg.json();
  if (!regJ.success) { console.log('Registro falló', regJ); process.exit(1); }
  const clientToken = regJ.data.accessToken;
  console.log('Registrado:', email);

  // 3. Carrito
  const add = await fetch(`${BASE}/api/v1/cart/items`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clientToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: product.id, quantity: 1 }),
  });
  console.log('Add cart [%s]', add.status);

  // 4. Checkout
  const chk = await fetch(`${BASE}/api/v1/checkout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clientToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipping: { address: 'Calle 1 #2-3', city: 'Bogotá', state: 'Cundinamarca' }, payment: { method: 'cash' } }),
  });
  const chkJ = await chk.json().catch(() => ({}));
  console.log('Checkout [%s]', chk.status, chkJ.success ? 'OK sale=' + (chkJ.data?.saleNumber || chkJ.data?.sale_number) : JSON.stringify(chkJ).slice(0, 300));

  // 5. Mis Compras
  const my = await fetch(`${BASE}/api/v1/sales/my-sales?page=1&limit=12`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const myJ = await my.json();
  const list = myJ.data?.data ?? myJ.data ?? [];
  console.log('My-sales [%s] total=%s count=%s', my.status, myJ.data?.pagination?.total, Array.isArray(list) ? list.length : '?');
  if (Array.isArray(list) && list.length > 0) {
    const s = list[0];
    console.log('  sale:', s.saleNumber, '| status:', s.status, '| items:', s.items?.length, '| total:', s.total);
    if (s.items?.[0]) console.log('  item0:', s.items[0].productName, 'x', s.items[0].quantity, '=', s.items[0].total);
  }
  process.exit(0);
};
run().catch(e => { console.error('ERR', e.message); process.exit(1); });

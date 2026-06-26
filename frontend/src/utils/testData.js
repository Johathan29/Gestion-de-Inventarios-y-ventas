/**
 * Test Data & Mock API Interceptor
 * Proporciona datos de prueba para navegar el SPA sin backend.
 * Activo solo cuando VITE_MOCK_API=true o en desarrollo sin backend.
 */
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import router from '../router';

// ============================================================
// SEED DATA
// ============================================================

const now = new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();

const USERS = [
  {
    id: 1, name: 'Admin Principal', email: 'admin@sistema.com', phone: '+57 300 111 2233',
    role_id: 1, role_name: 'Administrador', is_active: true, created_at: daysAgo(90),
    permissions: {
      admin: ['access'], products: ['read', 'create', 'update', 'delete'],
      inventory: ['read', 'create', 'update', 'delete'], sales: ['read', 'create', 'update', 'delete'],
      purchases: ['read', 'create', 'update', 'delete'], clients: ['read', 'create', 'update', 'delete'],
      reports: ['view'], ecommerce: ['manage'], config: ['manage']
    }
  },
  {
    id: 2, name: 'María García', email: 'cajero@sistema.com', phone: '+57 300 222 3344',
    role_id: 3, role_name: 'Cajero', is_active: true, created_at: daysAgo(60),
    permissions: {
      sales: ['read', 'create'], products: ['read'],
      inventory: ['read'], clients: ['read']
    }
  },
  {
    id: 3, name: 'Carlos López', email: 'clopez@sistema.com', phone: '+57 300 333 4455',
    role_id: 2, role_name: 'Supervisor', is_active: true, created_at: daysAgo(45),
    permissions: {
      admin: ['access'], products: ['read', 'create', 'update'],
      inventory: ['read', 'create', 'update'], sales: ['read', 'create', 'update'],
      purchases: ['read', 'create'], clients: ['read', 'create'],
      reports: ['view']
    }
  },
  {
    id: 4, name: 'Ana Martínez', email: 'ana@sistema.com', phone: '+57 300 444 5566',
    role_id: 3, role_name: 'Cajero', is_active: false, created_at: daysAgo(30)
  }
];

const PASSWORD_MAP = { 'admin@sistema.com': 'admin123', 'cajero@sistema.com': 'cajero123', 'clopez@sistema.com': 'super123', 'ana@sistema.com': 'ana123' };

const CATEGORIES = [
  { id: 1, name: 'Electrónicos', description: 'Productos electrónicos y tecnológicos', slug: 'electronicos', is_active: true, created_at: daysAgo(90), product_count: 4 },
  { id: 2, name: 'Ropa y Accesorios', description: 'Prendas de vestir y complementos', slug: 'ropa-accesorios', is_active: true, created_at: daysAgo(85), product_count: 3 },
  { id: 3, name: 'Hogar', description: 'Artículos para el hogar', slug: 'hogar', is_active: true, created_at: daysAgo(80), product_count: 3 },
  { id: 4, name: 'Deportes', description: 'Equipo deportivo y accesorios', slug: 'deportes', is_active: true, created_at: daysAgo(75), product_count: 2 },
  { id: 5, name: 'Alimentos', description: 'Productos alimenticios', slug: 'alimentos', is_active: true, created_at: daysAgo(70), product_count: 2 },
  { id: 6, name: 'Libros', description: 'Libros y material educativo', slug: 'libros', is_active: false, created_at: daysAgo(60), product_count: 0 }
];

const PRODUCTS = [
  { id: 1, name: 'Laptop Pro 15\"', sku: 'LAP-001', description: 'Laptop de alto rendimiento con 16GB RAM, SSD 512GB', price: 4500000, cost: 3200000, stock: 15, min_stock: 5, category_id: 1, category_name: 'Electrónicos', is_active: true, is_featured: true, image_url: null, created_at: daysAgo(80) },
  { id: 2, name: 'Monitor 27\" 4K', sku: 'MON-002', description: 'Monitor IPS 4K UHD 27 pulgadas', price: 1800000, cost: 1200000, stock: 8, min_stock: 3, category_id: 1, category_name: 'Electrónicos', is_active: true, is_featured: false, image_url: null, created_at: daysAgo(75) },
  { id: 3, name: 'Teclado Mecánico RGB', sku: 'TEC-003', description: 'Teclado mecánico con switches Cherry MX', price: 350000, cost: 180000, stock: 25, min_stock: 10, category_id: 1, category_name: 'Electrónicos', is_active: true, is_featured: true, image_url: null, created_at: daysAgo(70) },
  { id: 4, name: 'Mouse Inalámbrico', sku: 'MOU-004', description: 'Mouse ergonómico inalámbrico con sensor óptico', price: 120000, cost: 65000, stock: 2, min_stock: 10, category_id: 1, category_name: 'Electrónicos', is_active: true, is_featured: false, image_url: null, created_at: daysAgo(65) },
  { id: 5, name: 'Camiseta Algodón Premium', sku: 'CAM-001', description: 'Camiseta de algodón orgánico, varios colores', price: 85000, cost: 35000, stock: 50, min_stock: 20, category_id: 2, category_name: 'Ropa y Accesorios', is_active: true, is_featured: true, image_url: null, created_at: daysAgo(60) },
  { id: 6, name: 'Jeans Clásicos', sku: 'JEA-002', description: 'Jeans de corte recto, tela denim premium', price: 180000, cost: 90000, stock: 30, min_stock: 15, category_id: 2, category_name: 'Ropa y Accesorios', is_active: true, is_featured: false, image_url: null, created_at: daysAgo(55) },
  { id: 7, name: 'Reloj Deportivo', sku: 'REL-003', description: 'Reloj inteligente con GPS y monitor cardíaco', price: 520000, cost: 280000, stock: 0, min_stock: 5, category_id: 2, category_name: 'Ropa y Accesorios', is_active: true, is_featured: false, image_url: null, created_at: daysAgo(50) },
  { id: 8, name: 'Lámpara LED Escritorio', sku: 'LAM-001', description: 'Lámpara LED regulable con luz cálida/fría', price: 145000, cost: 75000, stock: 20, min_stock: 8, category_id: 3, category_name: 'Hogar', is_active: true, is_featured: false, image_url: null, created_at: daysAgo(45) },
  { id: 9, name: 'Set Ollas Antiadherentes', sku: 'OLA-002', description: 'Juego de 5 ollas con recubrimiento cerámico', price: 380000, cost: 190000, stock: 12, min_stock: 5, category_id: 3, category_name: 'Hogar', is_active: true, is_featured: true, image_url: null, created_at: daysAgo(40) },
  { id: 10, name: 'Organizador Escritorio', sku: 'ORG-003', description: 'Organizador modular de bambú para escritorio', price: 95000, cost: 40000, stock: 3, min_stock: 10, category_id: 3, category_name: 'Hogar', is_active: true, is_featured: false, image_url: null, created_at: daysAgo(35) },
  { id: 11, name: 'Bicicleta Montaña 21v', sku: 'BIC-001', description: 'Bicicleta todo terreno con cuadro de aluminio', price: 1200000, cost: 750000, stock: 5, min_stock: 2, category_id: 4, category_name: 'Deportes', is_active: true, is_featured: true, image_url: null, created_at: daysAgo(30) },
  { id: 12, name: 'Pesa Rusa 16kg', sku: 'PES-002', description: 'Pesa rusa de hierro fundido con agarre ergonómico', price: 110000, cost: 55000, stock: 18, min_stock: 5, category_id: 4, category_name: 'Deportes', is_active: true, is_featured: false, image_url: null, created_at: daysAgo(25) },
  { id: 13, name: 'Café Premium 500g', sku: 'CAF-001', description: 'Café orgánico de altura, molienda media', price: 42000, cost: 20000, stock: 40, min_stock: 15, category_id: 5, category_name: 'Alimentos', is_active: true, is_featured: false, image_url: null, created_at: daysAgo(20) },
  { id: 14, name: 'Aceite de Oliva Extra', sku: 'ACE-002', description: 'Aceite de oliva extra virgen, 1 litro', price: 65000, cost: 35000, stock: 22, min_stock: 10, category_id: 5, category_name: 'Alimentos', is_active: true, is_featured: false, image_url: null, created_at: daysAgo(15) }
];

// Sales & Invoice data
const SALES = [
  { id: 1, invoice_number: 'FAC-001', client_id: 1, client_name: 'Juan Pérez', client_email: 'juan@email.com', user_id: 1, user_name: 'Admin Principal', subtotal: 1650000, tax: 313500, total: 1963500, status: 'completed', payment_method: 'Efectivo', items: [{ product_id: 2, product_name: 'Monitor 27\" 4K', quantity: 1, price: 1800000 }, { product_id: 3, product_name: 'Teclado Mecánico RGB', quantity: 1, price: 350000 }], created_at: hoursAgo(3) },
  { id: 2, invoice_number: 'FAC-002', client_id: null, client_name: 'Cliente General', user_id: 1, user_name: 'Admin Principal', subtotal: 520000, tax: 98800, total: 618800, status: 'completed', payment_method: 'Tarjeta', items: [{ product_id: 7, product_name: 'Reloj Deportivo', quantity: 1, price: 520000 }], created_at: hoursAgo(8) },
  { id: 3, invoice_number: 'FAC-003', client_id: 2, client_name: 'María Rodríguez', client_email: 'maria@email.com', user_id: 2, user_name: 'María García', subtotal: 240000, tax: 45600, total: 285600, status: 'completed', payment_method: 'Efectivo', items: [{ product_id: 5, product_name: 'Camiseta Algodón Premium', quantity: 2, price: 85000 }, { product_id: 6, product_name: 'Jeans Clásicos', quantity: 1, price: 180000 }], created_at: hoursAgo(12) },
  { id: 4, invoice_number: 'FAC-004', client_id: 3, client_name: 'Pedro Sánchez', user_id: 1, user_name: 'Admin Principal', subtotal: 4500000, tax: 855000, total: 5355000, status: 'pending', payment_method: 'Transferencia', items: [{ product_id: 1, product_name: 'Laptop Pro 15\"', quantity: 1, price: 4500000 }], created_at: daysAgo(1) },
  { id: 5, invoice_number: 'FAC-005', client_id: null, client_name: 'Cliente General', user_id: 2, user_name: 'María García', subtotal: 380000, tax: 72200, total: 452200, status: 'completed', payment_method: 'Efectivo', items: [{ product_id: 9, product_name: 'Set Ollas Antiadherentes', quantity: 1, price: 380000 }], created_at: daysAgo(1) },
  { id: 6, invoice_number: 'FAC-006', client_id: 4, client_name: 'Laura Torres', client_email: 'laura@email.com', user_id: 1, user_name: 'Admin Principal', subtotal: 340000, tax: 64600, total: 404600, status: 'cancelled', payment_method: 'Tarjeta', items: [{ product_id: 10, product_name: 'Organizador Escritorio', quantity: 2, price: 95000 }, { product_id: 8, product_name: 'Lámpara LED Escritorio', quantity: 1, price: 145000 }], created_at: daysAgo(2) },
  { id: 7, invoice_number: 'FAC-007', client_id: 1, client_name: 'Juan Pérez', user_id: 2, user_name: 'María García', subtotal: 1200000, tax: 228000, total: 1428000, status: 'completed', payment_method: 'Efectivo', items: [{ product_id: 11, product_name: 'Bicicleta Montaña 21v', quantity: 1, price: 1200000 }], created_at: daysAgo(3) },
  { id: 8, invoice_number: 'FAC-008', client_id: 5, client_name: 'Diana Vargas', user_id: 1, user_name: 'Admin Principal', subtotal: 700000, tax: 133000, total: 833000, status: 'paid', payment_method: 'Transferencia', items: [{ product_id: 3, product_name: 'Teclado Mecánico RGB', quantity: 2, price: 350000 }], created_at: daysAgo(4) }
];

const CLIENTS = [
  { id: 1, name: 'Juan Pérez', email: 'juan@email.com', phone: '+57 310 111 2233', document_id: 'CC-12345678', total_purchases: 3100000, visit_count: 8, created_at: daysAgo(60) },
  { id: 2, name: 'María Rodríguez', email: 'maria@email.com', phone: '+57 310 222 3344', document_id: 'CC-23456789', total_purchases: 285600, visit_count: 3, created_at: daysAgo(45) },
  { id: 3, name: 'Pedro Sánchez', email: 'pedro@email.com', phone: '+57 310 333 4455', document_id: 'CC-34567890', total_purchases: 5355000, visit_count: 5, created_at: daysAgo(30) },
  { id: 4, name: 'Laura Torres', email: 'laura@email.com', phone: '+57 310 444 5566', document_id: 'CC-45678901', total_purchases: 404600, visit_count: 2, created_at: daysAgo(20) },
  { id: 5, name: 'Diana Vargas', email: 'diana@email.com', phone: '+57 310 555 6677', document_id: 'CC-56789012', total_purchases: 833000, visit_count: 4, created_at: daysAgo(15) }
];

const PURCHASES = [
  { id: 1, supplier_name: 'TechDist S.A.S.', supplier_contact: 'proveedor@techdist.com', user_id: 1, user_name: 'Admin Principal', subtotal: 3200000, tax: 608000, total: 3808000, status: 'received', items: [{ product_name: 'Laptop Pro 15\"', quantity: 10, unit_cost: 320000 }], created_at: daysAgo(30) },
  { id: 2, supplier_name: 'ModaColombia Ltda.', supplier_contact: 'ventas@modacolombia.com', user_id: 1, user_name: 'Admin Principal', subtotal: 1800000, tax: 342000, total: 2142000, status: 'pending', items: [{ product_name: 'Camiseta Algodón Premium', quantity: 50, unit_cost: 35000 }, { product_name: 'Jeans Clásicos', quantity: 20, unit_cost: 90000 }], created_at: daysAgo(15) },
  { id: 3, name: 'HogarExpress', user_id: 2, user_name: 'María García', subtotal: 950000, tax: 180500, total: 1130500, status: 'approved', items: [{ product_name: 'Set Ollas Antiadherentes', quantity: 5, unit_cost: 190000 }], created_at: daysAgo(7) }
];

const INVENTORY_MOVEMENTS = [
  { id: 1, product_id: 1, product_name: 'Laptop Pro 15\"', type: 'entry', quantity: 10, reference: 'OC-001', notes: 'Compra a TechDist', user_name: 'Admin Principal', created_at: daysAgo(30) },
  { id: 2, product_id: 1, product_name: 'Laptop Pro 15\"', type: 'exit', quantity: -1, reference: 'FAC-004', notes: 'Venta a Pedro Sánchez', user_name: 'Admin Principal', created_at: daysAgo(1) },
  { id: 3, product_id: 2, product_name: 'Monitor 27\" 4K', type: 'entry', quantity: 5, reference: 'INV-001', notes: 'Ajuste de inventario', user_name: 'Admin Principal', created_at: daysAgo(20) },
  { id: 4, product_id: 3, product_name: 'Teclado Mecánico RGB', type: 'entry', quantity: 20, reference: 'OC-002', notes: 'Reabastecimiento', user_name: 'Admin Principal', created_at: daysAgo(15) },
  { id: 5, product_id: 4, product_name: 'Mouse Inalámbrico', type: 'entry', quantity: 5, reference: 'OC-003', notes: 'Reabastecimiento urgente', user_name: 'María García', created_at: daysAgo(7) },
  { id: 6, product_id: 4, product_name: 'Mouse Inalámbrico', type: 'exit', quantity: -3, reference: 'FAC-001', notes: 'Venta', user_name: 'Admin Principal', created_at: hoursAgo(3) }
];

const NOTIFICATIONS = [
  { id: 1, title: 'Stock Bajo', message: 'Mouse Inalámbrico (SKU: MOU-004) tiene solo 2 unidades en stock.', type: 'warning', is_read: false, created_at: hoursAgo(2) },
  { id: 2, title: 'Stock Bajo', message: 'Organizador Escritorio (SKU: ORG-003) tiene solo 3 unidades en stock.', type: 'warning', is_read: false, created_at: hoursAgo(5) },
  { id: 3, title: 'Producto Agotado', message: 'Reloj Deportivo (SKU: REL-003) está sin stock.', type: 'error', is_read: false, created_at: daysAgo(1) },
  { id: 4, title: 'Venta Completada', message: 'Venta FAC-001 completada por $1,963,500.', type: 'success', is_read: true, created_at: hoursAgo(3) },
  { id: 5, title: 'Nuevo Cliente', message: 'Diana Vargas se ha registrado en el sistema.', type: 'info', is_read: true, created_at: daysAgo(15) }
];

const BANNERS = [
  { id: 1, title: 'Oferta Especial', subtitle: 'Hasta 30% OFF en Electrónicos', image_url: null, link: '/catalog', is_active: true, sort_order: 1, created_at: daysAgo(30) },
  { id: 2, title: 'Nueva Colección', subtitle: 'Ropa deportiva temporada 2025', image_url: null, link: '/catalog', is_active: true, sort_order: 2, created_at: daysAgo(20) },
  { id: 3, title: 'Envío Gratis', subtitle: 'En compras mayores a $200,000', image_url: null, link: '/catalog', is_active: false, sort_order: 3, created_at: daysAgo(10) }
];

const OFFERS = [
  { id: 1, title: 'Combo Monitor + Teclado', description: 'Monitor 27\" + Teclado Mecánico por $1,900,000', discount_percentage: 15, product_id: 2, is_active: true, valid_until: daysAgo(-15), created_at: daysAgo(30) },
  { id: 2, title: '2x1 en Camisetas', description: 'Lleva 2 camisetas al precio de 1', discount_percentage: 50, product_id: 5, is_active: true, valid_until: daysAgo(-7), created_at: daysAgo(20) }
];

const CONFIG = {
  business_name: 'InventarioPro S.A.S.', tax_id: '900.123.456-7', address: 'Cra 15 # 88-66, Bogotá', phone: '+57 601 222 3344', email: 'info@inventariopro.com',
  currency: 'COP', tax_rate: 19, low_stock_threshold: 10, default_payment: 'Efectivo',
  enable_ecommerce: true, enable_notifications: true, maintenance_mode: false,
  logo_url: null, primary_color: '#4F2361'
};

const AUDIT_LOGS = [
  { id: 1, user_name: 'Admin Principal', action: 'login', module: 'auth', description: 'Inicio de sesión exitoso', ip_address: '192.168.1.100', created_at: hoursAgo(1) },
  { id: 2, user_name: 'Admin Principal', action: 'create', module: 'sales', description: 'Creó la venta FAC-001', created_at: hoursAgo(3) },
  { id: 3, user_name: 'María García', action: 'create', module: 'sales', description: 'Creó la venta FAC-003', created_at: hoursAgo(12) },
  { id: 4, user_name: 'Admin Principal', action: 'update', module: 'products', description: 'Actualizó el producto Laptop Pro 15\"', created_at: daysAgo(1) },
  { id: 5, user_name: 'Admin Principal', action: 'delete', module: 'users', description: 'Desactivó al usuario Ana Martínez', created_at: daysAgo(5) }
];

// Track cart state
let cartItems = [];
let cartIdCounter = 1;

// ============================================================
// MOCK RESPONSE BUILDER
// ============================================================

const mockResponse = (data, status = 200, pagination = null) => {
  const res = { data: { data, success: true } };
  if (pagination) res.data.pagination = pagination;
  if (status >= 400) res.data = { error: { message: data } };
  return [status, res.data];
};

const paginate = (arr, params = {}) => {
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 20;
  const start = (page - 1) * limit;
  const items = arr.slice(start, start + limit);
  return {
    data: items,
    pagination: { page, limit, total: arr.length, totalPages: Math.ceil(arr.length / limit) }
  };
};

const filterByParams = (arr, params) => {
  let result = [...arr];
  Object.entries(params).forEach(([key, val]) => {
    if (!val || key === 'page' || key === 'limit') return;
    if (key === 'search' || key === 'q') {
      const q = val.toLowerCase();
      result = result.filter(item => JSON.stringify(item).toLowerCase().includes(q));
    } else if (key === 'status') {
      result = result.filter(item => item.status === val || (val === 'active' && item.is_active !== false));
    } else if (key === 'category_id') {
      result = result.filter(item => item.category_id == val);
    } else if (key === 'featured') {
      const isFeatured = val === true || val === 'true';
      result = result.filter(item => item.is_featured === isFeatured || item.featured === isFeatured);
    } else if (key === 'min_price') {
      result = result.filter(item => item.price >= Number(val));
    } else if (key === 'max_price') {
      result = result.filter(item => item.price <= Number(val));
    }
  });
  return result;
};

// ============================================================
// API HANDLER
// ============================================================

function handleMockRequest(method, url, data, params) {
  const path = url
    .replace(/^.*\/api\/v1\//, '')
    .replace(/^\/api\/v1\//, '')
    .replace(/\/$/, '')
    .split('?')[0]; // Strip query string

  // ---- AUTH ----
  if (path === 'auth/login' && method === 'post') {
    const { email, password } = data || {};
    const user = USERS.find(u => u.email === email);
    if (!user || PASSWORD_MAP[email] !== password) return mockResponse('Credenciales inválidas', 401);
    if (!user.is_active) return mockResponse('Usuario inactivo. Contacte al administrador.', 403);
    return mockResponse({
      accessToken: 'mock-token-' + user.id + '-' + Date.now(),
      refreshToken: 'mock-refresh-' + user.id + '-' + Date.now(),
      user
    });
  }

  if (path === 'auth/register' && method === 'post') {
    return mockResponse({ message: 'Registro exitoso. Revise su correo para confirmar.' });
  }

  if (path === 'auth/refresh' && method === 'post') {
    return mockResponse({ accessToken: 'mock-refreshed-token-' + Date.now(), refreshToken: 'mock-refresh-' + Date.now() });
  }

  if (path === 'auth/logout' && method === 'post') {
    return mockResponse({ message: 'Sesión cerrada exitosamente' });
  }

  if (path === 'auth/forgot-password' && method === 'post') {
    return mockResponse({ message: 'Revise su correo para las instrucciones' });
  }

  if (path === 'auth/reset-password' && method === 'post') {
    return mockResponse({ message: 'Contraseña restablecida exitosamente' });
  }

  if (path === 'auth/me' && method === 'get') {
    const tokenUser = USERS[0];
    return mockResponse(tokenUser);
  }

  // ---- USERS ----
  const userMatch = path.match(/^users\/(\d+)$/);
  if (userMatch && method === 'get') {
    const u = USERS.find(x => x.id == userMatch[1]);
    return u ? mockResponse(u) : mockResponse('Usuario no encontrado', 404);
  }

  if (path.match(/^users\/\d+\/role$/) && method === 'put') return mockResponse({ message: 'Rol actualizado' });
  if (path.match(/^users\/\d+\/toggle-active$/) && method === 'put') return mockResponse({ message: 'Estado cambiado' });
  if (path.match(/^users\/\d+\/access-history$/) && method === 'get') return mockResponse(AUDIT_LOGS);

  if (path === 'users' && method === 'get') {
    const filtered = filterByParams(USERS.filter(u => u.id !== undefined), params);
    return mockResponse(...Object.values(paginate(filtered, params)));
  }

  if (path === 'users' && method === 'post') return mockResponse({ ...data, id: USERS.length + 1, created_at: now });
  if (path.match(/^users\/\d+$/) && method === 'put') return mockResponse({ ...data, id: parseInt(path.split('/')[1]) });
  if (path.match(/^users\/\d+$/) && method === 'delete') return mockResponse({ message: 'Usuario eliminado' });

  // ---- PRODUCTS ----
  const prodMatch = path.match(/^products\/(\d+)$/);
  if (prodMatch && method === 'get') {
    const p = PRODUCTS.find(x => x.id == prodMatch[1]);
    return p ? mockResponse(p) : mockResponse('Producto no encontrado', 404);
  }

  if (path === 'products/low-stock' && method === 'get') {
    return mockResponse(PRODUCTS.filter(p => p.stock <= p.min_stock));
  }

  if (path.match(/^products\/\d+\/featured$/) && method === 'put') return mockResponse({ message: 'Estado cambiado' });

  if (path.match(/^products\/category\/(\d+)$/) && method === 'get') {
    return mockResponse(PRODUCTS.filter(p => p.category_id == path.match(/^products\/category\/(\d+)$/)[1]));
  }

  if (path.match(/^products\/\d+\/variants$/) && method === 'get') return mockResponse([]);
  if (path.match(/^products\/\d+\/variants$/) && method === 'post') return mockResponse({ id: 1, ...data });
  if (path.match(/^products\/\d+\/variants\/\d+$/) && (method === 'put' || method === 'delete')) return mockResponse({ message: 'OK' });

  if (path === 'products' && method === 'get') {
    const filtered = filterByParams(PRODUCTS.filter(p => p.is_active !== false), params);
    return mockResponse(...Object.values(paginate(filtered, params)));
  }

  if (path === 'products' && method === 'post') {
    const newProd = { id: PRODUCTS.length + 1, ...data, stock: 0, created_at: now };
    return mockResponse(newProd);
  }

  if (path.match(/^products\/\d+$/) && method === 'put') {
    return mockResponse({ id: parseInt(path.split('/')[1]), ...data });
  }
  if (path.match(/^products\/\d+$/) && method === 'delete') return mockResponse({ message: 'Producto eliminado' });

  // ---- CATEGORIES ----
  const catMatch = path.match(/^categories\/(\d+)$/);
  if (catMatch && method === 'get') {
    const c = CATEGORIES.find(x => x.id == catMatch[1]);
    return c ? mockResponse(c) : mockResponse('Categoría no encontrada', 404);
  }

  if (path === 'categories/tree' && method === 'get') {
    return mockResponse(CATEGORIES.filter(c => c.is_active).map(c => ({ ...c, children: [] })));
  }

  if (path === 'categories' && method === 'get') {
    const filtered = filterByParams(CATEGORIES, params);
    return mockResponse(...Object.values(paginate(filtered, params)));
  }

  if (path === 'categories' && method === 'post') return mockResponse({ id: CATEGORIES.length + 1, ...data, created_at: now });
  if (path.match(/^categories\/\d+$/) && method === 'put') return mockResponse({ id: parseInt(path.split('/')[1]), ...data });
  if (path.match(/^categories\/\d+$/) && method === 'delete') return mockResponse({ message: 'Categoría eliminada' });

  // ---- INVENTORY ----
  if (path === 'inventory' && method === 'get') {
    const inventoryData = PRODUCTS.filter(p => p.is_active).map(p => ({
      id: p.id, product_id: p.id, product_name: p.name, product_sku: p.sku, stock: p.stock, min_stock: p.min_stock, category_name: p.category_name
    }));
    return mockResponse(...Object.values(paginate(inventoryData, params)));
  }

  if (path.match(/^inventory\/product\/(\d+)$/) && method === 'get') {
    const p = PRODUCTS.find(x => x.id == path.match(/^inventory\/product\/(\d+)$/)[1]);
    return p ? mockResponse({ ...p }) : mockResponse('No encontrado', 404);
  }

  if (path === 'inventory/movements' && method === 'get') return mockResponse(...Object.values(paginate(INVENTORY_MOVEMENTS, params)));
  if (path === 'inventory/entry' && method === 'post') return mockResponse({ id: 999, ...data, type: 'entry', created_at: now });
  if (path === 'inventory/exit' && method === 'post') return mockResponse({ id: 999, ...data, type: 'exit', created_at: now });
  if (path === 'inventory/adjustment' && method === 'post') return mockResponse({ id: 999, ...data, type: 'adjustment', created_at: now });
  if (path === 'inventory/transfer' && method === 'post') return mockResponse({ id: 999, ...data, type: 'transfer', created_at: now });
  if (path === 'inventory/alerts' && method === 'get') {
    return mockResponse(PRODUCTS.filter(p => p.stock <= p.min_stock).map(p => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, min_stock: p.min_stock, category: p.category_name })));
  }
  if (path === 'inventory/summary' && method === 'get') {
    return mockResponse({
      total_products: PRODUCTS.filter(p => p.is_active).length,
      total_stock: PRODUCTS.reduce((s, p) => s + p.stock, 0),
      low_stock_count: PRODUCTS.filter(p => p.stock <= p.min_stock && p.stock > 0).length,
      out_of_stock_count: PRODUCTS.filter(p => p.stock === 0).length,
      total_value: PRODUCTS.reduce((s, p) => s + p.stock * p.cost, 0)
    });
  }

  // ---- CLIENTS ----
  if (path === 'users/clients' && method === 'get') return mockResponse(...Object.values(paginate(CLIENTS, params)));
  if (path.match(/^users\/clients\/(\d+)$/) && method === 'get') {
    const c = CLIENTS.find(x => x.id == path.match(/^users\/clients\/(\d+)$/)[1]);
    return c ? mockResponse(c) : mockResponse('Cliente no encontrado', 404);
  }
  if (path === 'users/clients' && method === 'post') return mockResponse({ id: CLIENTS.length + 1, ...data, created_at: now });
  if (path.match(/^users\/clients\/\d+$/) && method === 'put') return mockResponse({ id: 1, ...data });
  if (path.match(/^users\/clients\/\d+$/) && method === 'delete') return mockResponse({ message: 'Cliente eliminado' });

  // ---- SALES ----
  const saleMatch = path.match(/^sales\/(\d+)$/);
  if (saleMatch && method === 'get') {
    const s = SALES.find(x => x.id == saleMatch[1]);
    return s ? mockResponse(s) : mockResponse('Venta no encontrada', 404);
  }

  if (path === 'sales' && method === 'get') {
    const filtered = filterByParams(SALES, params);
    return mockResponse(...Object.values(paginate(filtered, params)));
  }

  if (path === 'sales' && method === 'post') {
    const newSale = { id: SALES.length + 1, invoice_number: `FAC-${String(SALES.length + 1).padStart(3, '0')}`, ...data, created_at: now, status: 'completed' };
    return mockResponse(newSale);
  }

  if (path.match(/^sales\/\d+\/cancel$/) && method === 'put') return mockResponse({ message: 'Venta cancelada' });

  // ---- PURCHASES ----
  const purchMatch = path.match(/^purchases\/(\d+)$/);
  if (purchMatch && method === 'get') {
    const p = PURCHASES.find(x => x.id == purchMatch[1]);
    return p ? mockResponse(p) : mockResponse('Compra no encontrada', 404);
  }

  if (path === 'purchases' && method === 'get') return mockResponse(...Object.values(paginate(PURCHASES, params)));
  if (path === 'purchases' && method === 'post') return mockResponse({ id: PURCHASES.length + 1, ...data, created_at: now, status: 'pending' });
  if (path.match(/^purchases\/\d+\/status$/) && method === 'put') return mockResponse({ message: 'Estado actualizado' });
  if (path.match(/^purchases\/\d+\/cancel$/) && method === 'put') return mockResponse({ message: 'Compra cancelada' });

  // ---- INVOICES ----
  const invMatch = path.match(/^invoices\/(\d+)$/);
  if (invMatch && method === 'get') {
    const s = SALES.find(x => x.id == invMatch[1] || x.invoice_number == invMatch[1]);
    return s ? mockResponse({ ...s, notes: 'Factura de venta', due_date: daysAgo(-15), company: { name: CONFIG.business_name, tax_id: CONFIG.tax_id, address: CONFIG.address, phone: CONFIG.phone } }) : mockResponse('Factura no encontrada', 404);
  }

  if (path === 'invoices' && method === 'get') return mockResponse(...Object.values(paginate(SALES, params)));
  if (path.match(/^invoices\/\d+\/cancel$/) && method === 'put') return mockResponse({ message: 'Factura anulada' });
  if (path.match(/^invoices\/\d+\/email$/) && method === 'post') return mockResponse({ message: 'Factura enviada por correo' });
  if (path.match(/^invoices\/\d+\/pdf$/) && method === 'get') return mockResponse(new Blob(['%PDF-mock'], { type: 'application/pdf' }));

  // ---- REPORTS ----
  if (path === 'reports/dashboard' && method === 'get') {
    return mockResponse({
      todaySales: 2612300,
      monthSales: 11333800,
      lowStock: PRODUCTS.filter(p => p.stock <= p.min_stock).length,
      totalClients: CLIENTS.length,
      totalProducts: PRODUCTS.filter(p => p.is_active).length,
      totalSales: SALES.filter(s => s.status !== 'cancelled').length,
      totalRevenue: SALES.filter(s => s.status !== 'cancelled').reduce((t, s) => t + s.total, 0),
      averageTicket: Math.round(SALES.filter(s => s.status !== 'cancelled').reduce((t, s) => t + s.total, 0) / SALES.filter(s => s.status !== 'cancelled').length)
    });
  }

  if (path === 'reports/sales' && method === 'get') {
    const labels = params.period === 'yearly' ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] :
      params.period === 'monthly' ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] :
      params.period === 'weekly' ? ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'] :
      ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const data = labels.map((label, i) => ({
      label, date: daysAgo((labels.length - i) * (params.period === 'daily' ? 1 : params.period === 'weekly' ? 7 : 30)),
      total: Math.round(500000 + Math.random() * 3000000),
      count: Math.round(1 + Math.random() * 10)
    }));
    return mockResponse(data);
  }

  if (path === 'reports/inventory' && method === 'get') {
    return mockResponse(PRODUCTS.filter(p => p.is_active).map(p => ({
      id: p.id, name: p.name, sku: p.sku, category: p.category_name, stock: p.stock, min_stock: p.min_stock, price: p.price, cost: p.cost, stock_value: p.stock * p.cost, status: p.stock === 0 ? 'out_of_stock' : p.stock <= p.min_stock ? 'low_stock' : 'in_stock'
    })));
  }

  if (path === 'reports/top-products' && method === 'get') {
    const sorted = [...PRODUCTS].sort((a, b) => b.stock - a.stock).slice(0, 10);
    return mockResponse(sorted.map((p, i) => ({
      name: p.name, quantity: Math.round(10 + Math.random() * 50), total: p.price * Math.round(5 + Math.random() * 30), revenue: p.price * Math.round(10 + Math.random() * 40)
    })));
  }

  if (path === 'reports/clients' && method === 'get') return mockResponse(CLIENTS);

  // ---- NOTIFICATIONS ----
  if (path === 'notifications' && method === 'get') return mockResponse(...Object.values(paginate(NOTIFICATIONS, params)));
  if (path.match(/^notifications\/\d+\/read$/) && method === 'put') return mockResponse({ message: 'Notificación marcada como leída' });
  if (path === 'notifications/read-all' && method === 'put') return mockResponse({ message: 'Todas marcadas como leídas' });
  if (path.match(/^notifications\/\d+$/) && method === 'delete') return mockResponse({ message: 'Notificación eliminada' });

  // ---- AUDIT ----
  if (path === 'audit' && method === 'get') return mockResponse(...Object.values(paginate(AUDIT_LOGS, params)));
  if (path === 'audit/recent' && method === 'get') return mockResponse(AUDIT_LOGS.slice(0, 3));
  if (path === 'audit/stats' && method === 'get') return mockResponse({ total_logs: AUDIT_LOGS.length, unique_users: 2, unique_modules: 4 });

  // ---- CONFIG ----
  if (path === 'config' && method === 'get') return mockResponse(Object.entries(CONFIG).map(([k, v]) => ({ key: k, value: String(v), section: 'general', updated_at: daysAgo(10) })));
  if (path === 'config/sections' && method === 'get') return mockResponse(['general', 'ecommerce', 'notifications']);
  if ((path === 'config' || path === 'config/bulk') && (method === 'put' || method === 'post')) return mockResponse({ message: 'Configuración actualizada' });

  // ---- CART ----
  if (path === 'cart' && method === 'get') return mockResponse({ items: cartItems, total: cartItems.reduce((s, i) => s + i.price * i.quantity, 0), item_count: cartItems.length });
  if (path === 'cart' && method === 'post') {
    const newItem = { id: cartIdCounter++, product_id: data.product_id, product_name: data.product_name || 'Producto', price: data.price || 0, quantity: data.quantity || 1 };
    cartItems.push(newItem);
    return mockResponse(newItem);
  }
  if (path.match(/^cart\/(\d+)$/) && method === 'put') {
    const item = cartItems.find(i => i.id == path.match(/^cart\/(\d+)$/)[1]);
    if (item) Object.assign(item, data);
    return mockResponse(item);
  }
  if (path.match(/^cart\/(\d+)$/) && method === 'delete') {
    cartItems = cartItems.filter(i => i.id != path.match(/^cart\/(\d+)$/)[1]);
    return mockResponse({ message: 'Item eliminado' });
  }
  if (path === 'cart' && method === 'delete') { cartItems = []; return mockResponse({ message: 'Carrito vaciado' }); }

  // ---- CHECKOUT ----
  if (path === 'checkout/data' && method === 'get') return mockResponse({ clients: CLIENTS, products: PRODUCTS.filter(p => p.stock > 0) });
  if (path === 'checkout' && method === 'post') return mockResponse({ id: 999, invoice_number: 'FAC-999', ...data, total: 999999, status: 'completed', created_at: now });

  // ---- ECOMMERCE ----
  if (path === 'ecommerce/home' && method === 'get') return mockResponse({ banners: BANNERS.filter(b => b.is_active), featured: PRODUCTS.filter(p => p.is_featured), offers: OFFERS.filter(o => o.is_active) });
  if (path === 'ecommerce/banners' && method === 'get') return mockResponse(BANNERS);
  if (path === 'ecommerce/banners' && method === 'post') return mockResponse({ id: BANNERS.length + 1, ...data, created_at: now });
  if (path.match(/^ecommerce\/banners\/\d+$/) && method === 'put') return mockResponse({ id: 1, ...data });
  if (path.match(/^ecommerce\/banners\/\d+$/) && method === 'delete') return mockResponse({ message: 'Banner eliminado' });
  if (path === 'ecommerce/offers' && method === 'get') return mockResponse(OFFERS);
  if (path === 'ecommerce/offers' && method === 'post') return mockResponse({ id: OFFERS.length + 1, ...data, created_at: now });
  if (path.match(/^ecommerce\/offers\/\d+$/) && method === 'put') return mockResponse({ id: 1, ...data });
  if (path.match(/^ecommerce\/offers\/\d+$/) && method === 'delete') return mockResponse({ message: 'Oferta eliminada' });
  if (path === 'ecommerce/settings' && method === 'get') return mockResponse(CONFIG);
  if (path === 'ecommerce/settings' && method === 'put') return mockResponse({ message: 'Configuración guardada' });

  // ---- CATALOG ----
  if (path === 'catalog/search' && method === 'get') {
    const q = (params.q || params.search || '').toLowerCase();
    const results = PRODUCTS.filter(p => p.is_active && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category_name.toLowerCase().includes(q)));
    return mockResponse(...Object.values(paginate(results, params)));
  }
  if (path.match(/^catalog\/products\/(\d+)$/) && method === 'get') {
    const p = PRODUCTS.find(x => x.id == path.match(/^catalog\/products\/(\d+)$/)[1]);
    return p ? mockResponse(p) : mockResponse('No encontrado', 404);
  }

  // ---- EMAIL / WHATSAPP ----
  if (path.includes('email') && method === 'post') return mockResponse({ message: 'Correo enviado exitosamente' });
  if (path.includes('whatsapp') && method === 'post') return mockResponse({ message: 'Mensaje enviado exitosamente' });

  // ---- INVENTORY CRUD (generic) ----
  if (path.match(/^inventory\/\d+$/) && method === 'put') return mockResponse({ message: 'Actualizado' });
  if (path.match(/^inventory\/\d+$/) && method === 'delete') return mockResponse({ message: 'Eliminado' });
  if (path === 'inventory' && method === 'post') return mockResponse({ id: 999, ...data, created_at: now });

  console.warn('[MockAPI] No handler for:', method.toUpperCase(), '/api/v1/' + path, data);
  return mockResponse({ message: 'Endpoint no mockeado: ' + path }, 404);
}

// ============================================================
// INTERCEPTOR INSTALLATION
// ============================================================

let interceptorInstalled = false;

export function installTestData() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  console.log('%c🟣 Mock API activado — datos de prueba cargados', 'color: #6a1b8a; font-weight: bold; font-size: 14px;');
  console.log('%cUsuario: admin@sistema.com / admin123', 'color: #4F2361; font-size: 12px;');
  console.log('%cUsuario: cajero@sistema.com / cajero123', 'color: #4F2361; font-size: 12px;');

  // Rutas que deben pasar al backend real (dashboard y servicios core)
  const PASSTHROUGH_PATHS = [
    'reports/dashboard', 'reports/sales-chart', 'reports/sales',
    'reports/top-products', 'reports/inventory', 'reports/clients',
    'inventory/alerts', 'inventory/summary',
    'audit/recent', 'audit/stats',
    'sales', 'products', 'categories', 'clients'
  ];

  /** Hace una petición HTTP real con XMLHttpRequest (bypass del mock) */
  const realRequest = (config) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open((config.method || 'get').toUpperCase(), config.url || '', true);
    if (config.headers) {
      Object.entries(config.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    }
    xhr.onload = () => {
      try {
        resolve({ data: xhr.responseText ? JSON.parse(xhr.responseText) : null, status: xhr.status, statusText: xhr.statusText, headers: xhr.getAllResponseHeaders?.() || {}, config });
      } catch (parseError) {
        reject(new Error('Invalid JSON response'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(config.data || null);
  });

  // Custom adapter that intercepts API calls
  axios.defaults.adapter = async (config) => {
    if (!config.url?.includes('/api/v1/')) {
      // Non-API requests: use XMLHttpRequest natively
      return realRequest(config);
    }

    // Extraer ruta de la URL para decidir si hacer pass-through
    const apiPath = config.url.replace(/^.*\/api\/v1\//, '').split('?')[0].replace(/\/$/, '');
    const shouldPassthrough = PASSTHROUGH_PATHS.some(p => apiPath === p || apiPath.startsWith(p + '/'));

    if (shouldPassthrough) {
      return realRequest(config);
    }

    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';
    const data = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {};
    const params = config.params || {};

    // Simulate realistic network delay
    const delay = 200 + Math.random() * 400;
    await new Promise(resolve => setTimeout(resolve, delay));

    const [status, responseData] = handleMockRequest(method, url, data, params);

    // Build a mock axios response object
    const mockResponse = {
      data: responseData,
      status,
      statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
      headers: { 'content-type': 'application/json' },
      config
    };

    if (status >= 400) {
      const error = new Error(responseData?.error?.message || 'Error');
      error.response = mockResponse;
      throw error;
    }

    return mockResponse;
  };

  // Pre-fetch user profile if token exists
  const token = localStorage.getItem('accessToken');
  if (token) {
    const authStore = useAuthStore();
    setTimeout(() => authStore.fetchProfile(), 100);
  }
}

export default { installTestData };

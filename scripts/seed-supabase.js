// ===================================================
// Script para sembrar datos de prueba en Supabase
// ===================================================
// Ejecutar: node scripts/seed-supabase.js
// ===================================================

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seed() {
  console.log('🌱 Sembrando datos de prueba en Supabase...\n');

  // ==========================================
  // 1. Roles
  // ==========================================
  console.log('1. Insertando roles...');
  const { data: existingRoles } = await supabase.from('roles').select('name');
  const existingRoleNames = existingRoles?.map(r => r.name) || [];

  const roles = [
    {
      name: 'admin',
      description: 'Administrador del sistema - Acceso total',
      permissions: { products: ["create","read","update","delete"], inventory: ["create","read","update","delete"], sales: ["create","read","update","delete"], purchases: ["create","read","update","delete"], users: ["create","read","update","delete"], reports: ["view","export"], clients: ["create","read","update","delete"], ecommerce: ["manage"], config: ["manage"], audit: ["view"], admin: ["access"] }
    },
    {
      name: 'supervisor',
      description: 'Supervisor - Acceso a gestión y reportes',
      permissions: { products: ["create","read","update"], inventory: ["read","update"], sales: ["create","read","update"], purchases: ["create","read","update"], users: ["read"], reports: ["view"], clients: ["create","read","update"], ecommerce: ["manage"], config: [], audit: [], admin: [] }
    },
    {
      name: 'cajero',
      description: 'Cajero - Punto de venta',
      permissions: { products: ["read"], inventory: ["read"], sales: ["create","read"], purchases: [], users: [], reports: [], clients: ["create","read","update"], ecommerce: [], config: [], audit: [], admin: [] }
    },
    {
      name: 'inventario',
      description: 'Encargado de inventario',
      permissions: { products: ["create","read","update"], inventory: ["create","read","update"], sales: ["read"], purchases: ["create","read","update"], users: [], reports: ["view"], clients: ["read"], ecommerce: [], config: [], audit: [], admin: [] }
    },
    {
      name: 'cliente',
      description: 'Cliente - Acceso a ecommerce',
      permissions: { products: ["read"], inventory: [], sales: ["read"], purchases: [], users: [], reports: [], clients: ["read"], ecommerce: [], config: [], audit: [], admin: [] }
    }
  ];

  for (const role of roles) {
    if (!existingRoleNames.includes(role.name)) {
      const { error } = await supabase.from('roles').insert(role);
      if (error) console.error(`   Error insertando rol ${role.name}:`, error.message);
      else console.log(`   ✅ Rol "${role.name}" creado`);
    } else {
      console.log(`   ⏭️  Rol "${role.name}" ya existe`);
    }
  }

  // ==========================================
  // 2. Usuarios
  // ==========================================
  console.log('\n2. Insertando usuarios...');
  const { data: rolesData } = await supabase.from('roles').select('id, name');
  const roleMap = {};
  rolesData?.forEach(r => { roleMap[r.name] = r.id; });

  const { data: existingUsers } = await supabase.from('users').select('email');
  const existingUserEmails = existingUsers?.map(u => u.email) || [];

  const users = [
    { email: 'admin@sistema.com', name: 'Administrador', role_id: roleMap['admin'], password_hash: '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5GzYq0Ht6Fq1xJ8n0Qd5Kqy', email_verified: true, is_active: true },
    { email: 'cajero@sistema.com', name: 'Cajero Principal', role_id: roleMap['cajero'], password_hash: '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5GzYq0Ht6Fq1xJ8n0Qd5Kqy', email_verified: true, is_active: true }
  ];

  for (const user of users) {
    if (!existingUserEmails.includes(user.email)) {
      const { error } = await supabase.from('users').insert(user);
      if (error) console.error(`   Error insertando usuario ${user.email}:`, error.message);
      else console.log(`   ✅ Usuario "${user.email}" creado`);
    } else {
      console.log(`   ⏭️  Usuario "${user.email}" ya existe`);
    }
  }

  // ==========================================
  // 3. Categorías
  // ==========================================
  console.log('\n3. Insertando categorías...');
  const { data: existingCats } = await supabase.from('categories').select('name');
  const existingCatNames = existingCats?.map(c => c.name) || [];

  const categories = [
    { name: 'Electrónicos', slug: 'electronicos', description: 'Productos electrónicos y tecnología', status: 'active', sort_order: 1 },
    { name: 'Ropa y Accesorios', slug: 'ropa-accesorios', description: 'Prendas de vestir y accesorios', status: 'active', sort_order: 2 },
    { name: 'Hogar', slug: 'hogar', description: 'Productos para el hogar', status: 'active', sort_order: 3 },
    { name: 'Alimentos y Bebidas', slug: 'alimentos-bebidas', description: 'Alimentos y bebidas', status: 'active', sort_order: 4 },
    { name: 'Salud y Belleza', slug: 'salud-belleza', description: 'Productos de salud y belleza', status: 'active', sort_order: 5 }
  ];

  for (const cat of categories) {
    if (!existingCatNames.includes(cat.name)) {
      const { error } = await supabase.from('categories').insert(cat);
      if (error) console.error(`   Error insertando categoría ${cat.name}:`, error.message);
      else console.log(`   ✅ Categoría "${cat.name}" creada`);
    } else {
      console.log(`   ⏭️  Categoría "${cat.name}" ya existe`);
    }
  }

  // ==========================================
  // 4. Productos
  // ==========================================
  console.log('\n4. Insertando productos...');
  const { data: catsData } = await supabase.from('categories').select('id, name');
  const catMap = {};
  catsData?.forEach(c => { catMap[c.name] = c.id; });

  const { data: existingProducts } = await supabase.from('products').select('sku');
  const existingSkus = existingProducts?.map(p => p.sku) || [];

  const products = [
    { name: 'Smartphone X Pro', sku: 'ELEC-001', description: 'Smartphone de última generación con pantalla OLED 6.7", 256GB', price: 2499900, category_id: catMap['Electrónicos'], brand: 'TechPro', featured: true, status: 'active', unit: 'unidad', min_stock: 3, max_stock: 50, images: ['https://via.placeholder.com/400x400?text=Smartphone+X+Pro'] },
    { name: 'Laptop UltraBook 15', sku: 'ELEC-002', description: 'Laptop ultradelgada 15.6", 16GB RAM, 512GB SSD', price: 4599900, category_id: catMap['Electrónicos'], brand: 'TechPro', featured: true, status: 'active', unit: 'unidad', min_stock: 2, max_stock: 20, images: ['https://via.placeholder.com/400x400?text=Laptop+UltraBook'] },
    { name: 'Auriculares Bluetooth', sku: 'ELEC-003', description: 'Auriculares inalámbricos con cancelación de ruido', price: 249900, category_id: catMap['Electrónicos'], brand: 'SoundMax', featured: true, status: 'active', unit: 'unidad', min_stock: 10, max_stock: 100, images: ['https://via.placeholder.com/400x400?text=Auriculares+BT'] },
    { name: 'Tablet Pro 11', sku: 'ELEC-004', description: 'Tablet profesional 11" con lápiz táctil incluido', price: 1899900, category_id: catMap['Electrónicos'], brand: 'TechPro', featured: false, status: 'active', unit: 'unidad', min_stock: 3, max_stock: 30, images: ['https://via.placeholder.com/400x400?text=Tablet+Pro+11'] },
    { name: 'Camiseta Algodón Premium', sku: 'ROPA-001', description: 'Camiseta de algodón orgánico, corte moderno', price: 59900, category_id: catMap['Ropa y Accesorios'], brand: 'EcoWear', featured: true, status: 'active', unit: 'unidad', min_stock: 20, max_stock: 200, images: ['https://via.placeholder.com/400x400?text=Camiseta+Premium'] },
    { name: 'Chaqueta Cuero Clásica', sku: 'ROPA-002', description: 'Chaqueta de cuero genuino, diseño clásico', price: 449900, category_id: catMap['Ropa y Accesorios'], brand: 'EcoWear', featured: true, status: 'active', unit: 'unidad', min_stock: 5, max_stock: 30, images: ['https://via.placeholder.com/400x400?text=Chaqueta+Cuero'] },
    { name: 'Reloj Deportivo Smart', sku: 'ROPA-003', description: 'Reloj inteligente con GPS y monitoreo de salud', price: 799900, category_id: catMap['Ropa y Accesorios'], brand: 'FitTech', featured: true, status: 'active', unit: 'unidad', min_stock: 5, max_stock: 40, images: ['https://via.placeholder.com/400x400?text=Reloj+Smart'] },
    { name: 'Zapatos Running Pro', sku: 'ROPA-004', description: 'Zapatillas deportivas con amortiguación avanzada', price: 299900, category_id: catMap['Ropa y Accesorios'], brand: 'SportMax', featured: false, status: 'active', unit: 'par', min_stock: 10, max_stock: 60, images: ['https://via.placeholder.com/400x400?text=Zapatos+Running'] },
    { name: 'Lámpara LED Inteligente', sku: 'HOGAR-001', description: 'Lámpara LED controlada por app, 16M colores', price: 89900, category_id: catMap['Hogar'], brand: 'HomeSmart', featured: true, status: 'active', unit: 'unidad', min_stock: 15, max_stock: 80, images: ['https://via.placeholder.com/400x400?text=Lámpara+LED'] },
    { name: 'Set Sartenes Antiadherentes', sku: 'HOGAR-002', description: 'Juego de 5 sartenes con recubrimiento cerámico', price: 199900, category_id: catMap['Hogar'], brand: 'KitchenPro', featured: false, status: 'active', unit: 'juego', min_stock: 5, max_stock: 30, images: ['https://via.placeholder.com/400x400?text=Set+Sartenes'] },
    { name: 'Café Gourmet 500g', sku: 'ALIM-001', description: 'Café 100% arábica, tostado medio, origen Colombia', price: 34900, category_id: catMap['Alimentos y Bebidas'], brand: 'CaféAndino', featured: true, status: 'active', unit: 'unidad', min_stock: 30, max_stock: 150, images: ['https://via.placeholder.com/400x400?text=Café+Gourmet'] },
    { name: 'Aceite de Oliva Extra Virgen', sku: 'ALIM-002', description: 'Aceite de oliva extra virgen 1L, primera presión en frío', price: 45900, category_id: catMap['Alimentos y Bebidas'], brand: 'Delicias del Sur', featured: false, status: 'active', unit: 'unidad', min_stock: 20, max_stock: 100, images: ['https://via.placeholder.com/400x400?text=Aceite+Oliva'] },
    { name: 'Crema Facial Anti-Edad', sku: 'SALUD-001', description: 'Crema facial con ácido hialurónico y vitamina C', price: 89900, category_id: catMap['Salud y Belleza'], brand: 'NaturalGlow', featured: true, status: 'active', unit: 'unidad', min_stock: 10, max_stock: 50, images: ['https://via.placeholder.com/400x400?text=Crema+Facial'] },
    { name: 'Kit Cuidado Capilar', sku: 'SALUD-002', description: 'Set de shampoo y acondicionador orgánico 500ml', price: 69900, category_id: catMap['Salud y Belleza'], brand: 'NaturalGlow', featured: false, status: 'active', unit: 'juego', min_stock: 10, max_stock: 60, images: ['https://via.placeholder.com/400x400?text=Kit+Capilar'] }
  ];

  for (const product of products) {
    if (!existingSkus.includes(product.sku)) {
      const { error } = await supabase.from('products').insert(product);
      if (error) console.error(`   Error insertando producto ${product.sku}:`, error.message);
      else console.log(`   ✅ Producto "${product.name}" creado`);
    } else {
      console.log(`   ⏭️  Producto "${product.sku}" ya existe`);
    }
  }

  // ==========================================
  // 5. Inventario inicial
  // ==========================================
  console.log('\n5. Insertando inventario inicial...');
  const { data: prodData } = await supabase.from('products').select('id, sku');
  
  for (const prod of prodData || []) {
    const { data: existingInv } = await supabase.from('inventory').select('id').eq('product_id', prod.id).maybeSingle();
    if (!existingInv) {
      const stock = Math.floor(Math.random() * 80) + 10;
      const { error } = await supabase.from('inventory').insert({
        product_id: prod.id,
        warehouse: 'principal',
        stock: stock,
        min_stock: 5,
        max_stock: 100
      });
      if (error) console.error(`   Error inventario ${prod.sku}:`, error.message);
      else console.log(`   ✅ Inventario para ${prod.sku}: ${stock} unidades`);
    }
  }

  // ==========================================
  // 6. Configuración del sistema
  // ==========================================
  console.log('\n6. Insertando configuración del sistema...');
  const configs = [
    { key: 'store_name', value: 'Mi Tienda', section: 'general', description: 'Nombre de la tienda' },
    { key: 'low_stock_threshold', value: '5', section: 'inventory', description: 'Umbral para considerar stock bajo' },
    { key: 'default_tax_rate', value: '19', section: 'taxes', description: 'Porcentaje de impuesto por defecto' },
    { key: 'currency', value: 'COP', section: 'general', description: 'Moneda del sistema' },
    { key: 'currency_symbol', value: '$', section: 'general', description: 'Símbolo de moneda' },
    { key: 'company_name', value: 'Mi Empresa S.A.S.', section: 'invoice', description: 'Nombre de la empresa' },
    { key: 'company_nit', value: '123456789-0', section: 'invoice', description: 'NIT de la empresa' },
    { key: 'iva_rate', value: '19', section: 'taxes', description: 'Porcentaje de IVA' },
    { key: 'session_timeout', value: '60', section: 'security', description: 'Tiempo de sesión en minutos' }
  ];

  for (const cfg of configs) {
    const { data: existingCfg } = await supabase.from('system_config').select('key').eq('key', cfg.key).maybeSingle();
    if (!existingCfg) {
      const { error } = await supabase.from('system_config').insert(cfg);
      if (error) console.error(`   Error config ${cfg.key}:`, error.message);
      else console.log(`   ✅ Config "${cfg.key}" creada`);
    }
  }

  // ==========================================
  // 7. Storage Bucket para imágenes de productos
  // ==========================================
  console.log('\n7. Configurando Storage Bucket...');
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'product-images');
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('product-images', {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      if (createError) {
        console.error(`   Error creando bucket: ${createError.message}`);
        console.log('   ⚠️  Puedes crearlo manualmente en el Dashboard de Supabase > Storage > Create bucket');
        console.log('       Nombre: product-images, Público: SI');
      } else {
        console.log('   ✅ Bucket "product-images" creado correctamente');
      }
    } else {
      console.log('   ⏭️  Bucket "product-images" ya existe');
    }
  } catch (e) {
    // Si la creación falla, puede ser porque la clave no tiene permisos de admin
    console.log('   ⚠️  No se pudo configurar el bucket automáticamente.');
    console.log('       Asegúrate de crear el bucket "product-images" (público) en Supabase Dashboard > Storage.');
  }

  console.log('\n✅ ¡Datos de prueba insertados correctamente!');
  console.log('📧 Usuarios: admin@sistema.com / cajero@sistema.com');
  console.log('🔑 Contraseña: Admin123!');
}

seed().catch(e => {
  console.error('Error general:', e.message);
  process.exit(1);
});

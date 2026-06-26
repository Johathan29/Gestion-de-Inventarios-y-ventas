-- ===================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO Y VENTAS
-- Esquema inicial de base de datos (Supabase/PostgreSQL)
-- ===================================================

-- 1. USERS & AUTH
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  phone VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  refresh_token TEXT,
  refresh_token_expires TIMESTAMPTZ,
  reset_password_token TEXT,
  reset_password_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  document_type VARCHAR(20),
  document_number VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS & CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  sku VARCHAR(100) UNIQUE NOT NULL,
  barcode VARCHAR(100),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand VARCHAR(255),
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  compare_price DECIMAL(12,2) CHECK (compare_price >= 0),
  cost_price DECIMAL(12,2) CHECK (cost_price >= 0),
  tax_rate DECIMAL(5,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'unidad',
  min_stock INTEGER DEFAULT 5,
  max_stock INTEGER,
  images JSONB DEFAULT '[]',
  attributes JSONB DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  price DECIMAL(12,2),
  stock INTEGER DEFAULT 0,
  attributes JSONB DEFAULT '{}',
  images TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse VARCHAR(100) DEFAULT 'principal',
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  max_stock INTEGER,
  location VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse VARCHAR(100) DEFAULT 'principal',
  type VARCHAR(20) NOT NULL CHECK (type IN ('entry', 'exit', 'adjustment', 'transfer')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  reason TEXT,
  notes TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PURCHASES
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  tax_id VARCHAR(50),
  payment_terms VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SALES
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number VARCHAR(50) UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled', 'voided')),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  pdf_url TEXT,
  qr_code TEXT,
  qr_data TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CART
CREATE TABLE IF NOT EXISTS cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ECOMMERCE
CREATE TABLE IF NOT EXISTS ecommerce_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_percent DECIMAL(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecommerce_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(255) DEFAULT 'Mi Tienda',
  description TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  social_networks JSONB DEFAULT '{}',
  seo_settings JSONB DEFAULT '{}',
  shipping_settings JSONB DEFAULT '{}',
  payment_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES user_notifications(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'push')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EMAIL LOGS
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  status VARCHAR(20) DEFAULT 'sent',
  message_id VARCHAR(255),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SYSTEM CONFIG
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  section VARCHAR(100) DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, section)
);

-- ===================================================
-- ÍNDICES
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_document ON clients(document_number);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory(stock);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_number ON purchases(purchase_number);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_sale ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_cart_client ON cart(client_id);
CREATE INDEX IF NOT EXISTS idx_cart_session ON cart(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_offers_product ON offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_ecommerce_banners_active ON ecommerce_banners(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_system_config_section ON system_config(section);

-- ===================================================
-- VISTAS
-- ===================================================

-- Vista de Kardex
CREATE OR REPLACE VIEW vw_kardex AS
SELECT
  im.id,
  im.product_id,
  p.name AS product_name,
  p.sku,
  im.warehouse,
  im.type,
  im.quantity,
  im.previous_stock,
  im.new_stock,
  im.reference_type,
  im.reference_id,
  im.reason,
  im.user_id,
  u.name AS user_name,
  im.created_at
FROM inventory_movements im
JOIN products p ON p.id = im.product_id
LEFT JOIN users u ON u.id = im.user_id
ORDER BY im.created_at DESC;

-- Vista de ventas con items
CREATE OR REPLACE VIEW vw_sales_with_items AS
SELECT
  s.id AS sale_id,
  s.sale_number,
  s.client_id,
  c.name AS client_name,
  c.email AS client_email,
  s.user_id,
  u.name AS user_name,
  s.status,
  s.subtotal,
  s.tax,
  s.discount,
  s.total,
  s.payment_method,
  s.created_at,
  jsonb_agg(
    jsonb_build_object(
      'product_id', si.product_id,
      'product_name', si.product_name,
      'sku', si.sku,
      'quantity', si.quantity,
      'unit_price', si.unit_price,
      'discount', si.discount,
      'tax', si.tax,
      'total', si.total
    )
  ) AS items
FROM sales s
LEFT JOIN clients c ON c.id = s.client_id
LEFT JOIN users u ON u.id = s.user_id
LEFT JOIN sale_items si ON si.sale_id = s.id
GROUP BY s.id, s.sale_number, s.client_id, c.name, c.email, s.user_id, u.name, s.status, s.subtotal, s.tax, s.discount, s.total, s.payment_method, s.created_at;

-- Vista de productos con stock
CREATE OR REPLACE VIEW vw_products_with_stock AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.barcode,
  p.price,
  p.cost_price,
  p.category_id,
  c.name AS category_name,
  p.brand,
  COALESCE(i.stock, 0) AS current_stock,
  i.min_stock,
  i.warehouse,
  CASE
    WHEN COALESCE(i.stock, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(i.stock, 0) <= i.min_stock THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status,
  p.status,
  p.featured,
  p.images
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN LATERAL (
  SELECT stock, min_stock, warehouse
  FROM inventory
  WHERE product_id = p.id
  ORDER BY warehouse = 'principal' DESC
  LIMIT 1
) i ON true;

-- ===================================================
-- FUNCIONES
-- ===================================================

-- Función para obtener umbral de stock bajo
CREATE OR REPLACE FUNCTION get_low_stock_threshold()
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    (SELECT value::integer FROM system_config WHERE key = 'low_stock_threshold' AND section = 'inventory'),
    5
  );
$$;

-- Función para generar número de factura
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  year_prefix VARCHAR(4);
  next_number INTEGER;
  invoice_num VARCHAR(50);
BEGIN
  year_prefix := to_char(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM 'I\D+-(\d+)')::INTEGER), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_prefix || '-%';
  
  invoice_num := 'INV-' || year_prefix || '-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

-- Función para generar número de venta
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
  sale_num VARCHAR(50);
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(sale_number FROM 'SALE-(\d+)')::INTEGER), 0) + 1
  INTO next_number
  FROM sales;
  
  sale_num := 'SALE-' || LPAD(next_number::TEXT, 8, '0');
  RETURN sale_num;
END;
$$;

-- ===================================================
-- TRIGGERS
-- ===================================================

-- Actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_system_config_updated_at BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===================================================
-- DATOS INICIALES
-- ===================================================

-- Roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Administrador del sistema - Acceso total', 
 '{"products":["create","read","update","delete"],"inventory":["create","read","update","delete"],"sales":["create","read","update","delete"],"purchases":["create","read","update","delete"],"users":["create","read","update","delete"],"reports":["view","export"],"clients":["create","read","update","delete"],"ecommerce":["manage"],"config":["manage"],"audit":["view"],"admin":["access"]}'),
('supervisor', 'Supervisor - Acceso a gestión y reportes',
 '{"products":["create","read","update"],"inventory":["read","update"],"sales":["create","read","update"],"purchases":["create","read","update"],"users":["read"],"reports":["view"],"clients":["create","read","update"],"ecommerce":["manage"],"config":[],"audit":[],"admin":[]}'),
('cajero', 'Cajero - Punto de venta',
 '{"products":["read"],"inventory":["read"],"sales":["create","read"],"purchases":[],"users":[],"reports":[],"clients":["create","read","update"],"ecommerce":[],"config":[],"audit":[],"admin":[]}'),
('inventario', 'Encargado de inventario',
 '{"products":["create","read","update"],"inventory":["create","read","update"],"sales":["read"],"purchases":["create","read","update"],"users":[],"reports":["view"],"clients":["read"],"ecommerce":[],"config":[],"audit":[],"admin":[]}'),
('cliente', 'Cliente - Acceso a ecommerce',
 '{"products":["read"],"inventory":[],"sales":["read"],"purchases":[],"users":[],"reports":[],"clients":["read"],"ecommerce":[],"config":[],"audit":[],"admin":[]}');

-- Configuración inicial del sistema
INSERT INTO system_config (key, value, section, description) VALUES
('store_name', 'Mi Tienda', 'general', 'Nombre de la tienda'),
('low_stock_threshold', '5', 'inventory', 'Umbral para considerar stock bajo'),
('default_tax_rate', '19', 'taxes', 'Porcentaje de impuesto por defecto'),
('currency', 'COP', 'general', 'Moneda del sistema'),
('invoice_footer', 'Gracias por su compra', 'invoice', 'Pie de página en facturas'),
('session_timeout', '60', 'security', 'Tiempo de sesión en minutos');

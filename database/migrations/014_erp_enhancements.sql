-- ============================================================
-- SISTEMA ERP ENTERPRISE (GIICV)
-- Migración 014: Esquema de datos - SOLO ESTRUCTURA
-- ============================================================
-- PROPÓSITO: Esta migración contiene ÚNICAMENTE:
--   - Creación de tablas y columnas
--   - Constraints (CHECK, FK, UNIQUE)
--   - Índices (incluyendo compuestos y parciales)
--   - Vistas y Vistas Materializadas para reportes
--   - Triggers TÉCNICOS (updated_at, auto-numeración)
--   - Funciones SQL REUTILIZABLES (cálculos, validaciones)
--   - Seed data inicial
--
-- NO CONTIENE lógica de negocio:
--   - ❌ No hay triggers que automaticen procesos de compra/venta
--   - ❌ No hay funciones que actualicen inventario automáticamente
--   - ❌ No hay creación de facturas desde checkout en SQL
--   - ❌ No hay lógica de aprobación/rechazo
--
-- Toda la lógica de negocio vive en los servicios Node.js
-- ============================================================

-- ============================================================
-- 1. SEPARACIÓN CATÁLOGO ↔ INVENTARIO
-- ============================================================

-- 1.1. Tabla de marcas (Catálogo)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  website VARCHAR(255) DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2. Mejorar tabla products (Catálogo puro - SIN stock)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_keywords TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS warranty VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(20) DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_min DECIMAL(12,2) CHECK (price_min >= 0),
  ADD COLUMN IF NOT EXISTS price_max DECIMAL(12,2) CHECK (price_max >= 0),
  ADD COLUMN IF NOT EXISTS is_catalog_only BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_for_sale BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'hidden', 'discontinued'));

COMMENT ON COLUMN products.brand_id IS 'Relación con catálogo de marcas';
COMMENT ON COLUMN products.price_min IS 'Precio mínimo sugerido de venta';
COMMENT ON COLUMN products.price_max IS 'Precio máximo sugerido de venta';
COMMENT ON COLUMN products.available_for_sale IS 'Controla si el producto aparece en ventas/ecommerce';
COMMENT ON COLUMN products.is_catalog_only IS 'Producto solo de catálogo, sin gestión de inventario';

-- 1.3. Tabla de listas de precio
CREATE TABLE IF NOT EXISTS price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  min_quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(price_list_id, product_id, min_quantity)
);

-- 1.4. Tabla de especificaciones / atributos
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'number', 'boolean', 'select', 'multi_select', 'color', 'size')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attribute_id, product_id)
);

-- 1.5. Productos relacionados (cross-sell / up-sell)
CREATE TABLE IF NOT EXISTS product_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type VARCHAR(20) NOT NULL CHECK (relation_type IN ('cross_sell', 'up_sell', 'related', 'alternative')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, related_product_id, relation_type)
);

-- 1.6. Mejorar tabla inventory (Stock real - SOLO columnas)
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  ADD COLUMN IF NOT EXISTS available INTEGER GENERATED ALWAYS AS (stock - reserved) STORED,
  ADD COLUMN IF NOT EXISTS lot VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS avg_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

COMMENT ON COLUMN inventory.reserved IS 'Stock reservado (gestionado por InventoryService)';
COMMENT ON COLUMN inventory.available IS 'Stock disponible = stock - reservado (columna generada)';
COMMENT ON COLUMN inventory.lot IS 'Número de lote';
COMMENT ON COLUMN inventory.serial_number IS 'Número de serie del producto';

-- 1.7. Tabla de almacenes/sucursales
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT '',
  phone VARCHAR(30),
  email VARCHAR(255),
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;

-- 1.8. Ubicaciones dentro de almacén
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) DEFAULT '',
  zone VARCHAR(100) DEFAULT '',
  aisle VARCHAR(100) DEFAULT '',
  shelf VARCHAR(100) DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, code)
);

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL;

-- ============================================================
-- 2. TABLA DE EMPRESAS (Multi-tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  ruc VARCHAR(50) UNIQUE DEFAULT '',
  fiscal_address TEXT DEFAULT '',
  commercial_name VARCHAR(255) DEFAULT '',
  phone VARCHAR(30) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  logo_url TEXT DEFAULT '',
  website VARCHAR(255) DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- ============================================================
-- 3. ESTADOS DE COMPRAS (Workflow - SOLO estructura)
-- ============================================================

-- Respaldar estado actual antes de cambiar
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'status' AND column_default IS NULL) THEN
    ALTER TABLE purchases RENAME COLUMN status TO old_status;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'draft'
  CHECK (status IN (
    'draft', 'pending', 'approved', 'sent_to_supplier', 'in_transit',
    'partially_received', 'received', 'in_inspection', 'inspected',
    'approved_quality', 'rejected_quality', 'entered_inventory', 'closed', 'cancelled'
  ));

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS expected_date DATE,
  ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inspected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inspected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_tracking VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS ordered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entered_inventory_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entered_inventory_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Migrar datos antiguos (solo si existe old_status)
UPDATE purchases SET status = 'draft' WHERE old_status = 'pending' AND status IS NULL;
UPDATE purchases SET status = 'entered_inventory' WHERE old_status = 'received' AND status IS NULL;
UPDATE purchases SET status = 'cancelled' WHERE old_status = 'cancelled' AND status IS NULL;

-- ============================================================
-- 4. RECEPCIÓN DE MERCANCÍA
-- ============================================================

CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  received_by UUID REFERENCES users(id) ON DELETE SET NULL,
  supplier_document VARCHAR(255) DEFAULT '',
  carrier_name VARCHAR(255) DEFAULT '',
  tracking_number VARCHAR(255) DEFAULT '',
  vehicle_plate VARCHAR(50) DEFAULT '',
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'rejected', 'partial'
  )),
  received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_item_id UUID REFERENCES purchase_items(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  expected_quantity INTEGER NOT NULL CHECK (expected_quantity > 0),
  received_quantity INTEGER NOT NULL DEFAULT 0,
  accepted_quantity INTEGER NOT NULL DEFAULT 0,
  rejected_quantity INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  lot VARCHAR(100) DEFAULT '',
  serial_number VARCHAR(255) DEFAULT '',
  expiry_date DATE,
  unit_cost DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. INSPECCIÓN DE CALIDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number VARCHAR(50) UNIQUE NOT NULL,
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  inspected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'approved', 'rejected', 'partial'
  )),
  result VARCHAR(20) GENERATED ALWAYS AS (
    CASE
      WHEN status = 'approved' THEN 'approved'
      WHEN status = 'rejected' THEN 'rejected'
      WHEN status = 'partial' THEN 'partial'
      ELSE 'pending'
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_inspection_id UUID NOT NULL REFERENCES quality_inspections(id) ON DELETE CASCADE,
  goods_receipt_item_id UUID REFERENCES goods_receipt_items(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  inspected_quantity INTEGER NOT NULL DEFAULT 0,
  accepted_quantity INTEGER NOT NULL DEFAULT 0,
  rejected_quantity INTEGER NOT NULL DEFAULT 0,
  defect_type VARCHAR(100) DEFAULT '',
  defect_description TEXT,
  severity VARCHAR(20) DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'critical')),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. CHECKOUT (Flujo completo de compra ecommerce)
-- ============================================================

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'address_set', 'shipping_set', 'payment_set',
    'completed', 'expired', 'cancelled'
  )),
  shipping_address TEXT,
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_country VARCHAR(100),
  shipping_zip VARCHAR(20),
  shipping_phone VARCHAR(30),
  shipping_email VARCHAR(255),
  shipping_full_name VARCHAR(255),
  shipping_method VARCHAR(100) DEFAULT '',
  shipping_cost DECIMAL(12,2) DEFAULT 0,
  shipping_carrier VARCHAR(100) DEFAULT '',
  shipping_estimated_days INTEGER,
  payment_method VARCHAR(50) DEFAULT '',
  payment_reference VARCHAR(255) DEFAULT '',
  coupon_code VARCHAR(50) DEFAULT '',
  coupon_discount DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  accepted_terms BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id UUID NOT NULL REFERENCES checkout_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cupones de descuento
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(12,2) NOT NULL CHECK (discount_value > 0),
  min_purchase DECIMAL(12,2) DEFAULT 0,
  max_discount DECIMAL(12,2),
  max_uses INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Métodos de envío
CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  carrier VARCHAR(100) DEFAULT '',
  description TEXT DEFAULT '',
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  estimated_days_min INTEGER,
  estimated_days_max INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ESTADOS DE VENTAS (Workflow - SOLO estructura)
-- ============================================================

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_status_check
  CHECK (status IN (
    'pending', 'confirmed', 'preparing', 'shipped',
    'delivered', 'completed', 'cancelled', 'refunded',
    'partially_refunded'
  ));

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'pos' CHECK (source IN ('pos', 'ecommerce', 'manual')),
  ADD COLUMN IF NOT EXISTS checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS cash_register VARCHAR(100) DEFAULT '';

UPDATE sales SET status = 'confirmed' WHERE status = 'completed';

-- ============================================================
-- 8. FACTURACIÓN FISCAL (NCF, RNC, etc.)
-- ============================================================

-- 8.1. Tipos de comprobantes fiscales
CREATE TABLE IF NOT EXISTS fiscal_document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'consumer_final', 'credit_fiscal', 'governmental', 'special',
    'export', 'credit_note', 'debit_note', 'cancellation'
  )),
  prefix VARCHAR(5) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_identification BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.2. Secuencias NCF
CREATE TABLE IF NOT EXISTS ncf_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_document_type_id UUID NOT NULL REFERENCES fiscal_document_types(id) ON DELETE CASCADE,
  serie VARCHAR(10) NOT NULL,
  prefix VARCHAR(10) NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  max_number INTEGER NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  branch VARCHAR(100) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, serie, prefix, branch)
);

-- 8.3. Facturas mejoradas
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS ncf VARCHAR(50) UNIQUE DEFAULT '',
  ADD COLUMN IF NOT EXISTS ncf_sequence_id UUID REFERENCES ncf_sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_document_type_id UUID REFERENCES fiscal_document_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_document_type VARCHAR(20) DEFAULT '' CHECK (client_document_type IN ('', 'RNC', 'CEDULA', 'PASAPORTE')),
  ADD COLUMN IF NOT EXISTS client_document_number VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_name VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_phone VARCHAR(30) DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_email VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(30) DEFAULT 'consumer_final' CHECK (invoice_type IN (
    'consumer_final', 'credit_fiscal', 'governmental', 'special', 'export',
    'credit_note', 'debit_note', 'cancellation'
  )),
  ADD COLUMN IF NOT EXISTS reference_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS branch VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS cash_register VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS seller_name VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_method_name VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_term VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS xml_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS signature TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS qr_code_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fiscal_registration TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_electronic BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS electronic_status VARCHAR(30) DEFAULT 'pending' CHECK (electronic_status IN ('pending', 'sent', 'approved', 'rejected'));

-- Migrar datos de clientes a columnas de factura
UPDATE invoices i
SET
  client_name = COALESCE(c.name, ''),
  client_document_number = COALESCE(c.document_number, ''),
  client_email = COALESCE(c.email, ''),
  client_phone = COALESCE(c.phone, '')
FROM clients c
WHERE i.client_id = c.id AND (i.client_name IS NULL OR i.client_name = '');

-- 8.4. Registro de contribuyentes
CREATE TABLE IF NOT EXISTS taxpayer_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ruc VARCHAR(50) UNIQUE NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  commercial_name VARCHAR(255),
  fiscal_address TEXT,
  phone VARCHAR(30),
  email VARCHAR(255),
  economic_activity TEXT,
  is_active BOOLEAN DEFAULT true,
  fiscal_registration_number VARCHAR(100) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================
-- 9. DEVOLUCIONES Y REEMBOLSOS
-- ============================================================

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(50) UNIQUE NOT NULL,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'received', 'inspected', 'refunded', 'closed'
  )),
  disposition VARCHAR(30) DEFAULT 'restock' CHECK (disposition IN ('restock', 'discard', 'donation', 'return_to_supplier')),
  refund_amount DECIMAL(12,2) DEFAULT 0,
  refund_method VARCHAR(50) DEFAULT '',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  reason TEXT,
  condition VARCHAR(30) DEFAULT 'good' CHECK (condition IN ('good', 'damaged', 'defective', 'expired', 'incorrect')),
  is_restocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. MOVIMIENTOS DE INVENTARIO (Tipos extendidos)
-- ============================================================

-- 10.1. Check constraint actualizado
ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_type_check;
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_type_check
  CHECK (type IN (
    'entry', 'exit', 'entry_purchase', 'exit_sale',
    'adjustment_plus', 'adjustment_minus', 'transfer',
    'return_client', 'return_supplier', 'reservation',
    'release', 'count', 'production', 'internal_consumption',
    'initial_balance'
  ));

-- 10.2. Columnas adicionales
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS warehouse_from VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS warehouse_to VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS warehouse_from_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_to_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lot VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) DEFAULT '';

-- Migrar tipos antiguos
UPDATE inventory_movements SET type = 'entry_purchase' WHERE type = 'entry';
UPDATE inventory_movements SET type = 'exit_sale' WHERE type = 'exit';
UPDATE inventory_movements SET type = 'adjustment_plus' WHERE type = 'adjustment' AND quantity > 0;
UPDATE inventory_movements SET type = 'adjustment_minus' WHERE type = 'adjustment' AND quantity < 0;

-- ============================================================
-- 11. RESERVAS DE INVENTARIO
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'converted')),
  expires_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. AUDITORÍA MEJORADA
-- ============================================================

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS changes_detail JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

CREATE TABLE IF NOT EXISTS audit_field_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID NOT NULL REFERENCES audit_logs(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  data_type VARCHAR(50) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. FINANZAS / CONTABILIDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS account_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_id UUID REFERENCES account_plans(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  reference_type VARCHAR(50) DEFAULT '',
  reference_id UUID,
  is_automated BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accounting_entry_id UUID NOT NULL REFERENCES accounting_entries(id) ON DELETE CASCADE,
  account_plan_id UUID NOT NULL REFERENCES account_plans(id) ON DELETE CASCADE,
  debit DECIMAL(12,2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(12,2) DEFAULT 0 CHECK (credit >= 0),
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. MÉTODOS DE PAGO / CAJA
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('cash', 'card', 'transfer', 'check', 'credit', 'wallet', 'other')),
  is_active BOOLEAN DEFAULT true,
  requires_reference BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- ============================================================ 
-- 15. TRIGGERS TÉCNICOS (SOLO updated_at y auto-numeración)
-- ============================================================

-- 15.1. Función genérica para actualizar updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger updated_at a todas las tablas que lo necesiten
DO $$ DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name IN ('brands', 'price_lists', 'warehouses', 'companies',
        'goods_receipts', 'quality_inspections', 'checkout_sessions',
        'coupons', 'returns', 'account_plans', 'accounting_entries',
        'ncf_sequences', 'taxpayer_info', 'payment_methods', 'cash_registers')
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trg_' || t || '_updated_at')
    THEN
      EXECUTE 'CREATE TRIGGER trg_' || t || '_updated_at
        BEFORE UPDATE ON ' || t || '
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();';
    END IF;
  END LOOP;
END $$;

-- 15.2. Generar número de recibo automático (SOLO técnico)
CREATE OR REPLACE FUNCTION fn_generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_month TEXT := to_char(NOW(), 'MM');
  v_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER)), 0) + 1
  INTO v_seq
  FROM goods_receipts
  WHERE receipt_number LIKE 'RCP-' || v_year || v_month || '-%';

  NEW.receipt_number := 'RCP-' || v_year || v_month || '-' || LPAD(v_seq::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_goods_receipts_number ON goods_receipts;
CREATE TRIGGER trg_goods_receipts_number
  BEFORE INSERT ON goods_receipts
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL OR NEW.receipt_number = '')
  EXECUTE FUNCTION fn_generate_receipt_number();

-- 15.3. Generar número de inspección automático (SOLO técnico)
CREATE OR REPLACE FUNCTION fn_generate_inspection_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(inspection_number, '-', 2) AS INTEGER)), 0) + 1
  INTO v_seq
  FROM quality_inspections
  WHERE inspection_number LIKE 'INS-' || v_year || '-%';

  NEW.inspection_number := 'INS-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quality_inspections_number ON quality_inspections;
CREATE TRIGGER trg_quality_inspections_number
  BEFORE INSERT ON quality_inspections
  FOR EACH ROW
  WHEN (NEW.inspection_number IS NULL OR NEW.inspection_number = '')
  EXECUTE FUNCTION fn_generate_inspection_number();

-- 15.4. Generar número de devolución automático
CREATE OR REPLACE FUNCTION fn_generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT := to_char(NOW(), 'YYYY');
  v_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(return_number, '-', 2) AS INTEGER)), 0) + 1
  INTO v_seq
  FROM returns
  WHERE return_number LIKE 'RET-' || v_year || '-%';

  NEW.return_number := 'RET-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_returns_number ON returns;
CREATE TRIGGER trg_returns_number
  BEFORE INSERT ON returns
  FOR EACH ROW
  WHEN (NEW.return_number IS NULL OR NEW.return_number = '')
  EXECUTE FUNCTION fn_generate_return_number();

-- ============================================================
-- 16. FUNCIONES SQL REUTILIZABLES (cálculos de solo lectura)
-- ============================================================

-- 16.1. Calcular stock disponible para un producto/almacén
CREATE OR REPLACE FUNCTION fn_get_available_stock(
  p_product_id UUID,
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  IF p_warehouse_id IS NOT NULL THEN
    SELECT COALESCE(available, 0) INTO v_stock
    FROM inventory
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
  ELSE
    SELECT COALESCE(SUM(available), 0) INTO v_stock
    FROM inventory
    WHERE product_id = p_product_id;
  END IF;

  RETURN v_stock;
END;
$$ LANGUAGE plpgsql STABLE;

-- 16.2. Calcular costo promedio ponderado
CREATE OR REPLACE FUNCTION fn_calculate_avg_cost(
  p_product_id UUID,
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_avg_cost DECIMAL(12,2);
BEGIN
  IF p_warehouse_id IS NOT NULL THEN
    SELECT avg_cost INTO v_avg_cost
    FROM inventory
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
  ELSE
    SELECT SUM(avg_cost * stock) / NULLIF(SUM(stock), 0) INTO v_avg_cost
    FROM inventory
    WHERE product_id = p_product_id AND stock > 0;
  END IF;

  RETURN COALESCE(v_avg_cost, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 16.3. Validar que hay suficiente stock disponible
CREATE OR REPLACE FUNCTION fn_validate_stock(
  p_product_id UUID,
  p_quantity INTEGER,
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_available INTEGER;
BEGIN
  v_available := fn_get_available_stock(p_product_id, p_warehouse_id);
  RETURN v_available >= p_quantity;
END;
$$ LANGUAGE plpgsql STABLE;

-- 16.4. Obtener siguiente NCF disponible
CREATE OR REPLACE FUNCTION fn_get_next_ncf(
  p_fiscal_document_type_id UUID,
  p_branch VARCHAR(100) DEFAULT '',
  p_company_id UUID DEFAULT NULL
)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_sequence RECORD;
  v_ncf VARCHAR(50);
BEGIN
  SELECT * INTO v_sequence
  FROM ncf_sequences
  WHERE fiscal_document_type_id = p_fiscal_document_type_id
    AND branch = p_branch
    AND (p_company_id IS NULL OR company_id = p_company_id)
    AND is_active = true
    AND CURRENT_DATE BETWEEN valid_from AND valid_to
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active NCF sequence found for fiscal document type %', p_fiscal_document_type_id;
  END IF;

  IF v_sequence.current_number >= v_sequence.max_number THEN
    RAISE EXCEPTION 'NCF sequence % has reached its limit (%)', v_sequence.prefix, v_sequence.max_number;
  END IF;

  v_ncf := v_sequence.prefix || '-' || LPAD((v_sequence.current_number + 1)::TEXT, 8, '0');

  UPDATE ncf_sequences
  SET current_number = current_number + 1, updated_at = NOW()
  WHERE id = v_sequence.id;

  RETURN v_ncf;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 17. VISTAS PARA REPORTES (solo lectura)
-- ============================================================

-- 17.1. Vista de Kardex
DROP VIEW IF EXISTS vw_kardex;
CREATE OR REPLACE VIEW vw_kardex AS
SELECT
  im.id,
  im.product_id,
  p.name AS product_name,
  p.sku,
  im.warehouse,
  w.name AS warehouse_name,
  im.type,
  CASE
    WHEN im.type IN ('entry', 'entry_purchase', 'return_client', 'adjustment_plus', 'production', 'initial_balance') THEN 'Entrada'
    WHEN im.type IN ('exit', 'exit_sale', 'return_supplier', 'adjustment_minus', 'internal_consumption') THEN 'Salida'
    WHEN im.type = 'transfer' THEN 'Transferencia'
    WHEN im.type = 'reservation' THEN 'Reserva'
    WHEN im.type = 'release' THEN 'Liberación'
    WHEN im.type = 'count' THEN 'Conteo'
    ELSE im.type
  END AS type_label,
  CASE WHEN im.quantity > 0 THEN im.quantity ELSE 0 END AS entrada,
  CASE WHEN im.quantity < 0 THEN ABS(im.quantity) ELSE 0 END AS salida,
  im.quantity,
  im.previous_stock,
  im.new_stock,
  im.unit_cost,
  im.total_cost,
  im.reference_type,
  im.reference_id,
  im.lot,
  im.serial_number,
  im.reason,
  im.notes,
  u.name AS created_by_name,
  im.created_at
FROM inventory_movements im
LEFT JOIN products p ON p.id = im.product_id
LEFT JOIN warehouses w ON w.id = im.warehouse_from_id OR w.id = im.warehouse_to_id
LEFT JOIN users u ON u.id = im.user_id;

-- 17.2. Vista de órdenes de compra con estado
CREATE OR REPLACE VIEW vw_purchase_status AS
SELECT
  p.id, p.purchase_number, s.name AS supplier_name, p.status,
  CASE p.status
    WHEN 'draft' THEN 'Borrador'
    WHEN 'pending' THEN 'Pendiente de Aprobación'
    WHEN 'approved' THEN 'Aprobada'
    WHEN 'sent_to_supplier' THEN 'Enviada al Proveedor'
    WHEN 'in_transit' THEN 'En Tránsito'
    WHEN 'partially_received' THEN 'Recibida Parcialmente'
    WHEN 'received' THEN 'Recibida'
    WHEN 'in_inspection' THEN 'En Inspección'
    WHEN 'inspected' THEN 'Inspeccionada'
    WHEN 'approved_quality' THEN 'Aprobada en Calidad'
    WHEN 'rejected_quality' THEN 'Rechazada en Calidad'
    WHEN 'entered_inventory' THEN 'Ingresada al Inventario'
    WHEN 'closed' THEN 'Cerrada'
    WHEN 'cancelled' THEN 'Cancelada'
    ELSE p.status
  END AS status_label,
  p.total, p.expected_date, p.received_date, p.created_at,
  u.name AS created_by_name, p.approved_by, p.entered_inventory_at,
  CASE
    WHEN p.status IN ('entered_inventory', 'closed') THEN 'Completada'
    WHEN p.status = 'cancelled' THEN 'Cancelada'
    WHEN p.status IN ('draft', 'pending', 'approved') THEN 'Pendiente'
    WHEN p.status IN ('sent_to_supplier', 'in_transit', 'partially_received', 'received') THEN 'En Proceso'
    WHEN p.status IN ('in_inspection', 'inspected', 'approved_quality', 'rejected_quality') THEN 'En Inspección'
    ELSE 'Desconocido'
  END AS progress_status
FROM purchases p
LEFT JOIN suppliers s ON s.id = p.supplier_id
LEFT JOIN users u ON u.id = p.user_id;

-- 17.3. Vista de ventas con estado detallado
CREATE OR REPLACE VIEW vw_sale_status AS
SELECT
  s.id, s.sale_number, c.name AS client_name, s.status,
  CASE s.status
    WHEN 'pending' THEN 'Pendiente de Pago'
    WHEN 'confirmed' THEN 'Confirmada'
    WHEN 'preparing' THEN 'En Preparación'
    WHEN 'shipped' THEN 'Despachada'
    WHEN 'delivered' THEN 'Entregada'
    WHEN 'completed' THEN 'Completada'
    WHEN 'cancelled' THEN 'Cancelada'
    WHEN 'refunded' THEN 'Reembolsada'
    WHEN 'partially_refunded' THEN 'Reembolso Parcial'
    ELSE s.status
  END AS status_label,
  s.total, s.payment_method, s.payment_status, s.source,
  s.created_at, s.confirmed_at, s.delivered_at,
  u.name AS seller_name,
  CASE
    WHEN s.status IN ('completed', 'delivered') THEN 'Finalizada'
    WHEN s.status IN ('cancelled', 'refunded') THEN 'Cancelada'
    WHEN s.status = 'pending' THEN 'Pendiente'
    WHEN s.status IN ('confirmed', 'preparing', 'shipped') THEN 'En Proceso'
    ELSE 'Desconocido'
  END AS progress_status
FROM sales s
LEFT JOIN clients c ON c.id = s.client_id
LEFT JOIN users u ON u.id = s.user_id;

-- 17.4. Vista de facturas fiscales
CREATE OR REPLACE VIEW vw_fiscal_invoices AS
SELECT
  i.id, i.invoice_number, i.ncf,
  fdt.code AS fiscal_code, fdt.name AS fiscal_type_name,
  i.invoice_type, i.client_name,
  i.client_document_type, i.client_document_number,
  i.subtotal, i.tax, i.discount, i.total,
  i.status, i.paid_at, i.due_date, i.created_at,
  s.sale_number, s.status AS sale_status,
  u.name AS created_by_name,
  ti.ruc AS company_ruc, ti.business_name AS company_name
FROM invoices i
LEFT JOIN fiscal_document_types fdt ON fdt.id = i.fiscal_document_type_id
LEFT JOIN sales s ON s.id = i.sale_id
LEFT JOIN users u ON u.id = i.user_id
CROSS JOIN taxpayer_info ti
WHERE ti.is_active = true;

-- 17.5. Vista de inventario disponible
CREATE OR REPLACE VIEW vw_available_inventory AS
SELECT
  p.id AS product_id, p.name AS product_name, p.sku, p.barcode,
  p.price, p.cost_price, p.brand_id, b.name AS brand_name,
  p.category_id, c.name AS category_name,
  i.warehouse_id, w.name AS warehouse_name,
  i.stock, i.reserved, i.available,
  i.avg_cost, i.last_cost,
  i.lot, i.serial_number, i.expiry_date, i.location,
  (i.available > 0) AS is_available,
  (i.available <= p.min_stock) AS is_low_stock,
  (i.available = 0) AS is_out_of_stock
FROM products p
LEFT JOIN brands b ON b.id = p.brand_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN inventory i ON i.product_id = p.id
LEFT JOIN warehouses w ON w.id = i.warehouse_id
WHERE p.available_for_sale = true
  AND (i.available > 0 OR p.is_catalog_only = true);

-- 17.6. Vista de Dashboard - KPIs
CREATE OR REPLACE VIEW vw_dashboard_kpi AS
SELECT
  (SELECT COUNT(*) FROM products WHERE status = 'published') AS total_products,
  (SELECT COUNT(*) FROM products WHERE status = 'published' AND is_catalog_only = false) AS total_inventory_products,
  (SELECT COUNT(*) FROM clients WHERE is_active = true) AS total_clients,
  (SELECT COUNT(*) FROM suppliers WHERE is_active = true) AS total_suppliers,
  (SELECT COUNT(*) FROM sales WHERE status IN ('confirmed', 'preparing', 'shipped', 'delivered', 'completed')) AS total_active_sales,
  (SELECT COUNT(*) FROM purchases WHERE status IN ('pending', 'approved', 'sent_to_supplier', 'in_transit')) AS total_pending_purchases,
  (SELECT COUNT(*) FROM inventory WHERE available <= min_stock AND available > 0) AS low_stock_products,
  (SELECT COUNT(*) FROM inventory WHERE available = 0 AND is_active = true) AS out_of_stock_products,
  COALESCE((SELECT SUM(available * avg_cost) FROM inventory WHERE is_active = true), 0) AS inventory_value,
  COALESCE((SELECT SUM(total) FROM sales WHERE created_at >= CURRENT_DATE), 0) AS sales_today,
  COALESCE((SELECT SUM(total) FROM sales WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0) AS sales_month;

-- ============================================================
-- 18. ÍNDICES
-- ============================================================

-- Productos
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available_for_sale) WHERE available_for_sale = true;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku != '';
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode != '';

-- Inventario
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(available) WHERE available > 0;
CREATE INDEX IF NOT EXISTS idx_inventory_lot ON inventory(lot);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse ON inventory(product_id, warehouse_id);

-- Compras
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);

-- Recepción
CREATE INDEX IF NOT EXISTS idx_goods_receipts_purchase ON goods_receipts(purchase_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_status ON goods_receipts(status);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_received ON goods_receipts(received_by);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_receipt ON goods_receipt_items(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_product ON goods_receipt_items(product_id);

-- Inspección
CREATE INDEX IF NOT EXISTS idx_quality_inspections_receipt ON quality_inspections(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_status ON quality_inspections(status);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_inspector ON quality_inspections(inspected_by);
CREATE INDEX IF NOT EXISTS idx_quality_inspection_items_inspection ON quality_inspection_items(quality_inspection_id);

-- Ventas
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_source ON sales(source);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- Checkout
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_client ON checkout_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_session ON checkout_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_items_session ON checkout_items(checkout_session_id);

-- Facturación
CREATE INDEX IF NOT EXISTS idx_invoices_ncf ON invoices(ncf) WHERE ncf != '';
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_document ON invoices(fiscal_document_type_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sale ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_dates ON ncf_sequences(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_active ON ncf_sequences(is_active) WHERE is_active = true;

-- Devoluciones
CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON return_items(product_id);

-- Reservas
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_active ON inventory_reservations(status, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product ON inventory_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_session ON inventory_reservations(checkout_session_id);

-- Movimientos
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);

-- Auditoría
CREATE INDEX IF NOT EXISTS idx_audit_field_changes_log ON audit_field_changes(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Contabilidad
CREATE INDEX IF NOT EXISTS idx_accounting_entries_company ON accounting_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_date ON accounting_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_entry_items_entry ON accounting_entry_items(accounting_entry_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entry_items_account ON accounting_entry_items(account_plan_id);

-- Precios
CREATE INDEX IF NOT EXISTS idx_price_list_items_list ON price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_product ON price_list_items(product_id);

-- ============================================================
-- 19. DATOS INICIALES (Seed)
-- ============================================================

-- Tipos de documentos fiscales (República Dominicana)
INSERT INTO fiscal_document_types (code, name, type, prefix) VALUES
  ('01', 'Factura de Consumo', 'consumer_final', 'E31'),
  ('02', 'Factura de Crédito Fiscal', 'credit_fiscal', 'B01'),
  ('03', 'Factura Gubernamental', 'governmental', 'G01'),
  ('04', 'Factura para Regímenes Especiales', 'special', 'R01'),
  ('05', 'Factura de Exportación', 'export', 'E32'),
  ('11', 'Nota de Crédito', 'credit_note', 'N31'),
  ('12', 'Nota de Débito', 'debit_note', 'D31'),
  ('13', 'Anulación', 'cancellation', 'A31')
ON CONFLICT (code) DO NOTHING;

-- Almacén principal por defecto
INSERT INTO warehouses (code, name, is_main)
SELECT 'WH-MAIN', 'Almacén Principal', true
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code = 'WH-MAIN');

-- Asignar almacén principal al inventario existente
UPDATE inventory SET warehouse_id = (SELECT id FROM warehouses WHERE is_main LIMIT 1)
WHERE warehouse_id IS NULL;

-- Métodos de pago por defecto
INSERT INTO payment_methods (code, name, type, requires_reference) VALUES
  ('cash', 'Efectivo', 'cash', false),
  ('card_debit', 'Tarjeta de Débito', 'card', true),
  ('card_credit', 'Tarjeta de Crédito', 'card', true),
  ('transfer', 'Transferencia Bancaria', 'transfer', true),
  ('check', 'Cheque', 'check', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- NOTA: Toda la lógica de negocio (aprobaciones, flujos,
-- actualización de inventario, generación de facturas, etc.)
-- se ejecuta desde los servicios Node.js.
-- Supabase solo proporciona la capa de datos.
-- ============================================================

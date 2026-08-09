-- ============================================================================
-- MIGRATION 032: STANDARDIZED SCHEMA — MULTI-TENANT + NCF + COMPLETO
-- ============================================================================
-- Fecha: 2026-07-24
-- Propósito: Migración MAESTRA que consolida TODO el esquema estandarizado:
--   ✅ Multi-tenant: company_id en TODAS las tablas de negocio
--   ✅ NCF fiscal: fiscal_document_types + ncf_sequences + triggers
--   ✅ Helper functions: get_company_id(), get_user_id(), get_user_role()
--   ✅ Backfill: empresa default para datos existentes
--   ✅ Índices: optimizados para queries multi-tenant
--   ✅ RLS policies: aislamiento completo por empresa
--   ✅ Triggers: auto-assign company_id + auto-generar NCF
--   ✅ Vistas: company_context, verification queries
--   ✅ Seeds: DGII fiscal types + default NCF sequences
--
-- FIX: Funciones helper en schema public (no auth) para compatibilidad con Supabase
-- Aplicar en: Supabase SQL Editor → Nuevo Query → Pegar todo → Run
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HELPER FUNCTIONS — public.* para multi-tenancy
-- ============================================================================
-- IMPORTANTE: En Supabase, el esquema 'auth' es administrado por Supabase Auth.
-- No se pueden crear funciones ahí. Usamos 'public' en su lugar.

-- 1.1. Obtener company_id del JWT (con fallback a empresa default)
CREATE OR REPLACE FUNCTION public.get_company_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 1.2. Obtener user_id del JWT
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid,
    (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 1.3. Obtener role del JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role',
    'anonymous'
  )::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

RAISE NOTICE '✅ Helper functions created: get_company_id(), get_user_id(), get_user_role()';


-- ============================================================================
-- 2. EMPRESA DEFAULT — Garantizar que existe la empresa 00000000...
-- ============================================================================

INSERT INTO companies (id, name, slug, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Empresa Default', 'default', true)
ON CONFLICT (id) DO NOTHING;

RAISE NOTICE '✅ Empresa default verificada';


-- ============================================================================
-- 3. ADD company_id — Todas las tablas de negocio que lo necesitan
-- ============================================================================

-- 3.0. USERS (tabla central)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id') THEN
    ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ users: company_id added';
  ELSE
    RAISE NOTICE '⏭️ users: company_id already exists';
  END IF;
END $$;

-- 3.1. TABLAS DE VENTAS
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sale_payments' AND column_name = 'company_id') THEN
    ALTER TABLE sale_payments ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ sale_payments: company_id added';
  ELSE RAISE NOTICE '⏭️ sale_payments: company_id already exists'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'product_price_history' AND column_name = 'company_id') THEN
    ALTER TABLE product_price_history ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ product_price_history: company_id added';
  ELSE RAISE NOTICE '⏭️ product_price_history: company_id already exists'; END IF;
END $$;

-- 3.2. TABLAS DE CUPONES
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupon_products' AND column_name = 'company_id') THEN
    ALTER TABLE coupon_products ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ coupon_products: company_id added';
  ELSE RAISE NOTICE '⏭️ coupon_products: company_id already exists'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupon_categories' AND column_name = 'company_id') THEN
    ALTER TABLE coupon_categories ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ coupon_categories: company_id added';
  ELSE RAISE NOTICE '⏭️ coupon_categories: company_id already exists'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupon_usage' AND column_name = 'company_id') THEN
    ALTER TABLE coupon_usage ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ coupon_usage: company_id added';
  ELSE RAISE NOTICE '⏭️ coupon_usage: company_id already exists'; END IF;
END $$;

-- 3.3. TABLAS DE PROMOCIONES
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'promotion_products' AND column_name = 'company_id') THEN
    ALTER TABLE promotion_products ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ promotion_products: company_id added';
  ELSE RAISE NOTICE '⏭️ promotion_products: company_id already exists'; END IF;
END $$;

-- 3.4. TABLAS DE EMAIL
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_logs' AND column_name = 'company_id') THEN
    ALTER TABLE email_logs ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ email_logs: company_id added';
  ELSE RAISE NOTICE '⏭️ email_logs: company_id already exists'; END IF;
END $$;

-- 3.5. TABLAS CONTABLES
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'accounting_entry_items' AND column_name = 'company_id') THEN
    ALTER TABLE accounting_entry_items ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ accounting_entry_items: company_id added';
  ELSE RAISE NOTICE '⏭️ accounting_entry_items: company_id already exists'; END IF;
END $$;

-- 3.6. TABLAS DE DEVOLUCIONES
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'return_items' AND column_name = 'company_id') THEN
    ALTER TABLE return_items ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ return_items: company_id added';
  ELSE RAISE NOTICE '⏭️ return_items: company_id already exists'; END IF;
END $$;

-- 3.7. TABLAS DE CHECKOUT (ECOMMERCE)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'company_id') THEN
    ALTER TABLE checkout_sessions ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ checkout_sessions: company_id added';
  ELSE RAISE NOTICE '⏭️ checkout_sessions: company_id already exists'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'checkout_items' AND column_name = 'company_id') THEN
    ALTER TABLE checkout_items ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ checkout_items: company_id added';
  ELSE RAISE NOTICE '⏭️ checkout_items: company_id already exists'; END IF;
END $$;

-- 3.8. TABLAS DE ENVÍO
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'shipping_methods' AND column_name = 'company_id') THEN
    ALTER TABLE shipping_methods ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ shipping_methods: company_id added';
  ELSE RAISE NOTICE '⏭️ shipping_methods: company_id already exists'; END IF;
END $$;

-- 3.9. TABLAS DE CONFIGURACIÓN (singleton → multi-tenant)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ecommerce_settings' AND column_name = 'company_id') THEN
    ALTER TABLE ecommerce_settings ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ ecommerce_settings: company_id added';
  ELSE RAISE NOTICE '⏭️ ecommerce_settings: company_id already exists'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'hero_settings' AND column_name = 'company_id') THEN
    ALTER TABLE hero_settings ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ hero_settings: company_id added';
  ELSE RAISE NOTICE '⏭️ hero_settings: company_id already exists'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_config' AND column_name = 'company_id') THEN
    ALTER TABLE whatsapp_config ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ whatsapp_config: company_id added';
  ELSE RAISE NOTICE '⏭️ whatsapp_config: company_id already exists'; END IF;
END $$;

-- 3.10. TABLAS DE NOTIFICACIONES
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notification_channels' AND column_name = 'company_id') THEN
    ALTER TABLE notification_channels ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ notification_channels: company_id added';
  ELSE RAISE NOTICE '⏭️ notification_channels: company_id already exists'; END IF;
END $$;

-- 3.11. TABLAS DE ALMACÉN
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'company_id') THEN
    ALTER TABLE warehouse_locations ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ warehouse_locations: company_id added';
  ELSE RAISE NOTICE '⏭️ warehouse_locations: company_id already exists'; END IF;
END $$;

-- 3.12. NOTAS DE CRÉDITO
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'credit_note_items' AND column_name = 'company_id') THEN
    ALTER TABLE credit_note_items ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ credit_note_items: company_id added';
  ELSE RAISE NOTICE '⏭️ credit_note_items: company_id already exists'; END IF;
END $$;


-- ============================================================================
-- 4. BACKFILL — Asignar empresa default a TODOS los datos existentes
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  tables_to_backfill TEXT[] := ARRAY[
    'users',
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories',
    'coupon_usage', 'promotion_products', 'email_logs', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'ecommerce_settings', 'hero_settings', 'whatsapp_config', 'notification_channels',
    'warehouse_locations', 'credit_note_items',
    'products', 'product_variants', 'categories', 'inventory', 'inventory_movements',
    'suppliers', 'purchases', 'purchase_items', 'sales', 'sale_items',
    'invoices', 'clients', 'offers', 'ecommerce_banners', 'hero_slides',
    'floating_banners', 'product_reviews', 'user_notifications',
    'carts', 'cart_items', 'brands', 'price_lists', 'price_list_items',
    'product_attributes', 'product_attribute_values', 'product_relations',
    'warehouses', 'goods_receipts', 'goods_receipt_items',
    'quality_inspections', 'quality_inspection_items', 'returns',
    'taxpayer_info', 'account_plans', 'accounting_entries',
    'coupons', 'inventory_lots', 'inventory_serials', 'inventory_reservations',
    'inventory_fifo_layers', 'cash_registers', 'cash_register_sessions',
    'cash_movements', 'credit_notes', 'wishlist_items', 'system_configurations',
    'branches', 'inventory_ledger', 'payment_transactions'
  ];
  v_count INTEGER;
BEGIN
  FOREACH t IN ARRAY tables_to_backfill LOOP
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'company_id') THEN
      EXECUTE format(
        'UPDATE %I SET company_id = ''00000000-0000-0000-0000-000000000001''::uuid WHERE company_id IS NULL',
        t
      );
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        RAISE NOTICE '🔄 %: % rows backfilled', t, v_count;
      END IF;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 5. INDEXES — Para performance de queries multi-tenant
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  tables_to_index TEXT[] := ARRAY[
    'users',
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories',
    'coupon_usage', 'promotion_products', 'email_logs', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'ecommerce_settings', 'hero_settings', 'whatsapp_config', 'notification_channels',
    'warehouse_locations', 'credit_note_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_index LOOP
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'company_id') THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_company ON %I(company_id)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

RAISE NOTICE '✅ Multi-tenant indexes created';


-- ============================================================================
-- 6. UNIQUE CONSTRAINTS — Para singletons por empresa
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'ecommerce_settings_company_unique') THEN
    ALTER TABLE ecommerce_settings ADD CONSTRAINT ecommerce_settings_company_unique UNIQUE (company_id);
    RAISE NOTICE '✅ ecommerce_settings: UNIQUE(company_id)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'hero_settings_company_unique') THEN
    ALTER TABLE hero_settings ADD CONSTRAINT hero_settings_company_unique UNIQUE (company_id);
    RAISE NOTICE '✅ hero_settings: UNIQUE(company_id)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'whatsapp_config_company_unique') THEN
    ALTER TABLE whatsapp_config ADD CONSTRAINT whatsapp_config_company_unique UNIQUE (company_id);
    RAISE NOTICE '✅ whatsapp_config: UNIQUE(company_id)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 7. NOT NULL CONSTRAINTS — company_id nunca NULL en tablas de negocio
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  tables_nn TEXT[] := ARRAY[
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories',
    'coupon_usage', 'promotion_products', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items',
    'credit_note_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables_nn LOOP
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = t AND column_name = 'company_id' AND is_nullable = 'YES'
    ) THEN
      EXECUTE format(
        'UPDATE %I SET company_id = ''00000000-0000-0000-0000-000000000001''::uuid WHERE company_id IS NULL',
        t
      );
      EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', t);
      RAISE NOTICE '✅ %: company_id SET NOT NULL', t;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 8. TRIGGER: auto_assign_company_id — Asigna empresa desde JWT al INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_company_id()
RETURNS TRIGGER AS $$
DECLARE
  jwt_company_id UUID;
BEGIN
  IF NEW.company_id IS NULL THEN
    BEGIN
      jwt_company_id := (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid;
      IF jwt_company_id IS NOT NULL THEN
        NEW.company_id := jwt_company_id;
      ELSE
        NEW.company_id := '00000000-0000-0000-0000-000000000001'::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NEW.company_id := '00000000-0000-0000-0000-000000000001'::uuid;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
  t TEXT;
  tables_with_trigger TEXT[] := ARRAY[
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories',
    'coupon_usage', 'promotion_products', 'email_logs', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'notification_channels', 'warehouse_locations', 'credit_note_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_trigger LOOP
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'company_id') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_company_id ON %I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_auto_company_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION public.auto_assign_company_id()',
        t
      );
    END IF;
  END LOOP;
END $$;

RAISE NOTICE '✅ auto_assign_company_id trigger created on all business tables';


-- ============================================================================
-- 9. FACTURACIÓN FISCAL — fiscal_document_types + ncf_sequences
-- ============================================================================

-- 9.1. Tipos de comprobante fiscal (DGII República Dominicana)
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

-- 9.2. Secuencias NCF por empresa
CREATE TABLE IF NOT EXISTS ncf_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  UNIQUE(company_id, fiscal_document_type_id, serie, branch)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'ncf_sequences_company_type_unique') THEN
    ALTER TABLE ncf_sequences ADD CONSTRAINT ncf_sequences_company_type_unique UNIQUE (company_id, prefix, branch);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9.3. Columnas fiscales en invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS ncf VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS ncf_sequence_id UUID REFERENCES ncf_sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_document_type_id UUID REFERENCES fiscal_document_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_document_type VARCHAR(20) DEFAULT '' CHECK (client_document_type IN ('', 'RNC', 'CEDULA', 'PASAPORTE')),
  ADD COLUMN IF NOT EXISTS client_document_number VARCHAR(50) DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_name VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_phone VARCHAR(30) DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_email VARCHAR(255) DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(30) DEFAULT 'consumer_final',
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
  ADD COLUMN IF NOT EXISTS electronic_status VARCHAR(30) DEFAULT 'pending';

-- Migrar datos de clientes
UPDATE invoices i
SET
  client_name = COALESCE(c.name, ''),
  client_document_number = COALESCE(c.document_number, ''),
  client_email = COALESCE(c.email, ''),
  client_phone = COALESCE(c.phone, '')
FROM clients c
WHERE i.client_id = c.id AND (i.client_name IS NULL OR i.client_name = '');

-- 9.4. Índices para NCF
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_company ON ncf_sequences(company_id);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_fiscal_type ON ncf_sequences(fiscal_document_type_id);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_active ON ncf_sequences(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_dates ON ncf_sequences(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_ncf_sequences_branch ON ncf_sequences(branch);
CREATE INDEX IF NOT EXISTS idx_invoices_ncf ON invoices(ncf) WHERE ncf != '';
CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_type ON invoices(fiscal_document_type_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);

-- 9.5. Seed: Tipos de comprobante DGII
INSERT INTO fiscal_document_types (code, name, type, prefix, is_active, requires_identification) VALUES
  ('B01', 'Factura para Consumo Final',       'consumer_final',  'B01', true, false),
  ('B02', 'Credito Fiscal',                   'credit_fiscal',   'B02', true, true),
  ('B03', 'Gubernamental',                    'governmental',    'B03', true, true),
  ('B04', 'Regimenes Especiales',             'special',         'B04', true, true),
  ('B14', 'Exportaciones',                    'export',          'B14', true, true),
  ('B05', 'Nota de Credito',                  'credit_note',     'B05', true, true),
  ('B06', 'Nota de Debito',                   'debit_note',      'B06', true, true),
  ('B07', 'Comprobante de Anulacion',         'cancellation',    'B07', true, true)
ON CONFLICT (code) DO NOTHING;

RAISE NOTICE '✅ fiscal_document_types: DGII seeds inserted';

-- 9.6. Secuencias NCF para Empresa Default (8 tipos x 25M cada uno)
DO $$
DECLARE
  v_company_id UUID := '00000000-0000-0000-0000-000000000001';
  v_fiscal_type RECORD;
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  FOR v_fiscal_type IN SELECT id, code, prefix, name FROM fiscal_document_types WHERE is_active = true
  LOOP
    INSERT INTO ncf_sequences (
      company_id, fiscal_document_type_id, serie, prefix,
      current_number, max_number, valid_from, valid_to, is_active, branch
    ) VALUES (
      v_company_id, v_fiscal_type.id, v_fiscal_type.code, v_fiscal_type.prefix,
      0, 25000000,
      MAKE_DATE(v_year, 1, 1),
      MAKE_DATE(v_year, 12, 31),
      true, ''
    )
    ON CONFLICT (company_id, fiscal_document_type_id, serie, branch) DO NOTHING;

    RAISE NOTICE '✅ Secuencia NCF % (%) -> empresa default', v_fiscal_type.code, v_fiscal_type.name;
  END LOOP;
END $$;


-- ============================================================================
-- 10. FUNCIÓN: fn_get_next_ncf — Obtener siguiente NCF (atómica)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_next_ncf(
  p_fiscal_document_type_id UUID,
  p_branch VARCHAR(100) DEFAULT '',
  p_company_id UUID DEFAULT NULL
)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_sequence RECORD;
  v_ncf VARCHAR(50);
  v_next_number INTEGER;
BEGIN
  SELECT * INTO v_sequence
  FROM ncf_sequences
  WHERE fiscal_document_type_id = p_fiscal_document_type_id
    AND branch = p_branch
    AND (p_company_id IS NULL OR company_id = p_company_id)
    AND is_active = true
    AND CURRENT_DATE BETWEEN valid_from AND valid_to
  ORDER BY company_id NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active NCF sequence for type % (branch: %)', p_fiscal_document_type_id, p_branch;
  END IF;

  IF v_sequence.current_number >= v_sequence.max_number THEN
    RAISE EXCEPTION 'NCF sequence % (%) reached limit (%)', v_sequence.prefix, v_sequence.serie, v_sequence.max_number;
  END IF;

  v_next_number := v_sequence.current_number + 1;

  UPDATE ncf_sequences
  SET current_number = v_next_number, updated_at = NOW()
  WHERE id = v_sequence.id;

  v_ncf := v_sequence.prefix || '-' || LPAD(v_next_number::TEXT, 8, '0');
  RETURN v_ncf;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '✅ fn_get_next_ncf: function created';


-- ============================================================================
-- 11. TRIGGER: auto_generate_ncf — Asigna NCF automáticamente al INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_generate_ncf()
RETURNS TRIGGER AS $$
DECLARE
  v_seq RECORD;
  v_ncf TEXT;
BEGIN
  IF NEW.ncf IS NULL OR NEW.ncf = '' THEN
    SELECT * INTO v_seq
    FROM ncf_sequences
    WHERE fiscal_document_type_id = NEW.fiscal_document_type_id
      AND branch = COALESCE(NEW.branch, '')
      AND (NEW.company_id IS NULL OR company_id = NEW.company_id)
      AND is_active = true
      AND CURRENT_DATE BETWEEN valid_from AND valid_to
      AND current_number < max_number
    ORDER BY company_id NULLS LAST
    LIMIT 1
    FOR UPDATE;

    IF v_seq IS NOT NULL THEN
      UPDATE ncf_sequences
      SET current_number = current_number + 1, updated_at = NOW()
      WHERE id = v_seq.id;

      v_ncf := v_seq.prefix || '-' || LPAD((v_seq.current_number + 1)::TEXT, 8, '0');
      NEW.ncf := v_ncf;
      NEW.ncf_sequence_id := v_seq.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_ncf ON invoices;
CREATE TRIGGER trg_auto_ncf
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_ncf();

RAISE NOTICE '✅ trg_auto_ncf: trigger created on invoices';


-- ============================================================================
-- 12. RLS POLICIES — Aislamiento completo por empresa
-- ============================================================================
-- IMPORTANTE: Usa get_company_id() y get_user_role() del esquema public

-- 12.1. Habilitar RLS
DO $$
DECLARE
  t TEXT;
  all_tables TEXT[] := ARRAY[
    'users',
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories',
    'coupon_usage', 'promotion_products', 'email_logs', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'ecommerce_settings', 'hero_settings', 'whatsapp_config', 'notification_channels',
    'warehouse_locations', 'credit_note_items',
    'fiscal_document_types', 'ncf_sequences'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

RAISE NOTICE '✅ RLS enabled on all business tables';

-- 12.2. Policies — SELECT/INSERT/UPDATE/DELETE por empresa
DO $$
DECLARE
  t TEXT;
  tables_rls TEXT[] := ARRAY[
    'users',
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories',
    'coupon_usage', 'promotion_products', 'email_logs', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'ecommerce_settings', 'hero_settings', 'whatsapp_config', 'notification_channels',
    'warehouse_locations', 'credit_note_items',
    'ncf_sequences'
  ];
BEGIN
  FOREACH t IN ARRAY tables_rls LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      -- SELECT
      EXECUTE format('DROP POLICY IF EXISTS %s_select ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY %s_select ON %I FOR SELECT TO authenticated USING (get_user_role() IN (''admin'', ''employee'') AND get_company_id() = company_id)',
        t, t
      );
      -- INSERT
      EXECUTE format('DROP POLICY IF EXISTS %s_insert ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY %s_insert ON %I FOR INSERT TO authenticated WITH CHECK (get_user_role() IN (''admin'', ''employee'') AND get_company_id() = company_id)',
        t, t
      );
      -- UPDATE
      EXECUTE format('DROP POLICY IF EXISTS %s_update ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY %s_update ON %I FOR UPDATE TO authenticated USING (get_user_role() IN (''admin'', ''employee'') AND get_company_id() = company_id)',
        t, t
      );
      -- DELETE (admin only)
      EXECUTE format('DROP POLICY IF EXISTS %s_delete ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY %s_delete ON %I FOR DELETE TO authenticated USING (get_user_role() = ''admin'' AND get_company_id() = company_id)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- 12.3. Policy especial: fiscal_document_types — Solo lectura para todos
DROP POLICY IF EXISTS fiscal_document_types_select ON fiscal_document_types;
CREATE POLICY fiscal_document_types_select ON fiscal_document_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS fiscal_document_types_insert ON fiscal_document_types;
CREATE POLICY fiscal_document_types_insert ON fiscal_document_types
  FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');

RAISE NOTICE '✅ RLS policies created for all business tables';


-- ============================================================================
-- 13. VISTA: company_context
-- ============================================================================

CREATE OR REPLACE VIEW public.company_context AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.slug AS company_slug,
  c.ruc,
  c.is_active
FROM companies c
WHERE c.is_active = true;


-- ============================================================================
-- 14. FUNCIÓN: set_company_context
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_company_context(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_company_id', p_company_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 15. VERIFICACIÓN FINAL
-- ============================================================================

DO $$ DECLARE
  t TEXT;
  missing TEXT := '';
  tables_required TEXT[] := ARRAY[
    'users', 'products', 'categories', 'inventory', 'inventory_movements',
    'suppliers', 'purchases', 'purchase_items', 'sales', 'sale_items', 'sale_payments',
    'invoices', 'clients', 'offers', 'ecommerce_banners', 'hero_slides',
    'floating_banners', 'product_reviews', 'user_notifications', 'carts', 'cart_items',
    'brands', 'warehouses', 'returns', 'return_items', 'ncf_sequences',
    'taxpayer_info', 'account_plans', 'accounting_entries', 'accounting_entry_items',
    'coupons', 'coupon_products', 'coupon_categories', 'coupon_usage',
    'cash_registers', 'credit_notes', 'credit_note_items', 'system_configurations',
    'branches', 'inventory_ledger', 'payment_transactions', 'ecommerce_settings',
    'hero_settings', 'whatsapp_config', 'email_logs', 'checkout_sessions',
    'checkout_items', 'shipping_methods', 'product_price_history',
    'promotion_products', 'notification_channels', 'warehouse_locations'
  ];
BEGIN
  FOREACH t IN ARRAY tables_required LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'company_id') THEN
        missing := missing || t || ', ';
      END IF;
    END IF;
  END LOOP;
  IF missing != '' THEN
    RAISE WARNING '⚠️ Tablas SIN company_id: %', missing;
  ELSE
    RAISE NOTICE '✅ TODAS las tablas de negocio tienen company_id';
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE '📊 fiscal_document_types: % registros', (SELECT COUNT(*) FROM fiscal_document_types);
  RAISE NOTICE '📊 ncf_sequences: % registros', (SELECT COUNT(*) FROM ncf_sequences);
  RAISE NOTICE '📊 companies: % registros', (SELECT COUNT(*) FROM companies);
END $$;

COMMIT;

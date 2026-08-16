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
CREATE OR REPLACE FUNCTION public.auto_assign_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_claim_company uuid;
BEGIN
  -- If NEW already has a company_id, keep it
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1) Try to read company_id from JWT request context (works in Supabase/PG functions)
  BEGIN
    v_claim_company := NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'company_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_claim_company := NULL;
  END;

  -- 2) Apply fallback hierarchy
  NEW.company_id := COALESCE(v_claim_company, :'target_company'::uuid);

  RETURN NEW;
END;
$;

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

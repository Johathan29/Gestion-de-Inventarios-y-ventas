-- ============================================================================
-- MIGRATION 031: MULTI-TENANT ARCHITECTURE
-- ============================================================================
-- Fecha: 2026-07-24
-- Propósito: Asegurar que TODAS las tablas de negocio tengan company_id
--           para aislamiento completo entre empresas (multi-tenant).
-- Riesgo: MEDIO (ALTER TABLE ADD COLUMN + UPDATE + FK)
-- Rollback: Ver sección al final
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HELPER FUNCTIONS — auth.* para multi-tenancy
-- ============================================================================
-- Estas funciones leen el JWT del usuario autenticado.
-- Se necesitan antes de crear RLS policies.

-- Función para obtener company_id del JWT
CREATE OR REPLACE FUNCTION auth.company_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Función para obtener user_id del JWT
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid,
    (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Función para obtener role del JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role',
    'anonymous'
  )::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 2. EMPRESA POR DEFECTO — Garantizar que existe una empresa default
-- ============================================================================

INSERT INTO companies (id, name, slug, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Empresa Default', 'default', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. ADD company_id TO MISSING TABLES — Grupo B del Audit
-- ============================================================================
-- Estas tablas necesitan company_id para multi-tenancy pero no lo tienen.

-- 3.0 USERS — Tabla central (un usuario puede pertecer a múltiples empresas)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id') THEN
    ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to users';
  END IF;
END $$;

-- 3.1 SALES — payment methods (pagos de ventas)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sale_payments' AND column_name = 'company_id') THEN
    ALTER TABLE sale_payments ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to sale_payments';
  END IF;
END $$;

-- 3.2 PRODUCT PRICE HISTORY
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'product_price_history' AND column_name = 'company_id') THEN
    ALTER TABLE product_price_history ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to product_price_history';
  END IF;
END $$;

-- 3.3 COUPON JUNCTION TABLES
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupon_products' AND column_name = 'company_id') THEN
    ALTER TABLE coupon_products ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to coupon_products';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupon_categories' AND column_name = 'company_id') THEN
    ALTER TABLE coupon_categories ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to coupon_categories';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'coupon_usage' AND column_name = 'company_id') THEN
    ALTER TABLE coupon_usage ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to coupon_usage';
  END IF;
END $$;

-- 3.4 PROMOTION PRODUCTS
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'promotion_products' AND column_name = 'company_id') THEN
    ALTER TABLE promotion_products ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to promotion_products';
  END IF;
END $$;

-- 3.5 EMAIL LOGS
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_logs' AND column_name = 'company_id') THEN
    ALTER TABLE email_logs ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to email_logs';
  END IF;
END $$;

-- 3.6 ACCOUNTING ENTRY ITEMS (líneas de asiento contable)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'accounting_entry_items' AND column_name = 'company_id') THEN
    ALTER TABLE accounting_entry_items ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to accounting_entry_items';
  END IF;
END $$;

-- 3.7 RETURN ITEMS (líneas de devolución)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'return_items' AND column_name = 'company_id') THEN
    ALTER TABLE return_items ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to return_items';
  END IF;
END $$;

-- 3.8 CHECKOUT SESSIONS (ecommerce checkout)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'company_id') THEN
    ALTER TABLE checkout_sessions ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to checkout_sessions';
  END IF;
END $$;

-- 3.9 CHECKOUT ITEMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'checkout_items' AND column_name = 'company_id') THEN
    ALTER TABLE checkout_items ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to checkout_items';
  END IF;
END $$;

-- 3.10 SHIPPING METHODS (métodos de envío por empresa)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'shipping_methods' AND column_name = 'company_id') THEN
    ALTER TABLE shipping_methods ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to shipping_methods';
  END IF;
END $$;

-- 3.11 ECOMMERCE SETTINGS (convertir singleton → multi-tenant)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ecommerce_settings' AND column_name = 'company_id') THEN
    ALTER TABLE ecommerce_settings ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to ecommerce_settings';
  END IF;
END $$;

-- 3.12 HERO SETTINGS (convertir singleton → multi-tenant)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'hero_settings' AND column_name = 'company_id') THEN
    ALTER TABLE hero_settings ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to hero_settings';
  END IF;
END $$;

-- 3.13 WHATSAPP CONFIG (convertir singleton → multi-tenant)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_config' AND column_name = 'company_id') THEN
    ALTER TABLE whatsapp_config ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to whatsapp_config';
  END IF;
END $$;

-- 3.14 NOTIFICATION CHANNELS (hijo de user_notifications)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notification_channels' AND column_name = 'company_id') THEN
    ALTER TABLE notification_channels ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to notification_channels';
  END IF;
END $$;

-- 3.15 WAREHOUSE LOCATIONS (hijo de warehouses)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'company_id') THEN
    ALTER TABLE warehouse_locations ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to warehouse_locations';
  END IF;
END $$;

-- 3.16 CREDIT NOTE ITEMS (hijo de credit_notes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'credit_note_items' AND column_name = 'company_id') THEN
    ALTER TABLE credit_note_items ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE '✅ Added company_id to credit_note_items';
  END IF;
END $$;


-- ============================================================================
-- 4. BACKFILL — Asignar empresa default a filas existentes sin company_id
-- ============================================================================

DO $$ DECLARE
  t TEXT;
  tables_to_backfill TEXT[] := ARRAY[
    'users',
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories',
    'coupon_usage', 'promotion_products', 'email_logs', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'ecommerce_settings', 'hero_settings', 'whatsapp_config', 'notification_channels',
    'warehouse_locations', 'credit_note_items',
    -- Tablas que pudieran tener NULL company_id del loop 026
    'products', 'product_variants', 'categories', 'inventory', 'inventory_movements',
    'suppliers', 'purchases', 'purchase_items', 'sales', 'sale_items',
    'invoices', 'clients', 'offers', 'ecommerce_banners', 'hero_slides',
    'floating_banners', 'product_reviews', 'user_notifications',
    'carts', 'cart_items', 'brands', 'price_lists', 'price_list_items',
    'product_attributes', 'product_attribute_values', 'product_relations',
    'warehouses', 'goods_receipts', 'goods_receipt_items',
    'quality_inspections', 'quality_inspection_items', 'returns',
    'ncf_sequences', 'taxpayer_info', 'account_plans', 'accounting_entries',
    'coupons', 'inventory_lots', 'inventory_serials', 'inventory_reservations',
    'inventory_fifo_layers', 'cash_registers', 'cash_register_sessions',
    'cash_movements', 'credit_notes', 'wishlist_items', 'system_configurations',
    'branches', 'inventory_ledger', 'payment_transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_backfill LOOP
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'company_id') THEN
      EXECUTE format(
        'UPDATE %I SET company_id = ''00000000-0000-0000-0000-000000000001''::uuid WHERE company_id IS NULL',
        t
      );
      RAISE NOTICE '🔄 Backfilled company_id in %', t;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 5. INDEXES — Para performance de queries multi-tenant
-- ============================================================================

DO $$ DECLARE
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
      RAISE NOTICE '✅ Created idx_%s_company', t;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 6. UNIQUE CONSTRAINTS — Para singletons por empresa
-- ============================================================================

-- ecommerce_settings: una config por empresa
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'ecommerce_settings_company_unique') THEN
    ALTER TABLE ecommerce_settings ADD CONSTRAINT ecommerce_settings_company_unique UNIQUE (company_id);
    RAISE NOTICE '✅ ecommerce_settings: UNIQUE(company_id)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- hero_settings: un hero activo por empresa
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'hero_settings_company_unique') THEN
    ALTER TABLE hero_settings ADD CONSTRAINT hero_settings_company_unique UNIQUE (company_id);
    RAISE NOTICE '✅ hero_settings: UNIQUE(company_id)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- whatsapp_config: una config por empresa
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'whatsapp_config_company_unique') THEN
    ALTER TABLE whatsapp_config ADD CONSTRAINT whatsapp_config_company_unique UNIQUE (company_id);
    RAISE NOTICE '✅ whatsapp_config: UNIQUE(company_id)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ncf_sequences: una secuencia por empresa+tipo
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'ncf_sequences_company_type_unique') THEN
    ALTER TABLE ncf_sequences ADD CONSTRAINT ncf_sequences_company_type_unique UNIQUE (company_id, ncf_type);
    RAISE NOTICE '✅ ncf_sequences: UNIQUE(company_id, ncf_type)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 7. NOT NULL CONSTRAINTS — company_id nunca puede ser NULL en tablas de negocio
-- ============================================================================

DO $$ DECLARE
  t TEXT;
  tables_nn TEXT[] := ARRAY[
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories',
    'coupon_usage', 'promotion_products', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items',
    'credit_note_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables_nn LOOP
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'company_id' AND is_nullable = 'YES') THEN
      -- Primero backfill por si acaso
      EXECUTE format(
        'UPDATE %I SET company_id = ''00000000-0000-0000-0000-000000000001''::uuid WHERE company_id IS NULL',
        t
      );
      EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', t);
      RAISE NOTICE '✅ %company_id SET NOT NULL', t;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 8. TRIGGER: Auto-assign company_id desde el contexto del JWT
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_assign_company_id()
RETURNS TRIGGER AS $$
DECLARE
  jwt_company_id UUID;
BEGIN
  -- Solo asignar si company_id es NULL y hay JWT activo
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

-- Aplicar trigger a tablas nuevas que necesitan auto-assign
DO $$ DECLARE
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
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_auto_company_id ON %I',
        t
      );
      EXECUTE format(
        'CREATE TRIGGER trg_auto_company_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id()',
        t
      );
      RAISE NOTICE '✅ Trigger trg_auto_company_id on %', t;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 9. RLS POLICIES — Para todas las tablas con company_id
-- ============================================================================

-- Habilitar RLS en tablas nuevas
DO $$ DECLARE
  t TEXT;
  tables_rls TEXT[] := ARRAY[
    'users',
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories', 
    'coupon_usage', 'promotion_products', 'email_logs', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'ecommerce_settings', 'hero_settings', 'whatsapp_config', 'notification_channels',
    'warehouse_locations', 'credit_note_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables_rls LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE '✅ RLS enabled on %', t;
    END IF;
  END LOOP;
END $$;

-- Policies: SELECT (admin + employee de la misma empresa)
DO $$ DECLARE
  t TEXT;
  tables_select TEXT[] := ARRAY[
    'users',
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories', 
    'coupon_usage', 'promotion_products', 'email_logs', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'ecommerce_settings', 'hero_settings', 'whatsapp_config', 'notification_channels',
    'warehouse_locations', 'credit_note_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables_select LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      -- SELECT policy
      EXECUTE format(
        'DROP POLICY IF EXISTS %s_select ON %I', t, t
      );
      EXECUTE format(
        'CREATE POLICY %s_select ON %I FOR SELECT TO authenticated USING (auth.user_role() IN (''admin'', ''employee'') AND auth.company_id() = company_id)',
        t, t
      );
      -- INSERT policy
      EXECUTE format(
        'DROP POLICY IF EXISTS %s_insert ON %I', t, t
      );
      EXECUTE format(
        'CREATE POLICY %s_insert ON %I FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN (''admin'', ''employee'') AND auth.company_id() = company_id)',
        t, t
      );
      -- UPDATE policy
      EXECUTE format(
        'DROP POLICY IF EXISTS %s_update ON %I', t, t
      );
      EXECUTE format(
        'CREATE POLICY %s_update ON %I FOR UPDATE TO authenticated USING (auth.user_role() IN (''admin'', ''employee'') AND auth.company_id() = company_id)',
        t, t
      );
      -- DELETE policy (admin only)
      EXECUTE format(
        'DROP POLICY IF EXISTS %s_delete ON %I', t, t
      );
      EXECUTE format(
        'CREATE POLICY %s_delete ON %I FOR DELETE TO authenticated USING (auth.user_role() = ''admin'' AND auth.company_id() = company_id)',
        t, t
      );
      RAISE NOTICE '✅ RLS policies on %', t;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 10. VIEW: company_context — Vista para obtener contexto de la empresa
-- ============================================================================

CREATE OR REPLACE VIEW company_context AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.slug AS company_slug,
  c.ruc,
  c.currency_code,
  c.tax_rate,
  c.timezone,
  c.locale,
  c.is_active,
  c.settings
FROM companies c
WHERE c.is_active = true;

COMMENT ON VIEW company_context IS 'Vista del contexto de la empresa activa. Usar para obtener datos de configuración.';


-- ============================================================================
-- 11. FUNCTION: set_company_context — Establecer contexto de empresa en la sesión
-- ============================================================================

CREATE OR REPLACE FUNCTION set_company_context(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_company_id', p_company_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_company_context IS 'Establece el company_id actual en la sesión de PostgreSQL. Llamar al inicio de cada request.';


-- ============================================================================
-- 12. VERIFICACIÓN FINAL — Queries de validación
-- ============================================================================

-- Verificar que todas las tablas de negocio tienen company_id
DO $$ DECLARE
  t TEXT;
  missing TEXT := '';
  tables_required TEXT[] := ARRAY[
    'products', 'product_variants', 'categories', 'inventory', 'inventory_movements',
    'suppliers', 'purchases', 'purchase_items', 'sales', 'sale_items', 'sale_payments',
    'invoices', 'clients', 'offers', 'ecommerce_banners', 'hero_slides',
    'floating_banners', 'product_reviews', 'user_notifications', 'carts', 'cart_items',
    'brands', 'price_lists', 'price_list_items', 'product_attributes',
    'product_attribute_values', 'product_relations', 'warehouses', 'goods_receipts',
    'goods_receipt_items', 'quality_inspections', 'quality_inspection_items',
    'returns', 'return_items', 'ncf_sequences', 'taxpayer_info', 'account_plans',
    'accounting_entries', 'accounting_entry_items', 'coupons', 'coupon_products',
    'coupon_categories', 'coupon_usage', 'inventory_lots', 'inventory_serials',
    'inventory_reservations', 'inventory_fifo_layers', 'cash_registers',
    'cash_register_sessions', 'cash_movements', 'credit_notes', 'credit_note_items',
    'wishlist_items', 'system_configurations', 'branches', 'inventory_ledger',
    'payment_transactions', 'ecommerce_settings', 'hero_settings', 'whatsapp_config',
    'email_logs', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'product_price_history', 'promotion_products', 'notification_channels',
    'warehouse_locations'
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


COMMIT;

-- ============================================================================
-- ROLLBACK STRATEGY
-- ============================================================================
-- Para revertir esta migración:
--
-- 1. Eliminar RLS policies:
--    DO $$ DECLARE t TEXT; arr TEXT[] := ARRAY['sale_payments',...]; BEGIN
--      FOREACH t IN ARRAY arr LOOP
--        EXECUTE format('DROP POLICY IF EXISTS %s_select ON %I', t, t);
--        EXECUTE format('DROP POLICY IF EXISTS %s_insert ON %I', t, t);
--        EXECUTE format('DROP POLICY IF EXISTS %s_update ON %I', t, t);
--        EXECUTE format('DROP POLICY IF EXISTS %s_delete ON %I', t, t);
--        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
--      END LOOP;
--    END $$;
--
-- 2. Eliminar triggers:
--    DO $$ DECLARE t TEXT; arr TEXT[] := ARRAY[...]; BEGIN
--      FOREACH t IN ARRAY arr LOOP
--        EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_company_id ON %I', t);
--      END LOOP;
--    END $$;
--
-- 3. Eliminar columnas company_id:
--    DO $$ DECLARE t TEXT; arr TEXT[] := ARRAY[...]; BEGIN
--      FOREACH t IN ARRAY arr LOOP
--        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS company_id', t);
--      END LOOP;
--    END $$;
--
-- 4. Eliminar funciones:
--    DROP FUNCTION IF EXISTS auto_assign_company_id();
--    DROP FUNCTION IF EXISTS set_company_context(UUID);
--    DROP VIEW IF EXISTS company_context;
--
-- 5. Eliminar constraints:
--    ALTER TABLE ecommerce_settings DROP CONSTRAINT IF EXISTS ecommerce_settings_company_unique;
--    ALTER TABLE hero_settings DROP CONSTRAINT IF EXISTS hero_settings_company_unique;
--    ALTER TABLE whatsapp_config DROP CONSTRAINT IF EXISTS whatsapp_config_company_unique;
--    ALTER TABLE ncf_sequences DROP CONSTRAINT IF EXISTS ncf_sequences_company_type_unique;
-- ============================================================================

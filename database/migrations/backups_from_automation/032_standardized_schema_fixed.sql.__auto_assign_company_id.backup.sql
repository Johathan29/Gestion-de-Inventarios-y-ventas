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
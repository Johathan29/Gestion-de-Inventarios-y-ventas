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

CREATE OR REPLACE FUNCTION fn_get_next_ncf(
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
  -- Buscar secuencia activa (FOR UPDATE para atomicidad)
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
    RAISE EXCEPTION 'No se encontró secuencia NCF activa para tipo % (sucursal: %)', p_fiscal_document_type_id, p_branch;
  END IF;

  IF v_sequence.current_number >= v_sequence.max_number THEN
    RAISE EXCEPTION 'Secuencia NCF % (%) alcanzó su límite (%)', v_sequence.prefix, v_sequence.serie, v_sequence.max_number;
  END IF;

  v_next_number := v_sequence.current_number + 1;

  UPDATE ncf_sequences
  SET current_number = v_next_number, updated_at = NOW()
  WHERE id = v_sequence.id;

  -- Formato: B01-00000001
  v_ncf := v_sequence.prefix || '-' || LPAD(v_next_number::TEXT, 8, '0');

  RETURN v_ncf;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '✅ fn_get_next_ncf: function created/replaced';


-- ============================================================================
-- 11. TRIGGER: auto_generate_ncf — Asigna NCF automáticamente al INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_generate_ncf()
RETURNS TRIGGER AS $$
DECLARE
  v_seq RECORD;
  v_ncf TEXT;
BEGIN
  -- Solo si no tiene NCF asignado
  IF NEW.ncf IS NULL OR NEW.ncf = '' THEN
    -- Buscar secuencia para el tipo de documento + empresa
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
  EXECUTE FUNCTION auto_generate_ncf();

RAISE NOTICE '✅ trg_auto_ncf: trigger created on invoices';


-- ============================================================================
-- 12. RLS POLICIES — Aislamiento completo por empresa
-- ============================================================================

-- 12.1. Habilitar RLS en todas las tablas de negocio
DO $$ DECLARE
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
      RAISE NOTICE '✅ RLS enabled: %', t;
    END IF;
  END LOOP;
END $$;

-- 12.2. Policies SELECT — admin + employee de la misma empresa
DO $$ DECLARE
  t TEXT;
  tables_select TEXT[] := ARRAY[
    'users',
    'sale_payments', 'product_price_history', 'coupon_products', 'coupon_categories',
    'coupon_usage', 'promotion_products', 'email_logs', 'accounting_entry_items',
    'return_items', 'checkout_sessions', 'checkout_items', 'shipping_methods',
    'ecommerce_settings', 'hero_settings', 'whatsapp_config', 'notification_channels',
    'warehouse_locations', 'credit_note_items',
    'ncf_sequences'
  ];
BEGIN
  FOREACH t IN ARRAY tables_select LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      -- SELECT
      EXECUTE format('DROP POLICY IF EXISTS %s_select ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY %s_select ON %I FOR SELECT TO authenticated USING (auth.user_role() IN (''admin'', ''employee'') AND auth.company_id() = company_id)',
        t, t
      );
      -- INSERT
      EXECUTE format('DROP POLICY IF EXISTS %s_insert ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY %s_insert ON %I FOR INSERT TO authenticated WITH CHECK (auth.user_role() IN (''admin'', ''employee'') AND auth.company_id() = company_id)',
        t, t
      );
      -- UPDATE
      EXECUTE format('DROP POLICY IF EXISTS %s_update ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY %s_update ON %I FOR UPDATE TO authenticated USING (auth.user_role() IN (''admin'', ''employee'') AND auth.company_id() = company_id)',
        t, t
      );
      -- DELETE (admin only)
      EXECUTE format('DROP POLICY IF EXISTS %s_delete ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY %s_delete ON %I FOR DELETE TO authenticated USING (auth.user_role() = ''admin'' AND auth.company_id() = company_id)',
        t, t
      );
      RAISE NOTICE '✅ RLS policies: %', t;
    END IF;
  END LOOP;
END $$;

-- 12.3. Policy especial: fiscal_document_types — Solo lectura para todos
DROP POLICY IF EXISTS fiscal_document_types_select ON fiscal_document_types;
CREATE POLICY fiscal_document_types_select ON fiscal_document_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS fiscal_document_types_insert ON fiscal_document_types;
CREATE POLICY fiscal_document_types_insert ON fiscal_document_types
  FOR INSERT TO authenticated WITH CHECK (auth.user_role() = 'admin');


-- ============================================================================
-- 13. VISTA: company_context — Datos de la empresa activa
-- ============================================================================

CREATE OR REPLACE VIEW company_context AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.slug AS company_slug,
  c.ruc,
  c.is_active
FROM companies c
WHERE c.is_active = true;

COMMENT ON VIEW company_context IS 'Vista del contexto de empresa activa. Filtra por company_id del JWT.';


-- ============================================================================
-- 14. FUNCIÓN: set_company_context — Establecer empresa en la sesión
-- ============================================================================

CREATE OR REPLACE FUNCTION set_company_context(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_company_id', p_company_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_company_context(UUID) IS 'Establece el company_id actual en la sesión PostgreSQL.';


-- ============================================================================
-- 15. VERIFICACIÓN FINAL — Queries de validación
-- ============================================================================

-- 15.1. Verificar que TODAS las tablas de negocio tienen company_id
DO $$ DECLARE
  t TEXT;
  missing TEXT := '';
  tables_required TEXT[] := ARRAY[
    'users', 'products', 'product_variants', 'categories', 'inventory', 'inventory_movements',
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

-- 15.2. Conteo de registros
DO $$ BEGIN
  RAISE NOTICE '📊 fiscal_document_types: % registros', (SELECT COUNT(*) FROM fiscal_document_types);
  RAISE NOTICE '📊 ncf_sequences: % registros', (SELECT COUNT(*) FROM ncf_sequences);
  RAISE NOTICE '📊 companies: % registros', (SELECT COUNT(*) FROM companies);
END $$;

-- 15.3. Verificar secuencias NCF por empresa
-- (Resultado visible en el panel de resultados de Supabase SQL Editor)
-- SELECT
--   c.name AS empresa,
--   fdt.code AS tipo_ncf,
--   fdt.name AS nombre,
--   ns.prefix,
--   ns.serie,
--   ns.current_number,
--   ns.max_number,
--   ns.valid_from,
--   ns.valid_to
-- FROM ncf_sequences ns
-- JOIN companies c ON c.id = ns.company_id
-- JOIN fiscal_document_types fdt ON fdt.id = ns.fiscal_document_type_id
-- ORDER BY c.name, fdt.code;


COMMIT;

-- ============================================================================
-- ROLLBACK STRATEGY
-- ============================================================================
-- Para revertir esta migración ejecutar en orden:
--
-- 1. Eliminar RLS policies:
--    DO $$ DECLARE t TEXT; arr TEXT[] := ARRAY[
--      'users','sale_payments','product_price_history','coupon_products','coupon_categories',
--      'coupon_usage','promotion_products','email_logs','accounting_entry_items',
--      'return_items','checkout_sessions','checkout_items','shipping_methods',
--      'ecommerce_settings','hero_settings','whatsapp_config','notification_channels',
--      'warehouse_locations','credit_note_items','ncf_sequences'
--    ]; BEGIN
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
--    DROP TRIGGER IF EXISTS trg_auto_ncf ON invoices;
--    DO $$ DECLARE t TEXT; arr TEXT[] := ARRAY[
--      'sale_payments','product_price_history','coupon_products','coupon_categories',
--      'coupon_usage','promotion_products','email_logs','accounting_entry_items',
--      'return_items','checkout_sessions','checkout_items','shipping_methods',
--      'notification_channels','warehouse_locations','credit_note_items'
--    ]; BEGIN
--      FOREACH t IN ARRAY arr LOOP
--        EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_company_id ON %I', t);
--      END LOOP;
--    END $$;
--
-- 3. Eliminar funciones:
--    DROP FUNCTION IF EXISTS auto_assign_company_id();
--    DROP FUNCTION IF EXISTS auto_generate_ncf();
--    DROP FUNCTION IF EXISTS fn_get_next_ncf(UUID, VARCHAR, UUID);
--    DROP FUNCTION IF EXISTS set_company_context(UUID);
--    DROP VIEW IF EXISTS company_context;
--
-- 4. Eliminar columnas company_id (invertir paso 3):
--    DO $$ DECLARE t TEXT; arr TEXT[] := ARRAY[...]; BEGIN
--      FOREACH t IN ARRAY arr LOOP
--        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS company_id', t);
--      END LOOP;
--    END $$;
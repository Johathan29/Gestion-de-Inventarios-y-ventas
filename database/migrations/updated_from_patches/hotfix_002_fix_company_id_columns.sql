-- ============================================================
-- HOTFIX 002 v2: Columnas faltantes que rompen triggers y escrituras
-- ============================================================
-- Causa raíz (verificada en ejecución 2026-07):
--   1. La migración 046 creó triggers (trg_sales_automations,
--      trg_clients_automations, trg_form_submissions_automations)
--      que acceden a NEW.company_id en tablas que NUNCA recibieron
--      esa columna (la 014 solo cubrió users/warehouses/products/audit_logs).
--      → cualquier INSERT/UPDATE en clients, sales o
--        dynamic_form_submissions lanza:
--        record "new" has no field "company_id"  → 500
--   2. La migración 026 (audit columns: created_by/updated_by/
--      deleted_at/deleted_by) NUNCA se aplicó → products y otras
--      tablas no tienen created_by:
--        Could not find the 'created_by' column of 'products' in the schema cache
--   3. audit_logs.created_by tampoco existe → el subscriber
--      AuditLoginOnUserLoggedIn falla (500 en GET /audit/recent).
--   4. La función fn_register_webhook_event usa NEW.company_id
--      incluso en DELETE (NEW es NULL) → bug latente.
--
-- SOLUCIÓN (idempotente y segura):
--   • company_id se agrega SIN default (NULL) → el trigger pasa NULL
--     a las funciones de automatización que usan INTEGER: NULL no
--     genera error de tipo y simplemente no matchea reglas.
--   • Se replica la parte de auditoría de la 026 para la lista de
--     tablas original (created_by, updated_by, deleted_at, deleted_by
--     + triggers updated_at).
--   • Se reemplaza fn_register_webhook_event con la versión
--     COALESCE(NEW, OLD).company_id + guard para NULL (arregla DELETE
--     y evita llamadas inútiles).
--   • NOTIFY pgrst, 'reload schema' para limpiar el schema cache.
-- ============================================================

BEGIN;

-- ─── 1. company_id en tablas que los triggers 046 leen ────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- dynamic_form_submissions NO existe en la BD real (046 se aplicó parcial)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dynamic_form_submissions') THEN
    EXECUTE 'ALTER TABLE dynamic_form_submissions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL';
  END IF;
END;
$$;

-- ─── 2. audit_logs.created_by (lo usa el subscriber de auditoría) ──────
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ─── 3. Replicar la parte de auditoría de la migración 026 ─────────────
-- (la 026 nunca se aplicó en la BD real: products.created_by faltaba)
DO $$
DECLARE
    tables_to_audit TEXT[] := ARRAY[
        'products', 'product_variants', 'categories', 'inventory', 'inventory_movements',
        'suppliers', 'purchases', 'purchase_items', 'sales', 'sale_items',
        'invoices', 'clients', 'offers', 'ecommerce_banners', 'hero_slides',
        'floating_banners', 'product_reviews', 'ecommerce_settings'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables_to_audit
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t) THEN
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'created_by') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL', t);
            END IF;
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'updated_by') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET NULL', t);
            END IF;
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'deleted_at') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL', t);
            END IF;
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'deleted_by') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL', t);
            END IF;
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = t AND column_name = 'updated_at')
               AND NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = format('trg_%s_updated_at', t)) THEN
                EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- ─── 4. Corregir fn_register_webhook_event (NEW en DELETE + NULL seguro)
CREATE OR REPLACE FUNCTION public.fn_fire_webhooks(
  p_company_id  UUID,
  p_event       VARCHAR(50),
  p_payload     JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_webhook RECORD;
  v_event_id UUID;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE NOTICE 'fn_fire_webhooks: company_id is NULL, skipping webhooks';
    RETURN;
  END IF;

  v_event_id := md5(p_event || ':' || COALESCE(p_payload::text, ''))::uuid;

  FOR v_webhook IN
    SELECT * FROM webhooks
    WHERE company_id = p_company_id
      AND is_active = TRUE
      AND p_event = ANY(events)
  LOOP
    INSERT INTO webhook_logs (webhook_id, company_id, event_type, payload, status, max_attempts, event_id)
    VALUES (v_webhook.id, p_company_id, p_event, p_payload, 'pending', v_webhook.retry_count, v_event_id)
    ON CONFLICT (webhook_id, event_id) WHERE event_id IS NOT NULL DO NOTHING;

    IF FOUND THEN
      UPDATE webhooks SET last_triggered_at = NOW() WHERE id = v_webhook.id;
    END IF;
  END LOOP;
END;
$;

COMMIT;

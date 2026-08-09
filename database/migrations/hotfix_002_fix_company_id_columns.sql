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
CREATE OR REPLACE FUNCTION public.fn_register_webhook_event()
RETURNS TRIGGER AS $$
DECLARE
  v_event VARCHAR(50);
  v_entity VARCHAR(30);
  v_company_id UUID;
  v_row JSONB;
BEGIN
  -- En AFTER triggers, NEW es NULL en DELETE → usar COALESCE(NEW, OLD)
  v_row := to_jsonb(COALESCE(NEW, OLD));

  -- Determinar evento y entidad
  IF TG_TABLE_NAME = 'sales' THEN
    v_entity := 'sale';
    IF TG_OP = 'INSERT' THEN v_event := 'sale.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN v_event := 'sale.status_changed';
    ELSE v_event := 'sale.updated';
    END IF;
    v_company_id := NULLIF((v_row->>'company_id'), '')::uuid;

  ELSIF TG_TABLE_NAME = 'clients' THEN
    v_entity := 'client';
    IF TG_OP = 'INSERT' THEN v_event := 'client.created';
    ELSIF TG_OP = 'UPDATE' THEN v_event := 'client.updated';
    ELSE v_event := 'client.deleted';
    END IF;
    v_company_id := NULLIF((v_row->>'company_id'), '')::uuid;

  ELSIF TG_TABLE_NAME = 'leads' THEN
    v_entity := 'lead';
    IF TG_OP = 'INSERT' THEN v_event := 'lead.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.stage_id != NEW.stage_id THEN v_event := 'lead.stage_changed';
    ELSE v_event := 'lead.updated';
    END IF;
    v_company_id := NULLIF((v_row->>'company_id'), '')::uuid;

  ELSIF TG_TABLE_NAME = 'dynamic_form_submissions' THEN
    v_entity := 'form_submission';
    v_event := 'form.submitted';
    v_company_id := NULLIF((v_row->>'company_id'), '')::uuid;

  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Guard: si no hay company_id (NULL o no parseable) no disparar nada
  IF v_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Disparar automatizaciones
  PERFORM public.fn_trigger_automations(
    v_company_id, v_event, v_entity,
    COALESCE(NEW.id, OLD.id),
    v_row
  );

  -- Disparar webhooks
  PERFORM public.fn_fire_webhooks(v_company_id, v_event, v_row);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 5. Índices para los nuevos filtros multi-tenant ────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_by ON audit_logs(created_by);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dynamic_form_submissions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dynamic_form_submissions_company_id ON dynamic_form_submissions(company_id)';
  END IF;
END;
$$;

-- ─── 6. Recargar el schema cache de PostgREST (schema cache stale) ──────
NOTIFY pgrst, 'reload schema';

-- ─── 7. Verificación ────────────────────────────────────────────────────
DO $$
DECLARE
  v_missing INTEGER := 0;
  v_ok INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='company_id') THEN
    RAISE WARNING 'clients.company_id sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='company_id') THEN
    RAISE WARNING 'sales.company_id sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='dynamic_form_submissions')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dynamic_form_submissions' AND column_name='company_id') THEN
    RAISE WARNING 'dynamic_form_submissions.company_id sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='created_by') THEN
    RAISE WARNING 'audit_logs.created_by sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='created_by') THEN
    RAISE WARNING 'products.created_by sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='company_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='company_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='created_by')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='created_by') THEN
    v_ok := 1;
  END IF;
  IF v_missing = 0 AND v_ok = 1 THEN
    RAISE NOTICE 'HOTFIX 002 aplicado correctamente: columnas verificadas + función de trigger corregida';
  END IF;
END $$;

COMMIT;

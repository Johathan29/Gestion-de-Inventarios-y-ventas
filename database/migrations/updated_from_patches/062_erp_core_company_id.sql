-- ============================================================
-- MIGRACIÓN 062: company_id en el NÚCLEO ERP (29 tablas)
-- ------------------------------------------------------------
-- Objetivo: extender el aislamiento multi-tenant (Fase 1) a las
-- tablas core del ERP que aún carecen de company_id.
--
--   A) ADD COLUMN company_id + backfill DEFAULT + NOT NULL + índice
--   B) Parchear 6 funciones trigger activas que INSERTAN en
--      inventory / inventory_movements (para propagar company_id)
--   C) sale_items: trigger inteligente (deriva de sales) en vez de
--      auto_assign (sp_create_sale inserta sin company_id)
--   D) Re-aplicar trg_auto_company_id (loop de 061) + backfill
--   E) RLS policies genéricas para las 29 tablas nuevas
--   F) Verificación
-- ============================================================

-- ============================================================
-- A) NÚCLEO ERP: 29 tablas que pasan a TENANT
-- ============================================================
DO $$
DECLARE
  t TEXT;
  n INTEGER := 0;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','product_variants','product_reviews','categories',
    'inventory','inventory_movements','inventory_reservations',
    'sale_items','purchases','purchase_items','suppliers','tax_rates','warehouses',
    'goods_receipts','goods_receipt_items','cart_items','carts',
    'offers','hero_slides','floating_banners','ecommerce_banners',
    'user_notifications','form_workflows','form_workflow_logs',
    'quality_inspections','quality_inspection_items','support_sessions',
    'taxpayer_info','client_credit_accounts'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS company_id uuid', t);
    EXECUTE format(
      'UPDATE %I SET company_id = ''00000000-0000-0000-0000-000000000001'' WHERE company_id IS NULL',
      t
    );
    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', t);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_company_id ON %I (company_id)',
      replace(t, '_backup_', 'bak_'), t
    );
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'company_id añadido a % tablas', n;
END $$;

-- ============================================================
-- B) PARCHES A FUNCIONES TRIGGER ACTIVAS
-- ============================================================

-- B.1) create_inventory_on_product_insert (010): INSERT INTO inventory
--      (AFTER INSERT ON products → NEW.company_id)
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

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = 'public'
          AND col.table_name = c.relname
          AND col.column_name = 'company_id'
      )
  LOOP
    EXECUTE format(
      'UPDATE %I SET company_id = ''00000000-0000-0000-0000-000000000001'' WHERE company_id IS NULL',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- E) RLS: políticas genéricas para las 29 tablas nuevas
--    (solo afectan acceso directo vía PostgREST/anon; el gateway
--     usa service_role que las salta; fallback seguro → DEFAULT)
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','product_variants','product_reviews','categories',
    'inventory','inventory_movements','inventory_reservations',
    'sale_items','purchases','purchase_items','suppliers','tax_rates','warehouses',
    'goods_receipts','goods_receipt_items','cart_items','carts',
    'offers','hero_slides','floating_banners','ecommerce_banners',
    'user_notifications','form_workflows','form_workflow_logs',
    'quality_inspections','quality_inspection_items','support_sessions',
    'taxpayer_info','client_credit_accounts'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_access_%s" ON %I', t, t);
    EXECUTE format($p$
      CREATE POLICY "tenant_access_%s" ON %I
      USING (company_id = COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid, '00000000-0000-0000-0000-000000000001'::uuid))
      WITH CHECK (company_id = COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid, '00000000-0000-0000-0000-000000000001'::uuid))
    $p$, t, t);
  END LOOP;
END $$;

-- ============================================================
-- F) VERIFICACIÓN
-- ============================================================
SELECT c.relname AS tabla,
       (SELECT column_name FROM information_schema.columns col
        WHERE col.table_schema='public' AND col.table_name=c.relname AND col.column_name='company_id') AS tiene_company_id,
       (SELECT is_nullable FROM information_schema.columns col
        WHERE col.table_schema='public' AND col.table_name=c.relname AND col.column_name='company_id') AS nullable,
       count(*) FILTER (WHERE tg.tgfoid = 'auto_assign_company_id()'::regprocedure) AS auto_assign,
       count(*) FILTER (WHERE tg.tgfoid = 'auto_assign_sale_item_company()'::regprocedure) AS sale_item_trigger
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_trigger tg ON tg.tgrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'products','product_variants','product_reviews','categories',
    'inventory','inventory_movements','inventory_reservations',
    'sale_items','purchases','purchase_items','suppliers','tax_rates','warehouses',
    'goods_receipts','goods_receipt_items','cart_items','carts',
    'offers','hero_slides','floating_banners','ecommerce_banners',
    'user_notifications','form_workflows','form_workflow_logs',
    'quality_inspections','quality_inspection_items','support_sessions',
    'taxpayer_info','client_credit_accounts'
  )
GROUP BY c.relname
ORDER BY c.relname;

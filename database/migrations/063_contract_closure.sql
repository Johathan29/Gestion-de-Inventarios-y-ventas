-- ============================================================
-- 063_contract_closure.sql
-- Cierre del CONTRATO MULTI-TENANT — resuelve las 46 violaciones
-- del schema-contract (Fase 2):
--   A) company_id NOT NULL      → 19 tablas (0 NULLs verificados antes)
--   B) company_id_index         → 20 tablas (idx_<tabla>_company_id)
--   C) policies (tenant_access) → 26 tablas (mismo patrón que 062)
-- Patrón de política (idéntico a 062):
--   USING/WITH CHECK: company_id = COALESCE(jwt company_id, DEFAULT)
-- NOTA: service_role salta RLS → la defensa real es proxy + trigger.
-- ============================================================

-- ============================================================
-- A) company_id NOT NULL (19 tablas)
--    Guarda defensiva: aborta si hubiera NULLs (verificado: 0).
--    Todas tienen trg_auto_company_id (BEFORE INSERT) que rellena
--    NULL → DEFAULT cuando el INSERT no trae company_id.
-- ============================================================
DO $$
DECLARE
  t TEXT;
  n BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cash_movements','cash_register_sessions','cash_registers',
    'clients','cms_page_templates','cms_templates','dynamic_form_fields',
    'ecommerce_settings','email_logs','invoices','ncf_sequences',
    'notification_channels','notification_templates','sales',
    'site_navigation_items','themes','transactional_outbox','users',
    'whatsapp_config'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE company_id IS NULL', t) INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'ABORT: % tiene % filas con company_id NULL', t, n;
    END IF;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', t);
  END LOOP;
END $$;

-- ============================================================
-- B) Índices company_id (20 tablas)
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'api_key_logs','api_keys','automation_actions','automation_logs',
    'branch_schedules','branch_users','cash_movements','cash_register_sessions',
    'cms_page_templates','company_dashboard_widgets','dynamic_form_fields',
    'invoices','lead_activities','lead_assignments','lead_notes',
    'notification_history','pipeline_stages','plan_changes',
    'transactional_outbox','webhook_logs'
  ] LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_company_id ON %I (company_id)', t, t);
  END LOOP;
END $$;

-- ============================================================
-- C) Políticas tenant_access (26 tablas)
--    Política SIN FOR → cubre ALL (SELECT/INSERT/UPDATE/DELETE).
--    En tablas con políticas previas (ej. clients, sales) es
--    ADITIVA (OR) — no elimina las existentes.
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'api_key_logs','automation_logs','cash_movements','cash_register_sessions',
    'cash_registers','clients','cms_component_versions','cms_page_versions',
    'company_themes','custom_code_blocks','dynamic_form_fields',
    'dynamic_form_submissions','dynamic_forms','integration_logs','invoices',
    'media_assets','notification_history','payment_transactions','sales',
    'site_headers','site_navigation_items','site_navigation_menus','themes',
    'transactional_outbox','url_redirects','webhook_logs'
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
-- VERIFICACIÓN
-- ============================================================
SELECT 'A) not_null' AS seccion, count(*) AS tablas
FROM information_schema.columns
WHERE table_schema='public' AND column_name='company_id' AND is_nullable='NO'
UNION ALL
SELECT 'B) indices', count(DISTINCT tablename)
FROM pg_indexes
WHERE schemaname='public' AND indexdef ILIKE '%company_id%'
UNION ALL
SELECT 'C) policies', count(DISTINCT c.relname)
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND p.polname LIKE 'tenant\_access\_%';

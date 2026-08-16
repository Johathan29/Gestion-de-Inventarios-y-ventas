-- ============================================================
-- MIGRATION 061 — GARANTÍA DE company_id A NIVEL BASE DE DATOS
-- (Fase 1 — P0 · Multi-Tenancy Hardening · 2026-08-09)
-- ============================================================
-- Contexto (auditoría schema-contract + tenant-proxy):
--   1. Los triggers auto_create_client() / sync_client_from_user()
--      insertaban en `clients` SIN company_id → clientes huérfanos
--      (NULL) invisibles para lecturas filtradas por tenant.
--   2. El trigger auto_assign_company_id() solo estaba aplicado a 4
--      tablas (checkout_items, checkout_sessions, email_logs,
--      notification_channels). El resto de tablas tenant dependían
--      exclusivamente del proxy de aplicación (que estaba roto).
--   3. Esta migración hace que el ASIGNADO de company_id sea una
--      garantía de BD (defensa en profundidad), no un accidente.
--
-- Aplicar: Management API v1 (database/query) o SQL console.

-- ============================================================
-- 1. FIX auto_create_client(): copiar company_id del usuario
-- ============================================================
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

-- ============================================================
-- 4. Backfill de seguridad: filas huérfanas (NULL) → DEFAULT
--    (idempotente; cubre cualquier fila creada antes de esta
--     migración o por flujos que aún no pasan por el proxy)
-- ============================================================
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
-- 5. VERIFICACIÓN
-- ============================================================
SELECT c.relname AS tabla,
       count(*) FILTER (WHERE tg.tgfoid = 'auto_assign_company_id()'::regprocedure) AS con_trigger
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_trigger tg ON tg.tgrelid = c.oid
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns col
    WHERE col.table_schema = 'public' AND col.table_name = c.relname AND col.column_name = 'company_id'
  )
GROUP BY c.relname
ORDER BY c.relname;

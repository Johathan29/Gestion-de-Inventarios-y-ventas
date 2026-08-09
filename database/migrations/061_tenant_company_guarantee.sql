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
CREATE OR REPLACE FUNCTION public.auto_create_client()
RETURNS TRIGGER AS $$
DECLARE
  client_role_id INTEGER;
BEGIN
  SELECT id INTO client_role_id FROM roles WHERE name = 'cliente' LIMIT 1;

  IF NEW.role_id = client_role_id THEN
    INSERT INTO clients (user_id, name, email, phone, is_active, company_id, created_at, updated_at)
    VALUES (NEW.id, NEW.name, NEW.email, NEW.phone, true, NEW.company_id, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      company_id = COALESCE(clients.company_id, EXCLUDED.company_id),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. FIX sync_client_from_user(): copiar company_id del usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_client_from_user()
RETURNS TRIGGER AS $$
DECLARE
  client_role_id INTEGER;
BEGIN
  SELECT id INTO client_role_id FROM roles WHERE name = 'cliente' LIMIT 1;

  IF NEW.role_id = client_role_id THEN
    INSERT INTO clients (user_id, name, email, phone, is_active, company_id, updated_at)
    VALUES (NEW.id, NEW.name, NEW.email, NEW.phone, true, NEW.company_id, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      company_id = COALESCE(clients.company_id, EXCLUDED.company_id),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Aplicar trg_auto_company_id (BEFORE INSERT) a TODAS las
--    tablas tenant que tengan company_id y NO tengan el trigger.
--    (BEFORE INSERT + IF NEW.company_id IS NULL → no interfiere
--     con inserts explícitos de servicios o RPCs.)
-- ============================================================
DO $$
DECLARE
  t TEXT;
  n INTEGER := 0;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'                              -- solo tablas base
      AND EXISTS (
        SELECT 1 FROM information_schema.columns col
        WHERE col.table_schema = 'public'
          AND col.table_name = c.relname
          AND col.column_name = 'company_id'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_trigger tg
        WHERE tg.tgrelid = c.oid
          AND tg.tgfoid = 'auto_assign_company_id()'::regprocedure
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_company_id ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_auto_company_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION auto_assign_company_id()',
      t
    );
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'trg_auto_company_id aplicado a % tablas', n;
END $$;

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

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
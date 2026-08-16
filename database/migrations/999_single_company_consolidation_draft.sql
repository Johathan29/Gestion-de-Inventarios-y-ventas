-- Draft migration: Consolidate to single-company deployment
-- WARNING: Review and test thoroughly before applying to production.
-- Strategy summary:
-- 1) Validate that repository contains a single active company (or choose target company id).
-- 2) Create `company_settings` singleton if missing and ensure platform defaults.
-- 3) Backfill NULL `company_id` values to the target company id, with audit queries.
-- 4) Apply NOT NULL and FK constraints incrementally, reindex after backfill.
-- 5) Patch triggers/functions to tolerate missing `company_id` and prefer COALESCE(NEW.company_id, p_default_company)
-- 6) Optionally remove `company_id` columns after thorough verification (long window).

-- === Configuration: set TARGET_COMPANY_ID before running ===
-- Replace the placeholder with the UUID of the single company you want to keep.
\set :target_company '00000000-0000-0000-0000-000000000001'

BEGIN;

-- 0. Safety checks
RAISE NOTICE 'Validating companies table and target company...';
SELECT count(*) AS companies_total FROM companies;
SELECT id, name, is_active FROM companies WHERE id = :'target_company';

-- 1. Create company_settings singleton if not exists (store global defaults)
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
INSERT INTO company_settings (company_id, key, value)
SELECT :'target_company', 'singleton', jsonb_build_object('consolidated', true)
WHERE NOT EXISTS (SELECT 1 FROM company_settings WHERE key = 'singleton' AND company_id = :'target_company');

-- 2. Generate a report of tables with company_id and counts of NULLs
-- The implementer should run manual per-table counts and review before executing mass updates.

-- 3. Backfill: For each important business table, update NULL company_id -> target
-- Example for core tables (customize/extend list):
-- IMPORTANT: Do not run blind `UPDATE` across all tables until you've reviewed consequences.

-- Sample backfill pattern (uncomment and adapt per table):
-- UPDATE products SET company_id = :'target_company' WHERE company_id IS NULL;
-- UPDATE sales SET company_id = :'target_company' WHERE company_id IS NULL;
-- UPDATE inventory SET company_id = :'target_company' WHERE company_id IS NULL;
-- UPDATE inventory_movements SET company_id = :'target_company' WHERE company_id IS NULL;

-- 4. Disable non-idempotent triggers that may fire on mass-update
-- Example: ALTER TABLE products DISABLE TRIGGER ALL;

-- 5. Apply backfills in batches with logging (example using a single table)
-- DO $$
-- DECLARE
--   v_count int;
-- BEGIN
--   SELECT count(*) INTO v_count FROM products WHERE company_id IS NULL;
--   IF v_count > 0 THEN
--     RAISE NOTICE 'Backfilling % rows in products', v_count;
--     UPDATE products SET company_id = :'target_company' WHERE company_id IS NULL;
--   END IF;
-- END$$;

-- 6. Patch functions/triggers: audit and update functions to use COALESCE(NEW.company_id, :'target_company')
-- Example modification (pseudocode):
-- OLD: PERFORM some_function(NEW.company_id, ...);
-- NEW: PERFORM some_function(COALESCE(NEW.company_id, :'target_company'), ...);

-- 7. After backfill: set NOT NULL and add indexes incrementally
-- ALTER TABLE products ALTER COLUMN company_id SET NOT NULL;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_company_id ON products(company_id);

-- 8. Re-enable triggers and re-run integrity tests
-- Example: ALTER TABLE products ENABLE TRIGGER ALL;

-- 9. Create an audit table recording original NULL rows and migration timestamp for rollback review
CREATE TABLE IF NOT EXISTS company_backfill_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  primary_key jsonb,
  previous_company_id uuid,
  migrated_at timestamptz DEFAULT now()
);

COMMIT;

-- Rollback recipe (manual):
-- 1) Use `company_backfill_audit` to restore previous_company_id per primary_key.
-- 2) Re-enable previous triggers if manually disabled.

-- END of draft migration. Implementers: replace sample statements with curated per-table commands.

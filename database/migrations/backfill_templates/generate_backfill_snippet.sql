-- generate_backfill_snippet.sql
-- Returns a suggested backfill snippet (non-destructive) for a given table.
-- Usage (psql):
-- \set target_company '00000000-0000-0000-0000-000000000001'
-- SELECT * FROM generate_backfill_snippet('public','products', :'target_company');

CREATE OR REPLACE FUNCTION generate_backfill_snippet(p_schema text, p_table text, p_target_company uuid)
RETURNS TABLE(table_schema text, table_name text, total_rows bigint, null_count bigint, distinct_companies bigint, sample_companies text, pre_checks text, suggested_update text, disable_triggers text, reenable_triggers text)
LANGUAGE plpgsql AS $$
DECLARE
  fq text := format('%I.%I', p_schema, p_table);
  v_total bigint;
  v_nulls bigint;
  v_distinct bigint;
  v_sample text;
BEGIN
  EXECUTE format('SELECT count(*) FROM %s', fq) INTO v_total;
  EXECUTE format('SELECT count(*) FROM %s WHERE company_id IS NULL', fq) INTO v_nulls;
  EXECUTE format('SELECT count(DISTINCT company_id) FROM %s', fq) INTO v_distinct;
  EXECUTE format('SELECT string_agg(DISTINCT company_id::text, '','') FROM (SELECT DISTINCT company_id FROM %s WHERE company_id IS NOT NULL LIMIT 5) t', fq) INTO v_sample;

  pre_checks := format($$-- PRE-CHECKS for %s
-- 1) Row counts: %s rows total, %s rows with company_id IS NULL
-- 2) Sample non-null company_ids: %s
-- 3) Confirm primary key columns and FK constraints before applying updates.
SELECT count(*) FROM %s;
SELECT count(*) FROM %s WHERE company_id IS NULL;
SELECT * FROM %s WHERE company_id IS NOT NULL LIMIT 5;
$$, fq, v_total, v_nulls, COALESCE(v_sample,''), fq, fq, fq);

  disable_triggers := format('-- To avoid side-effects disable triggers (use with caution):\n-- ALTER TABLE %s DISABLE TRIGGER ALL;\n', fq);
  reenable_triggers := format('-- Re-enable triggers after backfill:\n-- ALTER TABLE %s ENABLE TRIGGER ALL;\n', fq);

  suggested_update := format($$-- Suggested safe backfill for %s
-- Run only after verifying PRE-CHECKS above and having backups.
-- Batch update example (adjust batch size as needed):
-- BEGIN;\n-- UPDATE %s SET company_id = '%s' WHERE ctid IN (SELECT ctid FROM %s WHERE company_id IS NULL LIMIT 10000) RETURNING *;\n-- COMMIT;\n$$, fq, fq, p_target_company, fq);

  RETURN QUERY SELECT p_schema, p_table, v_total, v_nulls, v_distinct, COALESCE(v_sample,''), pre_checks, suggested_update, disable_triggers, reenable_triggers;
END; $$;

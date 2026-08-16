-- PATCH 001: Safe `auto_assign_company_id()` trigger function
-- Purpose: ensure NEW.company_id is set using a safe fallback order:
--   1) NEW.company_id (if provided)
--   2) JWT claim `company_id` (request context)
--   3) configured :target_company (psql variable)
-- Usage: set target_company before running.
--   \set target_company '00000000-0000-0000-0000-000000000001'

CREATE OR REPLACE FUNCTION public.auto_assign_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Reapply trg_auto_company_id on tables as needed (example for `products`):
-- DROP TRIGGER IF EXISTS trg_auto_company_id ON public.products;
-- CREATE TRIGGER trg_auto_company_id BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.auto_assign_company_id();

-- PATCH 004: NCF / fiscal sequence safety
-- Ensure sequence helpers use explicit company_id fallback and locking.
-- Set target_company before running:
-- \set target_company '00000000-0000-0000-0000-000000000001'

CREATE OR REPLACE FUNCTION public.fn_get_next_ncf(
  p_fiscal_document_type_id UUID,
  p_branch VARCHAR(100) DEFAULT '',
  p_company_id UUID DEFAULT NULL
)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_sequence RECORD;
  v_ncf VARCHAR(50);
  v_next_number INTEGER;
  v_company uuid := COALESCE(p_company_id, NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'company_id','')::uuid, :'target_company'::uuid);
BEGIN
  SELECT * INTO v_sequence
  FROM ncf_sequences
  WHERE fiscal_document_type_id = p_fiscal_document_type_id
    AND branch = p_branch
    AND (p_company_id IS NULL OR company_id = p_company_id)
    AND is_active = true
    AND CURRENT_DATE BETWEEN valid_from AND valid_to
  ORDER BY company_id NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active NCF sequence for type % (branch: %)', p_fiscal_document_type_id, p_branch;
  END IF;

  IF v_sequence.current_number >= v_sequence.max_number THEN
    RAISE EXCEPTION 'NCF sequence % (%) reached limit (%)', v_sequence.prefix, v_sequence.serie, v_sequence.max_number;
  END IF;

  v_next_number := v_sequence.current_number + 1;

  UPDATE ncf_sequences
  SET current_number = v_next_number, updated_at = NOW()
  WHERE id = v_sequence.id;

  v_ncf := v_sequence.prefix || '-' || LPAD(v_next_number::TEXT, 8, '0');
  RETURN v_ncf;
END;
$$ LANGUAGE plpgsql;

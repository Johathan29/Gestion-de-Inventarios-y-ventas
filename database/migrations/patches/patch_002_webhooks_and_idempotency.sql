-- PATCH 002: Harden webhook registration and idempotency functions
-- Purpose: ensure functions that read company_id from payload/NEW guard against NULLs
-- and prefer JWT claim or target_company fallback.
-- Set target_company before running:
-- \set target_company '00000000-0000-0000-0000-000000000001'

-- 2.1 fn_register_webhook_event (trigger-based)
-- Replace fn_register_webhook_event with a hardened variant that preserves original
-- dispatch logic but ensures company_id fallback from JWT or target_company.
CREATE OR REPLACE FUNCTION public.fn_register_webhook_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event VARCHAR(50);
  v_entity VARCHAR(30);
  v_company_id UUID;
BEGIN
  -- Determine event & entity (keeps original mapping per table)
  IF TG_TABLE_NAME = 'sales' THEN
    v_entity := 'sale';
    IF TG_OP = 'INSERT' THEN v_event := 'sale.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN v_event := 'sale.status_changed';
    ELSE v_event := 'sale.updated'; END IF;
    v_company_id := NEW.company_id;

  ELSIF TG_TABLE_NAME = 'clients' THEN
    v_entity := 'client';
    IF TG_OP = 'INSERT' THEN v_event := 'client.created';
    ELSIF TG_OP = 'UPDATE' THEN v_event := 'client.updated';
    ELSE v_event := 'client.deleted'; END IF;
    v_company_id := NEW.company_id;

  ELSIF TG_TABLE_NAME = 'leads' THEN
    v_entity := 'lead';
    IF TG_OP = 'INSERT' THEN v_event := 'lead.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.stage_id != NEW.stage_id THEN v_event := 'lead.stage_changed';
    ELSE v_event := 'lead.updated'; END IF;
    v_company_id := NEW.company_id;

  ELSIF TG_TABLE_NAME = 'dynamic_form_submissions' THEN
    v_entity := 'form_submission';
    v_event := 'form.submitted';
    v_company_id := NEW.company_id;

  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Fallback: prefer explicit value, then JWT claim, then configured target company
  v_company_id := COALESCE(
    v_company_id,
    NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'company_id','')::uuid,
    :'target_company'::uuid
  );

  -- Trigger automations and webhooks using the resolved company_id
  PERFORM public.fn_trigger_automations(
    v_company_id, v_event, v_entity,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(COALESCE(NEW, OLD))
  );

  PERFORM public.fn_fire_webhooks(v_company_id, v_event, to_jsonb(COALESCE(NEW, OLD)));

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- fn_idempotency_claim: adapt existing signature but ensure fallback for NULL company
CREATE OR REPLACE FUNCTION public.fn_idempotency_claim(
  p_key            TEXT,
  p_company_id     UUID,
  p_user_id        UUID DEFAULT NULL,
  p_method         TEXT DEFAULT 'POST',
  p_path           TEXT DEFAULT '',
  p_request_hash   TEXT DEFAULT '',
  p_ttl_hours      INTEGER DEFAULT 24
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row idempotency_keys%ROWTYPE;
  v_expires TIMESTAMPTZ;
BEGIN
  IF p_company_id IS NULL THEN
    p_company_id := :'target_company'::uuid;
  END IF;

  -- Cleanup expired
  DELETE FROM public.idempotency_keys
  WHERE company_id = p_company_id AND expires_at < clock_timestamp();

  v_expires := clock_timestamp() + make_interval(hours => p_ttl_hours);

  INSERT INTO public.idempotency_keys
    (key, company_id, user_id, method, path, request_hash, expires_at)
  VALUES
    (p_key, p_company_id, p_user_id, p_method, p_path, p_request_hash, v_expires)
  ON CONFLICT (company_id, key) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row
    FROM public.idempotency_keys
    WHERE company_id = p_company_id AND key = p_key;

    IF v_row.id IS NULL THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CLAIM_FAILED';
    END IF;

    RETURN jsonb_build_object(
      'id', v_row.id,
      'is_new', false,
      'request_hash', v_row.request_hash,
      'response_status', v_row.response_status,
      'response_body', v_row.response_body,
      'expires_at', v_row.expires_at
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'is_new', true,
    'request_hash', v_row.request_hash,
    'response_status', v_row.response_status,
    'response_body', v_row.response_body,
    'expires_at', v_row.expires_at
  );
END;
$$;

-- fn_fire_webhooks: keep existing robust implementation but skip when company_id is NULL
CREATE OR REPLACE FUNCTION public.fn_fire_webhooks(
  p_company_id  UUID,
  p_event       VARCHAR(50),
  p_payload     JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook RECORD;
  v_event_id UUID;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE NOTICE 'fn_fire_webhooks: company_id is NULL, skipping webhooks';
    RETURN;
  END IF;

  v_event_id := md5(p_event || ':' || COALESCE(p_payload::text, ''))::uuid;

  FOR v_webhook IN
    SELECT * FROM webhooks
    WHERE company_id = p_company_id
      AND is_active = TRUE
      AND p_event = ANY(events)
  LOOP
    INSERT INTO webhook_logs (webhook_id, company_id, event_type, payload, status, max_attempts, event_id)
    VALUES (v_webhook.id, p_company_id, p_event, p_payload, 'pending', v_webhook.retry_count, v_event_id)
    ON CONFLICT (webhook_id, event_id) WHERE event_id IS NOT NULL DO NOTHING;

    IF FOUND THEN
      UPDATE webhooks SET last_triggered_at = NOW() WHERE id = v_webhook.id;
    END IF;
  END LOOP;
END;
$$;

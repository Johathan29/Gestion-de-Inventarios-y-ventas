CREATE OR REPLACE FUNCTION public.fn_register_webhook_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
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
$;

-- ─── 6. Recargar el schema cache de PostgREST (schema cache stale) ──────
NOTIFY pgrst, 'reload schema';

-- ─── 7. Verificación ────────────────────────────────────────────────────
DO $$
DECLARE
  v_missing INTEGER := 0;
  v_ok INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='company_id') THEN
    RAISE WARNING 'clients.company_id sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='company_id') THEN
    RAISE WARNING 'sales.company_id sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='dynamic_form_submissions')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dynamic_form_submissions' AND column_name='company_id') THEN
    RAISE WARNING 'dynamic_form_submissions.company_id sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='created_by') THEN
    RAISE WARNING 'audit_logs.created_by sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='created_by') THEN
    RAISE WARNING 'products.created_by sigue faltando'; v_missing := v_missing + 1;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='company_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='company_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='created_by')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='created_by') THEN
    v_ok := 1;
  END IF;
  IF v_missing = 0 AND v_ok = 1 THEN
    RAISE NOTICE 'HOTFIX 002 aplicado correctamente: columnas verificadas + función de trigger corregida';
  END IF;
END $$;
-- ===================================================
-- MIGRATION 056: Fix trigger de automatizaciones (UUID)
-- ===================================================
-- BUG CRÍTICO: fn_register_webhook_event declaraba v_company_id INTEGER
-- y casteaba el company_id (UUID) a entero → la inserción de
-- ventas/clientes/leads/formularios FALLABA SIEMPRE con
-- "invalid input syntax for type integer", rompiendo el flujo
-- de creación de ventas (POS y ecommerce).
--
-- Además fn_trigger_automations usaba p_entity_id INTEGER aunque las
-- entidades usan UUID, y automation_logs.trigger_entity_id era INTEGER.
-- ===================================================

-- 1. automation_logs.trigger_entity_id → UUID (tabla vacía, sin pérdida)
ALTER TABLE automation_logs
  ALTER COLUMN trigger_entity_id TYPE uuid
  USING trigger_entity_id::text::uuid;

-- 2. Eliminar firmas legacy con tipos incorrectos (INTEGER)
DROP FUNCTION IF EXISTS public.fn_trigger_automations(uuid, varchar, varchar, integer, jsonb);
DROP FUNCTION IF EXISTS public.fn_fire_webhooks(integer, varchar, jsonb);

-- 3. fn_trigger_automations con entity_id UUID
CREATE OR REPLACE FUNCTION public.fn_trigger_automations(
  p_company_id uuid,
  p_event character varying,
  p_entity character varying,
  p_entity_id uuid,
  p_entity_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rule RECORD;
  v_log_id INTEGER;
BEGIN
  FOR v_rule IN
    SELECT * FROM automation_rules
    WHERE company_id = p_company_id
      AND trigger_event = p_event
      AND is_active = TRUE
    ORDER BY priority DESC
  LOOP
    IF public.fn_check_conditions(v_rule.trigger_conditions, p_entity_data) THEN
      INSERT INTO automation_logs (rule_id, company_id, trigger_event, trigger_entity, trigger_entity_id, input_data, status)
      VALUES (v_rule.id, p_company_id, p_event, p_entity, p_entity_id, p_entity_data, 'completed')
      RETURNING id INTO v_log_id;

      UPDATE automation_rules
      SET run_count = run_count + 1, last_run_at = NOW(), updated_at = NOW()
      WHERE id = v_rule.id;
    END IF;
  END LOOP;
END;
$function$;

-- 4. fn_register_webhook_event corregido: v_company_id UUID
CREATE OR REPLACE FUNCTION public.fn_register_webhook_event()
RETURNS TRIGGER AS $$
DECLARE
  v_event VARCHAR(50);
  v_entity VARCHAR(30);
  v_company_id UUID;
  v_row JSONB;
BEGIN
  -- En AFTER triggers, NEW es NULL en DELETE → usar COALESCE(NEW, OLD)
  v_row := to_jsonb(COALESCE(NEW, OLD));

  -- Determinar evento y entidad
  IF TG_TABLE_NAME = 'sales' THEN
    v_entity := 'sale';
    IF TG_OP = 'INSERT' THEN v_event := 'sale.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN v_event := 'sale.status_changed';
    ELSE v_event := 'sale.updated';
    END IF;
    v_company_id := NULLIF((v_row->>'company_id'), '')::uuid;

  ELSIF TG_TABLE_NAME = 'clients' THEN
    v_entity := 'client';
    IF TG_OP = 'INSERT' THEN v_event := 'client.created';
    ELSIF TG_OP = 'UPDATE' THEN v_event := 'client.updated';
    ELSE v_event := 'client.deleted';
    END IF;
    v_company_id := NULLIF((v_row->>'company_id'), '')::uuid;

  ELSIF TG_TABLE_NAME = 'leads' THEN
    v_entity := 'lead';
    IF TG_OP = 'INSERT' THEN v_event := 'lead.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.stage_id != NEW.stage_id THEN v_event := 'lead.stage_changed';
    ELSE v_event := 'lead.updated';
    END IF;
    v_company_id := NULLIF((v_row->>'company_id'), '')::uuid;

  ELSIF TG_TABLE_NAME = 'dynamic_form_submissions' THEN
    v_entity := 'form_submission';
    v_event := 'form.submitted';
    v_company_id := NULLIF((v_row->>'company_id'), '')::uuid;

  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Guard: si no hay company_id (NULL o no parseable) no disparar nada
  IF v_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Disparar automatizaciones
  PERFORM public.fn_trigger_automations(
    v_company_id, v_event, v_entity,
    COALESCE(NEW.id, OLD.id),
    v_row
  );

  -- Disparar webhooks
  PERFORM public.fn_fire_webhooks(v_company_id, v_event, v_row);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 5. fn_fire_webhooks con company_id UUID (la versión legacy era INTEGER)
CREATE OR REPLACE FUNCTION public.fn_fire_webhooks(
  p_company_id  uuid,
  p_event       VARCHAR(50),
  p_payload     JSONB
) RETURNS void AS $$
DECLARE
  v_webhook RECORD;
BEGIN
  FOR v_webhook IN
    SELECT * FROM webhooks
    WHERE company_id = p_company_id
      AND is_active = TRUE
      AND p_event = ANY(events)
  LOOP
    INSERT INTO webhook_logs (webhook_id, company_id, event_type, payload, status, max_attempts)
    VALUES (v_webhook.id, p_company_id, p_event, p_payload, 'pending', v_webhook.retry_count);

    UPDATE webhooks SET last_triggered_at = NOW() WHERE id = v_webhook.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

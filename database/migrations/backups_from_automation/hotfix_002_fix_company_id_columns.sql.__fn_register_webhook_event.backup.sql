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

-- ─── 5. Índices para los nuevos filtros multi-tenant ────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_by ON audit_logs(created_by);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dynamic_form_submissions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dynamic_form_submissions_company_id ON dynamic_form_submissions(company_id)';
  END IF;
END;
$$;
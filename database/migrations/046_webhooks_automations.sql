-- ============================================================================
-- MIGRATION 046: WEBHOOKS & AUTOMATIONS ENGINE
-- ============================================================================
-- Sistema de webhooks outbound y reglas de automatización
-- "Cuando X pase, hacer Y" — automatización declarativa para cada empresa
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE A: WEBHOOKS
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. WEBHOOKS CONFIGURADOS POR EMPRESA ────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id              SERIAL PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,             -- 'Notificar a sistema externo'
  url             VARCHAR(500) NOT NULL,             -- URL destino
  description     TEXT,

  -- Eventos suscritos
  events          TEXT[] NOT NULL,                   -- ['sale.created', 'client.created', 'form.submitted']
  
  -- Configuración HTTP
  http_method     VARCHAR(10) NOT NULL DEFAULT 'POST',
  content_type    VARCHAR(50) NOT NULL DEFAULT 'application/json',
  auth_type       VARCHAR(20) NOT NULL DEFAULT 'none', -- 'none', 'basic', 'bearer', 'hmac', 'api_key'
  auth_value      TEXT,                              -- Token/secret (almacenado encriptado)
  auth_header     VARCHAR(50) DEFAULT 'Authorization',
  custom_headers  JSONB DEFAULT '{}',                -- Headers adicionales

  -- Filtrado
  filter_conditions JSONB,                           -- {"client_type": "vip", "min_amount": 100}

  -- Retry & Rate limiting
  retry_count     INTEGER NOT NULL DEFAULT 3,
  retry_delay_ms  INTEGER NOT NULL DEFAULT 5000,     -- 5 seconds
  timeout_ms      INTEGER NOT NULL DEFAULT 10000,    -- 10 seconds
  rate_limit      INTEGER NOT NULL DEFAULT 60,       -- Max per minute
  batch_size      INTEGER NOT NULL DEFAULT 1,        -- 1 = individual, >1 = batch
  batch_window_ms INTEGER NOT NULL DEFAULT 5000,     -- Time window for batching

  -- Transformación
  payload_template JSONB,                            -- Template personalizado del payload
  payload_version VARCHAR(10) NOT NULL DEFAULT 'v1',

  -- Estado
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_status     VARCHAR(20),                       -- 'success', 'error'
  last_error      TEXT,
  success_count   INTEGER NOT NULL DEFAULT 0,
  error_count     INTEGER NOT NULL DEFAULT 0,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_company ON webhooks(company_id);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);
CREATE INDEX idx_webhooks_active ON webhooks(company_id) WHERE is_active = TRUE;

COMMENT ON TABLE webhooks IS 'Webhooks outbound configurados por empresa';

-- ─── 2. LOG DE WEBHOOKS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_logs (
  id                SERIAL PRIMARY KEY,
  webhook_id        INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type        VARCHAR(50) NOT NULL,           -- 'sale.created'
  payload           JSONB NOT NULL,
  attempt           INTEGER NOT NULL DEFAULT 1,
  max_attempts      INTEGER NOT NULL DEFAULT 3,
  status            VARCHAR(20) NOT NULL,           -- 'pending', 'success', 'error', 'timeout', 'retrying'
  response_status   INTEGER,
  response_body     TEXT,
  error_message     TEXT,
  request_headers   JSONB,
  response_headers  JSONB,
  duration_ms       INTEGER,
  next_retry_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_company ON webhook_logs(company_id);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_pending ON webhook_logs(next_retry_at)
  WHERE status IN ('pending', 'retrying');

COMMENT ON TABLE webhook_logs IS 'Log de intentos de envío de webhooks';

-- ─── 3. EVENTOS DISPONIBLES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_event_types (
  id              SERIAL PRIMARY KEY,
  event_type      VARCHAR(50) NOT NULL UNIQUE,      -- 'sale.created'
  name            VARCHAR(150) NOT NULL,            -- 'Venta creada'
  description     TEXT,
  entity          VARCHAR(30) NOT NULL,             -- 'sale', 'client', 'product'
  action          VARCHAR(20) NOT NULL,             -- 'created', 'updated', 'deleted'
  payload_schema  JSONB,                            -- Schema del payload que se envía
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  category        VARCHAR(30) NOT NULL              -- 'ventas', 'inventario', 'crm', 'cms'
);

COMMENT ON TABLE webhook_event_types IS 'Catálogo de eventos disponibles para webhooks y automatizaciones';

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE B: AUTOMATIZACIONES
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 4. REGLAS DE AUTOMATIZACIÓN ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id              SERIAL PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,            -- 'Enviar WhatsApp al crear lead'
  description     TEXT,

  -- Trigger
  trigger_event   VARCHAR(50) NOT NULL,             -- 'lead.created', 'form.submitted'
  trigger_conditions JSONB DEFAULT '{}',            -- Filtros: {"lead.temperature": "hot"}

  -- Estado
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  run_count       INTEGER NOT NULL DEFAULT 0,
  last_run_at     TIMESTAMPTZ,
  last_error      TEXT,
  error_count     INTEGER NOT NULL DEFAULT 0,

  -- Límites del plan
  priority        INTEGER NOT NULL DEFAULT 0,       -- Orden de ejecución
  timeout_ms      INTEGER NOT NULL DEFAULT 30000,   -- 30 seconds

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_company ON automation_rules(company_id);
CREATE INDEX idx_automation_rules_event ON automation_rules(trigger_event);
CREATE INDEX idx_automation_rules_active ON automation_rules(company_id, trigger_event)
  WHERE is_active = TRUE;

COMMENT ON TABLE automation_rules IS 'Reglas de automatización declarativas: "Cuando X, hacer Y"';

-- ─── 5. ACCIONES DE AUTOMATIZACIÓN ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_actions (
  id              SERIAL PRIMARY KEY,
  rule_id         INTEGER NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_type     VARCHAR(30) NOT NULL,
    -- 'send_email', 'send_whatsapp', 'create_task', 'update_field',
    -- 'create_lead', 'notify_user', 'webhook_call', 'add_tag', 'move_stage'
  config          JSONB NOT NULL,                   -- Configuración específica de la acción
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Condición opcional para esta acción específica
  conditions      JSONB DEFAULT '{}',

  -- Timeout individual
  timeout_ms      INTEGER NOT NULL DEFAULT 10000,
  retry_on_fail   BOOLEAN NOT NULL DEFAULT FALSE,
  max_retries     INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_actions_rule ON automation_actions(rule_id);
CREATE INDEX idx_automation_actions_company ON automation_actions(company_id);

COMMENT ON TABLE automation_actions IS 'Acciones a ejecutar cuando se dispara una regla de automatización';

-- ─── 6. LOG DE AUTOMATIZACIONES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_logs (
  id                SERIAL PRIMARY KEY,
  rule_id           INTEGER NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_id         INTEGER REFERENCES automation_actions(id),
  trigger_event     VARCHAR(50) NOT NULL,
  trigger_entity    VARCHAR(30),
  trigger_entity_id UUID,
  status            VARCHAR(20) NOT NULL,           -- 'pending', 'running', 'completed', 'error', 'skipped'
  input_data        JSONB,
  output_data       JSONB,
  error_message     TEXT,
  error_stack       TEXT,
  duration_ms       INTEGER,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_automation_logs_rule ON automation_logs(rule_id);
CREATE INDEX idx_automation_logs_company ON automation_logs(company_id);
CREATE INDEX idx_automation_logs_status ON automation_logs(status);
CREATE INDEX idx_automation_logs_created ON automation_logs(created_at);

COMMENT ON TABLE automation_logs IS 'Log de ejecuciones de automatizaciones';

-- ─── 7. FUNCIÓN: Disparar automatizaciones ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_trigger_automations(
  p_company_id    UUID,
  p_event         VARCHAR(50),
  p_entity        VARCHAR(30),
  p_entity_id     UUID,
  p_entity_data   JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
  v_rule RECORD;
  v_action RECORD;
  v_conditions_met BOOLEAN;
BEGIN
  -- Buscar reglas activas para este evento
  FOR v_rule IN
    SELECT * FROM automation_rules
    WHERE company_id = p_company_id
      AND trigger_event = p_event
      AND is_active = TRUE
    ORDER BY priority DESC
  LOOP
    -- Verificar condiciones del trigger
    v_conditions_met := public.fn_check_conditions(v_rule.trigger_conditions, p_entity_data);

    IF NOT v_conditions_met THEN
      INSERT INTO automation_logs (rule_id, company_id, trigger_event, trigger_entity, trigger_entity_id, input_data, status)
      VALUES (v_rule.id, p_company_id, p_event, p_entity, p_entity_id, p_entity_data, 'skipped');
      CONTINUE;
    END IF;

    -- Registrar inicio
    INSERT INTO automation_logs (rule_id, company_id, trigger_event, trigger_entity, trigger_entity_id, input_data, status)
    VALUES (v_rule.id, p_company_id, p_event, p_entity, p_entity_id, p_entity_data, 'running')
    RETURNING id INTO v_action;

    -- Ejecutar acciones en orden
    FOR v_action IN
      SELECT * FROM automation_actions
      WHERE rule_id = v_rule.id AND is_active = TRUE
      ORDER BY sort_order
    LOOP
      -- Verificar condiciones de la acción individual
      IF v_action.conditions != '{}'::jsonb THEN
        IF NOT public.fn_check_conditions(v_action.conditions, p_entity_data) THEN
          CONTINUE;
        END IF;
      END IF;

      -- Insertar en cola de procesamiento (el worker lo procesa async)
      INSERT INTO transactional_outbox (event_type, aggregate_type, aggregate_id, payload, status)
      VALUES (
        'automation.action',
        'automation_action',
        v_action.id,
        jsonb_build_object(
          'action_type', v_action.action_type,
          'config', v_action.config,
          'entity', p_entity,
          'entity_id', p_entity_id,
          'entity_data', p_entity_data,
          'company_id', p_company_id,
          'rule_id', v_rule.id,
          'log_id', v_action.id
        ),
        'pending'
      );
    END LOOP;

    -- Actualizar contadores
    UPDATE automation_rules
    SET run_count = run_count + 1, last_run_at = NOW(), updated_at = NOW()
    WHERE id = v_rule.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.fn_trigger_automations IS 'Motor de automatizaciones: busca reglas y ejecuta acciones para un evento';

-- ─── 8. FUNCIÓN: Verificar condiciones ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_check_conditions(
  p_conditions  JSONB,
  p_data        JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_key TEXT;
  v_value JSONB;
  v_data_value JSONB;
BEGIN
  IF p_conditions = '{}'::jsonb THEN RETURN TRUE; END IF;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_conditions)
  LOOP
    -- Obtener valor del dato (soporta dot notation: "lead.temperature")
    v_data_value := p_data;

    -- Buscar en data directamente
    IF p_data ? v_key THEN
      v_data_value := p_data -> v_key;
    ELSE
      RETURN FALSE; -- Key not found in data
    END IF;

    -- Comparar
    IF v_data_value != v_value THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── 9. FUNCIÓN: Crear webhook para evento ───────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_register_webhook_event()
RETURNS TRIGGER AS $$
DECLARE
  v_event VARCHAR(50);
  v_entity VARCHAR(30);
  v_company_id UUID;
BEGIN
  -- Determinar evento y entidad
  IF TG_TABLE_NAME = 'sales' THEN
    v_entity := 'sale';
    IF TG_OP = 'INSERT' THEN v_event := 'sale.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN v_event := 'sale.status_changed';
    ELSE v_event := 'sale.updated';
    END IF;
    v_company_id := NEW.company_id;

  ELSIF TG_TABLE_NAME = 'clients' THEN
    v_entity := 'client';
    IF TG_OP = 'INSERT' THEN v_event := 'client.created';
    ELSIF TG_OP = 'UPDATE' THEN v_event := 'client.updated';
    ELSE v_event := 'client.deleted';
    END IF;
    v_company_id := NEW.company_id;

  ELSIF TG_TABLE_NAME = 'leads' THEN
    v_entity := 'lead';
    IF TG_OP = 'INSERT' THEN v_event := 'lead.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.stage_id != NEW.stage_id THEN v_event := 'lead.stage_changed';
    ELSE v_event := 'lead.updated';
    END IF;
    v_company_id := NEW.company_id;

  ELSIF TG_TABLE_NAME = 'dynamic_form_submissions' THEN
    v_entity := 'form_submission';
    v_event := 'form.submitted';
    v_company_id := NEW.company_id;

  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Disparar automatizaciones
  PERFORM public.fn_trigger_automations(
    v_company_id, v_event, v_entity,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(COALESCE(NEW, OLD))
  );

  -- Disparar webhooks
  PERFORM public.fn_fire_webhooks(v_company_id, v_event, to_jsonb(COALESCE(NEW, OLD)));

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 10. FUNCIÓN: Enviar webhooks ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_fire_webhooks(
  p_company_id  UUID,
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

-- ─── 11. TRIGGERS EN TABLAS CLAVE ────────────────────────────────────────
-- Sales
CREATE TRIGGER trg_sales_automations
  AFTER INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION public.fn_register_webhook_event();

-- Clients
CREATE TRIGGER trg_clients_automations
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION public.fn_register_webhook_event();

-- Leads
CREATE TRIGGER trg_leads_automations
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_register_webhook_event();

-- Form Submissions
CREATE TRIGGER trg_form_submissions_automations
  AFTER INSERT ON dynamic_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_register_webhook_event();

-- ─── 12. TRIGGERS DE TIMESTAMP ───────────────────────────────────────────
CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- ─── 13. FUNCIÓN: Limpiar logs antiguos ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_clean_old_automation_logs(
  p_retention_days INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM automation_logs WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  DELETE FROM webhook_logs
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND status IN ('success', 'error');

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fn_clean_old_automation_logs IS 'Limpia logs de automatizaciones y webhooks antiguos';

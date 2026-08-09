-- ============================================================================
-- MIGRATION 044: CRM - LEADS, PIPELINE & TASKS
-- ============================================================================
-- Sistema CRM completo: Leads, Pipeline, Actividades, Tareas y Notas
-- Permite gestionar el ciclo de vida completo de un prospecto/cliente
-- ============================================================================

-- ─── 1. ETAPAS DEL PIPELINE (configurable por empresa) ────────────────────
CREATE TABLE IF NOT EXISTS lead_stages (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,            -- 'Contacto inicial', 'Calificado'
  slug            VARCHAR(50) NOT NULL,             -- 'contacto_inicial'
  color           VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  icon            VARCHAR(50),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  probability     INTEGER NOT NULL DEFAULT 0,       -- % probabilidad de cierre (0-100)
  is_won          BOOLEAN NOT NULL DEFAULT FALSE,   -- Etapa de cierre ganado
  is_lost          BOOLEAN NOT NULL DEFAULT FALSE,  -- Etapa de cierre perdido
  auto_action     JSONB,                            -- Acción automática al llegar: {"type": "email", "template": "bienvenida"}
  max_days        INTEGER,                          -- Días máximos antes de alerta
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

CREATE INDEX idx_lead_stages_company ON lead_stages(company_id);
CREATE INDEX idx_lead_stages_sort ON lead_stages(company_id, sort_order);

COMMENT ON TABLE lead_stages IS 'Etapas del pipeline CRM por empresa (configurables)';

-- ─── 2. ORIGENES DE LEADS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_sources (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,            -- 'Sitio web', 'WhatsApp', 'Referido'
  slug            VARCHAR(50) NOT NULL,
  icon            VARCHAR(50),
  color           VARCHAR(7),
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

CREATE INDEX idx_lead_sources_company ON lead_sources(company_id);

COMMENT ON TABLE lead_sources IS 'Orígenes de leads por empresa';

-- ─── 3. PIPELINES (múltiples pipelines por empresa) ───────────────────────
CREATE TABLE IF NOT EXISTS crm_pipelines (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,            -- 'Ventas B2B', 'Ventas B2C'
  slug            VARCHAR(50) NOT NULL,
  description     TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  currency_code   VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

CREATE INDEX idx_crm_pipelines_company ON crm_pipelines(company_id);

COMMENT ON TABLE crm_pipelines IS 'Pipelines CRM múltiples por empresa';

-- ─── 4. ETAPAS POR PIPELINE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id              SERIAL PRIMARY KEY,
  pipeline_id     INTEGER NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_id        INTEGER NOT NULL REFERENCES lead_stages(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  UNIQUE(pipeline_id, stage_id)
);

CREATE INDEX idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);

COMMENT ON TABLE pipeline_stages IS 'Etapas asignadas a cada pipeline (orden configurable)';

-- ─── 5. LEADS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pipeline_id     INTEGER REFERENCES crm_pipelines(id),
  stage_id        INTEGER NOT NULL REFERENCES lead_stages(id),
  source_id       INTEGER REFERENCES lead_sources(id),
  client_id       INTEGER REFERENCES clients(id),  -- Si ya es cliente
  user_id         UUID REFERENCES users(id),        -- Usuario propietario del lead

  -- Datos del lead
  name            VARCHAR(200) NOT NULL,            -- Nombre completo o empresa
  email           VARCHAR(200),
  phone           VARCHAR(30),
  whatsapp        VARCHAR(30),
  company_name    VARCHAR(200),
  position        VARCHAR(100),                     -- Cargo
  website         VARCHAR(500),
  address         TEXT,

  -- Clasificación
  lead_type       VARCHAR(20) NOT NULL DEFAULT 'individual', -- 'individual', 'company'
  priority        VARCHAR(10) NOT NULL DEFAULT 'medium',     -- 'low', 'medium', 'high', 'urgent'
  temperature     VARCHAR(10) NOT NULL DEFAULT 'warm',       -- 'cold', 'warm', 'hot'
  rating          INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Valor
  estimated_value DECIMAL(12,2) DEFAULT 0,
  currency_code   VARCHAR(3) NOT NULL DEFAULT 'USD',
  probability     INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close  DATE,

  -- Formulario de origen
  form_id         INTEGER REFERENCES dynamic_forms(id),
  submission_id   INTEGER REFERENCES dynamic_form_submissions(id),

  -- Tags y metadata
  tags            TEXT[] DEFAULT '{}',
  custom_fields   JSONB DEFAULT '{}',
  notes_summary   TEXT,

  -- Fechas
  first_contact   TIMESTAMPTZ DEFAULT NOW(),
  last_activity   TIMESTAMPTZ,
  next_follow_up  TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,

  -- Conversión
  converted_at    TIMESTAMPTZ,
  lost_reason     TEXT,
  won_value       DECIMAL(12,2),

  -- Tracking
  utm_source      VARCHAR(100),
  utm_medium      VARCHAR(100),
  utm_campaign    VARCHAR(100),
  referrer_url    TEXT,
  visitor_id      VARCHAR(100),

  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_leads_pipeline ON leads(pipeline_id);
CREATE INDEX idx_leads_stage ON leads(stage_id);
CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_leads_source ON leads(source_id);
CREATE INDEX idx_leads_email ON leads(company_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_phone ON leads(company_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_leads_next_follow ON leads(next_follow_up) WHERE next_follow_up IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_leads_priority ON leads(company_id, priority);
CREATE INDEX idx_leads_created ON leads(company_id, created_at);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);

COMMENT ON TABLE leads IS 'Leads/prospectos del CRM con pipeline y scoring';

-- ─── 6. ACTIVIDADES DE LEADS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_activities (
  id              SERIAL PRIMARY KEY,
  lead_id         INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_type   VARCHAR(30) NOT NULL,
    -- 'call', 'email', 'whatsapp', 'meeting', 'note', 'task', 'stage_change',
    -- 'form_submission', 'page_view', 'status_change', 'assignment'
  subject         VARCHAR(200) NOT NULL,
  description     TEXT,
  direction       VARCHAR(10),                     -- 'inbound', 'outbound'
  duration        INTEGER,                         -- Minutes (for calls/meetings)
  outcome         VARCHAR(50),                     -- 'completed', 'no_answer', 'interested', 'not_interested'

  -- Para stage_change
  from_stage_id   INTEGER REFERENCES lead_stages(id),
  to_stage_id     INTEGER REFERENCES lead_stages(id),

  -- Para email/whatsapp
  message_id      VARCHAR(255),
  template_id     INTEGER,

  -- Adjuntos
  attachments     JSONB DEFAULT '[]',

  -- Quién ejecutó
  user_id         UUID NOT NULL REFERENCES users(id),
  is_system       BOOLEAN NOT NULL DEFAULT FALSE, -- Auto-generated
  is_visible      BOOLEAN NOT NULL DEFAULT TRUE,

  scheduled_at    TIMESTAMPTZ,                     -- Para actividades programadas
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_company ON lead_activities(company_id);
CREATE INDEX idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX idx_lead_activities_scheduled ON lead_activities(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_lead_activities_created ON lead_activities(created_at);

COMMENT ON TABLE lead_activities IS 'Historial completo de actividades y seguimiento de leads';

-- ─── 7. NOTAS DE LEADS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_notes (
  id              SERIAL PRIMARY KEY,
  lead_id         INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  is_internal     BOOLEAN NOT NULL DEFAULT TRUE,   -- Solo visible para el equipo
  user_id         UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id);
CREATE INDEX idx_lead_notes_pinned ON lead_notes(lead_id) WHERE is_pinned = TRUE;

COMMENT ON TABLE lead_notes IS 'Notas internas sobre leads';

-- ─── 8. ASIGNACIONES DE LEADS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_assignments (
  id              SERIAL PRIMARY KEY,
  lead_id         INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  assigned_by     UUID REFERENCES users(id),
  is_primary      BOOLEAN NOT NULL DEFAULT TRUE,   -- Lead owner
  notes           TEXT,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at   TIMESTAMPTZ,
  UNIQUE(lead_id, user_id)
);

CREATE INDEX idx_lead_assignments_lead ON lead_assignments(lead_id);
CREATE INDEX idx_lead_assignments_user ON lead_assignments(user_id);
CREATE INDEX idx_lead_assignments_company ON lead_assignments(company_id);

COMMENT ON TABLE lead_assignments IS 'Asignación de leads a usuarios del equipo';

-- ─── 9. TAREAS GLOBALES (vinculadas a leads, clientes, etc.) ──────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'in_progress', 'completed', 'cancelled', 'overdue'
  priority        VARCHAR(10) NOT NULL DEFAULT 'medium',
    -- 'low', 'medium', 'high', 'urgent'
  task_type       VARCHAR(30) NOT NULL DEFAULT 'general',
    -- 'general', 'follow_up', 'call', 'email', 'meeting', 'demo', 'proposal'

  -- Referencias polymórficas
  reference_type  VARCHAR(30),                     -- 'lead', 'client', 'sale', 'purchase'
  reference_id    INTEGER,                         -- ID de la entidad referenciada

  -- Fechas
  due_date        DATE,
  due_time        TIME,
  start_at        TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  reminder_at     TIMESTAMPTZ,

  -- Asignación
  assigned_to     UUID REFERENCES users(id),
  created_by      UUID NOT NULL REFERENCES users(id),
  is_recurring    BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule JSONB,                           -- {"frequency": "daily", "interval": 1}

  -- Resultado
  result          TEXT,
  completion_notes TEXT,

  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_tasks_due ON tasks(due_date, due_time) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_tasks_reference ON tasks(reference_type, reference_id);
CREATE INDEX idx_tasks_status ON tasks(company_id, status);
CREATE INDEX idx_tasks_priority ON tasks(company_id, priority);
CREATE INDEX idx_tasks_created ON tasks(company_id, created_at);

COMMENT ON TABLE tasks IS 'Tareas globales del CRM - vinculables a leads, clientes, ventas';

-- ─── 10. PIPELINE METRICS (materializado para performance) ────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pipeline_metrics AS
SELECT
  l.company_id,
  l.pipeline_id,
  cp.name AS pipeline_name,
  ls.id AS stage_id,
  ls.name AS stage_name,
  ls.sort_order AS stage_order,
  COUNT(DISTINCT l.id) AS lead_count,
  COALESCE(SUM(l.estimated_value), 0) AS total_value,
  COALESCE(AVG(l.estimated_value), 0) AS avg_value,
  COUNT(DISTINCT l.id) FILTER (WHERE l.temperature = 'hot') AS hot_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.priority = 'high' OR l.priority = 'urgent') AS high_priority,
  COUNT(DISTINCT l.id) FILTER (WHERE l.next_follow_up <= NOW() + INTERVAL '7 days') AS due_soon,
  COUNT(DISTINCT l.id) FILTER (WHERE l.next_follow_up < NOW() AND l.next_follow_up IS NOT NULL) AS overdue
FROM leads l
JOIN lead_stages ls ON ls.id = l.stage_id
LEFT JOIN crm_pipelines cp ON cp.id = l.pipeline_id
WHERE l.deleted_at IS NULL
  AND l.is_archived = FALSE
GROUP BY l.company_id, l.pipeline_id, cp.name, ls.id, ls.name, ls.sort_order;

CREATE UNIQUE INDEX idx_mpm ON mv_pipeline_metrics(company_id, pipeline_id, stage_id);

COMMENT ON MATERIALIZED VIEW mv_pipeline_metrics IS 'Métricas agregadas del pipeline CRM por empresa/etapa';

-- ─── 11. FUNCIÓN: Refrescar métricas del pipeline ─────────────────────────
CREATE OR REPLACE FUNCTION public.fn_refresh_pipeline_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pipeline_metrics;
END;
$$ LANGUAGE plpgsql;

-- ─── 12. FUNCIÓN: Mover lead a nueva etapa ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_move_lead_stage(
  p_lead_id     INTEGER,
  p_new_stage_id INTEGER,
  p_user_id     UUID,
  p_notes       TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_old_stage_id INTEGER;
  v_lead RECORD;
BEGIN
  -- Obtener etapa actual
  SELECT stage_id, company_id, name INTO v_old_stage_id, v_lead.company_id, v_lead.name
  FROM leads WHERE id = p_lead_id;

  IF v_old_stage_id IS NULL THEN
    RAISE EXCEPTION 'Lead no encontrado: %', p_lead_id;
  END IF;

  -- Actualizar etapa
  UPDATE leads
  SET stage_id = p_new_stage_id,
      last_activity = NOW(),
      updated_at = NOW()
  WHERE id = p_lead_id;

  -- Registrar actividad de cambio
  INSERT INTO lead_activities (lead_id, company_id, activity_type, subject, description,
    from_stage_id, to_stage_id, user_id, is_system)
  VALUES (p_lead_id, v_lead.company_id, 'stage_change',
    'Etapa cambiada',
    COALESCE(p_notes, 'Lead movido de etapa'),
    v_old_stage_id, p_new_stage_id, p_user_id, TRUE);

  -- Actualizar last_activity
  UPDATE leads SET last_activity = NOW() WHERE id = p_lead_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 13. FUNCIÓN: Auto-crear etapas default al crear pipeline ─────────────
CREATE OR REPLACE FUNCTION public.fn_auto_create_default_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_stages (company_id, name, slug, color, sort_order, probability) VALUES
    (NEW.company_id, 'Nuevo',         'nuevo',         '#3B82F6', 0,  10),
    (NEW.company_id, 'Contactado',    'contactado',    '#8B5CF6', 1,  25),
    (NEW.company_id, 'Calificado',    'calificado',    '#F59E0B', 2,  50),
    (NEW.company_id, 'Propuesta',     'propuesta',     '#F97316', 3,  70),
    (NEW.company_id, 'Negociación',   'negociacion',   '#EF4444', 4,  85),
    (NEW.company_id, 'Ganado',        'ganado',        '#22C55E', 5,  100),
    (NEW.company_id, 'Perdido',       'perdido',       '#6B7280', 6,  0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_create_stages
  AFTER INSERT ON crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_create_default_stages();

-- ─── 14. TRIGGERS ─────────────────────────────────────────────────────────
CREATE TRIGGER trg_lead_stages_updated_at
  BEFORE UPDATE ON lead_stages
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_crm_pipelines_updated_at
  BEFORE UPDATE ON crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_lead_notes_updated_at
  BEFORE UPDATE ON lead_notes
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- ─── 15. FUNCIÓN: Auto-convertir form submission a lead ───────────────────
CREATE OR REPLACE FUNCTION public.fn_auto_form_to_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_default_pipeline INTEGER;
  v_default_stage INTEGER;
  v_name VARCHAR(200);
  v_email VARCHAR(200);
  v_phone VARCHAR(30);
  v_lead_id INTEGER;
BEGIN
  v_company_id := NEW.company_id;

  -- Solo para formularios marcados como generadores de leads
  IF NOT EXISTS (
    SELECT 1 FROM dynamic_forms df
    WHERE df.id = NEW.form_id AND df.form_type = 'lead'
  ) THEN
    RETURN NEW;
  END IF;

  -- Obtener pipeline y stage por defecto
  SELECT cp.id INTO v_default_pipeline
  FROM crm_pipelines cp WHERE cp.company_id = v_company_id AND cp.is_default = TRUE;

  IF v_default_pipeline IS NULL THEN
    SELECT id INTO v_default_pipeline
    FROM crm_pipelines WHERE company_id = v_company_id LIMIT 1;
  END IF;

  IF v_default_pipeline IS NULL THEN RETURN NEW; END IF;

  SELECT ps.id INTO v_default_stage
  FROM pipeline_stages ps
  WHERE ps.pipeline_id = v_default_pipeline
  ORDER BY ps.sort_order LIMIT 1;

  -- Extraer datos del formulario
  SELECT value_text INTO v_name
  FROM dynamic_form_submission_values dfv
  JOIN dynamic_form_fields dff ON dff.id = dfv.field_id
  WHERE dfv.submission_id = NEW.id AND dff.name IN ('name', 'full_name', 'nombre')
  LIMIT 1;

  SELECT value_text INTO v_email
  FROM dynamic_form_submission_values dfv
  JOIN dynamic_form_fields dff ON dff.id = dfv.field_id
  WHERE dfv.submission_id = NEW.id AND dff.name IN ('email', 'correo')
  LIMIT 1;

  SELECT value_text INTO v_phone
  FROM dynamic_form_submission_values dfv
  JOIN dynamic_form_fields dff ON dff.id = dfv.field_id
  WHERE dfv.submission_id = NEW.id AND dff.name IN ('phone', 'telefono', 'teléfono')
  LIMIT 1;

  -- Crear lead
  INSERT INTO leads (company_id, pipeline_id, stage_id, source_id, name, email, phone,
    lead_type, form_id, submission_id, temperature, user_id, custom_fields)
  VALUES (
    v_company_id,
    v_default_pipeline,
    v_default_stage,
    NULL,
    COALESCE(v_name, 'Lead desde formulario'),
    v_email,
    v_phone,
    'individual',
    NEW.form_id,
    NEW.id,
    'warm',
    NULL,
    jsonb_build_object('form_submission_id', NEW.id)
  )
  RETURNING id INTO v_lead_id;

  -- Registrar actividad
  INSERT INTO lead_activities (lead_id, company_id, activity_type, subject, description,
    direction, user_id, is_system)
  VALUES (
    v_lead_id, v_company_id, 'form_submission',
    'Lead creado desde formulario',
    'Lead generado automáticamente desde envío de formulario',
    'inbound', NULL, TRUE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_auto_form_to_lead
  AFTER INSERT ON dynamic_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_form_to_lead();

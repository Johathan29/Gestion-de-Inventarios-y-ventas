-- ============================================================================
-- MIGRATION 047: NOTIFICATION TEMPLATES, BRAND SETTINGS & TESTIMONIALS
-- ============================================================================
-- Plantillas de notificaciones, configuración de marca por empresa,
-- moderación de testimonios y mejoras adicionales
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE A: PLANTILLAS DE NOTIFICACIONES
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. PLANTILLAS DE NOTIFICACIONES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_templates (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER REFERENCES companies(id) ON DELETE CASCADE, -- NULL = template global/plataforma
  name            VARCHAR(100) NOT NULL,            -- 'Venta creada', 'Lead nuevo'
  slug            VARCHAR(50) NOT NULL,             -- 'sale_created', 'lead_new'
  category        VARCHAR(30) NOT NULL,             -- 'sales', 'crm', 'inventory', 'system', 'marketing'

  -- Canales
  use_email       BOOLEAN NOT NULL DEFAULT FALSE,
  use_whatsapp    BOOLEAN NOT NULL DEFAULT FALSE,
  use_push        BOOLEAN NOT NULL DEFAULT FALSE,
  use_in_app      BOOLEAN NOT NULL DEFAULT TRUE,

  -- Contenido
  subject         VARCHAR(300),                     -- Para email: asunto
  body_html       TEXT,                             -- Template HTML (emails)
  body_text       TEXT,                             -- Plain text fallback
  body_whatsapp   TEXT,                             -- Formato WhatsApp
  body_push       VARCHAR(200),                     -- Push notification (corto)
  body_in_app     TEXT,                             -- Notificación in-app

  -- Variables disponibles: {{client_name}}, {{sale_number}}, {{amount}}, etc.
  variables       JSONB DEFAULT '[]',               -- Lista de variables disponibles
  sample_data     JSONB DEFAULT '{}',               -- Datos de ejemplo para preview

  -- Configuración
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,   -- No se puede eliminar
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  locale          VARCHAR(5) NOT NULL DEFAULT 'es',  -- Idioma del template

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

CREATE INDEX idx_notification_templates_company ON notification_templates(company_id);
CREATE INDEX idx_notification_templates_slug ON notification_templates(slug);
CREATE INDEX idx_notification_templates_category ON notification_templates(category);

COMMENT ON TABLE notification_templates IS 'Plantillas de notificaciones multi-canal por empresa';

-- ─── 2. HISTORIAL DE NOTIFICACIONES ENVIADAS ─────────────────────────────
CREATE TABLE IF NOT EXISTS notification_history (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id       INTEGER REFERENCES notification_templates(id),
  user_id           UUID REFERENCES users(id),     -- Destinatario
  channel           VARCHAR(20) NOT NULL,           -- 'email', 'whatsapp', 'push', 'in_app'
  status            VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'

  -- Contenido enviado
  subject           VARCHAR(300),
  body              TEXT NOT NULL,
  recipient         VARCHAR(200) NOT NULL,          -- Email, phone, etc.

  -- Tracking
  reference_type    VARCHAR(30),                    -- 'sale', 'lead', 'form'
  reference_id      INTEGER,
  read_at           TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ,
  error_message     TEXT,
  external_id       VARCHAR(255),                   -- ID del proveedor externo

  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ
);

CREATE INDEX idx_notif_history_company ON notification_history(company_id);
CREATE INDEX idx_notif_history_user ON notification_history(user_id);
CREATE INDEX idx_notif_history_channel ON notification_history(channel);
CREATE INDEX idx_notif_history_sent ON notification_history(sent_at);

COMMENT ON TABLE notification_history IS 'Historial de notificaciones enviadas por canal';

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE B: CONFIGURACIÓN DE MARCA POR EMPRESA
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 3. BRAND SETTINGS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_brand_settings (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Logos
  logo_url        VARCHAR(500),
  logo_dark_url   VARCHAR(500),                     -- Logo para fondo oscuro
  logo_icon       VARCHAR(500),                     -- Solo icono (sin texto)
  favicon_url     VARCHAR(500),
  watermark_url   VARCHAR(500),

  -- Colores principales
  primary_color       VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  secondary_color     VARCHAR(7) NOT NULL DEFAULT '#10B981',
  accent_color        VARCHAR(7) NOT NULL DEFAULT '#F59E0B',
  background_color    VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  surface_color       VARCHAR(7) NOT NULL DEFAULT '#F9FAFB',
  text_primary_color  VARCHAR(7) NOT NULL DEFAULT '#111827',
  text_secondary_color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  error_color         VARCHAR(7) NOT NULL DEFAULT '#EF4444',
  success_color       VARCHAR(7) NOT NULL DEFAULT '#22C55E',

  -- Tipografía
  font_family          VARCHAR(100) NOT NULL DEFAULT 'Inter',
  heading_font_family  VARCHAR(100) NOT NULL DEFAULT 'Inter',
  font_size_base       VARCHAR(10) NOT NULL DEFAULT '16px',
  font_size_sm         VARCHAR(10) NOT NULL DEFAULT '14px',
  font_size_lg         VARCHAR(10) NOT NULL DEFAULT '18px',
  font_size_xl         VARCHAR(10) NOT NULL DEFAULT '20px',
  font_weight_normal   INTEGER NOT NULL DEFAULT 400,
  font_weight_bold     INTEGER NOT NULL DEFAULT 700,
  line_height          DECIMAL(3,1) NOT NULL DEFAULT 1.5,

  -- Botones
  button_style         VARCHAR(20) NOT NULL DEFAULT 'rounded',  -- 'rounded', 'pill', 'square'
  button_border_radius VARCHAR(10) NOT NULL DEFAULT '8px',
  button_font_weight   INTEGER NOT NULL DEFAULT 600,
  button_shadow        BOOLEAN NOT NULL DEFAULT TRUE,

  -- Bordes
  border_radius_sm     VARCHAR(10) NOT NULL DEFAULT '4px',
  border_radius_md     VARCHAR(10) NOT NULL DEFAULT '8px',
  border_radius_lg     VARCHAR(10) NOT NULL DEFAULT '12px',
  border_radius_xl     VARCHAR(10) NOT NULL DEFAULT '16px',
  border_radius_full   VARCHAR(10) NOT NULL DEFAULT '9999px',
  border_color         VARCHAR(7) NOT NULL DEFAULT '#E5E7EB',

  -- Sombras
  shadow_sm            VARCHAR(100) DEFAULT '0 1px 2px rgba(0,0,0,0.05)',
  shadow_md            VARCHAR(100) DEFAULT '0 4px 6px rgba(0,0,0,0.1)',
  shadow_lg            VARCHAR(100) DEFAULT '0 10px 15px rgba(0,0,0,0.1)',
  shadow_xl            VARCHAR(100) DEFAULT '0 20px 25px rgba(0,0,0,0.15)',

  -- Espaciados
  spacing_unit         VARCHAR(10) NOT NULL DEFAULT '4px',
  container_max_width  VARCHAR(10) NOT NULL DEFAULT '1200px',
  section_padding      VARCHAR(20) NOT NULL DEFAULT '80px 0',

  -- Animaciones
  transition_default   VARCHAR(50) NOT NULL DEFAULT 'all 0.2s ease',
  transition_slow      VARCHAR(50) NOT NULL DEFAULT 'all 0.4s ease',
  hover_scale           DECIMAL(4,3) NOT NULL DEFAULT 1.020,
  animation_enabled    BOOLEAN NOT NULL DEFAULT TRUE,

  -- Imágenes
  hero_background_url  VARCHAR(500),
  hero_overlay_opacity DECIMAL(3,2) NOT NULL DEFAULT 0.4,
  about_image_url      VARCHAR(500),
  favicon_32           VARCHAR(500),
  favicon_16           VARCHAR(500),
  apple_touch_icon     VARCHAR(500),

  -- CSS Custom
  custom_css           TEXT,
  custom_head_html     TEXT,
  custom_body_html     TEXT,

  -- JSON Generado (para frontend)
  css_variables        JSONB,                        -- Auto-generado desde los campos anteriores
  theme_preset         VARCHAR(30),                  -- 'custom', 'aurora_gold', 'aurora_dark'

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE INDEX idx_brand_settings_company ON company_brand_settings(company_id);

COMMENT ON TABLE company_brand_settings IS 'Configuración visual completa de marca por empresa';

-- ─── 4. FUNCIÓN: Generar CSS Variables desde brand settings ───────────────
CREATE OR REPLACE FUNCTION public.fn_generate_css_variables(
  p_company_id INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_brand RECORD;
  v_css JSONB;
BEGIN
  SELECT * INTO v_brand
  FROM company_brand_settings
  WHERE company_id = p_company_id;

  IF v_brand IS NULL THEN RETURN '{}'::jsonb; END IF;

  v_css := jsonb_build_object(
    '--brand-primary', v_brand.primary_color,
    '--brand-secondary', v_brand.secondary_color,
    '--brand-accent', v_brand.accent_color,
    '--brand-bg', v_brand.background_color,
    '--brand-surface', v_brand.surface_color,
    '--brand-text', v_brand.text_primary_color,
    '--brand-text-secondary', v_brand.text_secondary_color,
    '--brand-error', v_brand.error_color,
    '--brand-success', v_brand.success_color,
    '--brand-font', v_brand.font_family,
    '--brand-font-heading', v_brand.heading_font_family,
    '--brand-radius-sm', v_brand.border_radius_sm,
    '--brand-radius-md', v_brand.border_radius_md,
    '--brand-radius-lg', v_brand.border_radius_lg,
    '--brand-radius-xl', v_brand.border_radius_xl,
    '--brand-shadow-sm', v_brand.shadow_sm,
    '--brand-shadow-md', v_brand.shadow_md,
    '--brand-shadow-lg', v_brand.shadow_lg,
    '--brand-spacing', v_brand.spacing_unit,
    '--brand-max-width', v_brand.container_max_width,
    '--brand-transition', v_brand.transition_default
  );

  -- Guardar en la tabla
  UPDATE company_brand_settings
  SET css_variables = v_css, updated_at = NOW()
  WHERE company_id = p_company_id;

  RETURN v_css;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.fn_generate_css_variables IS 'Genera CSS variables (:root) desde la configuración de marca';

-- ─── 5. TRIGGER: Auto-generar CSS al actualizar brand ─────────────────────
CREATE OR REPLACE FUNCTION public.fn_auto_regenerate_css()
RETURNS TRIGGER AS $$
BEGIN
  NEW.css_variables := jsonb_build_object(
    '--brand-primary', NEW.primary_color,
    '--brand-secondary', NEW.secondary_color,
    '--brand-accent', NEW.accent_color,
    '--brand-bg', NEW.background_color,
    '--brand-surface', NEW.surface_color,
    '--brand-text', NEW.text_primary_color,
    '--brand-text-secondary', NEW.text_secondary_color,
    '--brand-error', NEW.error_color,
    '--brand-success', NEW.success_color,
    '--brand-font', NEW.font_family,
    '--brand-font-heading', NEW.heading_font_family,
    '--brand-radius-sm', NEW.border_radius_sm,
    '--brand-radius-md', NEW.border_radius_md,
    '--brand-radius-lg', NEW.border_radius_lg,
    '--brand-radius-xl', NEW.border_radius_xl,
    '--brand-shadow-sm', NEW.shadow_sm,
    '--brand-shadow-md', NEW.shadow_md,
    '--brand-shadow-lg', NEW.shadow_lg,
    '--brand-spacing', NEW.spacing_unit,
    '--brand-max-width', NEW.container_max_width,
    '--brand-transition', NEW.transition_default,
    '--brand-button-style', NEW.button_style,
    '--brand-button-radius', NEW.button_border_radius,
    '--brand-font-size-base', NEW.font_size_base,
    '--brand-font-size-sm', NEW.font_size_sm,
    '--brand-font-size-lg', NEW.font_size_lg,
    '--brand-line-height', NEW.line_height::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_regenerate_css
  BEFORE INSERT OR UPDATE ON company_brand_settings
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_regenerate_css();

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE C: TESTIMONIOS MEJORADOS (Moderación)
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 6. Agregar campos de moderación a testimonials ───────────────────────
-- (La tabla testimonials ya existe de migration 037)
ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'approved', 'rejected', 'flagged'
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS response TEXT,           -- Respuesta del admin
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE;

-- Índices para moderación
CREATE INDEX IF NOT EXISTS idx_testimonials_moderation ON testimonials(moderation_status);
CREATE INDEX IF NOT EXISTS idx_testimonials_company_moderation ON testimonials(company_id, moderation_status);

COMMENT ON COLUMN testimonials.moderation_status IS 'pending: esperando revisión, approved: publicado, rejected: rechazado, flagged: reportado';

-- ─── 7. FUNCIÓN: Auto-aprobar testimonios de clientes verificados ────────
CREATE OR REPLACE FUNCTION public.fn_auto_moderate_testimonial()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el testimonio viene de un cliente verificado (con client_id), auto-aprobar
  IF NEW.client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients c WHERE c.id = NEW.client_id AND c.is_active = TRUE
  ) THEN
    NEW.moderation_status := 'approved';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_moderate_testimonial
  BEFORE INSERT ON testimonials
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_moderate_testimonial();

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE D: VERSIONADO DE CONTENIDO MEJORADO
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 8. Estados de publicación ───────────────────────────────────────────
-- Agregar campos de workflow a cms_pages si no existen
ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- 'draft', 'in_review', 'changes_requested', 'approved', 'published'
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unpublish_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cms_pages_review ON cms_pages(review_status) WHERE review_status != 'draft';

COMMENT ON COLUMN cms_pages.review_status IS 'Workflow de publicación: draft → in_review → approved → published';

-- ─── 9. Tabla de comentarios de revisión ─────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_review_comments (
  id              SERIAL PRIMARY KEY,
  page_id         INTEGER NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  section_id      INTEGER REFERENCES cms_page_sections(id),
  comment         TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'wont_fix'
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  parent_id       INTEGER REFERENCES cms_review_comments(id), -- Hilo de respuestas
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cms_review_comments_page ON cms_review_comments(page_id);
CREATE INDEX idx_cms_review_comments_status ON cms_review_comments(status);

COMMENT ON TABLE cms_review_comments IS 'Comentarios de revisión durante el workflow de publicación CMS';

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE E: TRIGGERS DE TIMESTAMP
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER trg_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_company_brand_settings_updated_at
  BEFORE UPDATE ON company_brand_settings
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

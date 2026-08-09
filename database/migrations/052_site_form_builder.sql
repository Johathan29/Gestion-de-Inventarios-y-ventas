-- ============================================================
-- MIGRATION 052: SITE BUILDER + FORM BUILDER TABLES
-- Esquema alineado con site-builder-service y form-builder-service
-- (controladores y frontend son la fuente de verdad del contrato)
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- SITE BUILDER
-- ════════════════════════════════════════════════════════════

-- 1. MEDIA ASSETS
CREATE TABLE IF NOT EXISTS public.media_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  url             TEXT,
  original_name   VARCHAR(255),
  file_name       VARCHAR(255) NOT NULL,
  mime_type       VARCHAR(100),
  file_size       INTEGER,
  alt_text        VARCHAR(255),
  title           VARCHAR(255),
  description     TEXT,
  tags            JSONB DEFAULT '[]',
  folder_path     VARCHAR(255) DEFAULT '/',
  is_public       BOOLEAN NOT NULL DEFAULT true,
  uploaded_by     UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_company ON public.media_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON public.media_assets(company_id, folder_path);

-- 2. THEMES
CREATE TABLE IF NOT EXISTS public.themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(100),
  description     TEXT,
  settings        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_themes_company ON public.themes(company_id);

-- 3. COMPANY THEMES
CREATE TABLE IF NOT EXISTS public.company_themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  theme_id        UUID REFERENCES public.themes(id) ON DELETE SET NULL,
  overrides       JSONB DEFAULT '{}',
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. COMPANY BRAND SETTINGS
CREATE TABLE IF NOT EXISTS public.company_brand_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  primary_color   VARCHAR(20),
  secondary_color VARCHAR(20),
  accent_color    VARCHAR(20),
  font_heading    VARCHAR(100),
  font_body       VARCHAR(100),
  logo_url        TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. SITE NAVIGATION MENUS
CREATE TABLE IF NOT EXISTS public.site_navigation_menus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(100),
  location        VARCHAR(50) NOT NULL DEFAULT 'header',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_snm_company ON public.site_navigation_menus(company_id);

-- 6. SITE NAVIGATION ITEMS
CREATE TABLE IF NOT EXISTS public.site_navigation_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id         UUID NOT NULL REFERENCES public.site_navigation_menus(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES public.site_navigation_items(id) ON DELETE CASCADE,
  label           VARCHAR(255) NOT NULL,
  url             VARCHAR(500),
  target          VARCHAR(20) DEFAULT '_self',
  icon            VARCHAR(50),
  css_classes     VARCHAR(255),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sni_menu ON public.site_navigation_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_sni_company ON public.site_navigation_items(company_id);

-- 7. SITE HEADERS (config flexible en JSONB)
CREATE TABLE IF NOT EXISTS public.site_headers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  settings        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. CUSTOM CODE BLOCKS
CREATE TABLE IF NOT EXISTS public.custom_code_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  code_type       VARCHAR(20) NOT NULL DEFAULT 'html',
  content         TEXT NOT NULL,
  location        VARCHAR(30) NOT NULL DEFAULT 'body',
  pages           JSONB DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccb_company ON public.custom_code_blocks(company_id);

-- 9. URL REDIRECTS
CREATE TABLE IF NOT EXISTS public.url_redirects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_path     VARCHAR(500) NOT NULL,
  target_url      VARCHAR(500) NOT NULL,
  redirect_type   SMALLINT NOT NULL DEFAULT 301,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, source_path)
);

CREATE INDEX IF NOT EXISTS idx_ur_company ON public.url_redirects(company_id);

-- ════════════════════════════════════════════════════════════
-- FORM BUILDER
-- ════════════════════════════════════════════════════════════

-- 10. DYNAMIC FORMS
CREATE TABLE IF NOT EXISTS public.dynamic_forms (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title               VARCHAR(200) NOT NULL,
  name                VARCHAR(200),
  slug                VARCHAR(100),
  description         TEXT,
  form_type           VARCHAR(30) NOT NULL DEFAULT 'contact',
  settings            JSONB NOT NULL DEFAULT '{}',
  redirect_url        VARCHAR(500),
  submit_button_text  VARCHAR(100) DEFAULT 'Enviar',
  notification_emails JSONB DEFAULT '[]',
  success_message     TEXT,
  is_published        BOOLEAN NOT NULL DEFAULT false,
  published_at        TIMESTAMPTZ,
  submission_count    INTEGER NOT NULL DEFAULT 0,
  created_by          UUID REFERENCES public.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  UNIQUE(company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_df_company ON public.dynamic_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_df_type ON public.dynamic_forms(form_type);

-- 11. DYNAMIC FORM FIELDS
CREATE TABLE IF NOT EXISTS public.dynamic_form_fields (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES public.dynamic_forms(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  field_key       VARCHAR(100),
  field_type      VARCHAR(30) NOT NULL,
  label           VARCHAR(255) NOT NULL,
  placeholder     VARCHAR(255),
  required        BOOLEAN NOT NULL DEFAULT false,
  options         JSONB,
  validation_rules JSONB DEFAULT '{}',
  default_value   TEXT,
  settings        JSONB DEFAULT '{}',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dff_form ON public.dynamic_form_fields(form_id);

-- 12. DYNAMIC FORM SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.dynamic_form_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES public.dynamic_forms(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  form_data       JSONB NOT NULL DEFAULT '{}',
  submitter_name  VARCHAR(255),
  submitter_email VARCHAR(255),
  submitter_phone VARCHAR(50),
  source          VARCHAR(30) DEFAULT 'direct',
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'new',
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  read_by         UUID REFERENCES public.users(id),
  replied_at      TIMESTAMPTZ,
  replied_by      UUID REFERENCES public.users(id),
  reply_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dfs_form ON public.dynamic_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_dfs_company ON public.dynamic_form_submissions(company_id);

-- 13. FORM WORKFLOWS
CREATE TABLE IF NOT EXISTS public.form_workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID REFERENCES public.dynamic_forms(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  trigger_type    VARCHAR(50) NOT NULL,
  conditions      JSONB DEFAULT '[]',
  actions         JSONB DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fw_form ON public.form_workflows(form_id);

-- 14. FORM WORKFLOW LOGS
CREATE TABLE IF NOT EXISTS public.form_workflow_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID REFERENCES public.form_workflows(id) ON DELETE CASCADE,
  form_id         UUID REFERENCES public.dynamic_forms(id) ON DELETE CASCADE,
  triggered_by    UUID REFERENCES public.users(id),
  trigger_data    JSONB DEFAULT '{}',
  status          VARCHAR(30),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fwl_workflow ON public.form_workflow_logs(workflow_id);

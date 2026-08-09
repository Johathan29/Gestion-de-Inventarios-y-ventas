-- ============================================================
-- MIGRATION 035: DYNAMIC FORMS ENGINE
-- Forms, Fields, Submissions, Validation
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. DYNAMIC FORMS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dynamic_forms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,
  form_type       VARCHAR(30) NOT NULL DEFAULT 'contact',
  -- 'contact', 'booking', 'registration', 'quote', 'survey', 'newsletter', 'feedback', 'custom'
  
  -- Submission settings
  submit_action   VARCHAR(30) NOT NULL DEFAULT 'email',
  -- 'email', 'webhook', 'database', 'email+database', 'webhook+database'
  submit_email    VARCHAR(255),          -- where to send submissions
  submit_webhook  VARCHAR(500),          -- webhook URL
  redirect_url    VARCHAR(500),          -- redirect after submit
  success_message TEXT,                  -- custom success message
  
  -- Form behavior
  require_auth    BOOLEAN NOT NULL DEFAULT false,
  allow_anonymous BOOLEAN NOT NULL DEFAULT true,
  max_submissions INTEGER,               -- NULL = unlimited
  start_date      TIMESTAMPTZ,
  end_date        TIMESTAMPTZ,
  
  -- Anti-spam
  enable_captcha  BOOLEAN NOT NULL DEFAULT false,
  honeypot_field  VARCHAR(100),          -- hidden field name for bot detection
  
  -- Notification
  notify_on_submit BOOLEAN NOT NULL DEFAULT true,
  notification_emails TEXT[],            -- array of emails to notify
  
  -- Auto-response
  auto_response      BOOLEAN NOT NULL DEFAULT false,
  auto_response_subject VARCHAR(255),
  auto_response_body   TEXT,
  
  -- Styling
  theme           VARCHAR(30) DEFAULT 'default', -- 'default', 'minimal', 'boxed', 'transparent'
  custom_css      TEXT,
  custom_class    VARCHAR(255),
  
  -- Status
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  
  -- Stats (denormalized for performance)
  submission_count INTEGER NOT NULL DEFAULT 0,
  
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(company_id, slug)
);

COMMENT ON TABLE public.dynamic_forms IS 'Dynamic form definitions per tenant';

CREATE INDEX IF NOT EXISTS idx_dynamic_forms_company ON public.dynamic_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_forms_type ON public.dynamic_forms(form_type);
CREATE INDEX IF NOT EXISTS idx_dynamic_forms_slug ON public.dynamic_forms(company_id, slug);

-- ────────────────────────────────────────────────────────────
-- 2. DYNAMIC FORM FIELDS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dynamic_form_fields (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES public.dynamic_forms(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  field_type      VARCHAR(30) NOT NULL,
  -- 'text', 'email', 'phone', 'number', 'textarea', 'select', 'radio', 'checkbox',
  -- 'date', 'time', 'datetime', 'file', 'image', 'color', 'range', 'rating',
  -- 'heading', 'paragraph', 'divider', 'html', 'hidden'
  
  name            VARCHAR(100) NOT NULL,    -- field name / key
  label           VARCHAR(255) NOT NULL,    -- display label
  placeholder     VARCHAR(255),
  help_text       TEXT,
  default_value   TEXT,
  
  -- Validation
  is_required     BOOLEAN NOT NULL DEFAULT false,
  min_length      INTEGER,
  max_length      INTEGER,
  min_value       DECIMAL(12,2),
  max_value       DECIMAL(12,2),
  pattern         VARCHAR(500),             -- regex pattern
  pattern_message VARCHAR(255),             -- custom validation message
  
  -- Options for select/radio/checkbox
  options         JSONB DEFAULT '[]',
  -- [{ value: "opt1", label: "Option 1" }, ...]
  
  -- File fields
  accept_types    VARCHAR(500),             -- 'image/*,.pdf,.docx'
  max_file_size   INTEGER,                  -- in MB
  
  -- Conditional visibility
  conditions      JSONB DEFAULT '[]',
  -- [{ field: "field_name", operator: "equals", value: "some_value" }]
  
  -- Layout
  sort_order      INTEGER NOT NULL DEFAULT 0,
  column_span     INTEGER NOT NULL DEFAULT 1, -- 1-4 columns
  group_name      VARCHAR(100),              -- logical grouping
  
  -- Styling
  css_class       VARCHAR(255),
  
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  is_readonly     BOOLEAN NOT NULL DEFAULT false,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dynamic_form_fields IS 'Individual fields within a dynamic form';

CREATE INDEX IF NOT EXISTS idx_dff_form ON public.dynamic_form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_dff_company ON public.dynamic_form_fields(company_id);
CREATE INDEX IF NOT EXISTS idx_dff_sort ON public.dynamic_form_fields(form_id, sort_order);

-- ────────────────────────────────────────────────────────────
-- 3. DYNAMIC FORM SUBMISSIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dynamic_form_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES public.dynamic_forms(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Submitter info
  user_id         UUID REFERENCES public.users(id),  -- NULL if anonymous
  client_id       UUID REFERENCES public.clients(id), -- if linked to a client
  session_id      VARCHAR(255),
  
  -- Contact info (denormalized for easy search)
  submitter_name  VARCHAR(255),
  submitter_email VARCHAR(255),
  submitter_phone VARCHAR(50),
  
  -- Status
  status          VARCHAR(30) NOT NULL DEFAULT 'new',
  -- 'new', 'read', 'replied', 'spam', 'archived'
  
  -- Processing
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  read_by         UUID REFERENCES public.users(id),
  
  replied_at      TIMESTAMPTZ,
  replied_by      UUID REFERENCES public.users(id),
  reply_notes     TEXT,
  
  -- Source tracking
  source_url      VARCHAR(500),
  referrer_url    VARCHAR(500),
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  country_code    VARCHAR(2),
  
  -- Spam detection
  spam_score      DECIMAL(5,2) DEFAULT 0,
  is_spam         BOOLEAN NOT NULL DEFAULT false,
  
  -- Notification
  notified        BOOLEAN NOT NULL DEFAULT false,
  notified_at     TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dynamic_form_submissions IS 'Form submission records';

CREATE INDEX IF NOT EXISTS idx_dfs_form ON public.dynamic_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_dfs_company ON public.dynamic_form_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_dfs_status ON public.dynamic_form_submissions(form_id, status);
CREATE INDEX IF NOT EXISTS idx_dfs_created ON public.dynamic_form_submissions(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dfs_email ON public.dynamic_form_submissions(submitter_email);

-- ────────────────────────────────────────────────────────────
-- 4. DYNAMIC FORM SUBMISSION VALUES (EAV pattern)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dynamic_form_submission_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.dynamic_form_submissions(id) ON DELETE CASCADE,
  field_id        UUID NOT NULL REFERENCES public.dynamic_form_fields(id) ON DELETE CASCADE,
  field_name      VARCHAR(100) NOT NULL,
  value_text      TEXT,
  value_json      JSONB,
  value_file_url  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dynamic_form_submission_values IS 'Individual field values for each submission (EAV pattern)';

CREATE INDEX IF NOT EXISTS idx_dfs_values_submission ON public.dynamic_form_submission_values(submission_id);
CREATE INDEX IF NOT EXISTS idx_dfs_values_field ON public.dynamic_form_submission_values(field_id);

-- ────────────────────────────────────────────────────────────
-- 5. FORM FIELD FILES (uploaded files via form fields)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dynamic_form_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.dynamic_form_submissions(id) ON DELETE CASCADE,
  field_id        UUID NOT NULL REFERENCES public.dynamic_form_fields(id),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name       VARCHAR(255) NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       INTEGER,                -- bytes
  mime_type       VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dynamic_form_files IS 'Files uploaded through form submissions';

CREATE INDEX IF NOT EXISTS idx_dff_submission ON public.dynamic_form_files(submission_id);

-- ────────────────────────────────────────────────────────────
-- 6. RLS POLICIES
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.dynamic_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_form_submission_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_form_files ENABLE ROW LEVEL SECURITY;

-- Forms: company-scoped
CREATE POLICY "df_forms_select" ON public.dynamic_forms
  FOR SELECT USING (
    (company_id = public.get_current_company_id() AND deleted_at IS NULL)
    OR public.is_platform_admin()
  );
CREATE POLICY "df_forms_insert" ON public.dynamic_forms
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "df_forms_update" ON public.dynamic_forms
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "df_forms_delete" ON public.dynamic_forms
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Form Fields: company-scoped
CREATE POLICY "df_fields_select" ON public.dynamic_form_fields
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "df_fields_insert" ON public.dynamic_form_fields
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "df_fields_update" ON public.dynamic_form_fields
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "df_fields_delete" ON public.dynamic_form_fields
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Submissions: company-scoped; users can submit to any active form
CREATE POLICY "df_submissions_select" ON public.dynamic_form_submissions
  FOR SELECT USING (
    (company_id = public.get_current_company_id() AND public.is_company_admin())
    OR public.is_platform_admin()
  );
CREATE POLICY "df_submissions_insert" ON public.dynamic_form_submissions
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());

-- Submission Values: inherited from submission
CREATE POLICY "df_values_select" ON public.dynamic_form_submission_values
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dynamic_form_submissions s
      WHERE s.id = submission_id
        AND (
          (s.company_id = public.get_current_company_id() AND public.is_company_admin())
          OR public.is_platform_admin()
        )
    )
  );
CREATE POLICY "df_values_insert" ON public.dynamic_form_submission_values
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dynamic_form_submissions s
      WHERE s.id = submission_id AND s.company_id = public.get_current_company_id()
    )
  );

-- Files: company-scoped
CREATE POLICY "df_files_select" ON public.dynamic_form_files
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "df_files_insert" ON public.dynamic_form_files
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());

-- ────────────────────────────────────────────────────────────
-- 7. TRIGGERS
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at_dynamic_forms
  BEFORE UPDATE ON public.dynamic_forms FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_dff
  BEFORE UPDATE ON public.dynamic_form_fields FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_dfs
  BEFORE UPDATE ON public.dynamic_form_submissions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Auto-increment submission count on form
CREATE OR REPLACE FUNCTION public.fn_update_form_submission_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.dynamic_forms
  SET submission_count = submission_count + 1
  WHERE id = NEW.form_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_submission_count
  AFTER INSERT ON public.dynamic_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_form_submission_count();

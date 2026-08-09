-- ============================================================
-- MIGRATION 033: AURORA PLATFORM — CORE TENANT FUNCTIONS
-- Business Types, Platform Admin Functions, Company Enhancements
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. HELPER FUNCTIONS (public schema — NOT auth schema)
-- ────────────────────────────────────────────────────────────

-- Get current user ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID;
$$;

-- Get current company_id from JWT
CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::json->>'company_id', '')::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID
  );
$$;

-- Get current user role from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::json->>'role', ''),
    'customer'
  );
$$;

-- Check if current user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT public.get_current_user_role() = 'platform_admin';
$$;

-- Check if current user is company admin (or platform admin)
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT public.get_current_user_role() IN ('platform_admin', 'company_admin');
$$;

-- ────────────────────────────────────────────────────────────
-- 2. BUSINESS TYPES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  icon            VARCHAR(50),           -- icon name or emoji
  color_primary   VARCHAR(7) DEFAULT '#624200',
  color_secondary VARCHAR(7) DEFAULT '#815c03',
  color_accent    VARCHAR(7) DEFAULT '#dbb12b',
  color_bg        VARCHAR(7) DEFAULT '#ffffff',
  font_heading    VARCHAR(100) DEFAULT 'Inter',
  font_body       VARCHAR(100) DEFAULT 'Inter',
  font_size_title VARCHAR(10) DEFAULT '2.5rem',
  font_size_text  VARCHAR(10) DEFAULT '1rem',
  spacing_scale   VARCHAR(10) DEFAULT '1',
  border_radius   VARCHAR(10) DEFAULT '0.5rem',
  shadow_style    VARCHAR(20) DEFAULT 'md',
  visual_style    VARCHAR(30) DEFAULT 'modern',   -- modern/classic/minimal/bold
  catalog_type    VARCHAR(30) DEFAULT 'standard', -- standard/menu/service/mixed
  product_type    VARCHAR(30) DEFAULT 'physical', -- physical/digital/service/food/mixed
  checkout_type   VARCHAR(30) DEFAULT 'standard', -- standard/quick/booking/subscription
  form_type       VARCHAR(30) DEFAULT 'contact',  -- contact/booking/registration/quote
  settings        JSONB DEFAULT '{}',             -- extensible settings
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.business_types IS 'Configurable business type templates for Aurora Platform tenants';

-- ────────────────────────────────────────────────────────────
-- 3. BUSINESS TYPE MODULES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_type_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_id UUID NOT NULL REFERENCES public.business_types(id) ON DELETE CASCADE,
  module_slug     VARCHAR(100) NOT NULL,   -- 'catalog', 'inventory', 'pos', 'ecommerce', 'crm', etc.
  module_name     VARCHAR(200) NOT NULL,
  description     TEXT,
  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  is_core         BOOLEAN NOT NULL DEFAULT false, -- cannot be disabled
  config          JSONB DEFAULT '{}',       -- module-specific config
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_type_id, module_slug)
);

COMMENT ON TABLE public.business_type_modules IS 'Which modules each business type enables';

-- ────────────────────────────────────────────────────────────
-- 4. BUSINESS TYPE FEATURES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_type_features (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_id UUID NOT NULL REFERENCES public.business_types(id) ON DELETE CASCADE,
  feature_slug    VARCHAR(100) NOT NULL,
  feature_name    VARCHAR(200) NOT NULL,
  description     TEXT,
  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  config          JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_type_id, feature_slug)
);

COMMENT ON TABLE public.business_type_features IS 'Feature flags per business type';

-- ────────────────────────────────────────────────────────────
-- 5. BUSINESS TYPE TEMPLATES (default page/component layouts)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_type_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_id UUID NOT NULL REFERENCES public.business_types(id) ON DELETE CASCADE,
  template_type   VARCHAR(50) NOT NULL,   -- 'homepage', 'product_page', 'category_page', 'checkout'
  template_name   VARCHAR(200) NOT NULL,
  description     TEXT,
  layout          JSONB NOT NULL DEFAULT '[]', -- ordered list of component configs
  is_default      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_type_id, template_type)
);

COMMENT ON TABLE public.business_type_templates IS 'Default page templates per business type';

-- ────────────────────────────────────────────────────────────
-- 6. BUSINESS TYPE THEMES (default theme per business type)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_type_themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_id UUID NOT NULL REFERENCES public.business_types(id) ON DELETE CASCADE,
  theme_name      VARCHAR(200) NOT NULL,
  settings        JSONB NOT NULL DEFAULT '{}',
  is_default      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.business_type_themes IS 'Default theme configuration per business type';

-- ────────────────────────────────────────────────────────────
-- 7. COMPANY ENHANCEMENTS
-- ────────────────────────────────────────────────────────────

-- Add Aurora Platform columns to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS business_type_id UUID REFERENCES public.business_types(id),
  ADD COLUMN IF NOT EXISTS slug              VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description       TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url       TEXT,
  ADD COLUMN IF NOT EXISTS theme_id          UUID,  -- will reference themes table
  ADD COLUMN IF NOT EXISTS plan              VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise', 'custom')),
  ADD COLUMN IF NOT EXISTS plan_expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_users         INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_products      INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS max_storage_mb    INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS timezone          VARCHAR(50) DEFAULT 'America/Santo_Domingo',
  ADD COLUMN IF NOT EXISTS locale            VARCHAR(10) DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS currency_code     VARCHAR(3) DEFAULT 'DOP',
  ADD COLUMN IF NOT EXISTS tax_rate          DECIMAL(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS meta_title        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS meta_description  TEXT,
  ADD COLUMN IF NOT EXISTS meta_keywords     TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url      TEXT,
  ADD COLUMN IF NOT EXISTS is_platform       BOOLEAN NOT NULL DEFAULT false, -- true for platform admin companies
  ADD COLUMN IF NOT EXISTS deactivated_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by    UUID,
  ADD COLUMN IF NOT EXISTS deactivated_reason TEXT;

-- Add slug uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_slug_unique'
  ) THEN
    ALTER TABLE public.companies ADD CONSTRAINT companies_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 8. USER ROLES (junction table for multi-role support)
-- ────────────────────────────────────────────────────────────

-- Extend the existing 'roles' table to support platform-level roles
-- Add a type column to distinguish platform vs company roles
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS role_type VARCHAR(30) DEFAULT 'company' CHECK (role_type IN ('platform', 'company', 'system')),
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false, -- cannot be deleted
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT false; -- available to all companies

-- Add platform_admin role if not exists
INSERT INTO public.roles (name, description, permissions, role_type, is_system, is_global)
VALUES (
  'platform_admin',
  'Administrador global de la plataforma Aurora',
  '{"*": true}',
  'platform',
  true,
  true
)
ON CONFLICT (name) DO UPDATE SET
  role_type = 'platform',
  is_system = true,
  is_global = true,
  permissions = '{"*": true}';

-- Add company_admin role if not exists
INSERT INTO public.roles (name, description, permissions, role_type, is_system, is_global)
VALUES (
  'company_admin',
  'Administrador de empresa con acceso completo a su tenant',
  '{"*": true}',
  'company',
  true,
  false
)
ON CONFLICT (name) DO UPDATE SET
  role_type = 'company',
  is_system = true,
  permissions = '{"*": true}';

-- Add company_manager role if not exists
INSERT INTO public.roles (name, description, permissions, role_type, is_system, is_global)
VALUES (
  'company_manager',
  'Gerente de empresa con acceso limitado a módulos asignados',
  '{"catalog": true, "inventory": true, "sales": true, "reports": true}',
  'company',
  true,
  false
)
ON CONFLICT (name) DO UPDATE SET
  role_type = 'company',
  is_system = true;

-- Add employee role if not exists
INSERT INTO public.roles (name, description, permissions, role_type, is_system, is_global)
VALUES (
  'employee',
  'Empleado con acceso operacional a módulos asignados',
  '{"catalog": "read", "inventory": "read", "sales": "readwrite"}',
  'company',
  true,
  false
)
ON CONFLICT (name) DO UPDATE SET
  role_type = 'company',
  is_system = true;

-- ────────────────────────────────────────────────────────────
-- 9. PLATFORM MODULES REGISTRY
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(50) NOT NULL, -- 'core', 'catalog', 'sales', 'inventory', 'cms', 'marketing', 'finance', 'reporting'
  is_core         BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  icon            VARCHAR(50),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  config_schema   JSONB DEFAULT '{}',   -- JSON Schema for module config
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_modules IS 'Registry of all available modules in the Aurora Platform';

-- ────────────────────────────────────────────────────────────
-- 10. COMPANY MODULE SUBSCRIPTIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.company_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_id       UUID NOT NULL REFERENCES public.platform_modules(id) ON DELETE CASCADE,
  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  config          JSONB DEFAULT '{}',
  enabled_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, module_id)
);

COMMENT ON TABLE public.company_modules IS 'Which platform modules each company has enabled';

-- ────────────────────────────────────────────────────────────
-- 11. INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_business_types_slug ON public.business_types(slug);
CREATE INDEX IF NOT EXISTS idx_business_types_active ON public.business_types(is_active);
CREATE INDEX IF NOT EXISTS idx_bt_modules_type ON public.business_type_modules(business_type_id);
CREATE INDEX IF NOT EXISTS idx_bt_features_type ON public.business_type_features(business_type_id);
CREATE INDEX IF NOT EXISTS idx_bt_templates_type ON public.business_type_templates(business_type_id);
CREATE INDEX IF NOT EXISTS idx_bt_themes_type ON public.business_type_themes(business_type_id);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_business_type ON public.companies(business_type_id);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);
CREATE INDEX IF NOT EXISTS idx_platform_modules_slug ON public.platform_modules(slug);
CREATE INDEX IF NOT EXISTS idx_platform_modules_category ON public.platform_modules(category);
CREATE INDEX IF NOT EXISTS idx_company_modules_company ON public.company_modules(company_id);
CREATE INDEX IF NOT EXISTS idx_company_modules_module ON public.company_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_roles_type ON public.roles(role_type);

-- ────────────────────────────────────────────────────────────
-- 12. RLS POLICIES
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_type_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_type_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_type_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_type_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

-- Business types: everyone authenticated can read, platform_admin can manage
CREATE POLICY "business_types_select" ON public.business_types FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "business_types_insert" ON public.business_types FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY "business_types_update" ON public.business_types FOR UPDATE USING (public.is_platform_admin());
CREATE POLICY "business_types_delete" ON public.business_types FOR DELETE USING (public.is_platform_admin());

-- Business type modules: read for all, manage for platform_admin
CREATE POLICY "bt_modules_select" ON public.business_type_modules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "bt_modules_insert" ON public.business_type_modules FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY "bt_modules_update" ON public.business_type_modules FOR UPDATE USING (public.is_platform_admin());
CREATE POLICY "bt_modules_delete" ON public.business_type_modules FOR DELETE USING (public.is_platform_admin());

-- Business type features: read for all, manage for platform_admin
CREATE POLICY "bt_features_select" ON public.business_type_features FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "bt_features_insert" ON public.business_type_features FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY "bt_features_update" ON public.business_type_features FOR UPDATE USING (public.is_platform_admin());
CREATE POLICY "bt_features_delete" ON public.business_type_features FOR DELETE USING (public.is_platform_admin());

-- Business type templates: read for all, manage for platform_admin
CREATE POLICY "bt_templates_select" ON public.business_type_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "bt_templates_insert" ON public.business_type_templates FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY "bt_templates_update" ON public.business_type_templates FOR UPDATE USING (public.is_platform_admin());
CREATE POLICY "bt_templates_delete" ON public.business_type_templates FOR DELETE USING (public.is_platform_admin());

-- Business type themes: read for all, manage for platform_admin
CREATE POLICY "bt_themes_select" ON public.business_type_themes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "bt_themes_insert" ON public.business_type_themes FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY "bt_themes_update" ON public.business_type_themes FOR UPDATE USING (public.is_platform_admin());
CREATE POLICY "bt_themes_delete" ON public.business_type_themes FOR DELETE USING (public.is_platform_admin());

-- Platform modules: read for all, manage for platform_admin
CREATE POLICY "platform_modules_select" ON public.platform_modules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "platform_modules_insert" ON public.platform_modules FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY "platform_modules_update" ON public.platform_modules FOR UPDATE USING (public.is_platform_admin());
CREATE POLICY "platform_modules_delete" ON public.platform_modules FOR DELETE USING (public.is_platform_admin());

-- Company modules: scoped to own company
CREATE POLICY "company_modules_select" ON public.company_modules
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "company_modules_insert" ON public.company_modules
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id() AND public.is_company_admin());
CREATE POLICY "company_modules_update" ON public.company_modules
  FOR UPDATE USING (company_id = public.get_current_company_id() AND public.is_company_admin());
CREATE POLICY "company_modules_delete" ON public.company_modules
  FOR DELETE USING (company_id = public.get_current_company_id() AND public.is_company_admin());

-- ────────────────────────────────────────────────────────────
-- 13. TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Auto updated_at for new tables
CREATE TRIGGER set_updated_at_business_types
  BEFORE UPDATE ON public.business_types FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_bt_templates
  BEFORE UPDATE ON public.business_type_templates FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_bt_themes
  BEFORE UPDATE ON public.business_type_themes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_platform_modules
  BEFORE UPDATE ON public.platform_modules FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_company_modules
  BEFORE UPDATE ON public.company_modules FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

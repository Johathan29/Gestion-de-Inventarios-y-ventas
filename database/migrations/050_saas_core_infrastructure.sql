-- ============================================================================
-- Migration 050: SaaS Core Multi-Tenant Infrastructure
-- ============================================================================
-- Adds the foundational tables required for true multi-tenancy:
--   1. user_companies         – many-to-many user ↔ company
--   2. custom_roles           – company-created roles
--   3. custom_role_permissions – permissions for custom roles
--   4. two_factor_secrets     – TOTP 2FA per user
--   5. backup_codes           – recovery codes for 2FA
--   6. active_sessions        – session tracking & management
--   7. session_policies       – per-company session limits
--   8. password_policies      – per-company password rules
--   9. feature_flags          – global toggleable features
--  10. company_features       – per-company feature overrides
--  11. usage_metrics          – track resource consumption
--  12. company_audit_logs     – structured per-company audit trail
--
-- Idempotent: uses IF NOT EXISTS / CREATE OR REPLACE everywhere.
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- 0. Extension check
-- ──────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────────────
-- Helper: updated_at trigger (idempotent)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. USER ↔ COMPANY MAPPING (many-to-many)
-- ============================================================================
-- Existing: users.company_id (single company per user).
-- New table allows a single user to belong to multiple companies with
-- different roles in each.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_id         INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by      UUID REFERENCES public.users(id),
  deactivated_at  TIMESTAMPTZ,
  deactivated_by  UUID REFERENCES public.users(id),
  deactivation_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_company UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_companies_user ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON public.user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_role ON public.user_companies(role_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_primary ON public.user_companies(user_id, is_primary) WHERE is_primary = TRUE;

DROP TRIGGER IF EXISTS trg_user_companies_updated ON public.user_companies;
CREATE TRIGGER trg_user_companies_updated
  BEFORE UPDATE ON public.user_companies
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

COMMENT ON TABLE  public.user_companies IS 'Maps users to companies (many-to-many). Replaces single user.company_id for multi-tenant access.';
COMMENT ON COLUMN public.user_companies.is_primary IS 'TRUE for the user default/active company. Exactly one per user.';
COMMENT ON COLUMN public.user_companies.role_id IS 'Role within this specific company. Different companies can have different roles for the same user.';

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS: user_companies
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uc_select_own ON public.user_companies;
CREATE POLICY uc_select_own ON public.user_companies
  FOR SELECT USING (
    user_id = public.get_current_user_id()
    OR public.is_platform_admin()
    OR company_id = public.get_current_company_id()
  );

DROP POLICY IF EXISTS uc_insert_platform ON public.user_companies;
CREATE POLICY uc_insert_platform ON public.user_companies
  FOR INSERT WITH CHECK (
    public.is_platform_admin()
    OR public.is_company_admin()
  );

DROP POLICY IF EXISTS uc_update_platform ON public.user_companies;
CREATE POLICY uc_update_platform ON public.user_companies
  FOR UPDATE USING (
    public.is_platform_admin()
    OR public.is_company_admin()
  );

DROP POLICY IF EXISTS uc_delete_platform ON public.user_companies;
CREATE POLICY uc_delete_platform ON public.user_companies
  FOR DELETE USING (
    public.is_platform_admin()
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- Function: get_user_companies(user_id) – returns all companies for a user
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_companies(p_user_id UUID)
RETURNS TABLE (
  company_id      UUID,
  company_name    VARCHAR,
  company_slug    VARCHAR,
  role_id         INTEGER,
  role_name       VARCHAR,
  is_primary      BOOLEAN,
  is_active       BOOLEAN,
  joined_at       TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS company_id,
    c.name AS company_name,
    c.slug AS company_slug,
    uc.role_id,
    r.name AS role_name,
    uc.is_primary,
    uc.is_active,
    uc.joined_at
  FROM public.user_companies uc
  JOIN public.companies c ON c.id = uc.company_id
  JOIN public.roles r ON r.id = uc.role_id
  WHERE uc.user_id = p_user_id
  ORDER BY uc.is_primary DESC, uc.joined_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────────────
-- Function: set_primary_company – set the primary company for a user
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_primary_company(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify membership
  IF NOT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = p_user_id AND company_id = p_company_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'User % is not an active member of company %', p_user_id, p_company_id;
  END IF;

  -- Unset current primary
  UPDATE public.user_companies
  SET is_primary = FALSE
  WHERE user_id = p_user_id AND is_primary = TRUE;

  -- Set new primary
  UPDATE public.user_companies
  SET is_primary = TRUE
  WHERE user_id = p_user_id AND company_id = p_company_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────────────
-- Function: add_user_to_company – invite / add a user to a company
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_user_to_company(
  p_user_id UUID,
  p_company_id UUID,
  p_role_id INTEGER,
  p_invited_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_is_first BOOLEAN;
BEGIN
  -- Check if already a member
  SELECT id INTO v_id
  FROM public.user_companies
  WHERE user_id = p_user_id AND company_id = p_company_id;

  IF v_id IS NOT NULL THEN
    -- Reactivate if inactive
    UPDATE public.user_companies
    SET is_active = TRUE, role_id = p_role_id, deactivated_at = NULL
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  -- Check if this is the user's first company
  SELECT COUNT(*) = 0 INTO v_is_first
  FROM public.user_companies WHERE user_id = p_user_id;

  INSERT INTO public.user_companies (user_id, company_id, role_id, is_primary, invited_by)
  VALUES (p_user_id, p_company_id, p_role_id, v_is_first, p_invited_by)
  RETURNING id INTO v_id;

  -- Also set user.company_id for backwards compatibility
  IF v_is_first THEN
    UPDATE public.users SET company_id = p_company_id WHERE id = p_user_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2. CUSTOM ROLES (company-created, not system-wide)
-- ============================================================================
-- Extends the existing `roles` table concept. Company admins can create
-- custom roles scoped to their company.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,
  color           VARCHAR(7) DEFAULT '#6366f1',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  parent_role_id  INTEGER REFERENCES public.roles(id),
  max_users       INTEGER,                   -- limit: how many users can have this role
  current_users   INTEGER NOT NULL DEFAULT 0,
  settings        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_custom_role_company_slug UNIQUE (company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_company ON public.custom_roles(company_id);

DROP TRIGGER IF EXISTS trg_custom_roles_updated ON public.custom_roles;
CREATE TRIGGER trg_custom_roles_updated
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

COMMENT ON TABLE public.custom_roles IS 'Roles created by company admins. Scoped per company, cannot conflict with system roles.';

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cr_select ON public.custom_roles;
CREATE POLICY cr_select ON public.custom_roles
  FOR SELECT USING (
    company_id = public.get_current_company_id()
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS cr_manage ON public.custom_roles;
CREATE POLICY cr_manage ON public.custom_roles
  FOR ALL USING (
    public.is_platform_admin()
    OR (public.is_company_admin() AND company_id = public.get_current_company_id())
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- custom_role_permissions (junction: custom_roles ↔ permissions)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_role_permissions (
  id              SERIAL PRIMARY KEY,
  custom_role_id  UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_id   INTEGER NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted         BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by      UUID REFERENCES public.users(id),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_custom_role_perm UNIQUE (custom_role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_crp_role ON public.custom_role_permissions(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_crp_permission ON public.custom_role_permissions(permission_id);

ALTER TABLE public.custom_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crp_select ON public.custom_role_permissions;
CREATE POLICY crp_select ON public.custom_role_permissions
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS crp_manage ON public.custom_role_permissions;
CREATE POLICY crp_manage ON public.custom_role_permissions
  FOR ALL USING (
    public.is_platform_admin()
    OR public.is_company_admin()
  );


-- ============================================================================
-- 3. TWO-FACTOR AUTHENTICATION (2FA / TOTP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.two_factor_secrets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  secret          VARCHAR(255) NOT NULL,        -- encrypted TOTP secret
  algorithm       VARCHAR(10) NOT NULL DEFAULT 'SHA1',
  digits          INTEGER NOT NULL DEFAULT 6,
  period          INTEGER NOT NULL DEFAULT 30,  -- seconds per code
  issuer          VARCHAR(100),
  label           VARCHAR(255),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at     TIMESTAMPTZ,                  -- NULL until user confirms first code
  last_used_at    TIMESTAMPTZ,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_2fa_user UNIQUE (user_id)
);

DROP TRIGGER IF EXISTS trg_2fa_updated ON public.two_factor_secrets;
CREATE TRIGGER trg_2fa_updated
  BEFORE UPDATE ON public.two_factor_secrets
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

COMMENT ON TABLE public.two_factor_secrets IS 'TOTP 2FA secrets. One per user. Secret is encrypted at rest.';

-- ──────────────────────────────────────────────────────────────────────────────
-- Backup / recovery codes for 2FA
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.backup_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code_hash       VARCHAR(255) NOT NULL,        -- bcrypt hash
  is_used         BOOLEAN NOT NULL DEFAULT FALSE,
  used_at         TIMESTAMPTZ,
  used_from_ip    INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON public.backup_codes(user_id);

COMMENT ON TABLE public.backup_codes IS 'One-time recovery codes for 2FA. 10 codes generated when 2FA is enabled.';


-- ============================================================================
-- 4. SESSION MANAGEMENT
-- ============================================================================
-- Tracks active sessions for security visibility and enforcement.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES public.companies(id),
  token_jti       VARCHAR(255) NOT NULL,        -- JWT jti claim
  refresh_token   VARCHAR(500),
  ip_address      INET,
  user_agent      TEXT,
  device_type     VARCHAR(20),                  -- 'desktop', 'mobile', 'tablet', 'api'
  device_name     VARCHAR(200),
  location_city   VARCHAR(100),
  location_country VARCHAR(3),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_activity   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.active_sessions(token_jti);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.active_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.active_sessions(expires_at);

COMMENT ON TABLE public.active_sessions IS 'Tracks all active user sessions for security monitoring and enforcement.';

-- ──────────────────────────────────────────────────────────────────────────────
-- Session policies per company
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_policies (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  max_concurrent_sessions     INTEGER NOT NULL DEFAULT 5,
  session_timeout_minutes     INTEGER NOT NULL DEFAULT 480,   -- 8 hours
  idle_timeout_minutes        INTEGER NOT NULL DEFAULT 30,
  require_2fa_for_admin       BOOLEAN NOT NULL DEFAULT FALSE,
  allow_mobile_sessions       BOOLEAN NOT NULL DEFAULT TRUE,
  allow_api_keys              BOOLEAN NOT NULL DEFAULT FALSE,
  enforce_ip_restriction      BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_ip_ranges           JSONB NOT NULL DEFAULT '[]',    -- ["192.168.1.0/24", ...]
  notify_new_session          BOOLEAN NOT NULL DEFAULT TRUE,
  max_failed_login_attempts   INTEGER NOT NULL DEFAULT 5,
  lockout_duration_minutes    INTEGER NOT NULL DEFAULT 15,
  password_expiry_days        INTEGER,                         -- NULL = never expires
  settings                    JSONB NOT NULL DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_session_policy_company UNIQUE (company_id)
);

DROP TRIGGER IF EXISTS trg_session_policies_updated ON public.session_policies;
CREATE TRIGGER trg_session_policies_updated
  BEFORE UPDATE ON public.session_policies
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

COMMENT ON TABLE public.session_policies IS 'Per-company security session policies. Controls concurrent sessions, timeouts, 2FA requirements.';


-- ============================================================================
-- 5. PASSWORD POLICIES (per company)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.password_policies (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  min_length                  INTEGER NOT NULL DEFAULT 8,
  max_length                  INTEGER NOT NULL DEFAULT 128,
  require_uppercase           BOOLEAN NOT NULL DEFAULT TRUE,
  require_lowercase           BOOLEAN NOT NULL DEFAULT TRUE,
  require_numbers             BOOLEAN NOT NULL DEFAULT TRUE,
  require_special_chars       BOOLEAN NOT NULL DEFAULT FALSE,
  min_unique_chars            INTEGER NOT NULL DEFAULT 4,
  disallow_spaces             BOOLEAN NOT NULL DEFAULT TRUE,
  disallow_username_in_pass   BOOLEAN NOT NULL DEFAULT TRUE,
  history_count               INTEGER NOT NULL DEFAULT 5,      -- last N passwords cannot be reused
  max_age_days                INTEGER,                          -- NULL = never expires
  lockout_threshold           INTEGER NOT NULL DEFAULT 5,
  lockout_duration_minutes    INTEGER NOT NULL DEFAULT 15,
  reset_token_expiry_minutes  INTEGER NOT NULL DEFAULT 30,
  settings                    JSONB NOT NULL DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_password_policy_company UNIQUE (company_id)
);

DROP TRIGGER IF EXISTS trg_password_policies_updated ON public.password_policies;
CREATE TRIGGER trg_password_policies_updated
  BEFORE UPDATE ON public.password_policies
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

COMMENT ON TABLE public.password_policies IS 'Per-company password complexity and history policies.';

-- ──────────────────────────────────────────────────────────────────────────────
-- Password history (to enforce reuse prevention)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.password_history (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash   VARCHAR(255) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON public.password_history(user_id, created_at DESC);

COMMENT ON TABLE public.password_history IS 'Stores recent password hashes to prevent reuse.';


-- ============================================================================
-- 6. FEATURE FLAGS
-- ============================================================================
-- Global flags + per-plan defaults + per-company overrides.
-- The evaluation order is: company override > plan default > global default.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(50) NOT NULL DEFAULT 'general',  -- 'core', 'erp', 'cms', 'marketing', 'ecommerce', 'advanced', 'general'
  flag_type       VARCHAR(20) NOT NULL DEFAULT 'boolean',   -- 'boolean', 'percentage', 'variant', 'json'
  default_value   JSONB NOT NULL DEFAULT 'true',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,           -- system flags cannot be disabled
  metadata        JSONB NOT NULL DEFAULT '{}',               -- { allowed_values, min, max, etc. }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ff_slug ON public.feature_flags(slug);
CREATE INDEX IF NOT EXISTS idx_ff_category ON public.feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_ff_active ON public.feature_flags(is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_ff_updated ON public.feature_flags;
CREATE TRIGGER trg_ff_updated
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

COMMENT ON TABLE public.feature_flags IS 'Global feature flags. Evaluated: company override > plan default > global default.';

-- ──────────────────────────────────────────────────────────────────────────────
-- Per-plan feature flag defaults (extends existing plan_features)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_feature_flags (
  id              SERIAL PRIMARY KEY,
  plan_id         INTEGER NOT NULL REFERENCES public.saas_plans(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  value           JSONB NOT NULL DEFAULT 'true',
  config          JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_plan_ff UNIQUE (plan_id, feature_flag_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_ff_plan ON public.plan_feature_flags(plan_id);

COMMENT ON TABLE public.plan_feature_flags IS 'Default feature flag values per subscription plan.';

-- ──────────────────────────────────────────────────────────────────────────────
-- Per-company feature flag overrides
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_features (
  id              SERIAL PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  value           JSONB NOT NULL DEFAULT 'true',
  reason          TEXT,                                  -- why the override was granted
  granted_by      UUID REFERENCES public.users(id),
  expires_at      TIMESTAMPTZ,                           -- NULL = permanent
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_company_feature UNIQUE (company_id, feature_flag_id)
);

CREATE INDEX IF NOT EXISTS idx_cf_company ON public.company_features(company_id);

DROP TRIGGER IF EXISTS trg_cf_updated ON public.company_features;
CREATE TRIGGER trg_cf_updated
  BEFORE UPDATE ON public.company_features
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

COMMENT ON TABLE public.company_features IS 'Per-company feature flag overrides. Takes precedence over plan defaults.';

-- ──────────────────────────────────────────────────────────────────────────────
-- Function: evaluate_feature_flag(company_id, flag_slug) → JSONB
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.evaluate_feature_flag(
  p_company_id UUID,
  p_flag_slug  VARCHAR(100)
)
RETURNS JSONB AS $$
DECLARE
  v_result    JSONB;
  v_flag      RECORD;
BEGIN
  -- 1. Check if flag exists and is active
  SELECT * INTO v_flag
  FROM public.feature_flags
  WHERE slug = p_flag_slug AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN 'false'::JSONB;
  END IF;

  -- 2. Company override (highest priority)
  SELECT cf.value INTO v_result
  FROM public.company_features cf
  WHERE cf.company_id = p_company_id
    AND cf.feature_flag_id = v_flag.id
    AND (cf.expires_at IS NULL OR cf.expires_at > NOW());

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  -- 3. Plan default (via company subscription → plan → plan_feature_flags)
  SELECT pff.value INTO v_result
  FROM public.company_subscriptions cs
  JOIN public.plan_feature_flags pff ON pff.plan_id = cs.plan_id
  WHERE cs.company_id = p_company_id
    AND cs.status IN ('active', 'trialing')
    AND pff.feature_flag_id = v_flag.id
  ORDER BY cs.created_at DESC
  LIMIT 1;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  -- 4. Global default
  RETURN v_flag.default_value;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────────────
-- Function: check_feature_enabled(company_id, flag_slug) → BOOLEAN
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_feature_enabled(
  p_company_id UUID,
  p_flag_slug  VARCHAR(100)
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.evaluate_feature_flag(p_company_id, p_flag_slug))::BOOLEAN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────────────
-- Function: get_company_features(company_id) → TABLE(slug, value, category)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_company_features(p_company_id UUID)
RETURNS TABLE (
  flag_slug   VARCHAR(100),
  flag_name   VARCHAR(200),
  category    VARCHAR(50),
  value       JSONB,
  source      TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ff.slug AS flag_slug,
    ff.name AS flag_name,
    ff.category,
    public.evaluate_feature_flag(p_company_id, ff.slug) AS value,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.company_features cf
        WHERE cf.company_id = p_company_id AND cf.feature_flag_id = ff.id
          AND (cf.expires_at IS NULL OR cf.expires_at > NOW())
      ) THEN 'company_override'
      WHEN EXISTS (
        SELECT 1 FROM public.plan_feature_flags pff
        JOIN public.company_subscriptions cs ON cs.plan_id = pff.plan_id
        WHERE cs.company_id = p_company_id AND pff.feature_flag_id = ff.id
          AND cs.status IN ('active', 'trialing')
      ) THEN 'plan_default'
      ELSE 'global_default'
    END AS source
  FROM public.feature_flags ff
  WHERE ff.is_active = TRUE
  ORDER BY ff.category, ff.slug;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================================
-- 7. USAGE METRICS (track resource consumption)
-- ============================================================================
-- Periodic snapshots of resource usage per company, used for limit enforcement
-- and billing.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_type     VARCHAR(50) NOT NULL,
    -- 'users', 'products', 'clients', 'branches', 'forms', 'pages',
    -- 'api_calls', 'storage_mb', 'emails_sent', 'sms_sent',
    -- 'webhooks', 'automations', 'media_files'
  metric_name     VARCHAR(100) NOT NULL,
  current_value   BIGINT NOT NULL DEFAULT 0,
  limit_value     BIGINT,                              -- NULL = unlimited
  period_start    TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
  period_end      TIMESTAMPTZ NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second'),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usage_metric UNIQUE (company_id, metric_type, metric_name, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_company ON public.usage_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_type ON public.usage_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_usage_period ON public.usage_metrics(period_start, period_end);

DROP TRIGGER IF EXISTS trg_usage_updated ON public.usage_metrics;
CREATE TRIGGER trg_usage_updated
  BEFORE UPDATE ON public.usage_metrics
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

COMMENT ON TABLE public.usage_metrics IS 'Tracks per-company resource usage for limit enforcement and billing.';

-- ──────────────────────────────────────────────────────────────────────────────
-- Function: increment_usage(company_id, metric_type, metric_name, amount)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_company_id  UUID,
  p_metric_type VARCHAR(50),
  p_metric_name VARCHAR(100),
  p_amount      BIGINT DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_row       RECORD;
  v_new_val   BIGINT;
  v_limit     BIGINT;
  v_allowed   BOOLEAN;
BEGIN
  -- Upsert the usage row for current period
  INSERT INTO public.usage_metrics (company_id, metric_type, metric_name, current_value, period_start, period_end)
  VALUES (
    p_company_id,
    p_metric_type,
    p_metric_name,
    p_amount,
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second'
  )
  ON CONFLICT (company_id, metric_type, metric_name, period_start)
  DO UPDATE SET
    current_value = public.usage_metrics.current_value + p_amount,
    updated_at = NOW()
  RETURNING current_value, limit_value INTO v_new_val, v_limit;

  v_allowed := (v_limit IS NULL) OR (v_new_val <= v_limit);

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current', v_new_val,
    'limit', v_limit,
    'remaining', CASE WHEN v_limit IS NULL THEN NULL ELSE GREATEST(0, v_limit - v_new_val) END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────────────
-- Function: check_usage_limit(company_id, metric_type, metric_name) → JSONB
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_usage_limit(
  p_company_id  UUID,
  p_metric_type VARCHAR(50),
  p_metric_name VARCHAR(100)
)
RETURNS JSONB AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT current_value, limit_value INTO v_row
  FROM public.usage_metrics
  WHERE company_id = p_company_id
    AND metric_type = p_metric_type
    AND metric_name = p_metric_name
    AND period_start = DATE_TRUNC('month', NOW());

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'current', 0,
      'limit', NULL,
      'remaining', NULL,
      'usage_pct', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', (v_row.limit_value IS NULL OR v_row.current_value < v_row.limit_value),
    'current', v_row.current_value,
    'limit', v_row.limit_value,
    'remaining', CASE WHEN v_row.limit_value IS NULL THEN NULL ELSE GREATEST(0, v_row.limit_value - v_row.current_value) END,
    'usage_pct', CASE WHEN v_row.limit_value IS NULL OR v_row.limit_value = 0 THEN 0
                       ELSE ROUND((v_row.current_value::NUMERIC / v_row.limit_value) * 100, 1) END
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================================
-- 8. COMPANY AUDIT LOGS (structured, per-company)
-- ============================================================================
-- Enhanced audit trail replacing or supplementing the existing simple audit_logs.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES public.users(id),
  actor_email     VARCHAR(255),
  actor_name      VARCHAR(255),
  actor_role      VARCHAR(100),
  action          VARCHAR(50) NOT NULL,
    -- 'create', 'update', 'delete', 'login', 'logout', 'export',
    -- 'import', 'approve', 'reject', 'activate', 'deactivate',
    -- 'permission_grant', 'permission_revoke', 'role_create', 'role_update',
    -- 'settings_change', 'subscription_change', 'feature_toggle'
  entity_type     VARCHAR(100) NOT NULL,
    -- 'user', 'product', 'sale', 'invoice', 'category', 'client',
    -- 'role', 'permission', 'settings', 'subscription', 'page',
    -- 'form', 'media', 'webhook', 'automation', 'theme'
  entity_id       VARCHAR(100),
  entity_name     VARCHAR(255),
  action_summary  TEXT NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  metadata        JSONB NOT NULL DEFAULT '{}',
  ip_address      INET,
  user_agent      TEXT,
  session_id      UUID,
  severity        VARCHAR(10) NOT NULL DEFAULT 'info',  -- 'info', 'warning', 'critical'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cal_company ON public.company_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_cal_actor ON public.company_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_cal_entity ON public.company_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cal_action ON public.company_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_cal_created ON public.company_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cal_severity ON public.company_audit_logs(severity) WHERE severity IN ('warning', 'critical');

COMMENT ON TABLE public.company_audit_logs IS 'Structured audit trail per company. Records all significant actions with old/new values.';

ALTER TABLE public.company_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cal_select ON public.company_audit_logs;
CREATE POLICY cal_select ON public.company_audit_logs
  FOR SELECT USING (
    company_id = public.get_current_company_id()
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS cal_insert ON public.company_audit_logs;
CREATE POLICY cal_insert ON public.company_audit_logs
  FOR INSERT WITH CHECK (TRUE);   -- any authenticated user can log (server-side inserts)

-- ──────────────────────────────────────────────────────────────────────────────
-- Function: log_company_audit(...)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_company_audit(
  p_company_id    UUID,
  p_actor_id      UUID,
  p_action        VARCHAR(50),
  p_entity_type   VARCHAR(100),
  p_entity_id     VARCHAR(100) DEFAULT NULL,
  p_entity_name   VARCHAR(255) DEFAULT NULL,
  p_summary       TEXT DEFAULT NULL,
  p_old_values    JSONB DEFAULT NULL,
  p_new_values    JSONB DEFAULT NULL,
  p_metadata      JSONB DEFAULT '{}',
  p_ip_address    INET DEFAULT NULL,
  p_user_agent    TEXT DEFAULT NULL,
  p_session_id    UUID DEFAULT NULL,
  p_severity      VARCHAR(10) DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_actor_email VARCHAR(255);
  v_actor_name  VARCHAR(255);
  v_actor_role  VARCHAR(100);
BEGIN
  -- Resolve actor info
  IF p_actor_id IS NOT NULL THEN
    SELECT u.email, u.full_name, u.role
    INTO v_actor_email, v_actor_name, v_actor_role
    FROM public.users u WHERE u.id = p_actor_id;
  END IF;

  INSERT INTO public.company_audit_logs (
    company_id, actor_id, actor_email, actor_name, actor_role,
    action, entity_type, entity_id, entity_name,
    action_summary, old_values, new_values, metadata,
    ip_address, user_agent, session_id, severity
  ) VALUES (
    p_company_id, p_actor_id, v_actor_email, v_actor_name, v_actor_role,
    p_action, p_entity_type, p_entity_id, p_entity_name,
    COALESCE(p_summary, p_action || ' on ' || p_entity_type),
    p_old_values, p_new_values, p_metadata,
    p_ip_address, p_user_agent, p_session_id, p_severity
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 9. SEED: Default Session & Password Policies for existing companies
-- ============================================================================
-- Create default policies for companies that don't have them yet.
-- ============================================================================
DO $$
DECLARE
  v_company RECORD;
BEGIN
  FOR v_company IN
    SELECT id FROM public.companies
    WHERE id NOT IN (SELECT company_id FROM public.session_policies)
  LOOP
    INSERT INTO public.session_policies (company_id) VALUES (v_company.id);
    INSERT INTO public.password_policies (company_id) VALUES (v_company.id);
  END LOOP;
END $$;


-- ============================================================================
-- 10. SEED: Core Feature Flags
-- ============================================================================
-- Insert the foundational feature flags used across the platform.
-- ============================================================================
INSERT INTO public.feature_flags (slug, name, description, category, flag_type, default_value, is_system)
VALUES
  -- Core
  ('auth.2fa_enabled', 'Two-Factor Authentication', 'Enable 2FA for company users', 'core', 'boolean', 'false', FALSE),
  ('auth.session_limit', 'Session Limit Enforcement', 'Enforce max concurrent sessions', 'core', 'boolean', 'true', FALSE),
  ('auth.password_policy', 'Custom Password Policy', 'Allow custom password complexity rules', 'core', 'boolean', 'true', FALSE),

  -- CMS
  ('cms.page_builder', 'Page Builder', 'Visual drag-and-drop page builder', 'cms', 'boolean', 'false', FALSE),
  ('cms.form_builder', 'Form Builder', 'Dynamic form creation and management', 'cms', 'boolean', 'false', FALSE),
  ('cms.theme_editor', 'Theme Editor', 'Visual theme customization', 'cms', 'boolean', 'false', FALSE),
  ('cms.media_library', 'Media Library', 'File management and organization', 'cms', 'boolean', 'false', FALSE),
  ('cms.navigation_builder', 'Navigation Builder', 'Custom navigation menu editor', 'cms', 'boolean', 'false', FALSE),
  ('cms.header_footer_builder', 'Header/Footer Builder', 'Custom header and footer editor', 'cms', 'boolean', 'false', FALSE),

  -- Ecommerce
  ('ecom.storefront', 'Storefront', 'Public-facing e-commerce store', 'ecommerce', 'boolean', 'false', FALSE),
  ('ecom.checkout', 'Checkout', 'Full checkout flow', 'ecommerce', 'boolean', 'false', FALSE),
  ('ecom.coupons', 'Coupons', 'Discount coupon system', 'ecommerce', 'boolean', 'false', FALSE),
  ('ecom.promotions', 'Promotions', 'Promotion rules engine', 'ecommerce', 'boolean', 'false', FALSE),
  ('ecom.reviews', 'Reviews & Ratings', 'Product review system', 'ecommerce', 'boolean', 'false', FALSE),

  -- ERP
  ('erp.pos', 'Point of Sale', 'POS terminal', 'erp', 'boolean', 'false', FALSE),
  ('erp.inventory', 'Inventory Management', 'Stock tracking and kardex', 'erp', 'boolean', 'false', FALSE),
  ('erp.purchasing', 'Purchasing', 'Purchase orders and suppliers', 'erp', 'boolean', 'false', FALSE),
  ('erp.invoicing', 'Invoicing', 'Invoice generation (NCF)', 'erp', 'boolean', 'false', FALSE),
  ('erp.accounting', 'Accounting', 'Chart of accounts and journal entries', 'erp', 'boolean', 'false', FALSE),

  -- CRM
  ('crm.leads', 'Lead Management', 'CRM pipeline and lead tracking', 'marketing', 'boolean', 'false', FALSE),
  ('crm.email_campaigns', 'Email Campaigns', 'Email marketing automation', 'marketing', 'boolean', 'false', FALSE),

  -- Reporting
  ('reports.advanced', 'Advanced Reports', 'Enhanced reporting with exports', 'reporting', 'boolean', 'false', FALSE),
  ('reports.realtime', 'Real-time Reports', 'Live dashboard data', 'reporting', 'boolean', 'false', FALSE),

  -- Integrations
  ('integrations.whatsapp', 'WhatsApp Integration', 'WhatsApp Business API', 'integrations', 'boolean', 'false', FALSE),
  ('integrations.webhooks', 'Webhooks', 'Outgoing webhook support', 'integrations', 'boolean', 'false', FALSE),
  ('integrations.api_keys', 'API Keys', 'Public API key management', 'integrations', 'boolean', 'false', FALSE),

  -- Advanced
  ('advanced.multi_branch', 'Multi-Branch', 'Multiple branches/warehouses', 'advanced', 'boolean', 'false', FALSE),
  ('advanced.custom_roles', 'Custom Roles', 'Create custom permission roles', 'advanced', 'boolean', 'false', FALSE),
  ('advanced.white_label', 'White Label', 'Remove platform branding', 'advanced', 'boolean', 'false', FALSE),
  ('advanced.custom_domain', 'Custom Domain', 'Custom domain per company', 'advanced', 'boolean', 'false', FALSE),
  ('advanced.automations', 'Automations', 'Workflow automation rules', 'advanced', 'boolean', 'false', FALSE)

ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- 11. Link existing users to user_companies (backfill)
-- ============================================================================
-- Migrate existing user.company_id → user_companies entries.
-- ============================================================================
DO $$
DECLARE
  v_user RECORD;
  v_default_role INTEGER;
BEGIN
  -- Get the default 'employee' role id (or fallback to 1)
  SELECT id INTO v_default_role FROM public.roles WHERE name = 'employee' LIMIT 1;
  IF v_default_role IS NULL THEN
    SELECT id INTO v_default_role FROM public.roles WHERE is_system = FALSE LIMIT 1;
  END IF;
  IF v_default_role IS NULL THEN
    v_default_role := 1;
  END IF;

  FOR v_user IN
    SELECT u.id, u.company_id, u.role
    FROM public.users u
    WHERE u.company_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = u.id AND uc.company_id = u.company_id
      )
  LOOP
    -- Determine the role_id for this user
    DECLARE
      v_role_id INTEGER;
    BEGIN
      SELECT id INTO v_role_id
      FROM public.roles
      WHERE name = v_user.role
        AND (company_id IS NULL OR company_id = v_user.company_id)
      LIMIT 1;

      IF v_role_id IS NULL THEN
        v_role_id := v_default_role;
      END IF;

      INSERT INTO public.user_companies (user_id, company_id, role_id, is_primary, is_active)
      VALUES (v_user.id, v_user.company_id, v_role_id, TRUE, TRUE)
      ON CONFLICT (user_id, company_id) DO NOTHING;
    END;
  END LOOP;
END $$;


-- ============================================================================
-- 12. Views for dashboard & platform admin
-- ============================================================================

-- View: Company feature evaluation summary
CREATE OR REPLACE VIEW public.vw_company_feature_summary AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  ff.slug AS feature_slug,
  ff.name AS feature_name,
  ff.category,
  public.evaluate_feature_flag(c.id, ff.slug) AS value,
  CASE
    WHEN cf.id IS NOT NULL THEN 'company_override'
    WHEN pff.id IS NOT NULL THEN 'plan_default'
    ELSE 'global_default'
  END AS source
FROM public.companies c
CROSS JOIN public.feature_flags ff
LEFT JOIN public.company_features cf
  ON cf.company_id = c.id AND cf.feature_flag_id = ff.id
  AND (cf.expires_at IS NULL OR cf.expires_at > NOW())
LEFT JOIN public.company_subscriptions cs
  ON cs.company_id = c.id AND cs.status IN ('active', 'trialing')
LEFT JOIN public.plan_feature_flags pff
  ON pff.plan_id = cs.plan_id AND pff.feature_flag_id = ff.id
WHERE ff.is_active = TRUE
ORDER BY c.name, ff.category, ff.slug;

-- View: Company usage dashboard
CREATE OR REPLACE VIEW public.vw_company_usage_dashboard AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  sp.max_users,
  sp.max_products,
  sp.max_clients,
  sp.max_storage_mb,
  sp.max_branches,
  sp.max_forms,
  sp.max_pages,
  (SELECT COUNT(*) FROM public.users u WHERE u.company_id = c.id) AS current_users,
  (SELECT COUNT(*) FROM public.products p WHERE p.company_id = c.id) AS current_products,
  (SELECT COUNT(*) FROM public.clients cl WHERE cl.company_id = c.id) AS current_clients,
  cs.status AS subscription_status,
  sp.slug AS plan_slug,
  sp.name AS plan_name
FROM public.companies c
LEFT JOIN public.company_subscriptions cs ON cs.company_id = c.id AND cs.status IN ('active', 'trialing')
LEFT JOIN public.saas_plans sp ON sp.id = cs.plan_id
WHERE c.is_platform = FALSE OR c.is_platform IS NULL;

-- View: Session summary per user
CREATE OR REPLACE VIEW public.vw_user_session_summary AS
SELECT
  u.id AS user_id,
  u.email,
  COUNT(s.id) FILTER (WHERE s.is_active = TRUE) AS active_sessions,
  MAX(s.last_activity) FILTER (WHERE s.is_active = TRUE) AS last_active,
  MAX(s.created_at) AS last_login
FROM public.users u
LEFT JOIN public.active_sessions s ON s.user_id = u.id
GROUP BY u.id, u.email;

COMMIT;

-- ============================================================================
-- Summary of objects created:
-- Tables: user_companies, custom_roles, custom_role_permissions,
--         two_factor_secrets, backup_codes, active_sessions,
--         session_policies, password_policies, password_history,
--         feature_flags, plan_feature_flags, company_features,
--         usage_metrics, company_audit_logs
-- Functions: fn_update_timestamp, get_user_companies, set_primary_company,
--            add_user_to_company, evaluate_feature_flag, check_feature_enabled,
--            get_company_features, increment_usage, check_usage_limit,
--            log_company_audit
-- Views: vw_company_feature_summary, vw_company_usage_dashboard, vw_user_session_summary
-- Feature Flags: 28 core flags seeded
-- ============================================================================

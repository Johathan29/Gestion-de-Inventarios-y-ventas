-- ============================================================================
-- MIGRATION 049: PLATFORM ADMIN + IMPERSONATION + SUPPORT SESSIONS
-- ============================================================================
-- Agrega sistema de impersonation para soporte, sesiones de admin global,
-- métricas de plataforma, y funciones auxiliares para el Admin App.
-- ============================================================================

-- 1. SUPPORT SESSIONS (sesiones temporales de acceso de soporte)
CREATE TABLE IF NOT EXISTS support_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  session_token VARCHAR(128) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. IMPERSONATION LOGS (audit trail de acciones como admin de otra empresa)
CREATE TABLE IF NOT EXISTS impersonation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  target_company_id UUID NOT NULL REFERENCES companies(id),
  action_type VARCHAR(50) NOT NULL, -- 'view', 'update', 'create', 'delete', 'config_change', 'user_manage'
  action_description TEXT NOT NULL,
  entity_type VARCHAR(50),          -- 'user', 'product', 'sale', 'config', etc.
  entity_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PLATFORM METRICS (snapshot diario de métricas globales)
CREATE TABLE IF NOT EXISTS platform_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_companies INTEGER DEFAULT 0,
  active_companies INTEGER DEFAULT 0,
  trial_companies INTEGER DEFAULT 0,
  grace_companies INTEGER DEFAULT 0,
  suspended_companies INTEGER DEFAULT 0,
  expired_companies INTEGER DEFAULT 0,
  no_subscription_companies INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  mrr DECIMAL(15,2) DEFAULT 0,
  arr DECIMAL(15,2) DEFAULT 0,
  subscriptions_by_plan JSONB DEFAULT '{}',
  new_companies_today INTEGER DEFAULT 0,
  new_users_today INTEGER DEFAULT 0,
  api_requests_today INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(metric_date)
);

-- 4. COMPANY ACTIVITY LOG (actividad reciente por empresa para el explorador global)
CREATE TABLE IF NOT EXISTS company_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL,
  activity_description TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Add columns to companies if they don't exist
DO $$
BEGIN
  -- business_type_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='business_type_id') THEN
    ALTER TABLE companies ADD COLUMN business_type_id INTEGER REFERENCES business_types(id);
  END IF;

  -- subscription_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscription_status') THEN
    ALTER TABLE companies ADD COLUMN subscription_status VARCHAR(30) DEFAULT 'no_subscription';
  END IF;

  -- trial_ends_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='trial_ends_at') THEN
    ALTER TABLE companies ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;

  -- grace_period_ends_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='grace_period_ends_at') THEN
    ALTER TABLE companies ADD COLUMN grace_period_ends_at TIMESTAMPTZ;
  END IF;

  -- logo_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='logo_url') THEN
    ALTER TABLE companies ADD COLUMN logo_url VARCHAR(500);
  END IF;

  -- slug (for public URLs)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='slug') THEN
    ALTER TABLE companies ADD COLUMN slug VARCHAR(100) UNIQUE;
  END IF;

  -- is_active
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='is_active') THEN
    ALTER TABLE companies ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;

  -- settings (JSONB config)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='settings') THEN
    ALTER TABLE companies ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;

  -- dashboard_config (widget layout config)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='dashboard_config') THEN
    ALTER TABLE companies ADD COLUMN dashboard_config JSONB DEFAULT '{}';
  END IF;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_ss_admin ON support_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_ss_target_company ON support_sessions(target_company_id);
CREATE INDEX IF NOT EXISTS idx_ss_active ON support_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ss_token ON support_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_il_session ON impersonation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_il_admin ON impersonation_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_il_target ON impersonation_logs(target_company_id);
CREATE INDEX IF NOT EXISTS idx_il_created ON impersonation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_il_action ON impersonation_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_pm_date ON platform_metrics(metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_cal_company ON company_activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_cal_created ON company_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cal_type ON company_activity_log(activity_type);

-- 7. RLS Policies
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_activity_log ENABLE ROW LEVEL SECURITY;

-- Support sessions: admin can see own sessions, platform_admin can see all
CREATE POLICY "Support sessions: admin own" ON support_sessions FOR ALL TO authenticated
  USING (admin_user_id = auth.uid() OR public.is_platform_admin());

-- Impersonation logs: admin own, platform_admin all
CREATE POLICY "Impersonation logs: admin own" ON impersonation_logs FOR ALL TO authenticated
  USING (admin_user_id = auth.uid() OR public.is_platform_admin());

-- Platform metrics: platform_admin only
CREATE POLICY "Platform metrics: admin only" ON platform_metrics FOR ALL TO authenticated
  USING (public.is_platform_admin());

-- Company activity log: platform_admin + own company
CREATE POLICY "Company activity: admin or own company" ON company_activity_log FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- 8. Helper functions

-- Create a support session (impersonation)
CREATE OR REPLACE FUNCTION public.create_support_session(
  p_target_company_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_session_token VARCHAR(128);
  v_session_id UUID;
  v_result JSONB;
BEGIN
  -- Verify the caller is platform admin
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can create support sessions';
  END IF;

  -- Generate token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  v_session_id := gen_random_uuid();

  -- Create session
  INSERT INTO support_sessions (id, admin_user_id, target_company_id, session_token, reason, ip_address)
  VALUES (v_session_id, v_admin_id, p_target_company_id, v_session_token, p_reason, inet_client_addr())
  RETURNING id INTO v_session_id;

  -- Log the impersonation start
  INSERT INTO impersonation_logs (session_id, admin_user_id, target_company_id, action_type, action_description, ip_address)
  VALUES (v_session_id, v_admin_id, p_target_company_id, 'session_start', COALESCE(p_reason, 'Admin access'), inet_client_addr());

  -- Return session info with a JWT-like token for the impersonated session
  v_result := jsonb_build_object(
    'session_id', v_session_id,
    'session_token', v_session_token,
    'target_company_id', p_target_company_id,
    'admin_user_id', v_admin_id,
    'started_at', now()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- End a support session
CREATE OR REPLACE FUNCTION public.end_support_session(
  p_session_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE support_sessions
  SET is_active = FALSE, ended_at = now()
  WHERE id = p_session_id AND admin_user_id = auth.uid() AND is_active = TRUE;

  INSERT INTO impersonation_logs (session_id, admin_user_id, target_company_id, action_type, action_description, ip_address)
  SELECT id, admin_user_id, target_company_id, 'session_end', 'Admin ended support session', inet_client_addr()
  FROM support_sessions WHERE id = p_session_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Log an impersonation action
CREATE OR REPLACE FUNCTION public.log_impersonation_action(
  p_session_id UUID,
  p_action_type VARCHAR(50),
  p_action_description TEXT,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id VARCHAR(100) DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_session RECORD;
BEGIN
  SELECT * INTO v_session FROM support_sessions WHERE id = p_session_id AND is_active = TRUE;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired support session';
  END IF;

  INSERT INTO impersonation_logs (
    session_id, admin_user_id, target_company_id,
    action_type, action_description,
    entity_type, entity_id, old_values, new_values,
    ip_address, user_agent
  ) VALUES (
    p_session_id, v_session.admin_user_id, v_session.target_company_id,
    p_action_type, p_action_description,
    p_entity_type, p_entity_id, p_old_values, p_new_values,
    inet_client_addr(), current_setting('request.headers', true)::jsonb->>'user-agent'
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Platform-wide stats function
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can view platform stats';
  END IF;

  SELECT jsonb_build_object(
    'total_companies', (SELECT COUNT(*) FROM companies),
    'active_companies', (SELECT COUNT(*) FROM companies WHERE subscription_status = 'active'),
    'trial_companies', (SELECT COUNT(*) FROM companies WHERE subscription_status = 'trial'),
    'grace_companies', (SELECT COUNT(*) FROM companies WHERE subscription_status = 'grace_period'),
    'suspended_companies', (SELECT COUNT(*) FROM companies WHERE subscription_status = 'suspended'),
    'expired_companies', (SELECT COUNT(*) FROM companies WHERE subscription_status = 'expired'),
    'no_subscription_companies', (SELECT COUNT(*) FROM companies WHERE subscription_status = 'no_subscription'),
    'total_users', (SELECT COUNT(*) FROM users),
    'active_users', (SELECT COUNT(*) FROM users WHERE is_active = TRUE),
    'total_clients', (SELECT COUNT(*) FROM clients),
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM subscription_payments WHERE status = 'completed'),
    'mrr', (SELECT COALESCE(SUM(sp.monthly_price), 0) FROM company_subscriptions cs
            JOIN saas_plans sp ON sp.id = cs.plan_id WHERE cs.status = 'active'),
    'new_companies_today', (SELECT COUNT(*) FROM companies WHERE created_at::date = CURRENT_DATE),
    'new_users_today', (SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE),
    'subscriptions_by_plan', (
      SELECT COALESCE(jsonb_object_agg(sp.name, cnt), '{}')
      FROM (SELECT sp.name, COUNT(*) as cnt
            FROM company_subscriptions cs
            JOIN saas_plans sp ON sp.id = cs.plan_id
            WHERE cs.status = 'active'
            GROUP BY sp.name) sp
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get all companies with subscription status (for admin explorer)
CREATE OR REPLACE FUNCTION public.get_all_companies(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_companies JSONB;
  v_total INTEGER;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can view all companies';
  END IF;

  -- Count total
  SELECT COUNT(*) INTO v_total FROM companies c
  WHERE (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.slug ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR c.subscription_status = p_status);

  -- Get companies with enriched data
  SELECT jsonb_agg(row_to_json(c_data)) INTO v_companies
  FROM (
    SELECT c.id, c.name, c.slug, c.logo_url, c.is_active, c.subscription_status,
           c.trial_ends_at, c.grace_period_ends_at, c.created_at, c.settings,
           c.business_type_id,
           bt.name as business_type_name,
           (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) as user_count,
           (SELECT COUNT(*) FROM clients cl WHERE cl.company_id = c.id) as client_count,
           (SELECT COUNT(*) FROM products p WHERE p.company_id = c.id) as product_count,
           (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.company_id = c.id AND s.created_at >= date_trunc('month', now())) as monthly_revenue,
           sp.name as plan_name,
           cs.status as subscription_active
    FROM companies c
    LEFT JOIN business_types bt ON bt.id = c.business_type_id
    LEFT JOIN company_subscriptions cs ON cs.company_id = c.id AND cs.status = 'active'
    LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
    WHERE (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.slug ILIKE '%' || p_search || '%')
      AND (p_status IS NULL OR c.subscription_status = p_status)
    ORDER BY c.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) c_data;

  v_result := jsonb_build_object(
    'companies', COALESCE(v_companies, '[]'::jsonb),
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get a specific company full details (for admin deep-dive)
CREATE OR REPLACE FUNCTION public.get_company_details(p_company_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can view company details';
  END IF;

  SELECT jsonb_build_object(
    'company', row_to_json(c.*),
    'business_type', (SELECT row_to_json(bt.*) FROM business_types bt WHERE bt.id = c.business_type_id),
    'subscription', (SELECT row_to_json(cs.*) FROM company_subscriptions cs WHERE cs.company_id = c.id ORDER BY cs.created_at DESC LIMIT 1),
    'plan', (SELECT row_to_json(sp.*) FROM company_subscriptions cs JOIN saas_plans sp ON sp.id = cs.plan_id WHERE cs.company_id = c.id AND cs.status = 'active' LIMIT 1),
    'user_count', (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id),
    'client_count', (SELECT COUNT(*) FROM clients cl WHERE cl.company_id = c.id),
    'product_count', (SELECT COUNT(*) FROM products p WHERE p.company_id = c.id),
    'sale_count', (SELECT COUNT(*) FROM sales s WHERE s.company_id = c.id),
    'monthly_revenue', (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.company_id = c.id AND s.created_at >= date_trunc('month', now())),
    'total_revenue', (SELECT COALESCE(SUM(s.total), 0) FROM sales s WHERE s.company_id = c.id)
  ) INTO v_result
  FROM companies c WHERE c.id = p_company_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update company dashboard configuration
CREATE OR REPLACE FUNCTION public.update_company_dashboard_config(
  p_company_id UUID,
  p_config JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_platform_admin() AND p_company_id != public.get_current_company_id() THEN
    RAISE EXCEPTION 'Cannot modify other company dashboard';
  END IF;

  UPDATE companies SET dashboard_config = p_config, updated_at = now() WHERE id = p_company_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Record company activity
CREATE OR REPLACE FUNCTION public.record_company_activity(
  p_company_id UUID,
  p_activity_type VARCHAR(50),
  p_activity_description TEXT,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id VARCHAR(100) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO company_activity_log (company_id, user_id, activity_type, activity_description, entity_type, entity_id, metadata)
  VALUES (p_company_id, auth.uid(), p_activity_type, p_activity_description, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- DONE
-- ============================================================================

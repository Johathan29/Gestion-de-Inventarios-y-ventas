-- ============================================================================
-- MIGRATION 042: SaaS PLANS & SUBSCRIPTIONS
-- ============================================================================
-- Sistema completo de planes SaaS, suscripciones, límites y pagos
-- Permite gestionar Plan Starter, Business, Enterprise con límites granulares
-- ============================================================================

-- ─── 1. PLANES SAAS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_plans (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,           -- 'Plan Starter'
  slug                VARCHAR(50) NOT NULL UNIQUE,     -- 'starter'
  description         TEXT,
  tier                INTEGER NOT NULL DEFAULT 0,      -- 0=free, 1=starter, 2=business, 3=enterprise

  -- Precios
  monthly_price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  annual_price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency_code       VARCHAR(3) NOT NULL DEFAULT 'USD',
  trial_days          INTEGER NOT NULL DEFAULT 0,
  setup_fee           DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Límites
  max_users           INTEGER NOT NULL DEFAULT 1,
  max_products        INTEGER NOT NULL DEFAULT 50,
  max_clients         INTEGER NOT NULL DEFAULT 100,
  max_storage_mb      INTEGER NOT NULL DEFAULT 500,
  max_branches        INTEGER NOT NULL DEFAULT 1,
  max_forms           INTEGER NOT NULL DEFAULT 3,
  max_pages           INTEGER NOT NULL DEFAULT 5,
  max_api_keys        INTEGER NOT NULL DEFAULT 0,
  max_webhooks        INTEGER NOT NULL DEFAULT 0,
  max_automations     INTEGER NOT NULL DEFAULT 0,

  -- Módulos incluidos
  included_modules    TEXT[] NOT NULL DEFAULT '{}',     -- ['products','sales','inventory']
  excluded_modules    TEXT[] NOT NULL DEFAULT '{}',

  -- Características
  has_cms             BOOLEAN NOT NULL DEFAULT FALSE,
  has_ecommerce       BOOLEAN NOT NULL DEFAULT FALSE,
  has_crm             BOOLEAN NOT NULL DEFAULT FALSE,
  has_custom_domain   BOOLEAN NOT NULL DEFAULT FALSE,
  has_priority_support BOOLEAN NOT NULL DEFAULT FALSE,
  has_api_access      BOOLEAN NOT NULL DEFAULT FALSE,
  has_white_label     BOOLEAN NOT NULL DEFAULT FALSE,
  has_advanced_reports BOOLEAN NOT NULL DEFAULT FALSE,
  has_automation      BOOLEAN NOT NULL DEFAULT FALSE,
  has_multi_branch    BOOLEAN NOT NULL DEFAULT FALSE,

  -- UI
  badge               VARCHAR(30),                      -- 'Popular', 'Recomendado'
  color               VARCHAR(7),                       -- '#3B82F6'
  icon                VARCHAR(50),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_popular          BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saas_plans_slug ON saas_plans(slug);
CREATE INDEX idx_saas_plans_tier ON saas_plans(tier);
CREATE INDEX idx_saas_plans_active ON saas_plans(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE saas_plans IS 'Planes SaaS con precios, límites y módulos incluidos';

-- ─── 2. FEATURES POR PLAN (tabla EAV para features booleanas) ─────────────
CREATE TABLE IF NOT EXISTS plan_features (
  id              SERIAL PRIMARY KEY,
  plan_id         INTEGER NOT NULL REFERENCES saas_plans(id) ON DELETE CASCADE,
  feature_slug    VARCHAR(100) NOT NULL,        -- 'advanced_inventory', 'multi_currency'
  feature_name    VARCHAR(200) NOT NULL,        -- 'Inventario avanzado'
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  limit_value     INTEGER,                      -- NULL = ilimitado, número = límite
  config          JSONB DEFAULT '{}',           -- Configuración adicional
  UNIQUE(plan_id, feature_slug)
);

CREATE INDEX idx_plan_features_plan ON plan_features(plan_id);

COMMENT ON TABLE plan_features IS 'Features individuales habilitadas por plan';

-- ─── 3. SUSCRIPCIONES DE EMPRESA ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id           INTEGER NOT NULL REFERENCES saas_plans(id),
  status            VARCHAR(20) NOT NULL DEFAULT 'trialing',
    -- trialling, active, past_due, paused, cancelled, expired
  billing_cycle     VARCHAR(10) NOT NULL DEFAULT 'monthly', -- monthly, annual, custom
  amount            DECIMAL(10,2) NOT NULL,      -- Monto actual (puede diferir del plan por descuentos)
  discount_percent  DECIMAL(5,2) NOT NULL DEFAULT 0,
  currency_code     VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Fechas
  trial_start       TIMESTAMPTZ,
  trial_end         TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  cancelled_at      TIMESTAMPTZ,
  cancelled_reason  TEXT,
  pause_until        TIMESTAMPTZ,

  -- Pagos
  payment_method    VARCHAR(30),                 -- 'card', 'bank_transfer', 'cash'
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id     VARCHAR(255),
  next_payment_date TIMESTAMPTZ,
  failed_payment_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_subscriptions_company ON company_subscriptions(company_id);
CREATE INDEX idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX idx_company_subscriptions_plan ON company_subscriptions(plan_id);
CREATE INDEX idx_company_subscriptions_period_end ON company_subscriptions(current_period_end);

COMMENT ON TABLE company_subscriptions IS 'Suscripciones activas de cada empresa a un plan SaaS';

-- ─── 4. HISTORIAL DE CAMBIOS DE PLAN ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_changes (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL REFERENCES companies(id),
  subscription_id   INTEGER REFERENCES company_subscriptions(id),
  change_type       VARCHAR(20) NOT NULL,         -- 'upgrade', 'downgrade', 'renewal', 'cancellation'
  previous_plan_id  INTEGER REFERENCES saas_plans(id),
  new_plan_id       INTEGER REFERENCES saas_plans(id),
  previous_amount   DECIMAL(10,2),
  new_amount        DECIMAL(10,2),
  proration_amount  DECIMAL(10,2) DEFAULT 0,      -- Crédito/débito prorrateado
  effective_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason            TEXT,
  performed_by      UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_changes_company ON plan_changes(company_id);
CREATE INDEX idx_plan_changes_subscription ON plan_changes(subscription_id);

COMMENT ON TABLE plan_changes IS 'Historial de cambios de plan (upgrade/downgrade/cancel)';

-- ─── 5. PAGOS DE SUSCRIPCIÓN ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_payments (
  id                SERIAL PRIMARY KEY,
  subscription_id   INTEGER NOT NULL REFERENCES company_subscriptions(id),
  company_id        INTEGER NOT NULL REFERENCES companies(id),
  amount            DECIMAL(10,2) NOT NULL,
  currency_code     VARCHAR(3) NOT NULL DEFAULT 'USD',
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, processing, succeeded, failed, refunded, partially_refunded
  payment_method    VARCHAR(30) NOT NULL,          -- 'card', 'bank_transfer', 'cash', 'paypal'
  payment_reference VARCHAR(255),

  -- Stripe / Gateway
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id         VARCHAR(255),
  gateway_response   JSONB,

  -- Facturación
  invoice_number    VARCHAR(50),
  invoice_url       TEXT,
  receipt_url       TEXT,
  tax_amount        DECIMAL(10,2) DEFAULT 0,

  -- Período cubierto
  period_start      TIMESTAMPTZ,
  period_end        TIMESTAMPTZ,

  paid_at           TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    TEXT,
  refunded_at       TIMESTAMPTZ,
  refund_reason     TEXT,
  refund_amount     DECIMAL(10,2) DEFAULT 0,

  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX idx_sub_payments_company ON subscription_payments(company_id);
CREATE INDEX idx_sub_payments_status ON subscription_payments(status);
CREATE INDEX idx_sub_payments_created ON subscription_payments(created_at);

COMMENT ON TABLE subscription_payments IS 'Historial de pagos de suscripciones SaaS';

-- ─── 6. CUPONES DE DESCUENTO SaaS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_coupons (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(50) NOT NULL UNIQUE,
  description       TEXT,
  discount_type     VARCHAR(20) NOT NULL,         -- 'percent', 'fixed'
  discount_value    DECIMAL(10,2) NOT NULL,
  currency_code     VARCHAR(3) NOT NULL DEFAULT 'USD',
  min_amount        DECIMAL(10,2) DEFAULT 0,
  max_uses          INTEGER,                      -- NULL = ilimitado
  used_count        INTEGER NOT NULL DEFAULT 0,
  applies_to_plans  INTEGER[],                    -- Array de plan_ids; vacío = todos
  valid_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until       TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saas_coupons_code ON saas_coupons(code) WHERE is_active = TRUE;

COMMENT ON TABLE saas_coupons IS 'Cupones de descuento para planes SaaS';

-- ─── 7. LÍMITES DE USO POR EMPRESA ───────────────────────────────────────
-- Vista para verificar si la empresa excedió algún límite del plan
CREATE OR REPLACE VIEW vw_company_usage_limits AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  sp.slug AS plan_slug,
  sp.name AS plan_name,
  -- Límites
  sp.max_users,
  sp.max_products,
  sp.max_clients,
  sp.max_storage_mb,
  sp.max_branches,
  sp.max_forms,
  sp.max_pages,
  -- Uso actual
  (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_active = TRUE) AS current_users,
  (SELECT COUNT(*) FROM products p WHERE p.company_id = c.id AND p.deleted_at IS NULL) AS current_products,
  (SELECT COUNT(*) FROM clients cl WHERE cl.company_id = c.id AND cl.deleted_at IS NULL) AS current_clients,
  (SELECT COUNT(*) FROM branches b WHERE b.company_id = c.id AND b.is_active = TRUE) AS current_branches,
  (SELECT COUNT(*) FROM dynamic_forms df WHERE df.company_id = c.id AND df.deleted_at IS NULL) AS current_forms,
  (SELECT COUNT(*) FROM cms_pages cp WHERE cp.company_id = c.id AND cp.deleted_at IS NULL) AS current_pages,
  -- Porcentajes de uso
  ROUND(
    (SELECT COUNT(*)::DECIMAL / NULLIF(sp.max_users, 0) * 100
     FROM users u WHERE u.company_id = c.id AND u.is_active = TRUE), 1
  ) AS users_usage_pct,
  ROUND(
    (SELECT COUNT(*)::DECIMAL / NULLIF(sp.max_products, 0) * 100
     FROM products p WHERE p.company_id = c.id AND p.deleted_at IS NULL), 1
  ) AS products_usage_pct,
  -- Estado
  cs.status AS subscription_status,
  cs.current_period_end
FROM companies c
LEFT JOIN company_subscriptions cs ON cs.company_id = c.id AND cs.status IN ('active', 'trialing')
LEFT JOIN saas_plans sp ON sp.id = cs.plan_id;

COMMENT ON VIEW vw_company_usage_limits IS 'Uso actual vs límites del plan por empresa';

-- ─── 8. FUNCIÓN: Verificar límite del plan ────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_plan_limit(
  p_company_id INTEGER,
  p_limit_type VARCHAR   -- 'users', 'products', 'clients', 'forms', 'pages', 'branches'
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_current INTEGER;
  v_max INTEGER;
  v_plan_name TEXT;
BEGIN
  -- Obtener límites del plan actual
  SELECT
    CASE p_limit_type
      WHEN 'users' THEN sp.max_users
      WHEN 'products' THEN sp.max_products
      WHEN 'clients' THEN sp.max_clients
      WHEN 'forms' THEN sp.max_forms
      WHEN 'pages' THEN sp.max_pages
      WHEN 'branches' THEN sp.max_branches
    END,
    sp.name
  INTO v_max, v_plan_name
  FROM company_subscriptions cs
  JOIN saas_plans sp ON sp.id = cs.plan_id
  WHERE cs.company_id = p_company_id
    AND cs.status IN ('active', 'trialing');

  IF v_max IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'reason', 'Sin plan activo o límite no definido'
    );
  END IF;

  -- Contar uso actual
  v_current := CASE p_limit_type
    WHEN 'users' THEN (SELECT COUNT(*) FROM users WHERE company_id = p_company_id AND is_active = TRUE)
    WHEN 'products' THEN (SELECT COUNT(*) FROM products WHERE company_id = p_company_id AND deleted_at IS NULL)
    WHEN 'clients' THEN (SELECT COUNT(*) FROM clients WHERE company_id = p_company_id AND deleted_at IS NULL)
    WHEN 'forms' THEN (SELECT COUNT(*) FROM dynamic_forms WHERE company_id = p_company_id AND deleted_at IS NULL)
    WHEN 'pages' THEN (SELECT COUNT(*) FROM cms_pages WHERE company_id = p_company_id AND deleted_at IS NULL)
    WHEN 'branches' THEN (SELECT COUNT(*) FROM branches WHERE company_id = p_company_id AND is_active = TRUE)
  END;

  RETURN jsonb_build_object(
    'allowed', v_current < v_max,
    'current', v_current,
    'max', v_max,
    'remaining', GREATEST(v_max - v_current, 0),
    'usage_pct', ROUND((v_current::DECIMAL / v_max * 100), 1),
    'plan', v_plan_name,
    'limit_type', p_limit_type
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.check_plan_limit IS 'Verifica si una empresa puede crear más recursos según su plan';

-- ─── 9. TRIGGER: Auto-update timestamps ───────────────────────────────────
CREATE TRIGGER trg_saas_plans_updated_at
  BEFORE UPDATE ON saas_plans
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_company_subscriptions_updated_at
  BEFORE UPDATE ON company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- ─── 10. FUNCIÓN: Auto-actualizar estado de suscripción ───────────────────
CREATE OR REPLACE FUNCTION public.fn_update_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el período terminó y no hay pago, marcar como past_due
  IF NEW.current_period_end < NOW()
     AND NEW.status = 'active'
     AND NEW.failed_payment_count > 0
  THEN
    NEW.status := 'past_due';
  END IF;

  -- Si el trial terminó
  IF NEW.trial_end IS NOT NULL
     AND NEW.trial_end < NOW()
     AND NEW.status = 'trialing'
  THEN
    NEW.status := 'expired';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_update_subscription_status
  BEFORE UPDATE ON company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_subscription_status();

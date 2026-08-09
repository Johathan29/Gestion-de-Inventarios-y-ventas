-- ============================================================================
-- MIGRATION 045: MULTI-CURRENCY, MULTI-LANGUAGE & INTEGRATIONS
-- ============================================================================
-- Soporte multi-moneda, internacionalización (i18n), integraciones externas,
-- API Keys y sistema de branch/sucursal mejorado
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE A: MULTI-MONEDA
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. MONEDAS HABILITADAS POR EMPRESA ──────────────────────────────────
CREATE TABLE IF NOT EXISTS company_currencies (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  currency_id     INTEGER NOT NULL REFERENCES currencies(id),
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  exchange_rate   DECIMAL(12,6) NOT NULL DEFAULT 1.0, -- vs moneda base
  decimal_places  INTEGER NOT NULL DEFAULT 2,
  symbol_position VARCHAR(10) NOT NULL DEFAULT 'before', -- 'before', 'after'
  thousands_sep   CHAR(1) NOT NULL DEFAULT ',',
  decimal_sep     CHAR(1) NOT NULL DEFAULT '.',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, currency_id)
);

CREATE INDEX idx_company_currencies_company ON company_currencies(company_id);

COMMENT ON TABLE company_currencies IS 'Monedas habilitadas por empresa con tasas de cambio y formato';

-- ─── 2. TASAS DE CAMBIO ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_currency_id  INTEGER NOT NULL REFERENCES currencies(id),
  to_currency_id    INTEGER NOT NULL REFERENCES currencies(id),
  rate              DECIMAL(12,6) NOT NULL,
  source            VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'manual', 'api', ' ECB'
  rate_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to          TIMESTAMPTZ,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, from_currency_id, to_currency_id, rate_date)
);

CREATE INDEX idx_cer_company ON currency_exchange_rates(company_id);
CREATE INDEX idx_cer_date ON currency_exchange_rates(rate_date DESC);

COMMENT ON TABLE currency_exchange_rates IS 'Historial de tasas de cambio por empresa';

-- ─── 3. FUNCIÓN: Convertir monto entre monedas ────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_convert_currency(
  p_amount          DECIMAL,
  p_from_currency   VARCHAR(3),
  p_to_currency     VARCHAR(3),
  p_company_id      INTEGER,
  p_date            DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_rate DECIMAL(12,6);
BEGIN
  IF p_from_currency = p_to_currency THEN
    RETURN p_amount;
  END IF;

  SELECT rate INTO v_rate
  FROM currency_exchange_rates cer
  JOIN currencies cf ON cf.id = cer.from_currency_id
  JOIN currencies ct ON ct.id = cer.to_currency_id
  WHERE cer.company_id = p_company_id
    AND cf.code = p_from_currency
    AND ct.code = p_to_currency
    AND cer.rate_date <= p_date
    AND (cer.valid_to IS NULL OR cer.valid_to > NOW())
  ORDER BY cer.rate_date DESC
  LIMIT 1;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'No exchange rate found for % → % on %', p_from_currency, p_to_currency, p_date;
  END IF;

  RETURN ROUND(p_amount * v_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.fn_convert_currency IS 'Convierte un monto entre monedas usando la tasa más reciente';

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE B: MULTI-IDIOMA / i18n
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 4. IDIOMAS SOPORTADOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS languages (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(10) NOT NULL UNIQUE,       -- 'es', 'en', 'fr'
  name            VARCHAR(50) NOT NULL,              -- 'Español', 'English'
  native_name     VARCHAR(50) NOT NULL,              -- 'Español', 'English'
  flag            VARCHAR(10),                       -- '🇩🇴', '🇺🇸'
  direction       VARCHAR(3) NOT NULL DEFAULT 'ltr', -- 'ltr', 'rtl'
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE languages IS 'Idiomas soportados por la plataforma';

-- ─── 5. IDIOMAS POR EMPRESA ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_languages (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  language_id     INTEGER NOT NULL REFERENCES languages(id),
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, language_id)
);

CREATE INDEX idx_company_languages_company ON company_languages(company_id);

COMMENT ON TABLE company_languages IS 'Idiomas habilitados por empresa';

-- ─── 6. TRADUCCIONES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translations (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  language_id     INTEGER NOT NULL REFERENCES languages(id),
  context         VARCHAR(100) NOT NULL,            -- 'cms', 'ecommerce', 'forms', 'emails', 'ui'
  key             VARCHAR(300) NOT NULL,            -- 'hero.title', 'product.addToCart'
  value           TEXT NOT NULL,                    -- Texto traducido
  plural_form     VARCHAR(20),                      -- 'zero', 'one', 'other'
  namespace       VARCHAR(100),                     -- Agrupación lógica
  is_approved     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, language_id, context, key, plural_form)
);

CREATE INDEX idx_translations_company ON translations(company_id);
CREATE INDEX idx_translations_language ON translations(language_id);
CREATE INDEX idx_translations_context ON translations(company_id, context);
CREATE INDEX idx_translations_key ON translations(key);

COMMENT ON TABLE translations IS 'Traducciones i18n por empresa e idioma - sistema EAV de traducciones';

-- ─── 7. FUNCIÓN: Obtener traducción ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.t(
  p_company_id    INTEGER,
  p_language_code  VARCHAR(10),
  p_key           VARCHAR(300),
  p_context       VARCHAR(100) DEFAULT 'ui',
  p_plural_form   VARCHAR(20) DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
BEGIN
  SELECT t.value INTO v_result
  FROM translations t
  JOIN languages l ON l.id = t.language_id
  WHERE t.company_id = p_company_id
    AND l.code = p_language_code
    AND t.key = p_key
    AND t.context = p_context
    AND t.plural_form = p_plural_form
    AND t.is_approved = TRUE
  LIMIT 1;

  RETURN COALESCE(v_result, p_key); -- Fallback: retorna la key
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.t IS 'Obtiene traducción: SELECT t(1, ''es'', ''hero.title'')';

-- ─── 8. BATCH DE TRADUCCIONES ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_translations_batch(
  p_company_id    INTEGER,
  p_language_code  VARCHAR(10),
  p_context       VARCHAR(100) DEFAULT NULL
) RETURNS TABLE(key VARCHAR(300), value TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.key, t.value
  FROM translations t
  JOIN languages l ON l.id = t.language_id
  WHERE t.company_id = p_company_id
    AND l.code = p_language_code
    AND (p_context IS NULL OR t.context = p_context)
    AND t.is_approved = TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE C: INTEGRACIONES EXTERNAS
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 9. CATÁLOGO DE INTEGRACIONES DISPONIBLES ────────────────────────────
CREATE TABLE IF NOT EXISTS integration_catalog (
  id              SERIAL PRIMARY KEY,
  slug            VARCHAR(50) NOT NULL UNIQUE,       -- 'stripe', 'mailchimp', 'google_analytics'
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  category        VARCHAR(30) NOT NULL,              -- 'payment', 'email', 'analytics', 'shipping', 'crm', 'accounting'
  icon            VARCHAR(50),
  logo_url        VARCHAR(500),
  website_url     VARCHAR(500),
  auth_type       VARCHAR(20) NOT NULL DEFAULT 'api_key',
    -- 'api_key', 'oauth2', 'basic', 'bearer', 'webhook'
  config_schema   JSONB,                            -- Schema de configuración requerida
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_catalog_slug ON integration_catalog(slug);
CREATE INDEX idx_integration_catalog_category ON integration_catalog(category);

COMMENT ON TABLE integration_catalog IS 'Catálogo de integraciones externas disponibles (Stripe, Mailchimp, etc.)';

-- ─── 10. INTEGRACIONES DE EMPRESA ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_integrations (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id    INTEGER NOT NULL REFERENCES integration_catalog(id),
  status            VARCHAR(20) NOT NULL DEFAULT 'disconnected',
    -- 'disconnected', 'connecting', 'connected', 'error', 'disabled'
  config            JSONB NOT NULL DEFAULT '{}',    -- Configuración encriptada del lado del servidor
  credentials       JSONB DEFAULT '{}',             -- API keys, tokens (almacenados encriptados)
  settings          JSONB DEFAULT '{}',             -- Configuración adicional del usuario

  -- OAuth
  access_token      TEXT,                           -- Encrypted
  refresh_token     TEXT,                           -- Encrypted
  token_expires_at  TIMESTAMPTZ,

  -- Estado
  last_sync_at      TIMESTAMPTZ,
  last_error        TEXT,
  error_count       INTEGER NOT NULL DEFAULT 0,
  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,

  -- Webhook URL
  webhook_url       VARCHAR(500),
  webhook_secret    VARCHAR(255),

  connected_by      UUID REFERENCES users(id),
  disconnected_by   UUID REFERENCES users(id),
  connected_at      TIMESTAMPTZ,
  disconnected_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, integration_id)
);

CREATE INDEX idx_company_integrations_company ON company_integrations(company_id);
CREATE INDEX idx_company_integrations_status ON company_integrations(company_id, status);

COMMENT ON TABLE company_integrations IS 'Integraciones activas por empresa con credenciales y estado';

-- ─── 11. LOG DE INTEGRACIONES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_logs (
  id                SERIAL PRIMARY KEY,
  company_id        INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id    INTEGER NOT NULL REFERENCES integration_catalog(id),
  direction         VARCHAR(10) NOT NULL,           -- 'inbound', 'outbound'
  event_type        VARCHAR(50) NOT NULL,           -- 'sync', 'webhook', 'api_call'
  status            VARCHAR(20) NOT NULL,           -- 'success', 'error', 'timeout'
  request_url       TEXT,
  request_method    VARCHAR(10),
  request_headers   JSONB,
  request_body      JSONB,
  response_status   INTEGER,
  response_body     JSONB,
  error_message     TEXT,
  duration_ms       INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_logs_company ON integration_logs(company_id);
CREATE INDEX idx_integration_logs_integration ON integration_logs(integration_id);
CREATE INDEX idx_integration_logs_created ON integration_logs(created_at);

COMMENT ON TABLE integration_logs IS 'Log de llamadas API y webhooks de integraciones';

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE D: API KEYS PÚBLICAS
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 12. API KEYS POR EMPRESA ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,             -- 'Mobile App', 'Integración ERP'
  description     TEXT,
  key_hash        VARCHAR(255) NOT NULL UNIQUE,      -- SHA-256 hash de la API key
  key_prefix      VARCHAR(10) NOT NULL,              -- Primeros 8 chars: 'ak_12345...'
  key_suffix      VARCHAR(10) NOT NULL,              -- Últimos 4 chars: '...7890'

  -- Permisos
  scopes          TEXT[] NOT NULL DEFAULT '{read}',   -- 'read', 'write', 'admin'
  allowed_ips     INET[],                            -- NULL = any
  rate_limit      INTEGER NOT NULL DEFAULT 1000,     -- Requests per hour
  expires_at      TIMESTAMPTZ,

  -- Restricciones
  allowed_endpoints TEXT[],                          -- ['/api/v1/products', ...]
  blocked_endpoints TEXT[],

  -- Estado
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at    TIMESTAMPTZ,
  usage_count     BIGINT NOT NULL DEFAULT 0,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,
  revoked_by      UUID REFERENCES users(id),
  revoke_reason   TEXT
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_company ON api_keys(company_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

COMMENT ON TABLE api_keys IS 'API Keys de acceso externo por empresa';

-- ─── 13. LOG DE USO DE API KEYS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_key_logs (
  id              SERIAL PRIMARY KEY,
  api_key_id      INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  endpoint        VARCHAR(500) NOT NULL,
  method          VARCHAR(10) NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  response_status INTEGER,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_key_logs_key ON api_key_logs(api_key_id);
CREATE INDEX idx_api_key_logs_created ON api_key_logs(created_at);

COMMENT ON TABLE api_key_logs IS 'Log de uso de API keys para auditoría y rate limiting';

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE E: SUCURSALES MEJORADAS
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 14. JUNCIÓN USUARIOS-SUCURSALES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_users (
  id              SERIAL PRIMARY KEY,
  branch_id       INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_branch  VARCHAR(30) NOT NULL DEFAULT 'employee',
    -- 'manager', 'employee', 'viewer'
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,  -- Sucursal principal del usuario
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, user_id)
);

CREATE INDEX idx_branch_users_branch ON branch_users(branch_id);
CREATE INDEX idx_branch_users_user ON branch_users(user_id);
CREATE INDEX idx_branch_users_company ON branch_users(company_id);

COMMENT ON TABLE branch_users IS 'Asignación de usuarios a sucursales con roles específicos';

-- ─── 15. HORARIOS DE SUCURSAL ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_schedules (
  id              SERIAL PRIMARY KEY,
  branch_id       INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dom, 6=Sáb
  open_time       TIME NOT NULL DEFAULT '08:00',
  close_time      TIME NOT NULL DEFAULT '17:00',
  is_closed       BOOLEAN NOT NULL DEFAULT FALSE,
  break_start     TIME,
  break_end       TIME,
  notes           VARCHAR(200),
  UNIQUE(branch_id, day_of_week)
);

CREATE INDEX idx_branch_schedules_branch ON branch_schedules(branch_id);

COMMENT ON TABLE branch_schedules IS 'Horarios de apertura/cierre por día de sucursal';

-- ─── 16. TRIGGERS ─────────────────────────────────────────────────────────
CREATE TRIGGER trg_company_currencies_updated_at
  BEFORE UPDATE ON company_currencies
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_translations_updated_at
  BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_company_integrations_updated_at
  BEFORE UPDATE ON company_integrations
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

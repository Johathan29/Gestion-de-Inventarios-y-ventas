-- ============================================================================
-- MIGRATION 043: DASHBOARD WIDGETS SYSTEM
-- ============================================================================
-- Dashboard dinámico según tipo de negocio
-- Widgets reordenables, configurables y visibles/ocultables por empresa
-- ============================================================================

-- ─── 1. REGISTRO DE WIDGETS DISPONIBLES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id              SERIAL PRIMARY KEY,
  slug            VARCHAR(100) NOT NULL UNIQUE,     -- 'daily_sales', 'active_orders'
  name            VARCHAR(150) NOT NULL,            -- 'Ventas del día'
  description     TEXT,
  category        VARCHAR(50) NOT NULL,             -- 'ventas', 'inventario', 'crm', 'cms', 'finanzas'
  icon            VARCHAR(50),                      -- 'chart-bar', 'shopping-cart'
  component       VARCHAR(100) NOT NULL,            -- Vue component name: 'SalesWidget'
  default_size    VARCHAR(20) NOT NULL DEFAULT 'medium',  -- 'small', 'medium', 'large', 'full'
  min_size        VARCHAR(20) NOT NULL DEFAULT 'small',
  refresh_interval INTEGER,                         -- Seconds; NULL = manual only
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,  -- Can't be disabled
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,

  -- Configuración por defecto
  default_config  JSONB NOT NULL DEFAULT '{
    "show_header": true,
    "show_footer": true,
    "chart_type": "bar",
    "time_range": "today",
    "limit": 10
  }',

  -- Schema de configuración editable
  config_schema   JSONB,                           -- JSON Schema para el editor de configuración

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_widgets_category ON dashboard_widgets(category);
CREATE INDEX idx_dashboard_widgets_slug ON dashboard_widgets(slug);

COMMENT ON TABLE dashboard_widgets IS 'Catálogo de widgets disponibles para dashboards';

-- ─── 2. ASIGNACIÓN DE WIDGETS POR TIPO DE NEGOCIO ────────────────────────
CREATE TABLE IF NOT EXISTS business_type_dashboards (
  id                SERIAL PRIMARY KEY,
  business_type_id  INTEGER NOT NULL REFERENCES business_types(id) ON DELETE CASCADE,
  widget_id         INTEGER NOT NULL REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  config_override   JSONB,                         -- Override de configuración default
  grid_column       INTEGER NOT NULL DEFAULT 1,    -- Grid position (1-12)
  grid_row          INTEGER NOT NULL DEFAULT 1,
  grid_width        INTEGER NOT NULL DEFAULT 6,    -- 1-12 columns
  grid_height       INTEGER NOT NULL DEFAULT 2,    -- Grid rows
  UNIQUE(business_type_id, widget_id)
);

CREATE INDEX idx_btd_type ON business_type_dashboards(business_type_id);

COMMENT ON TABLE business_type_dashboards IS 'Widgets habilitados y configuración para cada tipo de negocio';

-- ─── 3. DASHBOARD PERSONALIZADO POR EMPRESA ───────────────────────────────
CREATE TABLE IF NOT EXISTS company_dashboards (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL DEFAULT 'Mi Dashboard',
  slug            VARCHAR(50) NOT NULL DEFAULT 'main',
  is_default      BOOLEAN NOT NULL DEFAULT TRUE,
  layout          VARCHAR(20) NOT NULL DEFAULT 'grid', -- 'grid', 'list', 'masonry'
  columns         INTEGER NOT NULL DEFAULT 12,          -- Grid columns (12-col grid)
  theme           VARCHAR(20) NOT NULL DEFAULT 'light', -- 'light', 'dark', 'auto'
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

CREATE INDEX idx_company_dashboards_company ON company_dashboards(company_id);

COMMENT ON TABLE company_dashboards IS 'Layouts de dashboard personalizados por empresa';

-- ─── 4. WIDGETS INSTANCIADOS EN DASHBOARD DE EMPRESA ─────────────────────
CREATE TABLE IF NOT EXISTS company_dashboard_widgets (
  id              SERIAL PRIMARY KEY,
  dashboard_id    INTEGER NOT NULL REFERENCES company_dashboards(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  widget_id       INTEGER NOT NULL REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
  is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  config          JSONB NOT NULL DEFAULT '{}',       -- Config override por empresa
  grid_column     INTEGER NOT NULL DEFAULT 1,
  grid_row        INTEGER NOT NULL DEFAULT 1,
  grid_width      INTEGER NOT NULL DEFAULT 6,
  grid_height     INTEGER NOT NULL DEFAULT 2,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cdw_dashboard ON company_dashboard_widgets(dashboard_id);
CREATE INDEX idx_cdw_company ON company_dashboard_widgets(company_id);
CREATE INDEX idx_cdw_widget ON company_dashboard_widgets(widget_id);

COMMENT ON TABLE company_dashboard_widgets IS 'Widgets instalados en el dashboard de cada empresa con posición y config';

-- ─── 5. CACHE DE DATOS DE WIDGETS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS widget_data_cache (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  widget_slug     VARCHAR(100) NOT NULL,
  cache_key       VARCHAR(255) NOT NULL,           -- hash de los parámetros
  data            JSONB NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  UNIQUE(company_id, widget_slug, cache_key)
);

CREATE INDEX idx_wdc_company ON widget_data_cache(company_id);
CREATE INDEX idx_wdc_expires ON widget_data_cache(expires_at);

COMMENT ON TABLE widget_data_cache IS 'Cache de datos pre-computados para widgets del dashboard';

-- ─── 6. PREFERENCIAS DE DASHBOARD POR USUARIO ─────────────────────────────
CREATE TABLE IF NOT EXISTS user_dashboard_prefs (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  dashboard_id    INTEGER REFERENCES company_dashboards(id),
  layout          VARCHAR(20) DEFAULT 'grid',
  theme           VARCHAR(20) DEFAULT 'light',       -- 'light', 'dark', 'auto'
  refresh_auto    BOOLEAN NOT NULL DEFAULT TRUE,
  compact_mode    BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_widgets  INTEGER[] DEFAULT '{}',            -- Array de widget_ids ocultos
  widget_order    JSONB DEFAULT '[]',                -- Orden personalizado: [widget_id, ...]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX idx_udp_user ON user_dashboard_prefs(user_id);

COMMENT ON TABLE user_dashboard_prefs IS 'Preferencias personales de dashboard por usuario';

-- ─── 7. FUNCIÓN: Auto-crear dashboard al registrar empresa ────────────────
CREATE OR REPLACE FUNCTION public.fn_auto_create_company_dashboard()
RETURNS TRIGGER AS $$
DECLARE
  v_bt_id INTEGER;
  v_dash_id INTEGER;
  rec RECORD;
BEGIN
  -- Obtener business_type de la empresa
  SELECT business_type_id INTO v_bt_id
  FROM companies WHERE id = NEW.company_id;

  IF v_bt_id IS NULL THEN
    -- Dashboard genérico
    INSERT INTO company_dashboards (company_id, name, is_default)
    VALUES (NEW.company_id, 'Dashboard Principal', TRUE)
    RETURNING id INTO v_dash_id;
  ELSE
    -- Dashboard con widgets del tipo de negocio
    INSERT INTO company_dashboards (company_id, name, is_default)
    VALUES (NEW.company_id, 'Dashboard Principal', TRUE)
    RETURNING id INTO v_dash_id;

    -- Insertar widgets configurados para este business type
    FOR rec IN
      SELECT btd.widget_id, btd.sort_order, btd.config_override, btd.grid_column, btd.grid_row, btd.grid_width, btd.grid_height
      FROM business_type_dashboards btd
      WHERE btd.business_type_id = v_bt_id AND btd.is_enabled = TRUE
    LOOP
      INSERT INTO company_dashboard_widgets (dashboard_id, company_id, widget_id, sort_order, config, grid_column, grid_row, grid_width, grid_height)
      VALUES (v_dash_id, NEW.company_id, rec.widget_id, rec.sort_order,
              COALESCE(rec.config_override, '{}'),
              rec.grid_column, rec.grid_row, rec.grid_width, rec.grid_height);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─── 8. TRIGGER: Auto-crear dashboard al habilitar módulos ────────────────
-- Se ejecuta cuando la empresa tiene su primer módulo habilitado
CREATE OR REPLACE FUNCTION public.fn_auto_init_dashboard_on_modules()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si es la primera vez que se habilitan módulos
  IF NOT EXISTS (
    SELECT 1 FROM company_dashboards WHERE company_id = NEW.company_id
  ) THEN
    PERFORM public.fn_auto_create_company_dashboard();
    -- Nota: Esto se llama con la empresa como NEW
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 9. VISTA: Dashboard de empresa con datos de widgets ──────────────────
CREATE OR REPLACE VIEW vw_company_dashboard_full AS
SELECT
  cd.id AS dashboard_id,
  cd.company_id,
  cd.name AS dashboard_name,
  cd.layout,
  cd.columns,
  cd.theme,
  cdw.id AS instance_id,
  dw.slug AS widget_slug,
  dw.name AS widget_name,
  dw.component,
  dw.description,
  dw.icon,
  dw.category,
  dw.default_size,
  dw.refresh_interval,
  COALESCE(cdw.config, dw.default_config) AS config,
  cdw.is_visible,
  cdw.sort_order,
  cdw.grid_column,
  cdw.grid_row,
  cdw.grid_width,
  cdw.grid_height
FROM company_dashboards cd
JOIN company_dashboard_widgets cdw ON cdw.dashboard_id = cd.id
JOIN dashboard_widgets dw ON dw.id = cdw.widget_id
WHERE cd.is_active = TRUE
  AND dw.is_active = TRUE
ORDER BY cdw.sort_order, cdw.grid_row, cdw.grid_column;

COMMENT ON VIEW vw_company_dashboard_full IS 'Dashboard completo de empresa con widgets y configuración';

-- ─── 10. VISTA: Cache expirado para limpieza ──────────────────────────────
CREATE OR REPLACE VIEW vw_expired_widget_cache AS
SELECT COUNT(*) AS expired_entries, SUM(LENGTH(data::text))::BIGINT AS bytes_to_free
FROM widget_data_cache
WHERE expires_at < NOW();

-- ─── 11. FUNCIÓN: Limpiar cache expirado ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_clean_widget_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM widget_data_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fn_clean_widget_cache IS 'Elimina entradas de cache de widgets expiradas';

-- ─── 12. TRIGGERS ─────────────────────────────────────────────────────────
CREATE TRIGGER trg_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_company_dashboards_updated_at
  BEFORE UPDATE ON company_dashboards
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_company_dashboard_widgets_updated_at
  BEFORE UPDATE ON company_dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trg_user_dashboard_prefs_updated_at
  BEFORE UPDATE ON user_dashboard_prefs
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

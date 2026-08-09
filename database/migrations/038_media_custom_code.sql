-- ============================================================
-- MIGRATION 038: MEDIA STORAGE, CUSTOM CODE, REDIRECTS
-- Media Assets, Custom Code Blocks, URL Redirects, Analytics
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. MEDIA ASSETS (centralized media library)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.media_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- File info
  file_name       VARCHAR(255) NOT NULL,
  file_path       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_size       INTEGER,                -- bytes
  mime_type       VARCHAR(100),
  file_extension  VARCHAR(20),
  
  -- Organization
  folder          VARCHAR(255) DEFAULT '/',
  tags            TEXT[] DEFAULT '{}',
  alt_text        VARCHAR(255),
  title           VARCHAR(255),
  caption         TEXT,
  description     TEXT,
  
  -- Dimensions (for images/videos)
  width           INTEGER,
  height          INTEGER,
  duration_ms     INTEGER,                -- for video/audio
  
  -- Source
  uploaded_by     UUID REFERENCES public.users(id),
  source          VARCHAR(30) DEFAULT 'upload',
  -- 'upload', 'url', 'generated', 'ai', 'stock'
  
  -- Usage tracking
  usage_count     INTEGER NOT NULL DEFAULT 0,
  usage_refs      JSONB DEFAULT '[]',
  -- [{ "entity": "cms_component", "entity_id": "..." }, ...]
  
  -- Variant thumbnails
  thumbnails      JSONB DEFAULT '{}',
  -- { "small": "url", "medium": "url", "large": "url" }
  
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.media_assets IS 'Centralized media library per tenant';

CREATE INDEX IF NOT EXISTS idx_media_assets_company ON public.media_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON public.media_assets(company_id, folder);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON public.media_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_assets_mime ON public.media_assets(company_id, mime_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_name ON public.media_assets USING GIN(to_tsvector('spanish', file_name));

-- ────────────────────────────────────────────────────────────
-- 2. CUSTOM CODE BLOCKS (injected HTML/CSS/JS)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.custom_code_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  
  -- Code content
  code_type       VARCHAR(20) NOT NULL,
  -- 'html', 'css', 'javascript', 'head_meta', 'body_top', 'body_bottom'
  code_content    TEXT NOT NULL,
  
  -- Injection point
  injection_point VARCHAR(30) NOT NULL DEFAULT 'body_bottom',
  -- 'head', 'body_top', 'body_bottom', 'after_opening_body', 'before_closing_body',
  -- 'custom_component'
  
  -- Pages
  applies_to      VARCHAR(30) NOT NULL DEFAULT 'all',
  -- 'all', 'homepage', 'product_pages', 'category_pages', 'checkout', 'custom'
  target_pages    UUID[] DEFAULT '{}',  -- specific page IDs
  target_paths    TEXT[] DEFAULT '{}',  -- URL path patterns (regex)
  
  -- Conditions
  requires_auth   BOOLEAN NOT NULL DEFAULT false,
  only_mobile     BOOLEAN NOT NULL DEFAULT false,
  only_desktop    BOOLEAN NOT NULL DEFAULT false,
  
  priority        INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.custom_code_blocks IS 'Custom HTML/CSS/JS code injection per tenant';

CREATE INDEX IF NOT EXISTS idx_custom_code_company ON public.custom_code_blocks(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_code_type ON public.custom_code_blocks(company_id, code_type);

-- ────────────────────────────────────────────────────────────
-- 3. URL REDIRECTS (301/302 redirects)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.url_redirects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  from_path       VARCHAR(500) NOT NULL,
  to_path         VARCHAR(500) NOT NULL,
  redirect_type   SMALLINT NOT NULL DEFAULT 301,  -- 301 = permanent, 302 = temporary
  
  -- Pattern matching
  is_regex        BOOLEAN NOT NULL DEFAULT false,
  
  -- Tracking
  hit_count       INTEGER NOT NULL DEFAULT 0,
  last_hit_at     TIMESTAMPTZ,
  
  is_active       BOOLEAN NOT NULL DEFAULT true,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, from_path)
);

COMMENT ON TABLE public.url_redirects IS 'URL redirect rules per tenant (SEO-friendly)';

CREATE INDEX IF NOT EXISTS idx_redirects_company ON public.url_redirects(company_id);
CREATE INDEX IF NOT EXISTS idx_redirects_from ON public.url_redirects(company_id, from_path);

-- ────────────────────────────────────────────────────────────
-- 4. PAGES ANALYTICS (page view tracking)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.page_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  page_id         UUID REFERENCES public.cms_pages(id) ON DELETE SET NULL,
  page_path       VARCHAR(500) NOT NULL,
  
  -- Visitor info
  visitor_id      VARCHAR(255),          -- anonymous tracking ID
  user_id         UUID REFERENCES public.users(id),
  client_id       UUID REFERENCES public.clients(id),
  session_id      VARCHAR(255),
  
  -- Device info
  device_type     VARCHAR(20),           -- 'desktop', 'mobile', 'tablet'
  browser         VARCHAR(50),
  os              VARCHAR(50),
  country_code    VARCHAR(2),
  city            VARCHAR(100),
  
  -- Referrer
  referrer_url    TEXT,
  referrer_domain VARCHAR(255),
  utm_source      VARCHAR(100),
  utm_medium      VARCHAR(100),
  utm_campaign    VARCHAR(100),
  
  -- Performance
  load_time_ms    INTEGER,
  
  viewed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.page_analytics IS 'Page view analytics per tenant';

-- Partition by month for performance
CREATE INDEX IF NOT EXISTS idx_page_analytics_company ON public.page_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_date ON public.page_analytics(company_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_analytics_page ON public.page_analytics(page_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_visitor ON public.page_analytics(company_id, visitor_id);

-- ────────────────────────────────────────────────────────────
-- 5. CONVERSION TRACKING (form submissions, cart events, etc.)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversion_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  event_type      VARCHAR(50) NOT NULL,
  -- 'form_submit', 'add_to_cart', 'begin_checkout', 'purchase',
  -- 'newsletter_signup', 'register', 'search', 'view_item', 'select_item'
  
  event_data      JSONB NOT NULL DEFAULT '{}',
  -- { "product_id": "...", "value": 99.99, "currency": "DOP", "items": [...] }
  
  -- Attribution
  visitor_id      VARCHAR(255),
  user_id         UUID REFERENCES public.users(id),
  client_id       UUID REFERENCES public.clients(id),
  session_id      VARCHAR(255),
  
  -- Source
  page_path       VARCHAR(500),
  referrer_url    TEXT,
  utm_source      VARCHAR(100),
  utm_medium      VARCHAR(100),
  utm_campaign    VARCHAR(100),
  
  -- E-commerce
  order_id        UUID,
  value           DECIMAL(12,2),
  tax             DECIMAL(12,2),
  shipping        DECIMAL(12,2),
  currency        VARCHAR(3),
  
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.conversion_events IS 'Conversion event tracking per tenant';

CREATE INDEX IF NOT EXISTS idx_conversion_company ON public.conversion_events(company_id);
CREATE INDEX IF NOT EXISTS idx_conversion_type ON public.conversion_events(company_id, event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_date ON public.conversion_events(company_id, occurred_at DESC);

-- ────────────────────────────────────────────────────────────
-- 6. COMPANY ANALYTICS SUMMARY (daily aggregated stats)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.company_analytics_summary (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  date            DATE NOT NULL,
  
  -- Page views
  page_views      INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  unique_sessions INTEGER NOT NULL DEFAULT 0,
  
  -- E-commerce
  total_revenue   DECIMAL(12,2) NOT NULL DEFAULT 0,
  order_count     INTEGER NOT NULL DEFAULT 0,
  avg_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Conversion
  cart_additions  INTEGER NOT NULL DEFAULT 0,
  checkouts       INTEGER NOT NULL DEFAULT 0,
  conversions     INTEGER NOT NULL DEFAULT 0,
  conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Forms
  form_submissions INTEGER NOT NULL DEFAULT 0,
  
  -- Top pages
  top_pages       JSONB DEFAULT '[]',
  -- [{ "path": "/", "views": 1234 }, ...]
  
  -- Top referrers
  top_referrers   JSONB DEFAULT '[]',
  
  -- Device breakdown
  devices         JSONB DEFAULT '{"desktop": 0, "mobile": 0, "tablet": 0}',
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, date)
);

COMMENT ON TABLE public.company_analytics_summary IS 'Daily aggregated analytics per tenant';

CREATE INDEX IF NOT EXISTS idx_analytics_summary_company ON public.company_analytics_summary(company_id);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_date ON public.company_analytics_summary(company_id, date DESC);

-- ────────────────────────────────────────────────────────────
-- 7. PLATFORM ANALYTICS (global platform stats)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL,
  
  -- Tenant stats
  total_companies INTEGER NOT NULL DEFAULT 0,
  active_companies INTEGER NOT NULL DEFAULT 0,
  new_companies   INTEGER NOT NULL DEFAULT 0,
  churned_companies INTEGER NOT NULL DEFAULT 0,
  
  -- User stats
  total_users     INTEGER NOT NULL DEFAULT 0,
  active_users    INTEGER NOT NULL DEFAULT 0,
  new_users       INTEGER NOT NULL DEFAULT 0,
  
  -- Revenue
  mrr             DECIMAL(12,2) NOT NULL DEFAULT 0,  -- monthly recurring revenue
  arr             DECIMAL(12,2) NOT NULL DEFAULT 0,  -- annual recurring revenue
  
  -- Module usage
  module_usage    JSONB DEFAULT '{}',
  -- { "catalog": 45, "inventory": 38, "pos": 22, ... }
  
  -- Plan distribution
  plan_distribution JSONB DEFAULT '{}',
  -- { "free": 20, "starter": 15, "professional": 8, "enterprise": 2 }
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date)
);

COMMENT ON TABLE public.platform_analytics IS 'Global platform analytics (aggregated daily)';

-- ────────────────────────────────────────────────────────────
-- 8. INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_url_redirects_active ON public.url_redirects(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_page_analytics_date_path ON public.page_analytics(company_id, viewed_at DESC, page_path);
CREATE INDEX IF NOT EXISTS idx_conversion_events_date ON public.conversion_events(company_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_date ON public.company_analytics_summary(date DESC);

-- ────────────────────────────────────────────────────────────
-- 9. RLS POLICIES
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_code_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_analytics ENABLE ROW LEVEL SECURITY;

-- Media Assets: company-scoped
CREATE POLICY "media_select" ON public.media_assets
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "media_insert" ON public.media_assets
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "media_update" ON public.media_assets
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "media_delete" ON public.media_assets
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Custom Code: company-scoped
CREATE POLICY "custom_code_select" ON public.custom_code_blocks
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "custom_code_insert" ON public.custom_code_blocks
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "custom_code_update" ON public.custom_code_blocks
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "custom_code_delete" ON public.custom_code_blocks
  FOR DELETE USING (company_id = public.get_current_company_id());

-- URL Redirects: company-scoped
CREATE POLICY "redirects_select" ON public.url_redirects
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "redirects_insert" ON public.url_redirects
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "redirects_update" ON public.url_redirects
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "redirects_delete" ON public.url_redirects
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Page Analytics: company-scoped (write only for service role)
CREATE POLICY "analytics_insert" ON public.page_analytics
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "analytics_select" ON public.page_analytics
  FOR SELECT USING (
    (company_id = public.get_current_company_id() AND public.is_company_admin())
    OR public.is_platform_admin()
  );

-- Conversion Events: company-scoped
CREATE POLICY "conversion_insert" ON public.conversion_events
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "conversion_select" ON public.conversion_events
  FOR SELECT USING (
    (company_id = public.get_current_company_id() AND public.is_company_admin())
    OR public.is_platform_admin()
  );

-- Analytics Summary: company-scoped
CREATE POLICY "analytics_summary_select" ON public.company_analytics_summary
  FOR SELECT USING (
    (company_id = public.get_current_company_id() AND public.is_company_admin())
    OR public.is_platform_admin()
  );

-- Platform Analytics: platform_admin only
CREATE POLICY "platform_analytics_select" ON public.platform_analytics
  FOR SELECT USING (public.is_platform_admin());
CREATE POLICY "platform_analytics_insert" ON public.platform_analytics
  FOR INSERT WITH CHECK (public.is_platform_admin());

-- ────────────────────────────────────────────────────────────
-- 10. TRIGGERS
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at_media_assets
  BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_custom_code
  BEFORE UPDATE ON public.custom_code_blocks FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_redirects
  BEFORE UPDATE ON public.url_redirects FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Increment redirect hit count
CREATE OR REPLACE FUNCTION public.fn_redirect_hit_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.url_redirects
  SET hit_count = hit_count + 1, last_hit_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Increment media usage count
CREATE OR REPLACE FUNCTION public.fn_media_usage_increment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.media_assets
  SET usage_count = usage_count + 1
  WHERE id = NEW.media_asset_id;
  RETURN NEW;
END;
$$;

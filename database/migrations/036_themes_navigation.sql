-- ============================================================
-- MIGRATION 036: THEMES, NAVIGATION, HEADER/FOOTER SYSTEM
-- Theme Engine, Company Themes, Site Navigation, Header, Footer
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. THEMES (global theme definitions)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  thumbnail_url   TEXT,
  
  -- Color palette
  colors          JSONB NOT NULL DEFAULT '{
    "primary": "#624200",
    "secondary": "#815c03",
    "accent": "#dbb12b",
    "background": "#ffffff",
    "surface": "#f9fafb",
    "text": "#111827",
    "text_secondary": "#6b7280",
    "border": "#e5e7eb",
    "error": "#ef4444",
    "success": "#22c55e",
    "warning": "#f59e0b"
  }',
  
  -- Typography
  typography      JSONB NOT NULL DEFAULT '{
    "font_heading": "Inter",
    "font_body": "Inter",
    "font_mono": "JetBrains Mono",
    "title_size": "2.5rem",
    "h1_size": "2.25rem",
    "h2_size": "1.875rem",
    "h3_size": "1.5rem",
    "body_size": "1rem",
    "small_size": "0.875rem"
  }',
  
  -- Layout
  layout          JSONB NOT NULL DEFAULT '{
    "max_width": "1280px",
    "sidebar_width": "280px",
    "header_height": "64px",
    "footer_height": "auto",
    "border_radius": "0.5rem",
    "shadow_sm": "0 1px 2px 0 rgba(0,0,0,0.05)",
    "shadow_md": "0 4px 6px -1px rgba(0,0,0,0.1)",
    "shadow_lg": "0 10px 15px -3px rgba(0,0,0,0.1)"
  }',
  
  -- Component styles
  components      JSONB NOT NULL DEFAULT '{}',
  -- { "button": { "rounded": true, "shadow": true }, "card": { "hover": true }, ... }
  
  -- Visual style
  visual_style    VARCHAR(30) DEFAULT 'modern', -- 'modern', 'classic', 'minimal', 'bold', 'elegant'
  border_style    VARCHAR(30) DEFAULT 'rounded', -- 'sharp', 'rounded', 'pill'
  
  -- Image/Background
  hero_style      VARCHAR(30) DEFAULT 'gradient', -- 'gradient', 'image', 'video', 'particles'
  hero_overlay    VARCHAR(10) DEFAULT '0.5',
  
  -- Features
  dark_mode       BOOLEAN NOT NULL DEFAULT false,
  custom_css      TEXT,
  custom_js       TEXT,
  
  is_system       BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.themes IS 'Global theme definitions for Aurora Platform';

-- ────────────────────────────────────────────────────────────
-- 2. COMPANY THEMES (active theme per company + overrides)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.company_themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  theme_id        UUID NOT NULL REFERENCES public.themes(id),
  
  -- Overrides (NULL = use theme default)
  color_overrides     JSONB DEFAULT '{}',
  typography_overrides JSONB DEFAULT '{}',
  layout_overrides    JSONB DEFAULT '{}',
  component_overrides JSONB DEFAULT '{}',
  
  custom_css      TEXT,
  custom_js       TEXT,
  custom_fonts    JSONB DEFAULT '[]',
  -- [{ name: "Brand Font", url: "https://...", weights: [400,700] }]
  
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

COMMENT ON TABLE public.company_themes IS 'Active theme configuration per company with overrides';

-- Update companies FK to reference company_themes
ALTER TABLE public.companies
  ADD CONSTRAINT fk_companies_theme
  FOREIGN KEY (theme_id) REFERENCES public.company_themes(id)
  ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- 3. THEME SETTINGS (granular theme settings per company)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.theme_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category        VARCHAR(50) NOT NULL,
  -- 'colors', 'typography', 'layout', 'buttons', 'cards', 'forms', 'animations', 'responsive'
  key             VARCHAR(100) NOT NULL,
  value           JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, category, key)
);

COMMENT ON TABLE public.theme_settings IS 'Granular theme settings per company';

-- ────────────────────────────────────────────────────────────
-- 4. SITE HEADERS (header configuration)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_headers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Layout
  layout          VARCHAR(30) NOT NULL DEFAULT 'standard',
  -- 'standard', 'centered', 'split', 'overlay', 'transparent', 'sticky', 'hamburger'
  
  sticky          BOOLEAN NOT NULL DEFAULT true,
  transparent     BOOLEAN NOT NULL DEFAULT false,
  blur_bg         BOOLEAN NOT NULL DEFAULT false,
  shadow_on_scroll BOOLEAN NOT NULL DEFAULT true,
  
  -- Height
  height          INTEGER DEFAULT 64,
  height_sticky   INTEGER DEFAULT 56,
  height_mobile   INTEGER DEFAULT 56,
  
  -- Logo
  logo_url        TEXT,
  logo_dark_url   TEXT,  -- for dark mode
  logo_height     INTEGER DEFAULT 40,
  logo_mobile_height INTEGER DEFAULT 32,
  
  -- Actions
  show_search     BOOLEAN NOT NULL DEFAULT true,
  show_cart       BOOLEAN NOT NULL DEFAULT true,
  show_wishlist   BOOLEAN NOT NULL DEFAULT true,
  show_account    BOOLEAN NOT NULL DEFAULT true,
  show_branch_selector BOOLEAN NOT NULL DEFAULT false,
  
  -- Mobile
  mobile_menu_style VARCHAR(30) DEFAULT 'slide', -- 'slide', 'dropdown', 'fullscreen', 'push'
  
  -- Announcement bar
  show_announcement   BOOLEAN NOT NULL DEFAULT false,
  announcement_text   TEXT,
  announcement_bg     VARCHAR(7) DEFAULT '#624200',
  announcement_text_color VARCHAR(7) DEFAULT '#ffffff',
  announcement_url    VARCHAR(500),
  
  -- Styling
  bg_color        VARCHAR(20) DEFAULT 'transparent',
  text_color      VARCHAR(20) DEFAULT 'auto',
  border_bottom   BOOLEAN NOT NULL DEFAULT false,
  border_color    VARCHAR(20) DEFAULT '#e5e7eb',
  custom_css      TEXT,
  
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

COMMENT ON TABLE public.site_headers IS 'Header configuration per company';

-- ────────────────────────────────────────────────────────────
-- 5. SITE NAVIGATION MENUS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_navigation_menus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  location       VARCHAR(50) NOT NULL DEFAULT 'header',
  -- 'header', 'footer', 'mobile', 'sidebar', 'breadcrumb'
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, slug)
);

COMMENT ON TABLE public.site_navigation_menus IS 'Navigation menu definitions per company';

-- ────────────────────────────────────────────────────────────
-- 6. SITE NAVIGATION ITEMS (menu items)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_navigation_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id         UUID NOT NULL REFERENCES public.site_navigation_menus(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  parent_id       UUID REFERENCES public.site_navigation_items(id) ON DELETE CASCADE,
  
  label           VARCHAR(255) NOT NULL,
  url             VARCHAR(500),
  target          VARCHAR(20) DEFAULT '_self', -- '_self', '_blank'
  
  -- Link type
  link_type       VARCHAR(30) DEFAULT 'url',
  -- 'url', 'page', 'category', 'product', 'collection', 'search', 'form', 'anchor'
  link_id         UUID,                    -- ID of linked entity (page_id, category_id, etc.)
  
  -- Visual
  icon            VARCHAR(50),
  icon_url        TEXT,
  image_url       TEXT,
  badge           VARCHAR(50),             -- e.g., "NEW", "SALE"
  badge_color     VARCHAR(7) DEFAULT '#ef4444',
  
  -- Mega menu
  is_mega         BOOLEAN NOT NULL DEFAULT false,
  mega_content    JSONB DEFAULT '{}',
  -- { "columns": 4, "featured": {...}, "banners": [...] }
  
  -- Dropdown
  dropdown_style  VARCHAR(30) DEFAULT 'default',
  -- 'default', 'mega', 'fullwidth', 'tabs', 'tree'
  
  -- Visibility
  show_on_desktop BOOLEAN NOT NULL DEFAULT true,
  show_on_mobile  BOOLEAN NOT NULL DEFAULT true,
  
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_navigation_items IS 'Individual navigation menu items';

CREATE INDEX IF NOT EXISTS idx_sni_menu ON public.site_navigation_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_sni_parent ON public.site_navigation_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_sni_company ON public.site_navigation_items(company_id);

-- ────────────────────────────────────────────────────────────
-- 7. SITE HEADER WIDGETS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_header_widgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  widget_type     VARCHAR(50) NOT NULL,
  -- 'search', 'cart', 'wishlist', 'account', 'phone', 'email', 'social', 'language', 'currency', 'custom'
  
  label           VARCHAR(255),
  icon            VARCHAR(50),
  url             VARCHAR(500),
  
  config          JSONB NOT NULL DEFAULT '{}',
  -- widget-specific config (e.g., social links, phone number, etc.)
  
  position        VARCHAR(30) NOT NULL DEFAULT 'right',
  -- 'left', 'center', 'right'
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_header_widgets IS 'Header widget slots per company';

-- ────────────────────────────────────────────────────────────
-- 8. SITE FOOTERS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_footers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Layout
  layout          VARCHAR(30) NOT NULL DEFAULT 'multi_column',
  -- 'simple', 'multi_column', 'newsletter', 'complex'
  columns         INTEGER DEFAULT 4,
  
  -- Newsletter section
  show_newsletter     BOOLEAN NOT NULL DEFAULT true,
  newsletter_title    VARCHAR(255) DEFAULT 'Suscríbete a nuestro newsletter',
  newsletter_subtitle TEXT DEFAULT 'Recibe las mejores ofertas y novedades.',
  newsletter_button   VARCHAR(100) DEFAULT 'Suscribirse',
  
  -- Bottom bar
  show_bottom_bar     BOOLEAN NOT NULL DEFAULT true,
  bottom_bar_text     TEXT DEFAULT '© {year} {company_name}. Todos los derechos reservados.',
  
  -- Payment icons
  show_payment_icons  BOOLEAN NOT NULL DEFAULT true,
  payment_icons       JSONB DEFAULT '["visa","mastercard","amex","paypal"]',
  
  -- Styling
  bg_color        VARCHAR(20) DEFAULT '#1f2937',
  text_color      VARCHAR(20) DEFAULT '#f9fafb',
  link_color      VARCHAR(20) DEFAULT '#dbb12b',
  
  custom_css      TEXT,
  
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

COMMENT ON TABLE public.site_footers IS 'Footer configuration per company';

-- ────────────────────────────────────────────────────────────
-- 9. SITE FOOTER COLUMNS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_footer_columns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  footer_id       UUID NOT NULL REFERENCES public.site_footers(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  title           VARCHAR(255) NOT NULL,
  content_type    VARCHAR(30) NOT NULL DEFAULT 'links',
  -- 'links', 'html', 'social', 'newsletter', 'contact', 'image'
  content_html    TEXT,
  content_json    JSONB DEFAULT '{}',
  
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_footer_columns IS 'Footer columns per company';

CREATE INDEX IF NOT EXISTS idx_sfc_footer ON public.site_footer_columns(footer_id);

-- ────────────────────────────────────────────────────────────
-- 10. SITE FOOTER LINKS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_footer_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id       UUID NOT NULL REFERENCES public.site_footer_columns(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  label           VARCHAR(255) NOT NULL,
  url             VARCHAR(500),
  target          VARCHAR(20) DEFAULT '_self',
  icon            VARCHAR(50),
  
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_footer_links IS 'Individual footer links per column';

CREATE INDEX IF NOT EXISTS idx_sfl_column ON public.site_footer_links(column_id);

-- ────────────────────────────────────────────────────────────
-- 11. SITE SOCIAL LINKS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_social_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  platform        VARCHAR(50) NOT NULL,
  -- 'facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'linkedin',
  -- 'pinterest', 'snapchat', 'whatsapp', 'telegram', 'github'
  
  url             VARCHAR(500) NOT NULL,
  username        VARCHAR(255),
  
  -- Where to display
  show_in_header  BOOLEAN NOT NULL DEFAULT false,
  show_in_footer  BOOLEAN NOT NULL DEFAULT true,
  show_in_contact BOOLEAN NOT NULL DEFAULT false,
  
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, platform)
);

COMMENT ON TABLE public.site_social_links IS 'Social media links per company';

-- ────────────────────────────────────────────────────────────
-- 12. INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_themes_slug ON public.themes(slug);
CREATE INDEX IF NOT EXISTS idx_themes_active ON public.themes(is_active);
CREATE INDEX IF NOT EXISTS idx_company_themes_company ON public.company_themes(company_id);
CREATE INDEX IF NOT EXISTS idx_company_themes_theme ON public.company_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_settings_company ON public.theme_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_site_headers_company ON public.site_headers(company_id);
CREATE INDEX IF NOT EXISTS idx_snm_company ON public.site_navigation_menus(company_id);
CREATE INDEX IF NOT EXISTS idx_snm_location ON public.site_navigation_menus(company_id, location);
CREATE INDEX IF NOT EXISTS idx_sni_sort ON public.site_navigation_items(menu_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_shw_company ON public.site_header_widgets(company_id);
CREATE INDEX IF NOT EXISTS idx_site_footers_company ON public.site_footers(company_id);
CREATE INDEX IF NOT EXISTS idx_sfl_company ON public.site_footer_links(company_id);
CREATE INDEX IF NOT EXISTS idx_ssl_company ON public.site_social_links(company_id);
CREATE INDEX IF NOT EXISTS idx_ssl_platform ON public.site_social_links(company_id, platform);

-- ────────────────────────────────────────────────────────────
-- 13. RLS POLICIES
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_header_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_footers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_footer_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_footer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_social_links ENABLE ROW LEVEL SECURITY;

-- Themes: read for all authenticated, manage for platform_admin
CREATE POLICY "themes_select" ON public.themes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "themes_insert" ON public.themes FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY "themes_update" ON public.themes FOR UPDATE USING (public.is_platform_admin());
CREATE POLICY "themes_delete" ON public.themes FOR DELETE USING (public.is_platform_admin());

-- Company Themes: company-scoped
CREATE POLICY "company_themes_select" ON public.company_themes
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "company_themes_insert" ON public.company_themes
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id() AND public.is_company_admin());
CREATE POLICY "company_themes_update" ON public.company_themes
  FOR UPDATE USING (company_id = public.get_current_company_id() AND public.is_company_admin());
CREATE POLICY "company_themes_delete" ON public.company_themes
  FOR DELETE USING (company_id = public.get_current_company_id() AND public.is_company_admin());

-- Theme Settings: company-scoped
CREATE POLICY "theme_settings_select" ON public.theme_settings
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "theme_settings_insert" ON public.theme_settings
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "theme_settings_update" ON public.theme_settings
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "theme_settings_delete" ON public.theme_settings
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Site Headers: company-scoped
CREATE POLICY "site_headers_select" ON public.site_headers
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "site_headers_insert" ON public.site_headers
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "site_headers_update" ON public.site_headers
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "site_headers_delete" ON public.site_headers
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Navigation Menus: company-scoped
CREATE POLICY "nav_menus_select" ON public.site_navigation_menus
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "nav_menus_insert" ON public.site_navigation_menus
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "nav_menus_update" ON public.site_navigation_menus
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "nav_menus_delete" ON public.site_navigation_menus
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Navigation Items: company-scoped
CREATE POLICY "nav_items_select" ON public.site_navigation_items
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "nav_items_insert" ON public.site_navigation_items
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "nav_items_update" ON public.site_navigation_items
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "nav_items_delete" ON public.site_navigation_items
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Header Widgets: company-scoped
CREATE POLICY "header_widgets_select" ON public.site_header_widgets
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "header_widgets_insert" ON public.site_header_widgets
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "header_widgets_update" ON public.site_header_widgets
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "header_widgets_delete" ON public.site_header_widgets
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Site Footers: company-scoped
CREATE POLICY "site_footers_select" ON public.site_footers
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "site_footers_insert" ON public.site_footers
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "site_footers_update" ON public.site_footers
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "site_footers_delete" ON public.site_footers
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Footer Columns: company-scoped
CREATE POLICY "footer_cols_select" ON public.site_footer_columns
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "footer_cols_insert" ON public.site_footer_columns
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "footer_cols_update" ON public.site_footer_columns
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "footer_cols_delete" ON public.site_footer_columns
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Footer Links: company-scoped
CREATE POLICY "footer_links_select" ON public.site_footer_links
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "footer_links_insert" ON public.site_footer_links
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "footer_links_update" ON public.site_footer_links
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "footer_links_delete" ON public.site_footer_links
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Social Links: company-scoped
CREATE POLICY "social_links_select" ON public.site_social_links
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "social_links_insert" ON public.site_social_links
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "social_links_update" ON public.site_social_links
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "social_links_delete" ON public.site_social_links
  FOR DELETE USING (company_id = public.get_current_company_id());

-- ────────────────────────────────────────────────────────────
-- 14. TRIGGERS
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at_themes
  BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_company_themes
  BEFORE UPDATE ON public.company_themes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_theme_settings
  BEFORE UPDATE ON public.theme_settings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_site_headers
  BEFORE UPDATE ON public.site_headers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_snm
  BEFORE UPDATE ON public.site_navigation_menus FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_sni
  BEFORE UPDATE ON public.site_navigation_items FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_shw
  BEFORE UPDATE ON public.site_header_widgets FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_site_footers
  BEFORE UPDATE ON public.site_footers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_sfc
  BEFORE UPDATE ON public.site_footer_columns FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_sfl
  BEFORE UPDATE ON public.site_footer_links FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_ssl
  BEFORE UPDATE ON public.site_social_links FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

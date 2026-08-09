-- ============================================================
-- MIGRATION 039: COMPREHENSIVE RLS & PUBLIC STOREFRONT
-- Public access policies, storefront helper functions,
-- and RLS audit for all Aurora Platform tables
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PUBLIC STOREFRONT HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Resolve company from domain/subdomain (used by public storefront)
CREATE OR REPLACE FUNCTION public.resolve_company_by_domain(p_domain TEXT)
RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR(255),
  company_slug VARCHAR(255),
  is_active BOOLEAN,
  business_type_slug VARCHAR(100)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.is_active,
    bt.slug
  FROM public.companies c
  LEFT JOIN public.business_types bt ON bt.id = c.business_type_id
  WHERE c.slug = p_domain
     OR c.settings->>'domain' = p_domain
     OR p_domain ILIKE '%.' || c.slug || '.%'
  LIMIT 1;
END;
$$;

-- Get active company for storefront rendering
CREATE OR REPLACE FUNCTION public.get_storefront_company(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  slug VARCHAR(255),
  logo_url TEXT,
  favicon_url TEXT,
  description TEXT,
  currency_code VARCHAR(3),
  timezone VARCHAR(50),
  locale VARCHAR(10),
  settings JSONB,
  meta_title VARCHAR(255),
  meta_description TEXT,
  og_image_url TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.name, c.slug, c.logo_url, c.favicon_url, c.description,
    c.currency_code, c.timezone, c.locale, c.settings,
    c.meta_title, c.meta_description, c.og_image_url
  FROM public.companies c
  WHERE c.id = p_company_id AND c.is_active = true AND c.deleted_at IS NULL;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. PUBLIC STOREFRONT RLS POLICIES
-- These policies allow 'anon' and 'authenticated' roles
-- to read published/public data for storefront rendering
-- ────────────────────────────────────────────────────────────

-- ---- PAGES (public storefront) ----
DROP POLICY IF EXISTS "public_cms_pages" ON public.cms_pages;
CREATE POLICY "public_cms_pages" ON public.cms_pages
  FOR SELECT USING (
    is_published = true
    AND deleted_at IS NULL
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- PAGE SECTIONS (public storefront) ----
DROP POLICY IF EXISTS "public_cms_sections" ON public.cms_page_sections;
CREATE POLICY "public_cms_sections" ON public.cms_page_sections
  FOR SELECT USING (
    is_visible = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- COMPONENT INSTANCES (public storefront) ----
DROP POLICY IF EXISTS "public_cms_instances" ON public.cms_component_instances;
CREATE POLICY "public_cms_instances" ON public.cms_component_instances
  FOR SELECT USING (
    is_visible = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- COMPONENT REGISTRY (public read) ----
DROP POLICY IF EXISTS "public_cms_registry" ON public.cms_component_registry;
CREATE POLICY "public_cms_registry" ON public.cms_component_registry
  FOR SELECT USING (is_active = true);

-- ---- NAVIGATION MENUS (public storefront) ----
DROP POLICY IF EXISTS "public_nav_menus" ON public.site_navigation_menus;
CREATE POLICY "public_nav_menus" ON public.site_navigation_menus
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- NAVIGATION ITEMS (public storefront) ----
DROP POLICY IF EXISTS "public_nav_items" ON public.site_navigation_items;
CREATE POLICY "public_nav_items" ON public.site_navigation_items
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- HEADER (public storefront) ----
DROP POLICY IF EXISTS "public_site_headers" ON public.site_headers;
CREATE POLICY "public_site_headers" ON public.site_headers
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- HEADER WIDGETS (public storefront) ----
DROP POLICY IF EXISTS "public_header_widgets" ON public.site_header_widgets;
CREATE POLICY "public_header_widgets" ON public.site_header_widgets
  FOR SELECT USING (
    is_visible = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- FOOTER (public storefront) ----
DROP POLICY IF EXISTS "public_site_footers" ON public.site_footers;
CREATE POLICY "public_site_footers" ON public.site_footers
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- FOOTER COLUMNS (public storefront) ----
DROP POLICY IF EXISTS "public_footer_cols" ON public.site_footer_columns;
CREATE POLICY "public_footer_cols" ON public.site_footer_columns
  FOR SELECT USING (
    is_visible = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- FOOTER LINKS (public storefront) ----
DROP POLICY IF EXISTS "public_footer_links" ON public.site_footer_links;
CREATE POLICY "public_footer_links" ON public.site_footer_links
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- SOCIAL LINKS (public storefront) ----
DROP POLICY IF EXISTS "public_social_links" ON public.site_social_links;
CREATE POLICY "public_social_links" ON public.site_social_links
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- COMPANY THEME (public storefront) ----
DROP POLICY IF EXISTS "public_company_themes" ON public.company_themes;
CREATE POLICY "public_company_themes" ON public.company_themes
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- THEME SETTINGS (public storefront) ----
DROP POLICY IF EXISTS "public_theme_settings" ON public.theme_settings;
CREATE POLICY "public_theme_settings" ON public.theme_settings
  FOR SELECT USING (
    company_id = public.get_current_company_id()
    OR public.is_platform_admin()
  );

-- ---- THEMES (public read) ----
DROP POLICY IF EXISTS "public_themes" ON public.themes;
CREATE POLICY "public_themes" ON public.themes
  FOR SELECT USING (is_active = true);

-- ---- PRODUCTS (public storefront) ----
DROP POLICY IF EXISTS "public_products" ON public.products;
CREATE POLICY "public_products" ON public.products
  FOR SELECT USING (
    company_id = public.get_current_company_id()
    OR public.is_platform_admin()
  );

-- ---- PRODUCT VARIANTS (public storefront) ----
DROP POLICY IF EXISTS "public_product_variants" ON public.product_variants;
CREATE POLICY "public_product_variants" ON public.product_variants
  FOR SELECT USING (
    company_id = public.get_current_company_id()
    OR public.is_platform_admin()
  );

-- ---- CATEGORIES (public storefront) ----
DROP POLICY IF EXISTS "public_categories" ON public.categories;
CREATE POLICY "public_categories" ON public.categories
  FOR SELECT USING (
    company_id = public.get_current_company_id()
    OR public.is_platform_admin()
  );

-- ---- BRANDS (public storefront) ----
DROP POLICY IF EXISTS "public_brands" ON public.brands;
CREATE POLICY "public_brands" ON public.brands
  FOR SELECT USING (
    company_id = public.get_current_company_id()
    OR public.is_platform_admin()
  );

-- ---- ECOMMERCE SETTINGS (public storefront) ----
DROP POLICY IF EXISTS "public_ecommerce_settings" ON public.ecommerce_settings;
CREATE POLICY "public_ecommerce_settings" ON public.ecommerce_settings
  FOR SELECT USING (
    (company_id = public.get_current_company_id() AND is_active = true)
    OR public.is_platform_admin()
  );

-- ---- BANNERS (public storefront) ----
DROP POLICY IF EXISTS "public_banners" ON public.ecommerce_banners;
CREATE POLICY "public_banners" ON public.ecommerce_banners
  FOR SELECT USING (
    active = true
    AND deleted_at IS NULL
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- HERO SLIDES (public storefront) ----
DROP POLICY IF EXISTS "public_hero_slides" ON public.hero_slides;
CREATE POLICY "public_hero_slides" ON public.hero_slides
  FOR SELECT USING (
    is_active = true
    AND deleted_at IS NULL
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- FLOATING BANNERS (public storefront) ----
DROP POLICY IF EXISTS "public_floating_banners" ON public.floating_banners;
CREATE POLICY "public_floating_banners" ON public.floating_banners
  FOR SELECT USING (
    is_active = true
    AND deleted_at IS NULL
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- OFFERS (public storefront) ----
DROP POLICY IF EXISTS "public_offers" ON public.offers;
CREATE POLICY "public_offers" ON public.offers
  FOR SELECT USING (
    active = true
    AND deleted_at IS NULL
    AND (now() BETWEEN start_date AND end_date)
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- COUPONS (public: validate only, not full data) ----
DROP POLICY IF EXISTS "public_coupons" ON public.coupons;
CREATE POLICY "public_coupons" ON public.coupons
  FOR SELECT USING (
    is_active = true
    AND deleted_at IS NULL
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- PROMOTIONS (public storefront) ----
DROP POLICY IF EXISTS "public_promotions" ON public.promotions;
CREATE POLICY "public_promotions" ON public.promotions
  FOR SELECT USING (
    is_active = true
    AND deleted_at IS NULL
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- PROMOTION BANNERS (public storefront) ----
DROP POLICY IF EXISTS "public_promo_banners" ON public.promotion_banners;
CREATE POLICY "public_promo_banners" ON public.promotion_banners
  FOR SELECT USING (
    is_active = true
    AND deleted_at IS NULL
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- TESTIMONIALS (public storefront) ----
DROP POLICY IF EXISTS "public_testimonials" ON public.testimonials;
CREATE POLICY "public_testimonials" ON public.testimonials
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- PRODUCT REVIEWS (public storefront) ----
DROP POLICY IF EXISTS "public_product_reviews" ON public.product_reviews;
CREATE POLICY "public_product_reviews" ON public.product_reviews
  FOR SELECT USING (
    company_id = public.get_current_company_id()
    OR public.is_platform_admin()
  );

-- ---- PRODUCT TYPES (public storefront) ----
DROP POLICY IF EXISTS "public_product_types" ON public.product_types;
CREATE POLICY "public_product_types" ON public.product_types
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- PRODUCT CUSTOM ATTRIBUTES (public storefront) ----
DROP POLICY IF EXISTS "public_pca" ON public.product_custom_attributes;
CREATE POLICY "public_pca" ON public.product_custom_attributes
  FOR SELECT USING (
    company_id = public.get_current_company_id()
    OR public.is_platform_admin()
  );

-- ---- BUSINESS TYPES (public read) ----
DROP POLICY IF EXISTS "public_business_types" ON public.business_types;
CREATE POLICY "public_business_types" ON public.business_types
  FOR SELECT USING (is_active = true);

-- ---- BUSINESS TYPE MODULES (public read) ----
DROP POLICY IF EXISTS "public_bt_modules" ON public.business_type_modules;
CREATE POLICY "public_bt_modules" ON public.business_type_modules
  FOR SELECT USING (is_enabled = true);

-- ---- BUSINESS TYPE TEMPLATES (public read) ----
DROP POLICY IF EXISTS "public_bt_templates" ON public.business_type_templates;
CREATE POLICY "public_bt_templates" ON public.business_type_templates
  FOR SELECT USING (is_default = true);

-- ---- BUSINESS TYPE THEMES (public read) ----
DROP POLICY IF EXISTS "public_bt_themes" ON public.business_type_themes;
CREATE POLICY "public_bt_themes" ON public.business_type_themes
  FOR SELECT USING (is_default = true);

-- ---- TAX RATES (public storefront) ----
DROP POLICY IF EXISTS "public_tax_rates" ON public.tax_rates;
CREATE POLICY "public_tax_rates" ON public.tax_rates
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- SHIPPING METHODS (public storefront) ----
DROP POLICY IF EXISTS "public_shipping_methods" ON public.shipping_methods;
CREATE POLICY "public_shipping_methods" ON public.shipping_methods
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- PAYMENT METHODS (public read) ----
DROP POLICY IF EXISTS "public_payment_methods" ON public.payment_methods;
CREATE POLICY "public_payment_methods" ON public.payment_methods
  FOR SELECT USING (is_active = true);

-- ---- CURRENCIES (public read) ----
DROP POLICY IF EXISTS "public_currencies" ON public.currencies;
CREATE POLICY "public_currencies" ON public.currencies
  FOR SELECT USING (true);

-- ---- FISCAL DOCUMENT TYPES (public read) ----
DROP POLICY IF EXISTS "public_fiscal_doc_types" ON public.fiscal_document_types;
CREATE POLICY "public_fiscal_doc_types" ON public.fiscal_document_types
  FOR SELECT USING (is_active = true);

-- ---- URL REDIRECTS (service-level) ----
DROP POLICY IF EXISTS "public_redirects" ON public.url_redirects;
CREATE POLICY "public_redirects" ON public.url_redirects
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- PLATFORM MODULES (public read) ----
DROP POLICY IF EXISTS "public_platform_modules" ON public.platform_modules;
CREATE POLICY "public_platform_modules" ON public.platform_modules
  FOR SELECT USING (is_active = true);

-- ---- CUSTOM CODE BLOCKS (public storefront — for rendering) ----
DROP POLICY IF EXISTS "public_custom_code" ON public.custom_code_blocks;
CREATE POLICY "public_custom_code" ON public.custom_code_blocks
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- MEDIA ASSETS (public storefront) ----
DROP POLICY IF EXISTS "public_media" ON public.media_assets;
CREATE POLICY "public_media" ON public.media_assets
  FOR SELECT USING (
    is_active = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- ACTIVE FORMS (for public submission) ----
DROP POLICY IF EXISTS "public_active_forms" ON public.dynamic_forms;
CREATE POLICY "public_active_forms" ON public.dynamic_forms
  FOR SELECT USING (
    is_active = true
    AND is_published = true
    AND deleted_at IS NULL
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ---- FORM FIELDS (for public forms) ----
DROP POLICY IF EXISTS "public_form_fields" ON public.dynamic_form_fields;
CREATE POLICY "public_form_fields" ON public.dynamic_form_fields
  FOR SELECT USING (
    is_visible = true
    AND (
      company_id = public.get_current_company_id()
      OR public.is_platform_admin()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. CONVERSION EVENTS INSERT (public storefront)
-- ────────────────────────────────────────────────────────────

-- Allow anonymous visitors to track conversion events
DROP POLICY IF EXISTS "public_conversion_insert" ON public.conversion_events;
CREATE POLICY "public_conversion_insert" ON public.conversion_events
  FOR INSERT WITH CHECK (true);  -- allow any company's tracking

-- ────────────────────────────────────────────────────────────
-- 4. PAGE ANALYTICS INSERT (public storefront)
-- ────────────────────────────────────────────────────────────

-- Allow anonymous analytics tracking
DROP POLICY IF EXISTS "public_analytics_insert" ON public.page_analytics;
CREATE POLICY "public_analytics_insert" ON public.page_analytics
  FOR INSERT WITH CHECK (true);  -- allow any tracking

-- ────────────────────────────────────────────────────────────
-- 5. VIEW: STOREFRONT CONFIG (aggregated storefront config)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.vw_storefront_config AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.slug AS company_slug,
  c.logo_url,
  c.favicon_url,
  c.description,
  c.currency_code,
  c.timezone,
  c.locale,
  c.meta_title,
  c.meta_description,
  c.og_image_url,
  
  -- Theme
  ct.theme_id,
  t.name AS theme_name,
  COALESCE(ct.color_overrides, '{}') AS colors,
  COALESCE(ct.typography_overrides, '{}') AS typography,
  COALESCE(ct.layout_overrides, '{}') AS layout,
  COALESCE(ct.component_overrides, '{}') AS components,
  ct.custom_css AS theme_css,
  ct.custom_js AS theme_js,
  
  -- Header
  h.layout AS header_layout,
  h.sticky AS header_sticky,
  h.logo_height,
  h.show_search,
  h.show_cart,
  h.show_account,
  h.show_announcement,
  h.announcement_text,
  h.announcement_bg,
  h.announcement_text_color,
  
  -- Footer
  f.layout AS footer_layout,
  f.show_newsletter,
  f.newsletter_title,
  f.show_bottom_bar,
  f.bottom_bar_text,
  f.show_payment_icons,
  f.payment_icons,
  f.bg_color AS footer_bg_color,
  f.text_color AS footer_text_color,
  f.link_color AS footer_link_color

FROM public.companies c
LEFT JOIN public.company_themes ct ON ct.company_id = c.id AND ct.is_active = true
LEFT JOIN public.themes t ON t.id = ct.theme_id
LEFT JOIN public.site_headers h ON h.company_id = c.id AND h.is_active = true
LEFT JOIN public.site_footers f ON f.company_id = c.id AND f.is_active = true
WHERE c.is_active = true;

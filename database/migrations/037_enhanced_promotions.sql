-- ============================================================
-- MIGRATION 037: ENHANCED PROMOTIONS & PRODUCT TYPES
-- Advanced Promotions Engine, Rules, Actions, Product Types
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROMOTION RULES (advanced condition system)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promotion_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id    UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  rule_type       VARCHAR(50) NOT NULL,
  -- 'min_quantity', 'min_amount', 'specific_product', 'specific_category',
  -- 'first_order', 'repeat_order', 'day_of_week', 'time_range',
  -- 'client_segment', 'min_items_in_cart', 'payment_method', 'shipping_method',
  -- 'combined_products', 'product_tag'
  
  -- Conditions
  conditions      JSONB NOT NULL DEFAULT '{}',
  -- { "min_qty": 3, "min_amount": 100, "product_ids": [...], "category_ids": [...],
  --   "days": ["mon","tue"], "time_from": "09:00", "time_to": "17:00",
  --   "client_segments": ["vip","wholesale"], "payment_methods": ["cash","transfer"] }
  
  -- Scope: which products the promotion applies to
  scope           VARCHAR(30) NOT NULL DEFAULT 'all',
  -- 'all', 'specific_products', 'specific_categories', 'specific_brands', 'specific_tags'
  product_ids     UUID[] DEFAULT '{}',
  category_ids    UUID[] DEFAULT '{}',
  brand_ids       UUID[] DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  exclude_ids     UUID[] DEFAULT '{}',  -- excluded product/category IDs
  
  -- Priority
  priority        INTEGER NOT NULL DEFAULT 0,
  is_cumulative   BOOLEAN NOT NULL DEFAULT false,  -- can stack with other promos
  
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.promotion_rules IS 'Advanced rule conditions for promotions';

CREATE INDEX IF NOT EXISTS idx_promo_rules_promotion ON public.promotion_rules(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promo_rules_company ON public.promotion_rules(company_id);

-- ────────────────────────────────────────────────────────────
-- 2. PROMOTION ACTIONS (what happens when conditions met)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promotion_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id    UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  action_type     VARCHAR(50) NOT NULL,
  -- 'percentage_discount', 'fixed_discount', 'fixed_price',
  -- 'buy_x_get_y_free', 'buy_x_get_y_discount', 'bundle_price',
  -- 'free_shipping', 'free_gift', 'points_multiplier',
  -- 'category_discount', 'tiered_discount'
  
  -- Action parameters
  params          JSONB NOT NULL DEFAULT '{}',
  -- { "percentage": 20, "amount": 50, "fixed_price": 29.99,
  --   "buy_qty": 3, "get_qty": 1, "get_discount": 50,
  --   "gift_product_id": "...", "bundle_price": 99.99,
  --   "min_tier": 2, "tiers": [{"qty": 3, "discount": 10}, {"qty": 5, "discount": 20}] }
  
  -- Target: which products the action applies to
  target          VARCHAR(30) NOT NULL DEFAULT 'same',
  -- 'same' (same products that triggered the rule), 'cheapest', 'most_expensive',
  -- 'specific', 'all_cart', 'shipping'
  target_product_ids UUID[] DEFAULT '{}',
  target_category_ids UUID[] DEFAULT '{}',
  
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.promotion_actions IS 'Actions triggered when promotion rules are met';

CREATE INDEX IF NOT EXISTS idx_promo_actions_promotion ON public.promotion_actions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promo_actions_company ON public.promotion_actions(company_id);

-- ────────────────────────────────────────────────────────────
-- 3. PROMOTION COUPONS (link promotions to coupon codes)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promotion_coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id    UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  coupon_id       UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(promotion_id, coupon_id)
);

COMMENT ON TABLE public.promotion_coupons IS 'Links promotions to coupon codes';

-- ────────────────────────────────────────────────────────────
-- 4. PROMOTION USAGE LOG (detailed tracking)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promotion_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id    UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Who used it
  client_id       UUID REFERENCES public.clients(id),
  user_id         UUID REFERENCES public.users(id),
  session_id      VARCHAR(255),
  
  -- What it was applied to
  sale_id         UUID REFERENCES public.sales(id),
  checkout_session_id UUID,
  cart_id         UUID,
  
  -- Discount details
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_total  DECIMAL(12,2),
  final_total     DECIMAL(12,2),
  
  -- Which rules/actions were triggered
  matched_rules   JSONB DEFAULT '[]',   -- array of rule IDs
  applied_actions JSONB DEFAULT '[]',   -- array of action IDs with amounts
  
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  used_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.promotion_usage IS 'Detailed promotion usage tracking';

CREATE INDEX IF NOT EXISTS idx_promo_usage_promotion ON public.promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_company ON public.promotion_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_client ON public.promotion_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_date ON public.promotion_usage(company_id, used_at DESC);

-- ────────────────────────────────────────────────────────────
-- 5. PROMOTION BANNERS (visual promotion display)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promotion_banners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  promotion_id    UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  
  title           VARCHAR(255) NOT NULL,
  subtitle        TEXT,
  image_url       TEXT,
  mobile_image_url TEXT,
  link_url        VARCHAR(500),
  
  -- Display
  position        VARCHAR(30) NOT NULL DEFAULT 'homepage',
  -- 'homepage', 'category', 'product', 'checkout', 'popup', 'banner_bar'
  layout          VARCHAR(30) DEFAULT 'default', -- 'default', 'split', 'centered', 'overlay'
  
  -- Countdown
  show_countdown  BOOLEAN NOT NULL DEFAULT false,
  countdown_end   TIMESTAMPTZ,
  
  -- Style
  bg_color        VARCHAR(20),
  text_color      VARCHAR(20),
  
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

COMMENT ON TABLE public.promotion_banners IS 'Visual banners for promotions';

CREATE INDEX IF NOT EXISTS idx_promo_banners_company ON public.promotion_banners(company_id);
CREATE INDEX IF NOT EXISTS idx_promo_banners_position ON public.promotion_banners(company_id, position);

-- ────────────────────────────────────────────────────────────
-- 6. PRODUCT TYPES (configurable product type definitions)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,
  icon            VARCHAR(50),
  
  -- Product behavior
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  allow_variants  BOOLEAN NOT NULL DEFAULT true,
  allow_composite BOOLEAN NOT NULL DEFAULT false, -- composite/bundle products
  has_expiry      BOOLEAN NOT NULL DEFAULT false,
  has_serial      BOOLEAN NOT NULL DEFAULT false,
  has_lots        BOOLEAN NOT NULL DEFAULT false,
  is_digital      BOOLEAN NOT NULL DEFAULT false,
  is_subscription BOOLEAN NOT NULL DEFAULT false,
  
  -- Custom fields schema
  custom_fields   JSONB DEFAULT '[]',
  -- [{ "name": "flavor", "label": "Sabor", "type": "select",
  --    "options": [...], "required": true }]
  
  -- Display
  show_in_catalog BOOLEAN NOT NULL DEFAULT true,
  show_in_pos     BOOLEAN NOT NULL DEFAULT true,
  show_in_ecommerce BOOLEAN NOT NULL DEFAULT true,
  
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, slug)
);

COMMENT ON TABLE public.product_types IS 'Configurable product types per company';

CREATE INDEX IF NOT EXISTS idx_product_types_company ON public.product_types(company_id);

-- ────────────────────────────────────────────────────────────
-- 7. PRODUCT TYPE FIELDS (extended custom field definitions)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_type_fields (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id UUID NOT NULL REFERENCES public.product_types(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  name            VARCHAR(100) NOT NULL,
  label           VARCHAR(255) NOT NULL,
  field_type      VARCHAR(30) NOT NULL,
  -- 'text', 'number', 'select', 'multi_select', 'boolean', 'date', 'color', 'image', 'json'
  
  options         JSONB DEFAULT '[]',
  validation      JSONB DEFAULT '{}',
  default_value   TEXT,
  
  is_required     BOOLEAN NOT NULL DEFAULT false,
  is_filterable   BOOLEAN NOT NULL DEFAULT false,
  is_searchable   BOOLEAN NOT NULL DEFAULT false,
  is_variant_attribute BOOLEAN NOT NULL DEFAULT false,
  
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.product_type_fields IS 'Extended custom field definitions for product types';

CREATE INDEX IF NOT EXISTS idx_ptf_type ON public.product_type_fields(product_type_id);

-- ────────────────────────────────────────────────────────────
-- 8. PRODUCT CUSTOM ATTRIBUTES (actual values per product)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_custom_attributes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_type_id UUID NOT NULL REFERENCES public.product_types(id),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  field_name      VARCHAR(100) NOT NULL,
  value_text      TEXT,
  value_number    DECIMAL(12,4),
  value_json      JSONB,
  value_boolean   BOOLEAN,
  value_date      DATE,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, field_name)
);

COMMENT ON TABLE public.product_custom_attributes IS 'Custom attribute values per product';

CREATE INDEX IF NOT EXISTS idx_pca_product ON public.product_custom_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_pca_type ON public.product_custom_attributes(product_type_id);
CREATE INDEX IF NOT EXISTS idx_pca_company ON public.product_custom_attributes(company_id);
CREATE INDEX IF NOT EXISTS idx_pca_field ON public.product_custom_attributes(field_name, value_text);

-- ────────────────────────────────────────────────────────────
-- 9. TESTIMONIALS (customer reviews/testimonials)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.testimonials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Content
  author_name     VARCHAR(255) NOT NULL,
  author_role     VARCHAR(100),         -- 'CEO', 'Gerente', etc.
  author_company  VARCHAR(255),
  author_avatar   TEXT,
  author_location VARCHAR(255),
  
  testimonial     TEXT NOT NULL,
  rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Media
  image_url       TEXT,
  video_url       TEXT,
  
  -- Display
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  source          VARCHAR(50),          -- 'website', 'google', 'facebook', 'manual'
  
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.testimonials IS 'Customer testimonials per company';

CREATE INDEX IF NOT EXISTS idx_testimonials_company ON public.testimonials(company_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON public.testimonials(company_id, is_featured);

-- ────────────────────────────────────────────────────────────
-- 10. ADD product_type_id to products table
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES public.product_types(id);

CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(product_type_id);

-- ────────────────────────────────────────────────────────────
-- 11. RLS POLICIES
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_type_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_custom_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Promotion Rules: company-scoped
CREATE POLICY "promo_rules_select" ON public.promotion_rules
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "promo_rules_insert" ON public.promotion_rules
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "promo_rules_update" ON public.promotion_rules
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "promo_rules_delete" ON public.promotion_rules
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Promotion Actions: company-scoped
CREATE POLICY "promo_actions_select" ON public.promotion_actions
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "promo_actions_insert" ON public.promotion_actions
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "promo_actions_update" ON public.promotion_actions
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "promo_actions_delete" ON public.promotion_actions
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Promotion Coupons: company-scoped
CREATE POLICY "promo_coupons_select" ON public.promotion_coupons
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "promo_coupons_insert" ON public.promotion_coupons
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "promo_coupons_delete" ON public.promotion_coupons
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Promotion Usage: company-scoped
CREATE POLICY "promo_usage_select" ON public.promotion_usage
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "promo_usage_insert" ON public.promotion_usage
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());

-- Promotion Banners: company-scoped
CREATE POLICY "promo_banners_select" ON public.promotion_banners
  FOR SELECT USING (
    (company_id = public.get_current_company_id() AND deleted_at IS NULL)
    OR public.is_platform_admin()
  );
CREATE POLICY "promo_banners_insert" ON public.promotion_banners
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "promo_banners_update" ON public.promotion_banners
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "promo_banners_delete" ON public.promotion_banners
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Product Types: company-scoped
CREATE POLICY "product_types_select" ON public.product_types
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "product_types_insert" ON public.product_types
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "product_types_update" ON public.product_types
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "product_types_delete" ON public.product_types
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Product Type Fields: company-scoped
CREATE POLICY "ptf_select" ON public.product_type_fields
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "ptf_insert" ON public.product_type_fields
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "ptf_update" ON public.product_type_fields
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "ptf_delete" ON public.product_type_fields
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Product Custom Attributes: company-scoped
CREATE POLICY "pca_select" ON public.product_custom_attributes
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "pca_insert" ON public.product_custom_attributes
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "pca_update" ON public.product_custom_attributes
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "pca_delete" ON public.product_custom_attributes
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Testimonials: company-scoped; published visible to all
CREATE POLICY "testimonials_select" ON public.testimonials
  FOR SELECT USING (
    (company_id = public.get_current_company_id() AND deleted_at IS NULL)
    OR public.is_platform_admin()
  );
CREATE POLICY "testimonials_insert" ON public.testimonials
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "testimonials_update" ON public.testimonials
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "testimonials_delete" ON public.testimonials
  FOR DELETE USING (company_id = public.get_current_company_id());

-- ────────────────────────────────────────────────────────────
-- 12. TRIGGERS
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at_promo_rules
  BEFORE UPDATE ON public.promotion_rules FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_promo_actions
  BEFORE UPDATE ON public.promotion_actions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_promo_banners
  BEFORE UPDATE ON public.promotion_banners FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_product_types
  BEFORE UPDATE ON public.product_types FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_ptf
  BEFORE UPDATE ON public.product_type_fields FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_pca
  BEFORE UPDATE ON public.product_custom_attributes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_testimonials
  BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

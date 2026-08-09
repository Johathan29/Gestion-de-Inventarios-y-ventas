-- ============================================================
-- MIGRATION 034: CMS & PAGE BUILDER
-- Pages, Sections, Components, Component Registry, Templates
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CMS PAGES (the pages of each tenant's website)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cms_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slug            VARCHAR(255) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  meta_title      VARCHAR(255),
  meta_description TEXT,
  meta_keywords   TEXT,
  og_image_url    TEXT,
  template        VARCHAR(50) DEFAULT 'default',  -- 'default', 'full-width', 'sidebar', 'blank'
  is_homepage     BOOLEAN NOT NULL DEFAULT false,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  published_by    UUID REFERENCES public.users(id),
  version         INTEGER NOT NULL DEFAULT 1,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(company_id, slug)
);

COMMENT ON TABLE public.cms_pages IS 'CMS pages for each tenant website';

-- ────────────────────────────────────────────────────────────
-- 2. CMS PAGE SECTIONS (ordered sections within a page)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cms_page_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL DEFAULT 'Section',
  section_type    VARCHAR(50) NOT NULL DEFAULT 'content', -- 'content', 'hero', 'products', 'testimonials', 'cta', 'gallery', 'faq', 'custom_html'
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  settings        JSONB NOT NULL DEFAULT '{}', -- section-level settings (background, padding, max-width, etc.)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cms_page_sections IS 'Ordered sections within a CMS page';

CREATE INDEX IF NOT EXISTS idx_cms_page_sections_page ON public.cms_page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_cms_page_sections_company ON public.cms_page_sections(company_id);

-- ────────────────────────────────────────────────────────────
-- 3. CMS COMPONENT REGISTRY (available components library)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cms_component_registry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(50) NOT NULL, -- 'layout', 'content', 'media', 'commerce', 'form', 'navigation', 'social', 'custom'
  icon            VARCHAR(50),
  thumbnail_url   TEXT,
  props_schema    JSONB NOT NULL DEFAULT '{}', -- JSON Schema defining accepted props
  default_props   JSONB NOT NULL DEFAULT '{}', -- default values for props
  preview_html    TEXT,                         -- HTML snippet for preview
  is_system       BOOLEAN NOT NULL DEFAULT false, -- platform-provided, cannot delete
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cms_component_registry IS 'Registry of all available page builder components';

-- ────────────────────────────────────────────────────────────
-- 4. CMS COMPONENT INSTANCES (placed in page sections)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cms_component_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID NOT NULL REFERENCES public.cms_page_sections(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  component_id    UUID NOT NULL REFERENCES public.cms_component_registry(id),
  props           JSONB NOT NULL DEFAULT '{}',  -- component-specific props
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  custom_css      TEXT,
  custom_class    VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cms_component_instances IS 'Instances of components placed in page sections';

CREATE INDEX IF NOT EXISTS idx_cms_comp_instances_section ON public.cms_component_instances(section_id);
CREATE INDEX IF NOT EXISTS idx_cms_comp_instances_company ON public.cms_component_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_cms_comp_instances_component ON public.cms_component_instances(component_id);

-- ────────────────────────────────────────────────────────────
-- 5. CMS TEMPLATES (reusable page layouts)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cms_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL = platform/global template
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,
  layout          JSONB NOT NULL DEFAULT '[]', -- array of section configs
  is_system       BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cms_templates IS 'Reusable page templates';

CREATE INDEX IF NOT EXISTS idx_cms_templates_company ON public.cms_templates(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_templates_slug_company ON public.cms_templates(company_id, slug);

-- ────────────────────────────────────────────────────────────
-- 6. CMS PAGE VERSIONS (publishing & version history)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cms_page_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL,
  content_snapshot JSONB NOT NULL,            -- full snapshot of page + sections + components
  created_by      UUID REFERENCES public.users(id),
  published       BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cms_page_versions IS 'Version history for CMS pages';

CREATE INDEX IF NOT EXISTS idx_cms_page_versions_page ON public.cms_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_cms_page_versions_company ON public.cms_page_versions(company_id);

-- ────────────────────────────────────────────────────────────
-- 7. CMS COMPONENT VERSIONS (version history for components)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cms_component_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_instance_id UUID NOT NULL REFERENCES public.cms_component_instances(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  props_snapshot  JSONB NOT NULL,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cms_component_versions IS 'Version history for component instances';

CREATE INDEX IF NOT EXISTS idx_cms_comp_versions_instance ON public.cms_component_versions(component_instance_id);
CREATE INDEX IF NOT EXISTS idx_cms_comp_versions_company ON public.cms_component_versions(company_id);

-- ────────────────────────────────────────────────────────────
-- 8. RLS POLICIES
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_component_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_component_versions ENABLE ROW LEVEL SECURITY;

-- CMS Pages: company-scoped
CREATE POLICY "cms_pages_select" ON public.cms_pages
  FOR SELECT USING (
    (company_id = public.get_current_company_id() AND deleted_at IS NULL)
    OR public.is_platform_admin()
  );
CREATE POLICY "cms_pages_insert" ON public.cms_pages
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "cms_pages_update" ON public.cms_pages
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "cms_pages_delete" ON public.cms_pages
  FOR DELETE USING (company_id = public.get_current_company_id());

-- CMS Page Sections: company-scoped
CREATE POLICY "cms_sections_select" ON public.cms_page_sections
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "cms_sections_insert" ON public.cms_page_sections
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "cms_sections_update" ON public.cms_page_sections
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "cms_sections_delete" ON public.cms_page_sections
  FOR DELETE USING (company_id = public.get_current_company_id());

-- Component Registry: read for all, manage for platform_admin
CREATE POLICY "cms_registry_select" ON public.cms_component_registry FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "cms_registry_insert" ON public.cms_component_registry FOR INSERT WITH CHECK (public.is_platform_admin());
CREATE POLICY "cms_registry_update" ON public.cms_component_registry FOR UPDATE USING (public.is_platform_admin());
CREATE POLICY "cms_registry_delete" ON public.cms_component_registry FOR DELETE USING (public.is_platform_admin());

-- Component Instances: company-scoped
CREATE POLICY "cms_instances_select" ON public.cms_component_instances
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "cms_instances_insert" ON public.cms_component_instances
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());
CREATE POLICY "cms_instances_update" ON public.cms_component_instances
  FOR UPDATE USING (company_id = public.get_current_company_id());
CREATE POLICY "cms_instances_delete" ON public.cms_component_instances
  FOR DELETE USING (company_id = public.get_current_company_id());

-- CMS Templates: own company or platform global
CREATE POLICY "cms_templates_select" ON public.cms_templates
  FOR SELECT USING (
    (company_id = public.get_current_company_id())
    OR (company_id IS NULL)  -- global templates visible to all
    OR public.is_platform_admin()
  );
CREATE POLICY "cms_templates_insert" ON public.cms_templates
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "cms_templates_update" ON public.cms_templates
  FOR UPDATE USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "cms_templates_delete" ON public.cms_templates
  FOR DELETE USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- Page Versions: company-scoped
CREATE POLICY "cms_page_versions_select" ON public.cms_page_versions
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "cms_page_versions_insert" ON public.cms_page_versions
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());

-- Component Versions: company-scoped
CREATE POLICY "cms_comp_versions_select" ON public.cms_component_versions
  FOR SELECT USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "cms_comp_versions_insert" ON public.cms_component_versions
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id());

-- ────────────────────────────────────────────────────────────
-- 9. TRIGGERS
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at_cms_pages
  BEFORE UPDATE ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_cms_page_sections
  BEFORE UPDATE ON public.cms_page_sections FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_cms_component_registry
  BEFORE UPDATE ON public.cms_component_registry FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_cms_component_instances
  BEFORE UPDATE ON public.cms_component_instances FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER set_updated_at_cms_templates
  BEFORE UPDATE ON public.cms_templates FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Auto-increment page version on publish
CREATE OR REPLACE FUNCTION public.fn_auto_version_page()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
    NEW.version := OLD.version + 1;
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_version_page
  BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_version_page();

-- ────────────────────────────────────────────────────────────
-- 10. PUBLIC PAGES VIEW (for frontend rendering)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.vw_cms_page_published AS
SELECT
  p.id,
  p.company_id,
  p.slug,
  p.title,
  p.meta_title,
  p.meta_description,
  p.meta_keywords,
  p.og_image_url,
  p.template,
  p.version,
  p.published_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', s.id,
        'name', s.name,
        'section_type', s.section_type,
        'sort_order', s.sort_order,
        'settings', s.settings,
        'components', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', ci.id,
              'component_slug', cr.slug,
              'component_name', cr.name,
              'props', ci.props,
              'custom_css', ci.custom_css,
              'custom_class', ci.custom_class,
              'sort_order', ci.sort_order
            ) ORDER BY ci.sort_order
          ), '[]'::json)
          FROM public.cms_component_instances ci
          JOIN public.cms_component_registry cr ON cr.id = ci.component_id
          WHERE ci.section_id = s.id AND ci.is_visible = true
        )
      ) ORDER BY s.sort_order
    ),
    '[]'::json
  ) AS sections
FROM public.cms_pages p
LEFT JOIN public.cms_page_sections s ON s.page_id = p.id AND s.is_visible = true
WHERE p.is_published = true
  AND p.deleted_at IS NULL
GROUP BY p.id;

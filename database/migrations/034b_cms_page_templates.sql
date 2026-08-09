-- cms_page_templates: tabla usada por cms-service (ninguna migración la definía)
CREATE TABLE IF NOT EXISTS public.cms_page_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(100),
  description     TEXT,
  thumbnail_url   TEXT,
  layout          JSONB NOT NULL DEFAULT '[]',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_page_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_pt_select" ON public.cms_page_templates
  FOR SELECT USING (company_id = public.get_current_company_id() OR company_id IS NULL OR public.is_platform_admin());
CREATE POLICY "cms_pt_insert" ON public.cms_page_templates
  FOR INSERT WITH CHECK (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "cms_pt_update" ON public.cms_page_templates
  FOR UPDATE USING (company_id = public.get_current_company_id() OR public.is_platform_admin());
CREATE POLICY "cms_pt_delete" ON public.cms_page_templates
  FOR DELETE USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

INSERT INTO public.cms_page_templates (company_id, name, slug, description, layout, is_default) VALUES
(NULL, 'Página en blanco', 'blank', 'Página vacía sin secciones', '[]', true),
(NULL, 'Página con héroe', 'hero', 'Página con sección hero inicial', '[{"component_key":"hero","title":"Hero"}]', false),
(NULL, 'Página de productos', 'products', 'Página orientada a listar productos', '[{"component_key":"products","title":"Productos"}]', false);

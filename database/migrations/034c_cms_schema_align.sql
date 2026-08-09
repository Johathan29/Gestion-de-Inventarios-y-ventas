-- Alinear esquema CMS con lo que espera cms-service
-- cms_pages: settings, review_status, view_count
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'draft';
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- cms_page_sections: component_key, title, content
ALTER TABLE public.cms_page_sections ADD COLUMN IF NOT EXISTS component_key VARCHAR(50);
ALTER TABLE public.cms_page_sections ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE public.cms_page_sections ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}';
UPDATE public.cms_page_sections SET component_key = section_type WHERE component_key IS NULL;

-- cms_component_registry: key, settings_schema, default_settings
ALTER TABLE public.cms_component_registry ADD COLUMN IF NOT EXISTS key VARCHAR(100);
ALTER TABLE public.cms_component_registry ADD COLUMN IF NOT EXISTS settings_schema JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.cms_component_registry ADD COLUMN IF NOT EXISTS default_settings JSONB NOT NULL DEFAULT '{}';
UPDATE public.cms_component_registry SET key = slug WHERE key IS NULL;
UPDATE public.cms_component_registry SET settings_schema = props_schema WHERE settings_schema = '{}'::jsonb AND props_schema IS NOT NULL;
UPDATE public.cms_component_registry SET default_settings = default_props WHERE default_settings = '{}'::jsonb AND default_props IS NOT NULL;

-- cms_component_instances: settings, content
ALTER TABLE public.cms_component_instances ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.cms_component_instances ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}';

-- cms_page_versions: content, published_by
ALTER TABLE public.cms_page_versions ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE public.cms_page_versions ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.users(id);
UPDATE public.cms_page_versions SET content = content_snapshot WHERE content IS NULL AND content_snapshot IS NOT NULL;

-- Index para lookup por key en registry
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_registry_key ON public.cms_component_registry(key) WHERE key IS NOT NULL;

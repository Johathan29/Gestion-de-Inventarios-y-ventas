-- ============================================================================
-- 053: Seed de la biblioteca de componentes del Page Builder CMS
-- Sincroniza cms_component_registry con frontend/src/components/cms/componentLibrary.js
-- (key coincide con component_key de cms_page_sections y con RenderSection.vue)
-- ============================================================================

INSERT INTO public.cms_component_registry
  (slug, key, name, description, category, icon, settings_schema, default_settings, props_schema, default_props, is_system, is_active)
VALUES
  -- LAYOUT
  ('hero', 'hero', 'Hero', 'Banner principal con imagen de fondo, título, subtítulo y botones de acción.', 'layout', 'panorama',
   '{"type":"object","properties":{"eyebrow":{"type":"string"},"cta_label":{"type":"string"},"cta_url":{"type":"string"},"cta_secondary_label":{"type":"string"},"cta_secondary_url":{"type":"string"},"background_image":{"type":"string"},"overlay":{"type":"boolean"},"align":{"type":"string"},"text_color":{"type":"string"},"padding":{"type":"string"}}}',
   '{"overlay":true,"align":"center","padding":"80px 0"}',
   '{"type":"object","properties":{"title":{"type":"string"},"subtitle":{"type":"string"}}}',
   '{"title":"Bienvenidos","subtitle":""}', true, true),

  ('cta', 'cta', 'Call to Action', 'Banner de llamada a la acción con título, texto y botón.', 'layout', 'call_to_action',
   '{"type":"object","properties":{"cta_label":{"type":"string"},"cta_url":{"type":"string"},"background_image":{"type":"string"},"overlay":{"type":"boolean"},"background":{"type":"string"},"text_color":{"type":"string"}}}',
   '{"cta_label":"Contáctanos","cta_url":"/contacto"}',
   '{"type":"object","properties":{"title":{"type":"string"},"text":{"type":"string"}}}',
   '{"title":"¿Listo para empezar?","text":""}', true, true),

  ('divider', 'divider', 'Divisor', 'Línea separadora para dividir secciones de la página.', 'layout', 'horizontal_rule',
   '{"type":"object","properties":{"style":{"type":"string"},"max_width":{"type":"string"},"padding":{"type":"string"}}}',
   '{"style":"solid","padding":"40px 0","max_width":"1200px"}',
   '{}', '{}', true, true),

  -- CONTENIDO
  ('text', 'text', 'Texto / Párrafo', 'Bloque de texto enriquecido (HTML) con alineación y colores.', 'content', 'notes',
   '{"type":"object","properties":{"align":{"type":"string"},"text_color":{"type":"string"},"background":{"type":"string"},"padding":{"type":"string"}}}',
   '{"align":"left"}',
   '{"type":"object","properties":{"title":{"type":"string"},"text":{"type":"string"},"html":{"type":"string"}}}',
   '{"title":"","text":"","html":""}', true, true),

  ('features', 'features', 'Características / Tarjetas', 'Cuadrícula de tarjetas con icono, título y descripción.', 'content', 'view_module',
   '{}', '{}',
   '{"type":"object","properties":{"title":{"type":"string"},"text":{"type":"string"},"items":{"type":"array"}}}',
   '{"title":"","text":"","items":[{"icon":"verified","title":"Calidad","text":"Descripción"},{"icon":"schedule","title":"Rapidez","text":"Descripción"},{"icon":"support_agent","title":"Soporte","text":"Descripción"}]}', true, true),

  ('faq', 'faq', 'Preguntas Frecuentes', 'Acordeón de preguntas y respuestas.', 'content', 'help',
   '{}', '{}',
   '{"type":"object","properties":{"title":{"type":"string"},"items":{"type":"array"}}}',
   '{"title":"Preguntas frecuentes","items":[{"title":"¿Pregunta?","text":"Respuesta"}]}', true, true),

  ('stats', 'stats', 'Estadísticas / Contadores', 'Contadores destacados con valor y etiqueta.', 'content', 'monitoring',
   '{}', '{}',
   '{"type":"object","properties":{"title":{"type":"string"},"items":{"type":"array"}}}',
   '{"title":"","items":[{"value":"10K+","label":"Clientes"},{"value":"500+","label":"Productos"}]}', true, true),

  ('testimonials', 'testimonials', 'Testimonios', 'Testimonios de clientes con cita, nombre y foto.', 'content', 'format_quote',
   '{}', '{}',
   '{"type":"object","properties":{"title":{"type":"string"},"items":{"type":"array"}}}',
   '{"title":"Lo que dicen nuestros clientes","items":[{"text":"Excelente experiencia","title":"María Gómez","role":"Cliente","image":""}]}', true, true),

  -- MEDIA
  ('image', 'image', 'Imagen / Banner', 'Imagen de fondo con título y texto superpuestos.', 'media', 'image',
   '{"type":"object","properties":{"background_image":{"type":"string"},"overlay":{"type":"boolean"},"align":{"type":"string"},"text_color":{"type":"string"}}}',
   '{"overlay":true,"align":"center"}',
   '{"type":"object","properties":{"title":{"type":"string"},"text":{"type":"string"}}}',
   '{"title":"","text":""}', true, true),

  ('gallery', 'gallery', 'Galería de Imágenes', 'Cuadrícula de imágenes con leyenda.', 'media', 'photo_library',
   '{}', '{}',
   '{"type":"object","properties":{"title":{"type":"string"},"text":{"type":"string"},"items":{"type":"array"}}}',
   '{"title":"Galería","text":"","items":[{"title":"Imagen 1","image":""},{"title":"Imagen 2","image":""},{"title":"Imagen 3","image":""}]}', true, true),

  ('video', 'video', 'Video', 'Video embebido de YouTube, Vimeo o URL directa.', 'media', 'play_circle',
   '{}', '{}',
   '{"type":"object","properties":{"title":{"type":"string"},"text":{"type":"string"},"video_url":{"type":"string"}}}',
   '{"title":"","text":"","video_url":""}', true, true),

  ('logos', 'logos', 'Logos / Marcas', 'Nube de logos de marcas o clientes.', 'media', 'spa',
   '{}', '{}',
   '{"type":"object","properties":{"title":{"type":"string"},"items":{"type":"array"}}}',
   '{"title":"","items":[{"title":"Marca 1","image":""},{"title":"Marca 2","image":""}]}', true, true),

  -- COMERCIO
  ('products', 'products', 'Grid de Productos', 'Cuadrícula de productos destacados del catálogo.', 'commerce', 'shopping_bag',
   '{"type":"object","properties":{"limit":{"type":"number"}}}',
   '{"limit":3}',
   '{"type":"object","properties":{"title":{"type":"string"},"text":{"type":"string"}}}',
   '{"title":"Productos destacados","text":""}', true, true),

  -- FORM
  ('contact', 'contact', 'Formulario de Contacto', 'Formulario de contacto funcional para la página.', 'form', 'mail',
   '{}', '{}',
   '{"type":"object","properties":{"title":{"type":"string"},"text":{"type":"string"}}}',
   '{"title":"Contáctanos","text":""}', true, true),

  -- PERSONALIZADO
  ('html', 'html', 'HTML Personalizado', 'Bloque de código HTML/embeds (iframe, scripts, widgets).', 'custom', 'code',
   '{}', '{}',
   '{"type":"object","properties":{"html":{"type":"string","format":"html"}}}',
   '{"html":""}', true, true)

ON CONFLICT (slug) DO UPDATE SET
  key = EXCLUDED.key,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  settings_schema = EXCLUDED.settings_schema,
  default_settings = EXCLUDED.default_settings,
  props_schema = EXCLUDED.props_schema,
  default_props = EXCLUDED.default_props,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ============================================================
-- MIGRATION 040: SEED DATA, COMPOSITE INDEXES, ADVANCED TRIGGERS
-- Default business types, platform modules, themes, components,
-- and performance indexes for Aurora Platform
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. SEED: BUSINESS TYPES (6 default types)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.business_types (name, slug, description, icon, color_primary, color_secondary, color_accent, color_bg, visual_style, catalog_type, product_type, checkout_type, form_type, sort_order)
VALUES
  ('Restaurantes', 'restaurantes',
   'Menú digital, pedidos online, reservaciones, delivery. Ideal para restaurantes, cafeterías y food trucks.',
   '🍽️', '#92400e', '#b45309', '#fbbf24', '#fffbeb', 'modern', 'menu', 'food', 'standard', 'reservation',
   1),
  ('Tienda de Ropa', 'tienda-ropa',
   'Catálogo de moda con filtros por talla, color y colección. Lookbooks, guía de tallas y más.',
   '👗', '#831843', '#be185d', '#f472b6', '#fdf2f8', 'elegant', 'standard', 'physical', 'standard', 'contact',
   2),
  ('Electrónica', 'electronica',
   'Comparación de productos, especificaciones técnicas, fichas detalladas.',
   '💻', '#1e3a5f', '#2563eb', '#60a5fa', '#eff6ff', 'modern', 'standard', 'physical', 'standard', 'quote',
   3),
  ('Salud y Belleza', 'salud-belleza',
   'Citas online, servicios con profesionales, productos con variantes.',
   '💊', '#065f46', '#059669', '#34d399', '#ecfdf5', 'minimal', 'service', 'mixed', 'booking', 'booking',
   4),
  ('Construcción', 'construccion',
   'Materiales, cotizaciones por volumen, proyectos, proveedores.',
   '🏗️', '#44403c', '#78716c', '#d6d3d1', '#fafaf9', 'bold', 'standard', 'physical', 'quick', 'quote',
   5),
  ('General / Multi-tienda', 'general',
   'Tienda versátil para cualquier tipo de negocio. Configuración flexible.',
   '🏪', '#624200', '#815c03', '#dbb12b', '#ffffff', 'modern', 'standard', 'physical', 'standard', 'contact',
   0)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 2. SEED: BUSINESS TYPE MODULES (default module configs per type)
-- ────────────────────────────────────────────────────────────

-- Get business type IDs
DO $$
DECLARE
  v_restaurant UUID;
  v_clothing UUID;
  v_electronics UUID;
  v_health UUID;
  v_construction UUID;
  v_general UUID;
BEGIN
  SELECT id INTO v_restaurant FROM public.business_types WHERE slug = 'restaurantes';
  SELECT id INTO v_clothing FROM public.business_types WHERE slug = 'tienda-ropa';
  SELECT id INTO v_electronics FROM public.business_types WHERE slug = 'electronica';
  SELECT id INTO v_health FROM public.business_types WHERE slug = 'salud-belleza';
  SELECT id INTO v_construction FROM public.business_types WHERE slug = 'construccion';
  SELECT id INTO v_general FROM public.business_types WHERE slug = 'general';

  -- Restaurant modules
  INSERT INTO public.business_type_modules (business_type_id, module_slug, module_name, is_enabled, is_core, sort_order) VALUES
    (v_restaurant, 'catalog', 'Menú/Catálogo', true, true, 1),
    (v_restaurant, 'pos', 'Punto de Venta', true, true, 2),
    (v_restaurant, 'inventory', 'Inventario', true, true, 3),
    (v_restaurant, 'ecommerce', 'Pedidos Online', true, true, 4),
    (v_restaurant, 'crm', 'Clientes/Reservaciones', true, false, 5),
    (v_restaurant, 'reports', 'Reportes', true, true, 6),
    (v_restaurant, 'whatsapp', 'WhatsApp Business', true, false, 7)
  ON CONFLICT DO NOTHING;

  -- General store modules
  INSERT INTO public.business_type_modules (business_type_id, module_slug, module_name, is_enabled, is_core, sort_order) VALUES
    (v_general, 'catalog', 'Catálogo de Productos', true, true, 1),
    (v_general, 'pos', 'Punto de Venta', true, true, 2),
    (v_general, 'inventory', 'Gestión de Inventario', true, true, 3),
    (v_general, 'ecommerce', 'Tienda Online', true, true, 4),
    (v_general, 'crm', 'Gestión de Clientes', true, false, 5),
    (v_general, 'reports', 'Reportes y Análisis', true, true, 6),
    (v_general, 'whatsapp', 'WhatsApp Business', true, false, 7),
    (v_general, 'purchasing', 'Compras y Proveedores', true, false, 8),
    (v_general, 'accounting', 'Contabilidad', true, false, 9)
  ON CONFLICT DO NOTHING;

  -- Health/Beauty modules
  INSERT INTO public.business_type_modules (business_type_id, module_slug, module_name, is_enabled, is_core, sort_order) VALUES
    (v_health, 'catalog', 'Servicios/Productos', true, true, 1),
    (v_health, 'pos', 'Punto de Venta', true, true, 2),
    (v_health, 'inventory', 'Inventario', true, true, 3),
    (v_health, 'ecommerce', 'Booking Online', true, true, 4),
    (v_health, 'crm', 'Citas y Clientes', true, true, 5),
    (v_health, 'reports', 'Reportes', true, true, 6),
    (v_health, 'whatsapp', 'WhatsApp Business', true, false, 7)
  ON CONFLICT DO NOTHING;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. SEED: PLATFORM MODULES (all available modules)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.platform_modules (slug, name, description, category, is_core, icon, sort_order)
VALUES
  -- Core
  ('users', 'Gestión de Usuarios', 'Administración de usuarios, roles y permisos', 'core', true, 'users', 1),
  ('companies', 'Gestión de Empresas', 'Administración de empresas/tenants', 'core', true, 'building', 2),
  ('audit', 'Auditoría', 'Logs de auditoría y trazabilidad', 'core', true, 'shield', 3),
  
  -- Catalog
  ('catalog', 'Catálogo de Productos', 'Productos, categorías, marcas, variantes', 'catalog', true, 'package', 10),
  ('product-types', 'Tipos de Producto', 'Configuración de tipos de producto personalizados', 'catalog', false, 'tag', 11),
  
  -- Inventory
  ('inventory', 'Gestión de Inventario', 'Stock, movimientos, almacenes, lotes, series', 'inventory', true, 'archive', 20),
  ('warehouses', 'Almacenes', 'Gestión de almacenes y ubicaciones', 'inventory', false, 'home', 21),
  
  -- Sales
  ('pos', 'Punto de Venta', 'POS para ventas presenciales', 'sales', true, 'monitor', 30),
  ('ecommerce', 'Tienda Online', 'E-commerce con carrito y checkout', 'sales', true, 'shopping-cart', 31),
  ('invoices', 'Facturación', 'Facturas, notas de crédito/débito, NCF', 'sales', true, 'file-text', 32),
  ('returns', 'Devoluciones', 'Gestión de devoluciones y reembolsos', 'sales', false, 'rotate-ccw', 33),
  
  -- Purchasing
  ('purchasing', 'Compras', 'Órdenes de compra, recepción, inspección', 'purchasing', false, 'truck', 40),
  ('suppliers', 'Proveedores', 'Gestión de proveedores', 'purchasing', false, 'users', 41),
  
  -- CRM
  ('crm', 'Gestión de Clientes', 'Clientes, cuentas de crédito, historial', 'crm', false, 'user-check', 50),
  ('loyalty', 'Programa de Lealtad', 'Puntos, niveles, recompensas', 'crm', false, 'star', 51),
  
  -- CMS
  ('cms', 'CMS / Page Builder', 'Páginas, secciones, componentes drag & drop', 'cms', false, 'layout', 60),
  ('blog', 'Blog', 'Gestión de artículos del blog', 'cms', false, 'edit-3', 61),
  
  -- Marketing
  ('promotions', 'Promociones', 'Descuentos, ofertas, reglas avanzadas', 'marketing', false, 'percent', 70),
  ('coupons', 'Cupones', 'Generación y gestión de cupones', 'marketing', false, 'ticket', 71),
  ('banners', 'Banners y Popups', 'Banners promocionales y popups', 'marketing', false, 'image', 72),
  ('email-marketing', 'Email Marketing', 'Campañas de email', 'marketing', false, 'mail', 73),
  
  -- Communication
  ('whatsapp', 'WhatsApp Business', 'Integración con WhatsApp', 'communication', false, 'message-circle', 80),
  ('notifications', 'Notificaciones', 'Sistema de notificaciones push/email', 'communication', false, 'bell', 81),
  
  -- Finance
  ('accounting', 'Contabilidad', 'Plan de cuentas, asientos, balances', 'finance', false, 'book-open', 90),
  ('cash-register', 'Caja / POS', 'Sesiones de caja, movimientos', 'finance', false, 'dollar-sign', 91),
  ('taxes', 'Impuestos', 'Gestión de tasas de impuesto', 'finance', false, 'percent', 92),
  
  -- Reporting
  ('reports', 'Reportes', 'Dashboard, reportes de ventas, inventario, etc.', 'reporting', false, 'bar-chart', 100),
  ('analytics', 'Analytics', 'Métricas de sitio web y conversiones', 'reporting', false, 'activity', 101),
  
  -- Forms
  ('dynamic-forms', 'Formularios Dinámicos', 'Constructor de formularios personalizados', 'cms', false, 'clipboard', 110),
  
  -- Media
  ('media', 'Mediateca', 'Gestión centralizada de archivos multimedia', 'cms', false, 'folder', 120),
  
  -- Customization
  ('themes', 'Temas', 'Configuración visual del sitio web', 'cms', false, 'palette', 130),
  ('navigation', 'Navegación', 'Menús, headers, footers', 'cms', false, 'menu', 131),
  ('custom-code', 'Código Personalizado', 'Inyección de HTML/CSS/JS', 'cms', false, 'code', 132),
  ('redirects', 'Redirecciones URL', 'Reglas de redirección 301/302', 'cms', false, 'external-link', 133),
  
  -- Platform
  ('platform-admin', 'Admin de Plataforma', 'Panel de administración global SaaS', 'core', true, 'settings', 140),
  ('billing', 'Facturación SaaS', 'Planes, suscripciones, pagos', 'core', false, 'credit-card', 141)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4. SEED: DEFAULT THEMES (3 built-in themes)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.themes (name, slug, description, visual_style, border_style, dark_mode, is_system, sort_order)
VALUES
  ('Aurora Gold', 'aurora-gold',
   'Tema elegante con acentos dorados. Ideal para tiendas premium, joyerías y marcas de lujo.',
   'elegant', 'rounded', false, true, 1),
  ('Aurora Modern', 'aurora-modern',
   'Tema limpio y moderno con diseño minimalista. Versátil para cualquier tipo de negocio.',
   'modern', 'rounded', false, true, 2),
  ('Aurora Dark', 'aurora-dark',
   'Tema oscuro con acentos vibrantes. Ideal para tecnología, gaming y marcas年轻.',
   'bold', 'sharp', true, true, 3),
  ('Aurora Minimal', 'aurora-minimal',
   'Ultra-limpio con mucho espacio en blanco. Perfecto para servicios profesionales.',
   'minimal', 'sharp', false, true, 4),
  ('Aurora Classic', 'aurora-classic',
   'Tema clásico con tipografía tradicional. Ideal para instituciones y empresas establecidas.',
   'classic', 'rounded', false, true, 5)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 5. SEED: CMS COMPONENT REGISTRY (built-in page builder components)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.cms_component_registry (slug, name, description, category, icon, props_schema, default_props, is_system)
VALUES
  -- Layout
  ('hero-banner', 'Hero Banner', 'Gran banner principal con imagen de fondo, título, subtítulo y botones de acción', 'layout', 'maximize',
   '{"type":"object","properties":{"title":{"type":"string"},"subtitle":{"type":"string"},"image":{"type":"string"},"buttonText":{"type":"string"},"buttonUrl":{"type":"string"},"button2Text":{"type":"string"},"button2Url":{"type":"string"},"textAlign":{"type":"string","enum":["left","center","right"]},"overlayOpacity":{"type":"number"},"height":{"type":"string"}}}',
   '{"title":"Bienvenidos","subtitle":"Descubre nuestra colección","textAlign":"center","overlayOpacity":0.5,"height":"600px"}',
   true),

  ('text-block', 'Bloque de Texto', 'Bloque de contenido de texto con formato enriquecido', 'content', 'type',
   '{"type":"object","properties":{"content":{"type":"string","format":"html"},"textAlign":{"type":"string"},"maxWidth":{"type":"string"}}}',
   '{"textAlign":"left","maxWidth":"800px"}',
   true),

  ('image-gallery', 'Galería de Imágenes', 'Galería de imágenes con grid, carrusel o lightbox', 'media', 'image',
   '{"type":"object","properties":{"images":{"type":"array"},"layout":{"type":"string","enum":["grid","masonry","carousel"]},"columns":{"type":"number"},"showCaptions":{"type":"boolean"}}}',
   '{"layout":"grid","columns":3,"showCaptions":true}',
   true),

  ('product-grid', 'Grid de Productos', 'Cuadrícula de productos con filtros y paginación', 'commerce', 'grid',
   '{"type":"object","properties":{"title":{"type":"string"},"source":{"type":"string","enum":["category","brand","featured","new","sale"]},"categoryId":{"type":"string"},"brandId":{"type":"string"},"limit":{"type":"number"},"columns":{"type":"number"},"showPrices":{"type":"boolean"},"showRating":{"type":"boolean"}}}',
   '{"title":"Productos Destacados","source":"featured","limit":8,"columns":4,"showPrices":true,"showRating":true}',
   true),

  ('product-carousel', 'Carrusel de Productos', 'Carrusel horizontal de productos con navegación', 'commerce', 'layers',
   '{"type":"object","properties":{"title":{"type":"string"},"source":{"type":"string"},"limit":{"type":"number"},"autoplay":{"type":"boolean"},"showDots":{"type":"boolean"}}}',
   '{"title":"Productos Destacados","limit":10,"autoplay":true,"showDots":true}',
   true),

  ('category-grid', 'Grid de Categorías', 'Cuadrícula de categorías con imágenes', 'commerce', 'grid',
   '{"type":"object","properties":{"title":{"type":"string"},"columns":{"type":"number"},"showCount":{"type":"boolean"},"style":{"type":"string","enum":["cards","circles","minimal"]}}}',
   '{"title":"Categorías","columns":4,"showCount":true,"style":"cards"}',
   true),

  ('testimonial-slider', 'Slider de Testimonios', 'Carrusel de testimonios y reseñas de clientes', 'content', 'message-square',
   '{"type":"object","properties":{"title":{"type":"string"},"limit":{"type":"number"},"autoplay":{"type":"boolean"},"style":{"type":"string","enum":["card","quote","minimal"]}}}',
   '{"title":"Lo que dicen nuestros clientes","limit":5,"autoplay":true,"style":"card"}',
   true),

  ('cta-banner', 'Call to Action', 'Banner de llamada a la acción con botón', 'layout', 'zap',
   '{"type":"object","properties":{"title":{"type":"string"},"subtitle":{"type":"string"},"buttonText":{"type":"string"},"buttonUrl":{"type":"string"},"bgColor":{"type":"string"},"textColor":{"type":"string"}}}',
   '{"title":"¿Listo para empezar?","subtitle":"Contáctanos hoy","buttonText":"Contáctanos","bgColor":"#624200","textColor":"#ffffff"}',
   true),

  ('contact-form', 'Formulario de Contacto', 'Formulario de contacto personalizable', 'form', 'mail',
   '{"type":"object","properties":{"formId":{"type":"string"},"title":{"type":"string"},"showName":{"type":"boolean"},"showPhone":{"type":"boolean"},"showSubject":{"type":"boolean"}}}',
   '{"title":"Contáctanos","showName":true,"showPhone":true,"showSubject":true}',
   true),

  ('newsletter-signup', 'Suscripción al Newsletter', 'Formulario de suscripción por email', 'form', 'mail',
   '{"type":"object","properties":{"title":{"type":"string"},"subtitle":{"type":"string"},"buttonText":{"type":"string"},"bgColor":{"type":"string"}}}',
   '{"title":"Suscríbete","subtitle":"Recibe ofertas exclusivas","buttonText":"Suscribirse"}',
   true),

  ('faq-section', 'Preguntas Frecuentes (FAQ)', 'Sección de acordeón de preguntas frecuentes', 'content', 'help-circle',
   '{"type":"object","properties":{"title":{"type":"string"},"items":{"type":"array"},"style":{"type":"string","enum":["accordion","tabs","list"]}}}',
   '{"title":"Preguntas Frecuentes","style":"accordion"}',
   true),

  ('social-links', 'Redes Sociales', 'Links a redes sociales con iconos', 'social', 'share-2',
   '{"type":"object","properties":{"platforms":{"type":"array"},"style":{"type":"string","enum":["icons","buttons","text"]},"size":{"type":"string","enum":["sm","md","lg"]}}}',
   '{"style":"icons","size":"md"}',
   true),

  ('map-embed', 'Mapa / Ubicación', 'Embe de mapa Google Maps o dirección', 'content', 'map-pin',
   '{"type":"object","properties":{"address":{"type":"string"},"latitude":{"type":"number"},"longitude":{"type":"number"},"height":{"type":"string"},"showDetails":{"type":"boolean"}}}',
   '{"height":"400px","showDetails":true}',
   true),

  ('custom-html', 'HTML Personalizado', 'Bloque de HTML/CSS/JS personalizado', 'custom', 'code',
   '{"type":"object","properties":{"html":{"type":"string","format":"html"},"css":{"type":"string"},"js":{"type":"string"}}}',
   '{"html":"<!-- Tu HTML aquí -->"}',
   true),

  ('spacer', 'Espaciador', 'Espacio vertical configurable', 'layout', 'minus',
   '{"type":"object","properties":{"height":{"type":"string"}}}',
   '{"height":"60px"}',
   true),

  ('divider', 'Divisor', 'Línea separadora horizontal', 'layout', 'minus',
   '{"type":"object","properties":{"style":{"type":"string","enum":["solid","dashed","dotted"]},"color":{"type":"string"},"width":{"type":"string"}}}',
   '{"style":"solid","color":"#e5e7eb","width":"100%"}',
   true),

  ('countdown-timer', 'Temporizador de Cuenta Regresiva', 'Countdown para ofertas limitadas o eventos', 'commerce', 'clock',
   '{"type":"object","properties":{"title":{"type":"string"},"targetDate":{"type":"string","format":"date-time"},"bgColor":{"type":"string"}}}',
   '{"title":"Oferta termina en","bgColor":"#1f2937"}',
   true),

  ('video-embed', 'Video Embebido', 'Reproductor de video YouTube, Vimeo o propio', 'media', 'play',
   '{"type":"object","properties":{"videoUrl":{"type":"string"},"title":{"type":"string"},"thumbnailUrl":{"type":"string"},"autoplay":{"type":"boolean"}}}',
   '{"autoplay":false}',
   true),

  ('whatsapp-button', 'Botón de WhatsApp', 'Botón flotante de WhatsApp con mensaje predefinido', 'social', 'message-circle',
   '{"type":"object","properties":{"phoneNumber":{"type":"string"},"message":{"type":"string"},"position":{"type":"string","enum":["bottom-right","bottom-left"]},"showPulse":{"type":"boolean"}}}',
   '{"position":"bottom-right","showPulse":true}',
   true),

  ('feature-cards', 'Tarjetas de Características', 'Grid de tarjetas con iconos y descripciones', 'layout', 'layout',
   '{"type":"object","properties":{"title":{"type":"string"},"items":{"type":"array"},"columns":{"type":"number"},"style":{"type":"string","enum":["cards","minimal","boxed"]}}}',
   '{"title":"¿Por qué elegirnos?","columns":3,"style":"cards"}',
   true)

ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 6. SEED: BUSINESS TYPE FEATURES
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_restaurant UUID;
  v_general UUID;
BEGIN
  SELECT id INTO v_restaurant FROM public.business_types WHERE slug = 'restaurantes';
  SELECT id INTO v_general FROM public.business_types WHERE slug = 'general';

  -- Restaurant features
  INSERT INTO public.business_type_features (business_type_id, feature_slug, feature_name, is_enabled, config) VALUES
    (v_restaurant, 'menu_digital', 'Menú Digital', true, '{"display":"grid","show_images":true,"show_prices":true,"show_allergens":true}'),
    (v_restaurant, 'online_orders', 'Pedidos Online', true, '{"min_advance_minutes":30,"max_days_ahead":7}'),
    (v_restaurant, 'reservations', 'Sistema de Reservaciones', true, '{"max_party_size":20,"time_slots_interval":30}'),
    (v_restaurant, 'delivery', 'Delivery / Envío', true, '{"delivery_radius_km":10,"min_order_amount":500}'),
    (v_restaurant, 'table_qr', 'QR para Mesa', false, '{}'),
    (v_restaurant, 'kitchen_display', 'Pantalla de Cocina (KDS)', false, '{}')
  ON CONFLICT DO NOTHING;

  -- General features
  INSERT INTO public.business_type_features (business_type_id, feature_slug, feature_name, is_enabled, config) VALUES
    (v_general, 'product_comparison', 'Comparación de Productos', true, '{}'),
    (v_general, 'wishlists', 'Listas de Deseos', true, '{}'),
    (v_general, 'product_reviews', 'Reseñas de Productos', true, '{}'),
    (v_general, 'price_alerts', 'Alertas de Precio', false, '{}'),
    (v_general, 'bulk_pricing', 'Precios por Volumen', true, '{}'),
    (v_general, 'multi_currency', 'Multi-moneda', false, '{}')
  ON CONFLICT DO NOTHING;
END $$;

-- ────────────────────────────────────────────────────────────
-- 7. SEED: DEFAULT CMS TEMPLATES
-- ────────────────────────────────────────────────────────────

INSERT INTO public.cms_templates (company_id, name, slug, description, layout, is_system)
VALUES
  (NULL, 'Homepage — Hero + Productos', 'homepage-hero-products',
   'Homepage con hero banner, categorías destacadas, productos destacados, testimonios y CTA',
   '[
     {"component": "hero-banner", "settings": {"fullWidth": true}},
     {"component": "category-grid", "settings": {"columns": 4}},
     {"component": "product-grid", "settings": {"source": "featured", "limit": 8, "columns": 4}},
     {"component": "testimonial-slider", "settings": {"autoplay": true}},
     {"component": "newsletter-signup", "settings": {}},
     {"component": "cta-banner", "settings": {}}
   ]',
   true),

  (NULL, 'Homepage — Tienda Completa', 'homepage-full-store',
   'Homepage completa con hero, carruseles, ofertas, FAQ y newsletter',
   '[
     {"component": "hero-banner", "settings": {"fullWidth": true, "height": "700px"}},
     {"component": "product-carousel", "settings": {"source": "new", "title": "Novedades"}},
     {"component": "product-grid", "settings": {"source": "sale", "title": "Ofertas", "limit": 8}},
     {"component": "testimonial-slider", "settings": {}},
     {"component": "faq-section", "settings": {"title": "Preguntas Frecuentes"}},
     {"component": "newsletter-signup", "settings": {}}
   ]',
   true),

  (NULL, 'Página de Contacto', 'page-contact',
   'Página de contacto con formulario, mapa y datos de la empresa',
   '[
     {"component": "hero-banner", "settings": {"title": "Contáctanos", "height": "300px"}},
     {"component": "feature-cards", "settings": {"columns": 3}},
     {"component": "contact-form", "settings": {}},
     {"component": "map-embed", "settings": {}}
   ]',
   true),

  (NULL, 'Página de Acerca de', 'page-about',
   'Página corporativa con historia, equipo y valores',
   '[
     {"component": "hero-banner", "settings": {"title": "Sobre Nosotros", "height": "400px"}},
     {"component": "text-block", "settings": {}},
     {"component": "feature-cards", "settings": {"title": "Nuestros Valores", "columns": 3}},
     {"component": "testimonial-slider", "settings": {"title": "Nuestro Equipo"}}
   ]',
   true),

  (NULL, 'Página de Servicios', 'page-services',
   'Página de servicios con grid de servicios y CTA',
   '[
     {"component": "hero-banner", "settings": {"title": "Nuestros Servicios", "height": "400px"}},
     {"component": "feature-cards", "settings": {"columns": 2, "style": "boxed"}},
     {"component": "cta-banner", "settings": {"title": "¿Necesitas una cotización?"}}
   ]',
   true)
ON CONFLICT (company_id, slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 8. COMPOSITE INDEXES (for common query patterns)
-- ────────────────────────────────────────────────────────────

-- CMS
CREATE INDEX IF NOT EXISTS idx_cms_pages_published ON public.cms_pages(company_id, is_published, deleted_at) WHERE is_published = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cms_sections_page_sort ON public.cms_page_sections(page_id, sort_order) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_cms_instances_section_sort ON public.cms_component_instances(section_id, sort_order) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_cms_versions_page ON public.cms_page_versions(page_id, version DESC);

-- Dynamic Forms
CREATE INDEX IF NOT EXISTS idx_dff_form_sort ON public.dynamic_form_fields(form_id, sort_order) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_dfs_form_status ON public.dynamic_form_submissions(form_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dfs_values_sub ON public.dynamic_form_submission_values(submission_id, field_name);

-- Themes / Navigation
CREATE INDEX IF NOT EXISTS idx_sni_menu_sort ON public.site_navigation_items(menu_id, sort_order, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sni_parent_sort ON public.site_navigation_items(parent_id, sort_order) WHERE parent_id IS NOT NULL;

-- Promotions
CREATE INDEX IF NOT EXISTS idx_promo_rules_promo_active ON public.promotion_rules(promotion_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_actions_promo_sort ON public.promotion_actions(promotion_id, sort_order) WHERE is_active = true;

-- Media
CREATE INDEX IF NOT EXISTS idx_media_folder_name ON public.media_assets(company_id, folder, file_name);
CREATE INDEX IF NOT EXISTS idx_media_tags_gin ON public.media_assets USING GIN(tags);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_page_date ON public.page_analytics(page_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_date_type ON public.conversion_events(company_id, occurred_at DESC, event_type);

-- Custom Code
CREATE INDEX IF NOT EXISTS idx_custom_code_active ON public.custom_code_blocks(company_id, is_active, code_type) WHERE is_active = true;

-- Redirects
CREATE INDEX IF NOT EXISTS idx_redirects_from_active ON public.url_redirects(from_path, is_active, company_id) WHERE is_active = true;

-- Business Types
CREATE INDEX IF NOT EXISTS idx_bt_modules_slug ON public.business_type_modules(business_type_id, module_slug);
CREATE INDEX IF NOT EXISTS idx_bt_features_slug ON public.business_type_features(business_type_id, feature_slug);

-- Company Modules
CREATE INDEX IF NOT EXISTS idx_company_modules_active ON public.company_modules(company_id, is_enabled) WHERE is_enabled = true;

-- Testimonials
CREATE INDEX IF NOT EXISTS idx_testimonials_active_sort ON public.testimonials(company_id, is_active, sort_order) WHERE is_active = true;

-- ────────────────────────────────────────────────────────────
-- 9. ADVANCED TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Auto-create company theme on company creation
CREATE OR REPLACE FUNCTION public.fn_auto_create_company_theme()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_theme_id UUID;
BEGIN
  -- Get the default "Aurora Modern" theme
  SELECT id INTO v_theme_id FROM public.themes WHERE slug = 'aurora-modern' AND is_system = true LIMIT 1;
  
  IF v_theme_id IS NOT NULL THEN
    INSERT INTO public.company_themes (company_id, theme_id)
    VALUES (NEW.id, v_theme_id)
    ON CONFLICT (company_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_company_theme ON public.companies;
CREATE TRIGGER trg_auto_company_theme
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_create_company_theme();

-- Auto-create default header and footer on company creation
CREATE OR REPLACE FUNCTION public.fn_auto_create_company_site()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Create default header
  INSERT INTO public.site_headers (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  
  -- Create default footer
  INSERT INTO public.site_footers (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  
  -- Create default navigation menu
  INSERT INTO public.site_navigation_menus (company_id, name, slug, location)
  VALUES (NEW.id, 'Menú Principal', 'main-header', 'header')
  ON CONFLICT (company_id, slug) DO NOTHING;
  
  INSERT INTO public.site_navigation_menus (company_id, name, slug, location)
  VALUES (NEW.id, 'Menú Footer', 'main-footer', 'footer')
  ON CONFLICT (company_id, slug) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_company_site ON public.companies;
CREATE TRIGGER trg_auto_company_site
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_create_company_site();

-- Auto-enable default modules for new company
CREATE OR REPLACE FUNCTION public.fn_auto_enable_company_modules()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_type_slug TEXT;
  v_rec RECORD;
BEGIN
  -- Get the company's business type slug
  SELECT bt.slug INTO v_type_slug
  FROM public.business_types bt
  WHERE bt.id = NEW.business_type_id;
  
  IF v_type_slug IS NOT NULL THEN
    -- Enable modules based on business type
    FOR v_rec IN
      SELECT btm.module_slug
      FROM public.business_type_modules btm
      JOIN public.business_types bt ON bt.id = btm.business_type_id
      WHERE bt.slug = v_type_slug AND btm.is_enabled = true
    LOOP
      INSERT INTO public.company_modules (company_id, module_id, is_enabled)
      SELECT NEW.id, pm.id, true
      FROM public.platform_modules pm
      WHERE pm.slug = v_rec.module_slug
      ON CONFLICT (company_id, module_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enable_modules ON public.companies;
CREATE TRIGGER trg_auto_enable_modules
  AFTER UPDATE OF business_type_id ON public.companies
  WHEN (OLD.business_type_id IS DISTINCT FROM NEW.business_type_id)
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_enable_company_modules();

-- Track redirect hit
CREATE OR REPLACE FUNCTION public.fn_track_redirect_hit()
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

-- ────────────────────────────────────────────────────────────
-- 10. MATERIALIZED VIEW: Company Stats (refreshed periodically)
-- ────────────────────────────────────────────────────────────

DROP MATERIALIZED VIEW IF EXISTS public.mv_company_stats;
CREATE MATERIALIZED VIEW public.mv_company_stats AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.slug,
  c.plan,
  c.is_active,
  c.created_at AS registered_at,
  
  -- Product stats
  (SELECT COUNT(*) FROM public.products p WHERE p.company_id = c.id AND p.deleted_at IS NULL) AS product_count,
  
  -- User stats
  (SELECT COUNT(*) FROM public.users u WHERE u.company_id = c.id) AS user_count,
  
  -- Sales stats (last 30 days)
  (SELECT COUNT(*) FROM public.sales s WHERE s.company_id = c.id AND s.created_at > now() - INTERVAL '30 days') AS sales_30d,
  (SELECT COALESCE(SUM(s.total), 0) FROM public.sales s WHERE s.company_id = c.id AND s.created_at > now() - INTERVAL '30 days') AS revenue_30d,
  
  -- Page stats
  (SELECT COUNT(*) FROM public.cms_pages pg WHERE pg.company_id = c.id AND pg.is_published = true AND pg.deleted_at IS NULL) AS page_count,
  
  -- Media stats
  (SELECT COUNT(*) FROM public.media_assets m WHERE m.company_id = c.id) AS media_count,
  
  -- Form stats
  (SELECT COUNT(*) FROM public.dynamic_forms df WHERE df.company_id = c.id AND df.is_active = true) AS form_count,
  (SELECT COUNT(*) FROM public.dynamic_form_submissions dfs WHERE dfs.company_id = c.id AND dfs.created_at > now() - INTERVAL '30 days') AS submissions_30d

FROM public.companies c
WHERE c.is_active = true
  AND c.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_company_stats_id ON public.mv_company_stats(company_id);

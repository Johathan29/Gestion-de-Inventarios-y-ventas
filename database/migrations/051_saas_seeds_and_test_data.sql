-- ============================================================================
-- MIGRATION 051: SaaS Platform Seeds & Test Data
-- ============================================================================
-- Seeds for feature_flags, custom_roles, dashboard_widgets,
-- webhooks, automation_rules, and platform-level test data.
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. FEATURE FLAGS (additional to migration 050)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO public.feature_flags (slug, name, description, category, is_active, rollout_percentage, config) VALUES
  ('ai_product_descriptions',   'AI Product Descriptions',   'Auto-generate product descriptions using AI',       'experimental', FALSE, 0, '{"provider":"openai","model":"gpt-4o-mini"}'),
  ('advanced_reporting',        'Advanced Reporting',         'Enhanced report engine with custom SQL views',      'erp',         TRUE, 100, '{}'),
  ('multi_currency_checkout',   'Multi-Currency Checkout',    'Allow checkout in multiple currencies',             'ecommerce',   FALSE, 0, '{"default_currency":"COP"}'),
  ('whatsapp_order_notifications', 'WhatsApp Order Notifications', 'Send order status via WhatsApp',              'notification', TRUE, 100, '{"template_id":"order_update"}'),
  ('barcode_scanning',          'Barcode Scanning',           'Mobile barcode scanning for inventory',             'erp',         TRUE, 100, '{}'),
  ('customer_loyalty_points',   'Customer Loyalty Points',    'Reward system with points per purchase',            'erp',         FALSE, 0, '{"points_per_1000":10}'),
  ('abandoned_cart_emails',     'Abandoned Cart Recovery',    'Auto-email customers with abandoned carts',         'ecommerce',   FALSE, 0, '{"delay_hours":24}'),
  ('seo_auto_metadata',         'SEO Auto Metadata',          'Auto-generate meta tags from product/page content', 'cms',         TRUE, 100, '{}'),
  ('real_time_inventory_sync',  'Real-Time Inventory Sync',   'WebSocket-based inventory updates',                 'erp',         TRUE, 100, '{}'),
  ('multi_warehouse',           'Multi-Warehouse',            'Support for multiple warehouse locations',          'erp',         FALSE, 0, '{"max_warehouses":5}')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  config = EXCLUDED.config;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. DASHBOARD WIDGETS (catalog)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO public.dashboard_widgets (slug, name, description, category, icon, component, default_size, is_system, sort_order, default_config) VALUES
  ('daily_sales',           'Ventas del Día',         'Total de ventas realizadas hoy',            'ventas',     'today',            'KpiWidget',       'medium', TRUE,  1, '{"show_header":true,"time_range":"today"}'),
  ('total_revenue',         'Ingresos del Mes',       'Ingresos acumulados del mes actual',        'ventas',     'trending_up',      'KpiWidget',       'medium', TRUE,  2, '{"time_range":"month"}'),
  ('active_orders',         'Pedidos Activos',        'Número de pedidos en proceso',              'ventas',     'shopping_cart',    'KpiWidget',       'medium', TRUE,  3, '{"status":"pending"}'),
  ('low_stock',             'Stock Bajo',             'Productos por debajo del mínimo',           'inventario', 'warning',          'KpiWidget',       'medium', FALSE, 4, '{"threshold":10}'),
  ('pending_invoices',      'Facturas Pendientes',    'Facturas sin pago',                         'ventas',     'receipt',          'KpiWidget',       'medium', FALSE, 5, '{"status":"pending"}'),
  ('top_products',          'Top Productos',          'Productos más vendidos',                    'ventas',     'emoji_events',     'BarChartWidget',  'large',  FALSE, 10,'{"limit":5,"time_range":"month"}'),
  ('sales_trend',           'Tendencia de Ventas',    'Gráfico de ventas por día de la semana',    'ventas',     'show_chart',       'BarChartWidget',  'large',  FALSE, 11,'{"days":7}'),
  ('category_distribution', 'Distribución por Categoría', 'Ventas por categoría de producto',       'ventas',     'pie_chart',        'BarChartWidget',  'medium', FALSE, 12,'{"limit":5}'),
  ('recent_orders',         'Pedidos Recientes',      'Últimos pedidos recibidos',                 'ventas',     'list_alt',         'TableWidget',     'large',  FALSE, 20,'{"limit":5}'),
  ('recent_activity',       'Actividad Reciente',     'Últimas acciones en el sistema',            'general',    'history',          'ListWidget',      'medium', FALSE, 21,'{"limit":8}'),
  ('lead_pipeline',         'Pipeline CRM',           'Estado actual del pipeline de ventas',      'crm',        'funnel_right',     'BarChartWidget',  'large',  FALSE, 30,'{}'),
  ('top_customers',         'Mejores Clientes',       'Clientes con mayor facturación',            'crm',        'groups',           'TableWidget',     'medium', FALSE, 31,'{"limit":5}'),
  ('notifications_summary', 'Resumen Notificaciones', 'Notificaciones recientes y pendientes',     'general',    'notifications',    'ListWidget',      'medium', FALSE, 40,'{"limit":6}'),
  ('pending_tasks',         'Tareas Pendientes',      'Tareas asignadas pendientes',               'general',    'task_alt',         'TableWidget',     'medium', FALSE, 41,'{"status":"pending","limit":5}'),
  ('top_sellers',           'Mejores Vendedores',     'Vendedores con mayor rendimiento',          'crm',        'military_tech',    'ListWidget',      'medium', FALSE, 50,'{"limit":5}'),
  ('ecommerce_traffic',     'Tráfico E-Commerce',     'Visitantes y conversiones de la tienda',    'ecommerce',  'public',           'KpiWidget',       'medium', FALSE, 60,'{"time_range":"today"}'),
  ('inventory_value',       'Valor de Inventario',    'Valor total del inventario actual',         'inventario', 'inventory',        'KpiWidget',       'medium', FALSE, 70,'{}'),
  ('purchase_orders',       'Órdenes de Compra',      'Órdenes de compra activas',                 'compras',    'local_shipping',   'TableWidget',     'medium', FALSE, 80,'{"status":"pending","limit":5}')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_config = EXCLUDED.config;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. CUSTOM ROLES (for test company)
-- ──────────────────────────────────────────────────────────────────────────────
-- Note: role IDs are managed by the existing roles table.
-- This seeds custom role entries that extend the built-in roles.
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO public.custom_roles (company_id, name, description, color, is_active, is_system, max_users) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Gerente de Ventas',   'Supervisa todo el proceso de ventas y reportes',      '#3b82f6', TRUE, FALSE, 5),
  ('00000000-0000-0000-0000-000000000001', 'Almacén Senior',      'Gestión avanzada de inventario y compras',            '#10b981', TRUE, FALSE, 3),
  ('00000000-0000-0000-0000-000000000001', 'Asistente Virtual',   'Acceso limitado de solo lectura',                    '#8b5cf6', TRUE, FALSE, 10),
  ('00000000-0000-0000-0000-000000000001', 'Contador',            'Acceso a facturas, reportes financieros',            '#f59e0b', TRUE, FALSE, 2),
  ('00000000-0000-0000-0000-000000000001', 'Diseñador Web',       'Gestiona el CMS, tienda y contenido',                '#ec4899', TRUE, FALSE, 3)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. BUSINESS TYPE DASHBOARD MAPPINGS
-- ──────────────────────────────────────────────────────────────────────────────
-- Link widgets to business types for auto-dashboard generation
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_bt RECORD;
  v_widget RECORD;
  v_default_bt INTEGER;
BEGIN
  -- Get the first active business type as fallback
  SELECT id INTO v_default_bt FROM public.business_types WHERE is_active = TRUE LIMIT 1;

  IF v_default_bt IS NOT NULL THEN
    -- For each business type, map the core widgets
    FOR v_bt IN SELECT id, slug FROM public.business_types WHERE is_active = TRUE LOOP
      -- Core widgets for ALL business types
      FOR v_widget IN
        SELECT id, slug FROM public.dashboard_widgets
        WHERE slug IN ('daily_sales', 'total_revenue', 'active_orders', 'recent_orders', 'recent_activity')
      LOOP
        INSERT INTO public.business_type_dashboards (business_type_id, widget_id, is_enabled, sort_order, grid_column, grid_row, grid_width, grid_height)
        VALUES (v_bt.id, v_widget.id, TRUE,
                CASE v_widget.slug
                  WHEN 'daily_sales' THEN 1
                  WHEN 'total_revenue' THEN 2
                  WHEN 'active_orders' THEN 3
                  WHEN 'recent_orders' THEN 4
                  WHEN 'recent_activity' THEN 5
                  ELSE 10
                END,
                CASE
                  WHEN v_widget.slug IN ('daily_sales', 'total_revenue', 'active_orders') THEN 1
                  ELSE 1
                END,
                CASE
                  WHEN v_widget.slug IN ('daily_sales', 'total_revenue', 'active_orders') THEN 1
                  WHEN v_widget.slug = 'recent_orders' THEN 2
                  ELSE 3
                END,
                CASE
                  WHEN v_widget.slug IN ('daily_sales', 'total_revenue', 'active_orders') THEN 4
                  ELSE 12
                END,
                2)
        ON CONFLICT (business_type_id, widget_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. COMPANY DASHBOARD (for test company)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO public.company_dashboards (company_id, name, slug, is_default, layout, columns, theme)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dashboard Principal', 'main', TRUE, 'grid', 12, 'light')
ON CONFLICT (company_id, slug) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. COMPANY DASHBOARD WIDGETS (for test company)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_dash_id INTEGER;
  v_widget_rec RECORD;
  v_order INTEGER := 0;
BEGIN
  SELECT id INTO v_dash_id FROM public.company_dashboards
  WHERE company_id = '00000000-0000-0000-0000-000000000001' AND slug = 'main';

  IF v_dash_id IS NOT NULL THEN
    FOR v_widget_rec IN
      SELECT id, slug, default_size FROM public.dashboard_widgets
      WHERE is_active = TRUE AND slug IN (
        'daily_sales', 'total_revenue', 'active_orders', 'low_stock',
        'top_products', 'sales_trend', 'recent_orders', 'recent_activity',
        'lead_pipeline', 'pending_invoices', 'inventory_value'
      )
      ORDER BY sort_order
    LOOP
      v_order := v_order + 1;
      INSERT INTO public.company_dashboard_widgets
        (dashboard_id, company_id, widget_id, is_visible, sort_order, grid_column, grid_row, grid_width, grid_height)
      VALUES (
        v_dash_id,
        '00000000-0000-0000-0000-000000000001',
        v_widget_rec.id,
        TRUE,
        v_order,
        CASE
          WHEN v_widget_rec.default_size = 'full' THEN 1
          WHEN v_widget_rec.slug IN ('daily_sales', 'total_revenue', 'active_orders', 'low_stock', 'pending_invoices', 'inventory_value') THEN ((v_order - 1) % 6) * 2 + 1
          ELSE 1
        END,
        CASE
          WHEN v_widget_rec.slug IN ('daily_sales', 'total_revenue', 'active_orders', 'low_stock', 'pending_invoices', 'inventory_value') THEN 1
          WHEN v_widget_rec.slug IN ('top_products', 'sales_trend', 'lead_pipeline') THEN 2
          ELSE 3
        END,
        CASE
          WHEN v_widget_rec.default_size = 'full' THEN 12
          WHEN v_widget_rec.slug IN ('daily_sales', 'total_revenue', 'active_orders', 'low_stock', 'pending_invoices', 'inventory_value') THEN 4
          ELSE 6
        END,
        2
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. USER DASHBOARD PREFERENCES (for admin user)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO public.user_dashboard_prefs (user_id, company_id, layout, theme, refresh_auto, compact_mode)
VALUES ('1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', '00000000-0000-0000-0000-000000000001', 'grid', 'light', TRUE, FALSE)
ON CONFLICT (user_id, company_id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. WEBHOOKS (test data for test company)
-- ──────────────────────────────────────────────────────────────────────────────
-- Note: webhook tables are in migration 046. Seeding test data.
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks' AND table_schema = 'public') THEN
    INSERT INTO public.webhooks (company_id, name, url, secret, is_active, created_by)
    VALUES
      ('00000000-0000-0000-0000-000000000001', 'Notificación Slack Ventas',     'https://hooks.slack.com/services/T00/B00/test',     'whsec_test123abc', TRUE,  '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4'),
      ('00000000-0000-0000-0000-000000000001', 'Backup Automático a S3',        'https://api.example.com/webhooks/backup',            'whsec_backup456',  TRUE,  '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4'),
      ('00000000-0000-0000-0000-000000000001', 'Sincronización ERP → CRM',      'https://crm.example.com/api/sync',                   NULL,               TRUE,  '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4'),
      ('00000000-0000-0000-0000-000000000001', 'Notificación WhatsApp (Demo)',  'https://graph.facebook.com/v18.0/whatsapp/webhook',  NULL,               FALSE, '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. WEBHOOK EVENT TYPES (test data)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_event_types' AND table_schema = 'public') THEN
    INSERT INTO public.webhook_event_types (name, event_key, category, description)
    VALUES
      ('Venta Creada',           'sale.created',           'ventas',      'Cuando se registra una nueva venta'),
      ('Venta Anulada',          'sale.cancelled',         'ventas',      'Cuando se anula una venta'),
      ('Pedido Recibido',        'order.received',         'ventas',      'Cuando se recibe un nuevo pedido'),
      ('Pedido Enviado',         'order.shipped',          'ventas',      'Cuando se despacha un pedido'),
      ('Factura Generada',       'invoice.created',        'finanzas',    'Cuando se genera una factura'),
      ('Factura Paga',           'invoice.paid',           'finanzas',    'Cuando se marca una factura como pagada'),
      ('Stock Bajo',             'inventory.low_stock',    'inventario',  'Cuando un producto baja del mínimo'),
      ('Producto Creado',        'product.created',        'inventario',  'Cuando se agrega un nuevo producto'),
      ('Cliente Registrado',     'client.registered',      'crm',         'Cuando se registra un nuevo cliente'),
      ('Lead Convertido',        'lead.converted',         'crm',         'Cuando un lead se convierte en cliente'),
      ('Formulario Enviado',     'form.submitted',         'cms',         'Cuando un visitante envía un formulario'),
      ('Página Publicada',       'page.published',         'cms',         'Cuando se publica una página CMS'),
      ('Nuevo Lead CRM',         'lead.created',           'crm',         'Cuando se crea un nuevo lead en el pipeline'),
      ('Cambio de Estado',       'status.changed',         'general',     'Cuando cambia el estado de una entidad'),
      ('Error del Sistema',      'system.error',           'general',     'Cuando ocurre un error crítico del sistema'),
      ('Pago Recibido',          'payment.received',       'finanzas',    'Cuando se confirma un pago')
    ON CONFLICT (event_key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 10. AUTOMATION RULES (test data for test company)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_rules' AND table_schema = 'public') THEN
    INSERT INTO public.automation_rules (company_id, name, description, trigger_event, conditions, actions, priority, is_active, created_by)
    VALUES
      (
        '00000000-0000-0000-0000-000000000001',
        'Notificar venta > $100K',
        'Enviar email al gerente cuando la venta supere $100,000',
        'sale.created',
        '{"total_min": 100000}',
        '[{"action_type":"send_email","action_config":{"to":"gerente@example.com","subject":"¡Venta importante!","template":"high_value_sale"}},{"action_type":"send_notification","action_config":{"title":"Venta alta","message":"Nueva venta de alto valor detectada"}}]',
        5,
        TRUE,
        '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4'
      ),
      (
        '00000000-0000-0000-0000-000000000001',
        'Alerta stock bajo → WhatsApp',
        'Enviar WhatsApp al almacén cuando stock < 5 unidades',
        'inventory.low_stock',
        '{"quantity_max": 5}',
        '[{"action_type":"send_notification","action_config":{"channel":"whatsapp","to":"almacen@example.com","message":"⚠️ Stock bajo: {{product_name}}"}}]',
        8,
        TRUE,
        '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4'
      ),
      (
        '00000000-0000-0000-0000-000000000001',
        'Lead → Asignar vendedor',
        'Asignar automáticamente un vendedor al nuevo lead',
        'lead.created',
        '{}',
        '[{"action_type":"update_status","action_config":{"field":"assigned_to","value":"auto_round_robin"}}]',
        3,
        FALSE,
        '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4'
      ),
      (
        '00000000-0000-0000-0000-000000000001',
        'Factura pagada → Actualizar CRM',
        'Actualizar oportunidad en CRM cuando se paga la factura',
        'invoice.paid',
        '{}',
        '[{"action_type":"update_status","action_config":{"entity":"crm_opportunity","status":"won"}}]',
        4,
        TRUE,
        '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4'
      )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 11. COMPANY AUDIT LOGS (test data)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_audit_logs' AND table_schema = 'public') THEN
    INSERT INTO public.company_audit_logs (company_id, user_id, action, entity_type, entity_id, details, ip_address)
    VALUES
      ('00000000-0000-0000-0000-000000000001', '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', 'login',        'user',           '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', '{"method":"email","browser":"Chrome"}', '192.168.1.1'),
      ('00000000-0000-0000-0000-000000000001', '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', 'update',       'product',        NULL, '{"product":"Laptop HP","field":"price","old":2500000,"new":2400000}', '192.168.1.1'),
      ('00000000-0000-0000-0000-000000000001', '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', 'create',       'sale',           NULL, '{"total":450000,"items":3}', '192.168.1.1'),
      ('00000000-0000-0000-0000-000000000001', '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', 'create',       'custom_role',    NULL, '{"role_name":"Gerente de Ventas"}', '192.168.1.1'),
      ('00000000-0000-0000-0000-000000000001', '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', 'toggle',       'feature_flag',   NULL, '{"flag":"ai_product_descriptions","enabled":false}', '192.168.1.1'),
      ('00000000-0000-0000-0000-000000000001', '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', 'update',       'company',        '00000000-0000-0000-0000-000000000001', '{"field":"business_name","old":"Mi Empresa","new":"Mi Empresa S.A.S."}', '192.168.1.1'),
      ('00000000-0000-0000-0000-000000000001', '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', 'create',       'webhook',        NULL, '{"name":"Slack Ventas","url":"https://hooks.slack.com/..."}', '192.168.1.1'),
      ('00000000-0000-0000-0000-000000000001', '1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', 'create',       'automation',     NULL, '{"name":"Notificar venta > $100K","trigger":"sale.created"}', '192.168.1.1')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 12. USAGE METRICS (test data)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_metrics' AND table_schema = 'public') THEN
    INSERT INTO public.usage_metrics (company_id, metric_name, metric_value, period_start, period_end)
    VALUES
      ('00000000-0000-0000-0000-000000000001', 'api_calls',        15420,  DATE_TRUNC('month', NOW()),  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
      ('00000000-0000-0000-0000-000000000001', 'storage_used_mb',  245,    DATE_TRUNC('month', NOW()),  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
      ('00000000-0000-0000-0000-000000000001', 'users_active',     8,      DATE_TRUNC('month', NOW()),  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
      ('00000000-0000-0000-0000-000000000001', 'emails_sent',      342,    DATE_TRUNC('month', NOW()),  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
      ('00000000-0000-0000-0000-000000000001', 'products_count',   156,    NULL, NULL),
      ('00000000-0000-0000-0000-000000000001', 'invoices_count',   89,     NULL, NULL),
      ('00000000-0000-0000-0000-000000000001', 'forms_submitted',  23,     DATE_TRUNC('month', NOW()),  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
      ('00000000-0000-0000-0000-000000000001', 'webhooks_delivered', 127,  DATE_TRUNC('month', NOW()),  DATE_TRUNC('month', NOW()) + INTERVAL '1 month')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 13. USER ↔ COMPANY MAPPING (for admin user)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_companies' AND table_schema = 'public') THEN
    INSERT INTO public.user_companies (user_id, company_id, role_id, is_primary, is_active)
    VALUES ('1e959cd1-d3f4-4156-9b8d-f2bdb1b50aa4', '00000000-0000-0000-0000-000000000001', 1, TRUE, TRUE)
    ON CONFLICT (user_id, company_id) DO UPDATE SET
      is_primary = TRUE,
      is_active = TRUE;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 14. PASSWORD POLICY (for test company)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_policies' AND table_schema = 'public') THEN
    INSERT INTO public.password_policies (company_id, min_length, require_uppercase, require_lowercase, require_numbers, require_special, max_age_days, max_history)
    VALUES ('00000000-0000-0000-0000-000000000001', 8, TRUE, TRUE, TRUE, TRUE, 90, 5)
    ON CONFLICT (company_id) DO UPDATE SET
      min_length = 8,
      require_uppercase = TRUE,
      require_lowercase = TRUE,
      require_numbers = TRUE,
      require_special = TRUE,
      max_age_days = 90,
      max_history = 5;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 15. SESSION POLICY (for test company)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_policies' AND table_schema = 'public') THEN
    INSERT INTO public.session_policies (company_id, max_concurrent_sessions, session_timeout_minutes, idle_timeout_minutes, require_2fa_for_new_device)
    VALUES ('00000000-0000-0000-0000-000000000001', 3, 480, 30, FALSE)
    ON CONFLICT (company_id) DO UPDATE SET
      max_concurrent_sessions = 3,
      session_timeout_minutes = 480,
      idle_timeout_minutes = 30,
      require_2fa_for_new_device = FALSE;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Summary:
--   • 10 additional feature flags (experimental, erp, ecommerce, cms, notification)
--   • 18 dashboard widgets cataloged (kpi, chart, table, list types)
--   • 5 custom roles for test company
--   • Business type → dashboard widget mappings
--   • Company dashboard + 11 widgets assigned
--   • User dashboard preferences
--   • 4 webhooks + 16 event types
--   • 4 automation rules with conditions & actions
--   • 8 audit log entries
--   • 8 usage metrics
--   • User↔Company mapping, password policy, session policy
-- ============================================================================

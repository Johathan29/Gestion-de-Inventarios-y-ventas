-- ============================================================================
-- MIGRATION 048: RLS POLICIES, SEED DATA & COMPOSITE INDEXES
 ============================================================================
-- Políticas RLS para todas las tablas nuevas (041-047)
-- Datos semilla: permisos, planes, idiomas, widgets, eventos de webhook
-- Índices compuestos para queries de alto rendimiento
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE A: HABILITAR RLS EN TODAS LAS TABLAS NUEVAS
-- ═════════════════════════════════════════════════════════════════════════════

-- RBAC
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- SaaS
ALTER TABLE saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_coupons ENABLE ROW LEVEL SECURITY;

-- Dashboard
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_type_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboard_prefs ENABLE ROW LEVEL SECURITY;

-- CRM
ALTER TABLE lead_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Multi-currency
ALTER TABLE company_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_exchange_rates ENABLE ROW LEVEL SECURITY;

-- i18n
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Integrations
ALTER TABLE integration_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- API Keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_logs ENABLE ROW LEVEL SECURITY;

-- Branches
ALTER TABLE branch_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_schedules ENABLE ROW LEVEL SECURITY;

-- Webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_event_types ENABLE ROW LEVEL SECURITY;

-- Automations
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Notifications
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Brand
ALTER TABLE company_brand_settings ENABLE ROW LEVEL SECURITY;

-- CMS Enhanced
ALTER TABLE cms_review_comments ENABLE ROW LEVEL SECURITY;

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE B: POLÍTICAS RLS POR CATEGORÍA
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── RBAC: Permisos son lectura global, escritura solo super_admin ────────
CREATE POLICY "Permissions readable by authenticated"
  ON permissions FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Role permissions: company isolation"
  ON role_permissions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND r.company_id = public.get_current_company_id())
    OR public.is_platform_admin()
  );

CREATE POLICY "User permissions: own user only"
  ON user_permissions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "Permission audit: platform admin only"
  ON permission_audit_log FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- ─── SaaS: Plans son públicos para lectura ──────────────────────────────
CREATE POLICY "SaaS plans public read"
  ON saas_plans FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "SaaS plans: platform admin manage"
  ON saas_plans FOR ALL TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Plan features: read with plan"
  ON plan_features FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Plan features: platform admin manage"
  ON plan_features FOR ALL TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Company subscriptions: own company"
  ON company_subscriptions FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Plan changes: own company"
  ON plan_changes FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Subscription payments: own company"
  ON subscription_payments FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "SaaS coupons: platform admin manage"
  ON saas_coupons FOR ALL TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "SaaS coupons: public read active"
  ON saas_coupons FOR SELECT TO authenticated USING (is_active = TRUE);

-- ─── Dashboard: Company isolation ────────────────────────────────────────
CREATE POLICY "Dashboard widgets: public catalog"
  ON dashboard_widgets FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Dashboard widgets: platform admin manage"
  ON dashboard_widgets FOR ALL TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Business type dashboards: platform admin"
  ON business_type_dashboards FOR ALL TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Company dashboards: own company"
  ON company_dashboards FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Company dashboard widgets: own company"
  ON company_dashboard_widgets FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Widget cache: own company"
  ON widget_data_cache FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id());

CREATE POLICY "User dashboard prefs: own user"
  ON user_dashboard_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ─── CRM: Company isolation completa ─────────────────────────────────────
CREATE POLICY "Lead stages: own company"
  ON lead_stages FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Lead sources: own company"
  ON lead_sources FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "CRM pipelines: own company"
  ON crm_pipelines FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Pipeline stages: own company"
  ON pipeline_stages FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Leads: own company"
  ON leads FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Lead activities: own company"
  ON lead_activities FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Lead notes: own company"
  ON lead_notes FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Lead assignments: own company"
  ON lead_assignments FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Tasks: own company"
  ON tasks FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ─── Multi-currency: Company isolation ───────────────────────────────────
CREATE POLICY "Company currencies: own company"
  ON company_currencies FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Currency exchange rates: own company"
  ON currency_exchange_rates FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ─── i18n: Languages públicos, company isolation ─────────────────────────
CREATE POLICY "Languages: public read"
  ON languages FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Company languages: own company"
  ON company_languages FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Translations: own company"
  ON translations FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ─── Integrations: Platform catalog público, company config aislada ──────
CREATE POLICY "Integration catalog: public read"
  ON integration_catalog FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Integration catalog: platform admin manage"
  ON integration_catalog FOR ALL TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Company integrations: own company"
  ON company_integrations FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Integration logs: own company"
  ON integration_logs FOR SELECT TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ─── API Keys: own company ──────────────────────────────────────────────
CREATE POLICY "API keys: own company"
  ON api_keys FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "API key logs: own company"
  ON api_key_logs FOR SELECT TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ─── Branches: Company isolation ────────────────────────────────────────
CREATE POLICY "Branch users: own company"
  ON branch_users FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Branch schedules: own company"
  ON branch_schedules FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ─── Webhooks: Company isolation ────────────────────────────────────────
CREATE POLICY "Webhooks: own company"
  ON webhooks FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Webhook logs: own company"
  ON webhook_logs FOR SELECT TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Webhook event types: public read"
  ON webhook_event_types FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Webhook event types: platform admin manage"
  ON webhook_event_types FOR ALL TO authenticated
  USING (public.is_platform_admin());

-- ─── Automations: Company isolation ─────────────────────────────────────
CREATE POLICY "Automation rules: own company"
  ON automation_rules FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Automation actions: own company"
  ON automation_actions FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Automation logs: own company"
  ON automation_logs FOR SELECT TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ─── Notifications: Company isolation ──────────────────────────────────
CREATE POLICY "Notification templates: own company"
  ON notification_templates FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

CREATE POLICY "Notification history: own company"
  ON notification_history FOR SELECT TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ─── Brand Settings: Company isolation ─────────────────────────────────
CREATE POLICY "Brand settings: own company"
  ON company_brand_settings FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ─── CMS Review Comments: Company isolation ─────────────────────────────
CREATE POLICY "CMS review comments: own company"
  ON cms_review_comments FOR ALL TO authenticated
  USING (company_id = public.get_current_company_id() OR public.is_platform_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE C: ÍNDICES COMPUESTOS DE ALTO RENDIMIENTO
-- ═════════════════════════════════════════════════════════════════════════════

-- RBAC
CREATE INDEX idx_rp_role_perm ON role_permissions(role_id, permission_id);
CREATE INDEX idx_up_user_perm ON user_permissions(user_id, permission_id);

-- SaaS
CREATE INDEX idx_cs_company_status ON company_subscriptions(company_id, status);
CREATE INDEX idx_sp_company_status ON subscription_payments(company_id, status, created_at);
CREATE INDEX idx_sp_period ON subscription_payments(subscription_id, period_start, period_end);

-- Dashboard
CREATE INDEX idx_cdw_visible ON company_dashboard_widgets(dashboard_id, is_visible, sort_order);
CREATE INDEX idx_wdc_lookup ON widget_data_cache(company_id, widget_slug, expires_at);

-- CRM
CREATE INDEX idx_leads_company_stage ON leads(company_id, stage_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_company_user ON leads(company_id, user_id, stage_id);
CREATE INDEX idx_leads_pipeline_stage ON leads(pipeline_id, stage_id);
CREATE INDEX idx_leads_temperature ON leads(company_id, temperature, priority);
CREATE INDEX idx_leads_expected_close ON leads(expected_close) WHERE expected_close IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_lead_acts_lead_type ON lead_activities(lead_id, activity_type, created_at DESC);
CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id, is_pinned DESC, created_at DESC);
CREATE INDEX idx_tasks_company_status ON tasks(company_id, status, due_date);
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status, due_date);

-- Multi-currency
CREATE INDEX idx_cc_company_default ON company_currencies(company_id, is_default) WHERE is_default = TRUE;
CREATE INDEX idx_cer_lookup ON currency_exchange_rates(company_id, from_currency_id, to_currency_id, rate_date DESC);

-- i18n
CREATE INDEX idx_trans_lookup ON translations(company_id, language_id, context, key);
CREATE INDEX idx_trans_key_context ON translations(key, context);

-- Integrations
CREATE INDEX idx_ci_company_status ON company_integrations(company_id, status);
CREATE INDEX idx_il_company_date ON integration_logs(company_id, created_at DESC);

-- API Keys
CREATE INDEX idx_ak_prefix ON api_keys(key_prefix);
CREATE INDEX idx_akl_key_date ON api_key_logs(api_key_id, created_at DESC);

-- Webhooks
CREATE INDEX idx_wh_events ON webhooks USING GIN(events, company_id) WHERE is_active = TRUE;
CREATE INDEX idx_wl_pending ON webhook_logs(status, next_retry_at) WHERE status IN ('pending', 'retrying');

-- Automations
CREATE INDEX idx_ar_event_active ON automation_rules(trigger_event, company_id, is_active);
CREATE INDEX idx_aa_rule_sort ON automation_actions(rule_id, sort_order) WHERE is_active = TRUE;
CREATE INDEX idx_al_rule_status ON automation_logs(rule_id, status, started_at DESC);

-- Notifications
CREATE INDEX idx_nh_user_date ON notification_history(user_id, sent_at DESC);
CREATE INDEX idx_nh_ref ON notification_history(reference_type, reference_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE D: SEED DATA — PERMISOS GRANULARES
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (code, resource, action, name, description, category, is_system) VALUES
  -- Companies
  ('companies.read',     'companies',  'read',    'Ver empresa',          'Ver información de la empresa',               'Empresa', TRUE),
  ('companies.update',   'companies',  'update',  'Editar empresa',       'Editar configuración de la empresa',           'Empresa', TRUE),

  -- Users
  ('users.create',       'users',      'create',  'Crear usuarios',       'Crear nuevos usuarios en la empresa',          'Usuarios', TRUE),
  ('users.read',         'users',      'read',    'Ver usuarios',         'Ver lista de usuarios',                       'Usuarios', TRUE),
  ('users.update',       'users',      'update',  'Editar usuarios',      'Editar información de usuarios',               'Usuarios', TRUE),
  ('users.delete',       'users',      'delete',  'Eliminar usuarios',    'Eliminar usuarios de la empresa',              'Usuarios', TRUE),
  ('users.manage',       'users',      'manage',  'Gestionar usuarios',   'Gestión completa de usuarios',                 'Usuarios', TRUE),

  -- Roles
  ('roles.create',       'roles',      'create',  'Crear roles',          'Crear nuevos roles',                           'Seguridad', TRUE),
  ('roles.read',         'roles',      'read',    'Ver roles',            'Ver roles existentes',                         'Seguridad', TRUE),
  ('roles.update',       'roles',      'update',  'Editar roles',         'Editar permisos de roles',                     'Seguridad', TRUE),
  ('roles.delete',       'roles',      'delete',  'Eliminar roles',       'Eliminar roles no-sistema',                    'Seguridad', TRUE),

  -- Products
  ('products.create',    'products',   'create',  'Crear productos',      'Crear nuevos productos en el catálogo',        'Inventario', TRUE),
  ('products.read',      'products',   'read',    'Ver productos',        'Ver el catálogo de productos',                 'Inventario', TRUE),
  ('products.update',    'products',   'update',  'Editar productos',     'Editar información de productos',              'Inventario', TRUE),
  ('products.delete',    'products',   'delete',  'Eliminar productos',   'Eliminar productos del catálogo',              'Inventario', TRUE),
  ('products.export',    'products',   'export',  'Exportar productos',   'Exportar catálogo a CSV/Excel',                'Inventario', TRUE),
  ('products.import',    'products',   'import',  'Importar productos',   'Importar catálogo desde CSV/Excel',            'Inventario', TRUE),

  -- Categories
  ('categories.create',  'categories', 'create',  'Crear categorías',     'Crear categorías del catálogo',                'Inventario', TRUE),
  ('categories.read',    'categories', 'read',    'Ver categorías',       'Ver categorías',                               'Inventario', TRUE),
  ('categories.update',  'categories', 'update',  'Editar categorías',    'Editar categorías',                            'Inventario', TRUE),
  ('categories.delete',  'categories', 'delete',  'Eliminar categorías',  'Eliminar categorías',                          'Inventario', TRUE),

  -- Inventory
  ('inventory.create',   'inventory',  'create',  'Registrar stock',      'Registrar entradas de inventario',             'Inventario', TRUE),
  ('inventory.read',     'inventory',  'read',    'Ver inventario',       'Ver niveles de stock',                         'Inventario', TRUE),
  ('inventory.update',   'inventory',  'update',  'Ajustar stock',        'Realizar ajustes de inventario',               'Inventario', TRUE),
  ('inventory.delete',   'inventory',  'delete',  'Eliminar movimientos', 'Eliminar registros de inventario',             'Inventario', TRUE),

  -- Sales
  ('sales.create',       'sales',      'create',  'Crear ventas',         'Crear nuevas ventas (POS)',                    'Ventas', TRUE),
  ('sales.read',         'sales',      'read',    'Ver ventas',           'Ver historial de ventas',                      'Ventas', TRUE),
  ('sales.update',       'sales',      'update',  'Editar ventas',        'Editar ventas existentes',                     'Ventas', TRUE),
  ('sales.delete',       'sales',      'delete',  'Anular ventas',        'Anular/eliminar ventas',                       'Ventas', TRUE),
  ('sales.export',       'sales',      'export',  'Exportar ventas',      'Exportar reporte de ventas',                   'Ventas', TRUE),

  -- Purchases
  ('purchases.create',   'purchases',  'create',  'Crear compras',        'Crear órdenes de compra',                      'Compras', TRUE),
  ('purchases.read',     'purchases',  'read',    'Ver compras',          'Ver historial de compras',                     'Compras', TRUE),
  ('purchases.update',   'purchases',  'update',  'Editar compras',       'Editar órdenes de compra',                     'Compras', TRUE),
  ('purchases.delete',   'purchases',  'delete',  'Eliminar compras',     'Eliminar órdenes de compra',                   'Compras', TRUE),
  ('purchases.approve',  'purchases',  'approve', 'Aprobar compras',      'Aprobar órdenes de compra',                    'Compras', TRUE),

  -- Invoices
  ('invoices.create',    'invoices',   'create',  'Crear facturas',       'Emitir facturas fiscales',                     'Facturación', TRUE),
  ('invoices.read',      'invoices',   'read',    'Ver facturas',         'Ver facturas emitidas',                        'Facturación', TRUE),
  ('invoices.update',    'invoices',   'update',  'Editar facturas',      'Editar facturas (antes de enviar)',            'Facturación', TRUE),
  ('invoices.cancel',    'invoices',   'cancel',  'Anular facturas',      'Anular facturas fiscales',                     'Facturación', TRUE),

  -- Clients
  ('clients.create',     'clients',    'create',  'Crear clientes',       'Registrar nuevos clientes',                    'CRM', TRUE),
  ('clients.read',       'clients',    'read',    'Ver clientes',         'Ver directorio de clientes',                   'CRM', TRUE),
  ('clients.update',     'clients',    'update',  'Editar clientes',      'Editar información de clientes',               'CRM', TRUE),
  ('clients.delete',     'clients',    'delete',  'Eliminar clientes',    'Eliminar clientes',                            'CRM', TRUE),

  -- CMS
  ('cms.pages.create',   'cms',        'create',  'Crear páginas',        'Crear páginas en el CMS',                     'CMS', TRUE),
  ('cms.pages.read',     'cms',        'read',    'Ver páginas',          'Ver páginas del CMS',                          'CMS', TRUE),
  ('cms.pages.update',   'cms',        'update',  'Editar páginas',       'Editar páginas y componentes',                 'CMS', TRUE),
  ('cms.pages.delete',   'cms',        'delete',  'Eliminar páginas',     'Eliminar páginas del CMS',                     'CMS', TRUE),
  ('cms.pages.publish',  'cms',        'publish', 'Publicar páginas',     'Publicar cambios en el CMS',                   'CMS', TRUE),

  -- Forms
  ('forms.create',       'forms',      'create',  'Crear formularios',    'Crear formularios dinámicos',                  'Formularios', TRUE),
  ('forms.read',         'forms',      'read',    'Ver formularios',      'Ver formularios y respuestas',                 'Formularios', TRUE),
  ('forms.update',       'forms',      'update',  'Editar formularios',   'Editar formularios',                           'Formularios', TRUE),
  ('forms.delete',       'forms',      'delete',  'Eliminar formularios', 'Eliminar formularios',                         'Formularios', TRUE),

  -- Themes/Design
  ('themes.read',        'themes',     'read',    'Ver temas',            'Ver temas disponibles',                        'Diseño', TRUE),
  ('themes.apply',       'themes',     'apply',   'Aplicar temas',        'Cambiar tema de la empresa',                   'Diseño', TRUE),
  ('branding.update',    'branding',   'update',  'Editar marca',         'Editar configuración de marca (colores, etc)',  'Diseño', TRUE),

  -- Reports
  ('reports.sales',      'reports',    'read',    'Reportes de ventas',   'Ver reportes de ventas',                       'Reportes', TRUE),
  ('reports.inventory',  'reports',    'read',    'Reportes de inventario','Ver reportes de inventario',                  'Reportes', TRUE),
  ('reports.finance',    'reports',    'read',    'Reportes financieros', 'Ver reportes financieros',                      'Reportes', TRUE),
  ('reports.crm',        'reports',    'read',    'Reportes de CRM',      'Ver reportes de CRM',                          'Reportes', TRUE),

  -- Settings
  ('settings.read',      'settings',   'read',    'Ver configuración',    'Ver configuración de la empresa',              'Configuración', TRUE),
  ('settings.update',    'settings',   'update',  'Editar configuración', 'Editar configuración de la empresa',           'Configuración', TRUE),

  -- Integrations
  ('integrations.manage','integrations','manage', 'Gestionar integraciones','Conectar/desconectar integraciones externas', 'Integraciones', TRUE),

  -- Webhooks/Automations
  ('webhooks.manage',    'webhooks',   'manage',  'Gestionar webhooks',   'Configurar webhooks y automatizaciones',        'Automatización', TRUE),

  -- Subscriptions
  ('subscriptions.manage','subscriptions','manage','Gestionar suscripción','Administrar plan y pagos de suscripción',      'SaaS', TRUE)

ON CONFLICT (code) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE E: SEED DATA — PLANES SAAS
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO saas_plans (name, slug, description, tier, monthly_price, annual_price, trial_days,
  max_users, max_products, max_clients, max_storage_mb, max_branches, max_forms, max_pages, max_api_keys, max_webhooks, max_automations,
  included_modules, has_cms, has_ecommerce, has_crm, has_custom_domain, has_api_access, has_automation, has_multi_branch, has_advanced_reports, has_white_label,
  badge, color, sort_order, is_popular)
VALUES
  ('Free', 'free', 'Plan gratuito con funcionalidades básicas', 0, 0, 0, 0,
   2, 50, 100, 100, 1, 2, 2, 0, 0, 0,
   ARRAY['products','inventory','sales','clients']::TEXT[],
   FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
   NULL, '#6B7280', 0, FALSE),

  ('Starter', 'starter', 'Para pequeños negocios que empiezan', 1, 19.99, 199.99, 14,
   5, 200, 500, 500, 1, 5, 5, 1, 2, 2,
   ARRAY['products','inventory','sales','clients','invoices','reports']::TEXT[],
   TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
   NULL, '#3B82F6', 1, FALSE),

  ('Business', 'business', 'Para empresas en crecimiento', 2, 49.99, 499.99, 14,
   15, 1000, 2000, 2000, 3, 15, 15, 3, 10, 10,
   ARRAY['products','inventory','sales','clients','invoices','reports','cms','ecommerce','crm','forms']::TEXT[],
   TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE, TRUE, FALSE,
   'Popular', '#8B5CF6', 2, TRUE),

  ('Enterprise', 'enterprise', 'Para grandes empresas con necesidades avanzadas', 3, 149.99, 1499.99, 30,
   50, 10000, 50000, 10000, 10, 50, 50, 10, 50, 50,
   ARRAY['products','inventory','sales','clients','invoices','reports','cms','ecommerce','crm','forms','purchases','analytics']::TEXT[],
   TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
   'Recomendado', '#F59E0B', 3, FALSE)

ON CONFLICT (slug) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE F: SEED DATA — IDIOMAS
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO languages (code, name, native_name, flag, sort_order) VALUES
  ('es', 'Español', 'Español', '🇩🇴', 0),
  ('en', 'English', 'English', '🇺🇸', 1),
  ('fr', 'Français', 'Français', '🇫🇷', 2),
  ('pt', 'Português', 'Português', '🇧🇷', 3),
  ('de', 'Deutsch', 'Deutsch', '🇩🇪', 4),
  ('zh', '中文', '中文', '🇨🇳', 5),
  ('ja', '日本語', '日本語', '🇯🇵', 6)
ON CONFLICT (code) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE G: SEED DATA — DASHBOARD WIDGETS
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO dashboard_widgets (slug, name, description, category, icon, component, default_size, is_system, sort_order, default_config) VALUES
  -- Ventas
  ('daily_sales',         'Ventas del día',       'Resumen de ventas realizadas hoy',         'ventas',      'chart-bar',     'DailySalesWidget',      'medium',  TRUE,  0,  '{"time_range": "today", "show_chart": true}'),
  ('sales_trend',         'Tendencia de ventas',  'Gráfico de ventas de los últimos 30 días', 'ventas',      'trending-up',   'SalesTrendWidget',      'large',   FALSE, 1,  '{"days": 30, "chart_type": "line"}'),
  ('top_products',        'Productos más vendidos','Top 10 productos por ingreso',            'ventas',      'award',         'TopProductsWidget',     'medium',  FALSE, 2,  '{"limit": 10}'),
  ('revenue_chart',       'Ingresos',             'Ingresos mensuales con comparativa',       'finanzas',    'dollar-sign',   'RevenueWidget',         'large',   FALSE, 3,  '{"period": "monthly"}'),

  -- Inventario
  ('low_stock',           'Stock bajo',           'Productos por debajo del mínimo',          'inventario',  'alert-triangle','LowStockWidget',        'medium',  TRUE,  10, '{"limit": 10}'),
  ('inventory_value',     'Valor de inventario',  'Valor total del inventario actual',        'inventario',  'package',       'InventoryValueWidget',  'small',   FALSE, 11, '{}'),
  ('stock_movements',     'Movimientos recientes', 'Últimos movimientos de inventario',        'inventario',  'refresh-cw',    'StockMovementsWidget',  'medium',  FALSE, 12, '{"limit": 10}'),

  -- CRM
  ('leads_summary',       'Resumen de leads',     'Pipeline CRM con métricas',               'crm',         'users',         'LeadsSummaryWidget',    'medium',  TRUE,  20, '{"show_pipeline": true}'),
  ('upcoming_tasks',      'Próximas tareas',      'Tareas pendientes y vencidas',            'crm',         'check-square',  'TasksWidget',           'medium',  FALSE, 21, '{"limit": 10}'),
  ('follow_ups',          'Seguimientos',         'Leads que requieren seguimiento pronto',   'crm',         'phone',         'FollowUpsWidget',       'medium',  FALSE, 22, '{"days_ahead": 7}'),

  -- CMS
  ('page_views',          'Vistas de página',     'Tráfico de la página web',                'cms',         'eye',           'PageViewsWidget',       'medium',  FALSE, 30, '{"period": "7d"}'),
  ('form_submissions',    'Envíos de formularios','Últimos envíos de formularios',            'cms',         'file-text',     'FormSubmissionsWidget', 'medium',  FALSE, 31, '{"limit": 10}'),

  -- Inventario General
  ('recent_sales',        'Últimas ventas',       'Las ventas más recientes',                 'ventas',      'clock',         'RecentSalesWidget',     'small',   FALSE, 4,  '{"limit": 5}'),
  ('quick_stats',         'Estadísticas rápidas', 'KPIs clave del negocio',                  'ventas',      'bar-chart-2',   'QuickStatsWidget',      'small',   TRUE,  5,  '{}'),

  -- Empresa
  ('notifications',       'Notificaciones',       'Notificaciones recientes del sistema',     'sistema',     'bell',          'NotificationsWidget',   'small',   TRUE,  50, '{"limit": 10}'),
  ('activity_log',        'Actividad reciente',   'Últimas acciones realizadas',              'sistema',     'activity',      'ActivityLogWidget',     'medium',  FALSE, 51, '{"limit": 10}')

ON CONFLICT (slug) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE H: SEED DATA — WIDGETS POR TIPO DE NEGOCIO
-- ═════════════════════════════════════════════════════════════════════════════

-- Asignar widgets a tipos de negocio existentes
INSERT INTO business_type_dashboards (business_type_id, widget_id, is_enabled, sort_order, grid_column, grid_row, grid_width, grid_height)
SELECT
  bt.id, dw.id, TRUE, dw.sort_order,
  CASE WHEN dw.category = 'ventas' THEN 1 WHEN dw.category = 'inventario' THEN 7 ELSE 1 END,
  CASE WHEN dw.sort_order < 10 THEN 1 WHEN dw.sort_order < 20 THEN 2 ELSE 3 END,
  CASE WHEN dw.default_size = 'small' THEN 3 WHEN dw.default_size = 'large' THEN 12 ELSE 6 END,
  2
FROM business_types bt
CROSS JOIN dashboard_widgets dw
WHERE bt.is_active = TRUE
  AND dw.is_active = TRUE
ON CONFLICT (business_type_id, widget_id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE I: SEED DATA — WEBHOOK EVENT TYPES
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO webhook_event_types (event_type, name, description, entity, action, category) VALUES
  ('sale.created',          'Venta creada',           'Se creó una nueva venta',            'sale', 'created', 'ventas'),
  ('sale.updated',          'Venta actualizada',      'Se actualizó una venta',             'sale', 'updated', 'ventas'),
  ('sale.status_changed',   'Estado de venta cambiado','El estado de una venta cambió',     'sale', 'status_changed', 'ventas'),
  ('client.created',        'Cliente creado',         'Se registró un nuevo cliente',       'client', 'created', 'crm'),
  ('client.updated',        'Cliente actualizado',    'Se actualizó información de cliente', 'client', 'updated', 'crm'),
  ('lead.created',          'Lead creado',            'Se generó un nuevo lead/prospecto',  'lead', 'created', 'crm'),
  ('lead.stage_changed',    'Etapa de lead cambiada', 'Un lead pasó a nueva etapa',         'lead', 'stage_changed', 'crm'),
  ('lead.converted',        'Lead convertido',        'Un lead se convirtió en cliente',    'lead', 'converted', 'crm'),
  ('form.submitted',        'Formulario enviado',     'Se recibió un envío de formulario',  'form_submission', 'created', 'cms'),
  ('product.low_stock',     'Stock bajo',             'Un producto está por debajo del mínimo', 'product', 'low_stock', 'inventario'),
  ('invoice.created',       'Factura creada',         'Se emitió una nueva factura',        'invoice', 'created', 'facturacion'),
  ('invoice.paid',          'Factura pagada',         'Se confirmó pago de factura',        'invoice', 'status_changed', 'facturacion'),
  ('purchase.received',     'Compra recibida',        'Se recibió una orden de compra',     'purchase', 'status_changed', 'compras'),
  ('form.submitted.lead',   'Lead desde formulario',  'Formulario tipo lead enviado',       'form_submission', 'created', 'crm')
ON CONFLICT (event_type) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE J: SEED DATA — INTEGRACIONES DISPONIBLES
-- ═════════════════════════════════════════════════════════════════════════════

INSERT INTO integration_catalog (slug, name, description, category, auth_type, config_schema) VALUES
  ('stripe',          'Stripe',           'Pasarela de pagos con tarjeta',       'payment',  'api_key', '{"api_key": {"type": "string", "required": true}, "webhook_secret": {"type": "string"}}'),
  ('paypal',          'PayPal',           'Pagos PayPal',                        'payment',  'oauth2',  '{"client_id": {"type": "string"}, "client_secret": {"type": "string"}}'),
  ('google_analytics','Google Analytics', 'Seguimiento de tráfico web',          'analytics','api_key', '{"tracking_id": {"type": "string", "required": true}}'),
  ('meta_pixel',      'Meta Pixel',       'Seguimiento de conversiones Facebook/Instagram', 'analytics', 'api_key', '{"pixel_id": {"type": "string", "required": true}}'),
  ('mailchimp',       'Mailchimp',        'Email marketing y newsletters',       'email',    'api_key', '{"api_key": {"type": "string", "required": true}}'),
  ('sendgrid',        'SendGrid',         'Envío de emails transaccionales',      'email',    'api_key', '{"api_key": {"type": "string", "required": true}}'),
  ('google_maps',     'Google Maps',      'Mapas y geolocalización',             'utility',  'api_key', '{"api_key": {"type": "string", "required": true}}'),
  ('cloudflare',      'Cloudflare',       'CDN y protección DDoS',               'hosting',  'api_key', '{"api_token": {"type": "string", "required": true}}'),
  ('supabase',        'Supabase',         'Base de datos y autenticación',       'database', 'bearer', '{"url": {"type": "string"}, "anon_key": {"type": "string"}}')
ON CONFLICT (slug) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- PARTE K: ASIGNAR PERMISSIOS A ROLES EXISTENTES
-- ═════════════════════════════════════════════════════════════════════════════

-- Rol: ADMIN_EMPRESA — Todos los permisos de empresa
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, TRUE
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN_EMPRESA'
  AND p.is_system = TRUE
  AND p.resource NOT IN ('companies')  -- No puede modificar empresa desde aquí
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- Rol: EMPLEADO — Permisos básicos de operación
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, TRUE
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'EMPLEADO'
  AND p.code IN (
    'products.read', 'categories.read', 'inventory.read',
    'sales.create', 'sales.read', 'clients.read', 'clients.create',
    'invoices.read', 'invoices.create'
  )
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

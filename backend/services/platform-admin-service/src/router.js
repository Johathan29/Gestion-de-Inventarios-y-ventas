// ============================================================
// Platform Admin Router — Global admin endpoints
// ============================================================

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

/**
 * Create the platform admin router.
 * All endpoints call Supabase RPC functions (defined in migration 049).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} logger
 */
export function createPlatformAdminRouter(supabase, logger) {
  const router = Router();

  // ----------------------------------------------------------------
  // Helper: create authed supabase client from Bearer token
  // ----------------------------------------------------------------
  function authedSupabase(req) {
    // IMPORTANTE: NO pasar el JWT de la app como Authorization a PostgREST.
    // Los JWTs de negocio están firmados con el secreto de la app, no con
    // PGRST_JWT_SECRET, y PostgREST los rechaza ("No suitable key or wrong key type").
    // Se usa la service role key; las RPC de plataforma validan además el rol
    // vía get_current_user_role() (ver migración 057: service_role = platform_admin).
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    return createClient(
      process.env.SUPABASE_URL,
      serviceKey,
      { global: { headers: { Authorization: `Bearer ${serviceKey}` } } }
    );
  }

  // ----------------------------------------------------------------
  // PLATFORM STATS
  // ----------------------------------------------------------------
  router.get('/stats', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.rpc('get_platform_stats');
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Platform stats error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // COMPANIES — List all with search/filter
  // ----------------------------------------------------------------
  router.get('/companies', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { search, status, limit = 50, offset = 0 } = req.query;
      const { data, error } = await client.rpc('get_all_companies', {
        p_search: search || null,
        p_status: status || null,
        p_limit: parseInt(limit),
        p_offset: parseInt(offset),
      });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Companies list error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // COMPANIES — Get details
  // ----------------------------------------------------------------
  router.get('/companies/:id', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.rpc('get_company_details', {
        p_company_id: req.params.id,
      });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Company details error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // IMPERSONATION — Create support session
  // ----------------------------------------------------------------
  router.post('/impersonate', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { company_id, reason } = req.body;
      if (!company_id) return res.status(400).json({ success: false, error: 'company_id required' });

      const { data, error } = await client.rpc('create_support_session', {
        p_target_company_id: company_id,
        p_reason: reason || 'Platform admin support',
      });
      if (error) throw error;

      logger.info(`Impersonation started: admin=${req.user?.id} → company=${company_id}`);
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Impersonation error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // IMPERSONATION — End support session
  // ----------------------------------------------------------------
  router.post('/impersonate/:sessionId/end', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.rpc('end_support_session', {
        p_session_id: req.params.sessionId,
      });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('End impersonation error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // IMPERSONATION LOGS
  // ----------------------------------------------------------------
  router.get('/impersonation-logs', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { limit = 100, offset = 0, company_id } = req.query;

      let query = client.from('impersonation_logs')
        .select('*, support_sessions!inner(target_company_id, reason), users!impersonation_logs_admin_user_id_fkey(name, email)')
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (company_id) {
        query = query.eq('target_company_id', company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Impersonation logs error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // SUPPORT SESSIONS — Active
  // ----------------------------------------------------------------
  router.get('/sessions', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('support_sessions')
        .select('*, companies!support_sessions_target_company_id_fkey(name), users!support_sessions_admin_user_id_fkey(name, email)')
        .eq('is_active', true)
        .order('started_at', { ascending: false });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Sessions error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // USERS — Global search across all companies
  // ----------------------------------------------------------------
  router.get('/users', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { search, company_id, role, limit = 50, offset = 0 } = req.query;

      let query = client.from('users')
        .select('id, name, email, phone, is_active, role_id, company_id, created_at, last_login, roles!users_role_id_fkey(name), companies!users_company_id_fkey(name)',
          { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      if (company_id) query = query.eq('company_id', company_id);
      if (role) query = query.eq('roles.name', role);

      const { data, error, count } = await query;
      if (error) throw error;
      res.json({ success: true, data, pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (err) {
      logger.error('Global users error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // USERS — Toggle active status
  // ----------------------------------------------------------------
  router.put('/users/:id/toggle-active', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data: user, error: fetchErr } = await client.from('users').select('id, is_active').eq('id', req.params.id).single();
      if (fetchErr) throw fetchErr;

      const { data, error } = await client.from('users')
        .update({ is_active: !user.is_active, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select('id, name, email, is_active')
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Toggle user active error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // DASHBOARD CONFIG — Update company dashboard widgets
  // ----------------------------------------------------------------
  router.put('/companies/:id/dashboard-config', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.rpc('update_company_dashboard_config', {
        p_company_id: req.params.id,
        p_config: req.body.config,
      });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Dashboard config error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // COMPANY DASHBOARD WIDGETS — CRUD
  // ----------------------------------------------------------------
  router.get('/companies/:id/widgets', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('company_dashboard_widgets')
        .select('*, dashboard_widgets!company_dashboard_widgets_widget_id_fkey(*)')
        .eq('company_id', req.params.id)
        .order('sort_order');
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Company widgets error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/companies/:id/widgets', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('company_dashboard_widgets')
        .insert({ company_id: req.params.id, ...req.body })
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Add widget error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.put('/companies/:id/widgets/:widgetId', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('company_dashboard_widgets')
        .update(req.body)
        .eq('id', req.params.widgetId)
        .eq('company_id', req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Update widget error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.delete('/companies/:id/widgets/:widgetId', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { error } = await client.from('company_dashboard_widgets')
        .delete()
        .eq('id', req.params.widgetId)
        .eq('company_id', req.params.id);
      if (error) throw error;
      res.json({ success: true, message: 'Widget removed' });
    } catch (err) {
      logger.error('Delete widget error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // WIDGETS CATALOG — Available widgets
  // ----------------------------------------------------------------
  router.get('/widgets', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('dashboard_widgets')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      logger.error('Widgets catalog error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // BUSINESS TYPES
  // ----------------------------------------------------------------
  router.get('/business-types', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('business_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // SaaS PLANS
  // ----------------------------------------------------------------
  router.get('/plans', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('saas_plans')
        .select('*')
        .eq('is_active', true)
        .order('tier');
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // COMPANY SUBSCRIPTIONS — Manage
  // ----------------------------------------------------------------
  router.get('/companies/:id/subscription', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('company_subscriptions')
        .select('*, saas_plans!company_subscriptions_plan_id_fkey(*)')
        .eq('company_id', req.params.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // ACTIVITY LOG — Record actions
  // ----------------------------------------------------------------
  router.post('/activity', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { company_id, activity_type, description, entity_type, entity_id, metadata } = req.body;
      const { data, error } = await client.rpc('record_company_activity', {
        p_company_id: company_id,
        p_type: activity_type,
        p_desc: description,
        p_entity_type: entity_type || null,
        p_entity_id: entity_id || null,
        p_metadata: metadata || {},
      });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/companies/:id/activity', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { limit = 50 } = req.query;
      const { data, error } = await client.from('company_activity_log')
        .select('*, users!company_activity_log_user_id_fkey(name, email)')
        .eq('company_id', req.params.id)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // COMPANY CREATION — Onboarding flow
  // ----------------------------------------------------------------
  router.post('/companies', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const {
        name, slug, ruc, commercial_name, phone, email,
        business_type_id, business_type_name,
        website, fiscal_address,
        subscription_plan_id,
        logo_url, settings,
        // Admin user to create
        admin_name, admin_email, admin_password,
      } = req.body;

      // 1. Create company
      const { data: company, error: compErr } = await client.from('companies')
        .insert({
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          ruc: ruc || '',
          commercial_name: commercial_name || name,
          phone: phone || '',
          email: email || '',
          fiscal_address: fiscal_address || '',
          website: website || '',
          logo_url: logo_url || '',
          business_type_id: business_type_id || null,
          subscription_status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          settings: settings || {},
          dashboard_config: {
            layout: 'default',
            widgets: [
              { type: 'kpi', title: 'Ventas del Mes', visible: true },
              { type: 'kpi', title: 'Clientes Activos', visible: true },
              { type: 'chart', title: 'Gráfico de Ventas', visible: true },
              { type: 'list', title: 'Últimos Pedidos', visible: true },
            ],
          },
        })
        .select()
        .single();
      if (compErr) throw compErr;

      // 2. Create admin user for the company
      let adminUser = null;
      if (admin_email) {
        // Use Supabase Auth to create the user
        const { data: authUser, error: authErr } = await client.auth.admin.createUser({
          email: admin_email,
          password: admin_password || 'Admin123!',
          email_confirm: true,
          user_metadata: { name: admin_name || 'Admin', company_id: company.id },
        });
        if (authErr) {
          logger.warn('Admin user creation failed (may already exist):', authErr.message);
        } else {
          // Insert into users table
          const { data: u, error: userErr } = await client.from('users')
            .insert({
              id: authUser.user.id,
              name: admin_name || 'Admin',
              email: admin_email,
              role_id: 1, // admin role
              company_id: company.id,
              is_active: true,
            })
            .select()
            .single();
          if (!userErr) adminUser = u;
        }
      }

      // 3. Create default business_type if name provided
      if (business_type_name && !business_type_id) {
        await client.rpc('record_company_activity', {
          p_company_id: company.id,
          p_type: 'company_created',
          p_desc: `Empresa "${name}" creada. Tipo de negocio: ${business_type_name}`,
          p_entity_type: 'company',
          p_entity_id: company.id,
          p_metadata: { created_by: req.user?.id },
        });
      } else {
        await client.rpc('record_company_activity', {
          p_company_id: company.id,
          p_type: 'company_created',
          p_desc: `Empresa "${name}" creada`,
          p_entity_type: 'company',
          p_entity_id: company.id,
          p_metadata: { created_by: req.user?.id },
        });
      }

      // 4. If subscription plan specified, create subscription
      if (subscription_plan_id) {
        const { data: plan } = await client.from('saas_plans')
          .select('*')
          .eq('id', subscription_plan_id)
          .single();
        if (plan) {
          await client.from('company_subscriptions').insert({
            company_id: company.id,
            plan_id: subscription_plan_id,
            status: 'trial',
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      }

      res.status(201).json({ success: true, data: { company, adminUser } });
    } catch (err) {
      logger.error('Company creation error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // COMPANY UPDATE — Edit settings, subscription, dashboard
  // ----------------------------------------------------------------
  router.put('/companies/:id', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const updates = {};
      const allowed = ['name', 'slug', 'ruc', 'commercial_name', 'phone', 'email', 'website',
        'fiscal_address', 'logo_url', 'business_type_id', 'subscription_status',
        'is_active', 'settings', 'dashboard_config', 'trial_ends_at', 'grace_period_ends_at'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      updates.updated_at = new Date().toISOString();

      const { data, error } = await client.from('companies')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) throw error;

      await client.rpc('record_company_activity', {
        p_company_id: req.params.id,
        p_type: 'company_updated',
        p_desc: `Empresa actualizada: ${Object.keys(updates).filter(k => k !== 'updated_at').join(', ')}`,
        p_entity_type: 'company',
        p_entity_id: req.params.id,
        p_metadata: { fields_updated: Object.keys(updates).filter(k => k !== 'updated_at') },
      });

      res.json({ success: true, data });
    } catch (err) {
      logger.error('Company update error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------------------
  // COMPANY STATUS — Toggle active/suspended
  // ----------------------------------------------------------------
  router.put('/companies/:id/toggle-active', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { is_active } = req.body;
      const { data, error } = await client.from('companies')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) throw error;

      await client.rpc('record_company_activity', {
        p_company_id: req.params.id,
        p_type: is_active ? 'company_activated' : 'company_deactivated',
        p_desc: is_active ? 'Empresa reactivada' : 'Empresa desactivada',
        p_entity_type: 'company',
        p_entity_id: req.params.id,
        p_metadata: {},
      });

      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ================================================================
  // RBAC — Custom Roles & Permissions
  // ================================================================

  // List custom roles for a company
  router.get('/companies/:id/roles', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('custom_roles')
        .select('*, permissions:custom_role_permissions(*, permission:permissions(id, name, module, action))')
        .eq('company_id', req.params.id)
        .order('name');
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Create custom role for a company
  router.post('/companies/:id/roles', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { name, description, color, permission_ids } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Role name is required' });

      const { data: role, error } = await client.from('custom_roles').insert({
        company_id: req.params.id, name, description: description || null,
        color: color || '#6366f1', is_active: true, created_by: req.user?.id
      }).select().single();
      if (error) throw error;

      // Link permissions
      if (permission_ids?.length) {
        const links = permission_ids.map(pid => ({ role_id: role.id, permission_id: pid }));
        await client.from('custom_role_permissions').insert(links);
      }

      res.status(201).json({ success: true, data: role });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Update custom role
  router.put('/companies/:id/roles/:roleId', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const allowed = ['name', 'description', 'color', 'is_active'];
      const payload = {};
      for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
      payload.updated_at = new Date().toISOString();

      const { data, error } = await client.from('custom_roles')
        .update(payload).eq('id', req.params.roleId).eq('company_id', req.params.id).select().single();
      if (error || !data) return res.status(404).json({ success: false, error: 'Role not found' });

      // Update permissions if provided
      if (req.body.permission_ids) {
        await client.from('custom_role_permissions').delete().eq('role_id', data.id);
        if (req.body.permission_ids.length) {
          const links = req.body.permission_ids.map(pid => ({ role_id: data.id, permission_id: pid }));
          await client.from('custom_role_permissions').insert(links);
        }
      }

      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Delete custom role
  router.delete('/companies/:id/roles/:roleId', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('custom_roles')
        .delete().eq('id', req.params.roleId).eq('company_id', req.params.id).select().single();
      if (error || !data) return res.status(404).json({ success: false, error: 'Role not found' });
      res.json({ success: true, data: null, message: 'Role deleted' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // List all available permissions (system-wide)
  router.get('/permissions', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { module } = req.query;
      let query = client.from('permissions').select('*').order('module').order('action');
      if (module) query = query.eq('module', module);
      const { data, error } = await query;
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ================================================================
  // FEATURE FLAGS
  // ================================================================

  // List all feature flags (platform-wide)
  router.get('/feature-flags', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('feature_flags').select('*').order('category').order('name');
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Create feature flag
  router.post('/feature-flags', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { name, slug, description, category, is_enabled, config, rollout_percentage } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Flag name is required' });

      const { data, error } = await client.from('feature_flags').insert({
        name, slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description: description || null, category: category || 'general',
        is_enabled: is_enabled !== false, config: config || {},
        rollout_percentage: rollout_percentage || 100,
        created_by: req.user?.id
      }).select().single();
      if (error) throw error;
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Update feature flag
  router.put('/feature-flags/:id', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const allowed = ['name', 'slug', 'description', 'category', 'is_enabled', 'config', 'rollout_percentage'];
      const payload = {};
      for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
      payload.updated_at = new Date().toISOString();

      const { data, error } = await client.from('feature_flags')
        .update(payload).eq('id', req.params.id).select().single();
      if (error || !data) return res.status(404).json({ success: false, error: 'Flag not found' });
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Toggle feature flag
  router.put('/feature-flags/:id/toggle', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data: current } = await client.from('feature_flags').select('is_enabled').eq('id', req.params.id).single();
      if (!current) return res.status(404).json({ success: false, error: 'Flag not found' });

      const { data, error } = await client.from('feature_flags')
        .update({ is_enabled: !current.is_enabled, updated_at: new Date().toISOString() })
        .eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json({ success: true, data, message: `Flag ${data.is_enabled ? 'enabled' : 'disabled'}` });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Get company features (resolved: plan + overrides)
  router.get('/companies/:id/features', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.rpc('get_company_features', { p_company_id: req.params.id });
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Override feature for a company
  router.post('/companies/:id/features', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { feature_flag_id, is_enabled } = req.body;
      if (!feature_flag_id) return res.status(400).json({ success: false, error: 'feature_flag_id is required' });

      const { data: existing } = await client.from('company_features')
        .select('id').eq('company_id', req.params.id).eq('feature_flag_id', feature_flag_id).single();

      let result;
      if (existing) {
        const { data, error } = await client.from('company_features')
          .update({ is_enabled, override_reason: req.body.override_reason || null, updated_at: new Date().toISOString() })
          .eq('id', existing.id).select().single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await client.from('company_features')
          .insert({ company_id: req.params.id, feature_flag_id, is_enabled, override_reason: req.body.override_reason || null, created_by: req.user?.id })
          .select().single();
        if (error) throw error;
        result = data;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ================================================================
  // SUBSCRIPTION & BILLING — Plan Management
  // ================================================================

  // Create plan
  router.post('/plans', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { name, slug, description, price_monthly, price_yearly, max_users, max_products, max_storage_mb, max_api_calls, features, is_active } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Plan name is required' });

      const { data, error } = await client.from('saas_plans').insert({
        name, slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description: description || null,
        price_monthly: price_monthly || 0, price_yearly: price_yearly || 0,
        max_users: max_users || 5, max_products: max_products || 100,
        max_storage_mb: max_storage_mb || 500, max_api_calls: max_api_calls || 10000,
        features: features || [], is_active: is_active !== false,
        created_by: req.user?.id
      }).select().single();
      if (error) throw error;
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Update plan
  router.put('/plans/:id', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const allowed = ['name', 'slug', 'description', 'price_monthly', 'price_yearly', 'max_users', 'max_products', 'max_storage_mb', 'max_api_calls', 'features', 'is_active'];
      const payload = {};
      for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
      payload.updated_at = new Date().toISOString();

      const { data, error } = await client.from('saas_plans')
        .update(payload).eq('id', req.params.id).select().single();
      if (error || !data) return res.status(404).json({ success: false, error: 'Plan not found' });
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Assign/update subscription for a company
  router.post('/companies/:id/subscription', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { plan_id, status, billing_cycle, starts_at, ends_at } = req.body;
      if (!plan_id) return res.status(400).json({ success: false, error: 'plan_id is required' });

      const { data: existing } = await client.from('company_subscriptions')
        .select('id').eq('company_id', req.params.id).eq('status', 'active').single();

      let result;
      if (existing) {
        // Deactivate old subscription
        await client.from('company_subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', existing.id);
      }

      const { data, error } = await client.from('company_subscriptions').insert({
        company_id: req.params.id, plan_id,
        status: status || 'active',
        billing_cycle: billing_cycle || 'monthly',
        starts_at: starts_at || new Date().toISOString(),
        ends_at: ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: req.user?.id
      }).select().single();
      if (error) throw error;

      // Update company subscription_status
      await client.from('companies').update({ subscription_status: 'active', updated_at: new Date().toISOString() }).eq('id', req.params.id);

      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Usage metrics for a company
  router.get('/companies/:id/usage', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { data, error } = await client.from('usage_metrics')
        .select('*').eq('company_id', req.params.id)
        .order('period_start', { ascending: false }).limit(12);
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Audit logs for a company
  router.get('/companies/:id/audit-logs', async (req, res) => {
    try {
      const client = authedSupabase(req);
      const { page = 1, limit = 50, action } = req.query;
      const offset = (Math.max(1, page) - 1) * Math.min(100, limit);

      let query = client.from('company_audit_logs')
        .select('*, users!company_audit_logs_user_id_fkey(name, email)', { count: 'exact' })
        .eq('company_id', req.params.id);
      if (action) query = query.eq('action', action);
      query = query.order('created_at', { ascending: false }).range(offset, offset + Math.min(100, limit) - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      res.json({ success: true, data: data || [], pagination: { page: +page, limit: +limit, total: count || 0 } });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
}

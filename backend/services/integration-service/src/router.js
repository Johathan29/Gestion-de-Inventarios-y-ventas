import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  listWebhooks, getWebhook, createWebhook, updateWebhook, deleteWebhook, testWebhook, webhookLogs,
  listAutomations, getAutomation, createAutomation, updateAutomation, deleteAutomation, automationLogs, testAutomation, toggleAutomation,
  listEventTypes
} from './controllers/integration.controller.js';

function authedSupabase(req) {
  // IMPORTANTE: NO pasar el JWT de la app como Authorization a PostgREST.
  // Los JWTs de negocio están firmados con el secreto de la app, no con
  // PGRST_JWT_SECRET, y PostgREST los rechaza ("No suitable key or wrong key type").
  // Se usa la service role key (RLS bypass) para operar sobre datos multi-tenant.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  return createClient(process.env.SUPABASE_URL, serviceKey,
    { global: { headers: { Authorization: `Bearer ${serviceKey}` } }, auth: { autoRefreshToken: false, persistSession: false } });
}

function requireAuth(req, res, next) {
  req.sb = authedSupabase(req);
  if (!req.sb) return res.status(401).json({ success: false, error: 'Authentication required' });
  try {
    const jwt = req.headers.authorization?.slice(7);
    if (jwt) {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
      req.user = {
        id: payload.sub || payload.user_id || payload.id,
        email: payload.email,
        role: payload.role,
        companyId: payload.company_id || payload.companyId || null,
      };
    }
  } catch { /* ignore */ }
  next();
}

export function integrationRouter(defaultSupabase) {
  const router = Router();

  // ── EVENT TYPES (read-only) ────────────────────────────────────────
  router.get('/event-types', requireAuth, listEventTypes);

  // ── WEBHOOKS ───────────────────────────────────────────────────────
  router.get('/webhooks',            requireAuth, listWebhooks);
  router.get('/webhooks/:id',        requireAuth, getWebhook);
  router.post('/webhooks',           requireAuth, createWebhook);
  router.put('/webhooks/:id',        requireAuth, updateWebhook);
  router.delete('/webhooks/:id',     requireAuth, deleteWebhook);
  router.post('/webhooks/:id/test',  requireAuth, testWebhook);
  router.get('/webhooks/:id/logs',   requireAuth, webhookLogs);

  // ── AUTOMATIONS ────────────────────────────────────────────────────
  router.get('/automations',              requireAuth, listAutomations);
  router.get('/automations/:id',          requireAuth, getAutomation);
  router.post('/automations',             requireAuth, createAutomation);
  router.put('/automations/:id',          requireAuth, updateAutomation);
  router.delete('/automations/:id',       requireAuth, deleteAutomation);
  router.post('/automations/:id/toggle',  requireAuth, toggleAutomation);
  router.post('/automations/:id/test',    requireAuth, testAutomation);
  router.get('/automations/:id/logs',     requireAuth, automationLogs);

  return router;
}

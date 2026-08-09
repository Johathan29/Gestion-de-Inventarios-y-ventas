import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  listForms, getForm, createForm, updateForm, deleteForm, duplicateForm,
  formStats, publishForm, unpublishForm,
  listFields, updateFieldOrder, createField, updateField, deleteField,
  submitForm, listSubmissions, getSubmission, deleteSubmission, exportSubmissions,
  listWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, executeWorkflow
} from './controllers/form.controller.js';

function authedSupabase(req) {
  const token = req.headers.authorization;
  if (!token) return null;
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false }, db: { schema: 'public' } }
  );
}

function requireAuth(req, res, next) {
  req.sb = authedSupabase(req);
  if (!req.sb) return res.status(401).json({ success: false, error: 'Authentication required' });
  try {
    const jwt = req.headers.authorization?.slice(7);
    if (jwt) {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
      req.user = { id: payload.sub, email: payload.email, role: payload.role, companyId: payload.company_id };
    }
  } catch { /* ignore */ }
  next();
}

export function formBuilderRouter(defaultSupabase) {
  const router = Router();

  // ── FORMS ──────────────────────────────────────────────────────────
  // El gateway reescribe /api/v1/forms → /api/forms, por eso las rutas
  // del router son "peladas" (sin prefijo /forms).
  router.get('/',                    requireAuth, listForms);
  router.post('/',                   requireAuth, createForm);
  router.get('/workflows',           requireAuth, listWorkflows);
  router.post('/workflows',          requireAuth, createWorkflow);
  router.get('/:id',                 requireAuth, getForm);
  router.put('/:id',                 requireAuth, updateForm);
  router.delete('/:id',              requireAuth, deleteForm);
  router.post('/:id/duplicate',      requireAuth, duplicateForm);
  router.post('/:id/publish',        requireAuth, publishForm);
  router.post('/:id/unpublish',      requireAuth, unpublishForm);
  router.get('/:id/stats',           requireAuth, formStats);

  // ── FIELDS (nested under form) ─────────────────────────────────────
  router.get('/:formId/fields',            requireAuth, listFields);
  router.post('/:formId/fields',           requireAuth, createField);
  router.put('/:formId/fields/reorder',    requireAuth, updateFieldOrder);
  router.put('/:formId/fields/:id',        requireAuth, updateField);
  router.delete('/:formId/fields/:id',     requireAuth, deleteField);

  // ── SUBMISSIONS ────────────────────────────────────────────────────
  router.post('/public/:formId/submit', (req, res, next) => {
    // Public endpoint — no auth required for submissions
    req.sb = defaultSupabase;
    next();
  }, submitForm);
  router.get('/:formId/submissions',            requireAuth, listSubmissions);
  router.get('/:formId/submissions/export',     requireAuth, exportSubmissions);
  router.get('/:formId/submissions/:subId',     requireAuth, getSubmission);
  router.delete('/:formId/submissions/:subId',  requireAuth, deleteSubmission);

  // ── WORKFLOWS ──────────────────────────────────────────────────────
  router.get('/:formId/workflows',        requireAuth, listWorkflows);
  router.post('/:formId/workflows',       requireAuth, createWorkflow);
  router.put('/workflows/:id',            requireAuth, updateWorkflow);
  router.delete('/workflows/:id',         requireAuth, deleteWorkflow);
  router.post('/workflows/:id/execute',   requireAuth, executeWorkflow);

  return router;
}

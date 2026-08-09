import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  listPages, getPage, createPage, updatePage, deletePage,
  publishPage, unpublishPage, restoreVersion, listVersions,
  listSections, createSection, updateSection, deleteSection, reorderSections,
  listComponents, getComponent, createComponent, updateComponent,
  listTemplates, getTemplate, createTemplate, updateTemplate,
  previewPage, duplicateSection, duplicatePage, listPublicPages
} from './controllers/cms.controller.js';
import { authenticate } from '@inventory/shared';

// ── Helper: create Supabase client ──────────────────────────────────────
// Usa la service role key (igual que el resto de servicios). NO se inyecta
// el token JWT del app en Authorization: ese token está firmado con el
// JWT_SECRET del sistema, no con el secreto de Supabase, y PostgREST lo
// rechaza con "No suitable key or wrong key type".
function authedSupabase(req) {
  const token = req.headers.authorization;
  if (!token) return null;
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false }, db: { schema: 'public' } }
  );
}

// ── Middleware: require auth + attach supabase client ───────────────────
function requireAuth(req, res, next) {
  req.sb = authedSupabase(req);
  if (!req.sb) return res.status(401).json({ success: false, error: 'Authentication required' });

  // Extract user info from JWT (same pattern as platform-admin-service)
  try {
    const jwt = req.headers.authorization?.slice(7);
    if (jwt) {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
      req.user = { id: payload.sub, email: payload.email, role: payload.role, companyId: payload.company_id };
    }
  } catch { /* ignore */ }

  next();
}

export function cmsRouter(defaultSupabase) {
  const router = Router();

  // ════════════════════════════════════════════════════════════════════
  // PAGES
  // ════════════════════════════════════════════════════════════════════
  router.get('/pages',               requireAuth, listPages);
  router.get('/pages/:id',           requireAuth, getPage);
  router.post('/pages',              requireAuth, createPage);
  router.put('/pages/:id',           requireAuth, updatePage);
  router.delete('/pages/:id',        requireAuth, deletePage);
  router.post('/pages/:id/duplicate', requireAuth, duplicatePage);

  // Publish / unpublish / versioning
  router.post('/pages/:id/publish',       requireAuth, publishPage);
  router.post('/pages/:id/unpublish',     requireAuth, unpublishPage);
  router.get('/pages/:id/versions',       requireAuth, listVersions);
  router.post('/pages/:id/restore/:version', requireAuth, restoreVersion);
  router.post('/pages/:id/versions/:versionId/restore', requireAuth, restoreVersion);

  // ════════════════════════════════════════════════════════════════════
  // SECTIONS (nested under page)
  // ════════════════════════════════════════════════════════════════════
  router.get('/pages/:pageId/sections',          requireAuth, listSections);
  router.post('/pages/:pageId/sections',         requireAuth, createSection);
  router.put('/sections/:id',                    requireAuth, updateSection);
  router.delete('/sections/:id',                 requireAuth, deleteSection);
  // Aliases para compatibilidad con el frontend
  router.put('/pages/:pageId/sections/reorder', requireAuth, reorderSections);
  router.put('/pages/:pageId/sections/:id',      requireAuth, updateSection);
  router.delete('/pages/:pageId/sections/:id',   requireAuth, deleteSection);
  router.post('/sections/:id/duplicate',         requireAuth, duplicateSection);

  // ════════════════════════════════════════════════════════════════════
  // COMPONENTS (registry)
  // ════════════════════════════════════════════════════════════════════
  router.get('/components',         requireAuth, listComponents);
  router.get('/components/:id',     requireAuth, getComponent);
  router.post('/components',        requireAuth, createComponent);
  router.put('/components/:id',     requireAuth, updateComponent);

  // ════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ════════════════════════════════════════════════════════════════════
  router.get('/templates',           requireAuth, listTemplates);
  router.get('/templates/:id',       requireAuth, getTemplate);
  router.post('/templates',          requireAuth, createTemplate);
  router.put('/templates/:id',       requireAuth, updateTemplate);

  // ════════════════════════════════════════════════════════════════════
  // PUBLIC (landing) — list of published pages + slug-based preview
  // ════════════════════════════════════════════════════════════════════
  router.get('/public/pages', (req, res) => listPublicPages(req, res, defaultSupabase));
  router.get('/preview/:slug', (req, res) => previewPage(req, res, defaultSupabase));

  return router;
}

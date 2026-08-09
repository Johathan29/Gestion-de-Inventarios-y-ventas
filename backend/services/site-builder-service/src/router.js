import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  // Media
  listMedia, uploadMedia, getMedia, updateMedia, deleteMedia, listMediaFolders,
  // Themes
  listThemes, getTheme, createTheme, updateTheme, getCompanyTheme, updateCompanyTheme,
  // Branding
  getBrandSettings, updateBrandSettings,
  // Navigation
  listMenus, getMenu, createMenu, updateMenu, deleteMenu,
  listMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, reorderMenuItems,
  // Headers
  getHeader, updateHeader,
  // Footer
  getFooter, updateFooter,
  // Custom Code
  listCustomCode, createCustomCode, updateCustomCode, deleteCustomCode,
  // Redirects
  listRedirects, createRedirect, updateRedirect, deleteRedirect,
  // Storefront (public)
  getStorefrontConfig, getPublicMenus
} from './controllers/site.controller.js';

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

export function siteBuilderRouter(defaultSupabase) {
  const router = Router();

  // ── MEDIA LIBRARY ───────────────────────────────────────────────────
  router.get('/media',            requireAuth, listMedia);
  router.post('/media',           requireAuth, uploadMedia);
  router.get('/media/folders',    requireAuth, listMediaFolders);
  router.get('/media/:id',        requireAuth, getMedia);
  router.put('/media/:id',        requireAuth, updateMedia);
  router.delete('/media/:id',     requireAuth, deleteMedia);

  // ── THEMES ──────────────────────────────────────────────────────────
  router.get('/themes',           requireAuth, listThemes);
  router.get('/themes/:id',       requireAuth, getTheme);
  router.post('/themes',          requireAuth, createTheme);
  router.put('/themes/:id',       requireAuth, updateTheme);
  router.get('/company-theme',    requireAuth, getCompanyTheme);
  router.put('/company-theme',    requireAuth, updateCompanyTheme);

  // ── BRANDING ────────────────────────────────────────────────────────
  router.get('/brand',            requireAuth, getBrandSettings);
  router.put('/brand',            requireAuth, updateBrandSettings);

  // ── NAVIGATION MENUS ────────────────────────────────────────────────
  router.get('/menus',            requireAuth, listMenus);
  router.get('/menus/:id',        requireAuth, getMenu);
  router.post('/menus',           requireAuth, createMenu);
  router.put('/menus/:id',        requireAuth, updateMenu);
  router.delete('/menus/:id',     requireAuth, deleteMenu);
  router.get('/menus/:menuId/items',          requireAuth, listMenuItems);
  router.post('/menus/:menuId/items',         requireAuth, createMenuItem);
  router.put('/menu-items/:id',               requireAuth, updateMenuItem);
  router.delete('/menu-items/:id',            requireAuth, deleteMenuItem);
  router.put('/menus/:menuId/items/reorder',  requireAuth, reorderMenuItems);
  // Alias para compatibilidad con el frontend
  router.put('/menus/items/:id',              requireAuth, updateMenuItem);
  router.delete('/menus/items/:id',           requireAuth, deleteMenuItem);
  router.put('/menus/:menuId/reorder',        requireAuth, reorderMenuItems);

  // ── HEADERS & FOOTERS ───────────────────────────────────────────────
  router.get('/header',           requireAuth, getHeader);
  router.put('/header',           requireAuth, updateHeader);
  router.get('/footer',           requireAuth, getFooter);
  router.put('/footer',           requireAuth, updateFooter);

  // ── CUSTOM CODE ─────────────────────────────────────────────────────
  router.get('/custom-code',      requireAuth, listCustomCode);
  router.post('/custom-code',     requireAuth, createCustomCode);
  router.put('/custom-code/:id',  requireAuth, updateCustomCode);
  router.delete('/custom-code/:id', requireAuth, deleteCustomCode);

  // ── REDIRECTS ───────────────────────────────────────────────────────
  router.get('/redirects',        requireAuth, listRedirects);
  router.post('/redirects',       requireAuth, createRedirect);
  router.put('/redirects/:id',    requireAuth, updateRedirect);
  router.delete('/redirects/:id', requireAuth, deleteRedirect);

  // ── STOREFRONT (public) ─────────────────────────────────────────────
  router.get('/storefront/:slug', (req, res) => getStorefrontConfig(req, res, defaultSupabase));  router.get('/public/menus',     (req, res) => getPublicMenus(req, res, defaultSupabase));
  return router;
}

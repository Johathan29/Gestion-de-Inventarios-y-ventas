// Verifica qué tablas existen en Supabase para site-builder y form-builder
import fs from 'fs';

const PAT = fs.readFileSync('temp_supabase_token.txt', 'utf8').trim();
const PROJECT = 'prspnfxfspokbqxsboby';

const tables = [
  'forms', 'form_fields', 'form_submissions', 'form_workflows', 'form_field_options',
  'themes', 'theme_settings', 'company_themes', 'menus', 'menu_items',
  'brand_settings', 'site_headers', 'site_footers', 'headers', 'footers',
  'media_assets', 'custom_code', 'redirects', 'storefront_config', 'storefronts',
  'site_settings', 'site_themes', 'page_sections', 'cms_pages'
];

const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN (${tables.map(t => `'${t}'`).join(',')}) ORDER BY table_name`;

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: sql })
});

const text = await res.text();
console.log('status:', res.status);
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); } catch { console.log(text.slice(0, 2000)); }

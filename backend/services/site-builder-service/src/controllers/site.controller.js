// ============================================================================
// Site Builder Controller — media, themes, branding, navigation, headers,
// footers, custom code, redirects, storefront config
// ============================================================================

function ok(res, data, message, status = 200) { return res.status(status).json({ success: true, data, message }); }
function fail(res, error, status = 400) { return res.status(status).json({ success: false, error }); }

// ════════════════════════════════════════════════════════════════════════
// MEDIA LIBRARY
// ════════════════════════════════════════════════════════════════════════

export async function listMedia(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);
    const { folder, type, search, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, page) - 1) * Math.min(100, limit);

    let query = sb.from('media_assets').select('*', { count: 'exact' }).eq('company_id', companyId);
    if (folder) query = query.eq('folder_path', folder);
    if (type) query = query.eq('mime_type', type);
    if (search) query = query.or(`original_name.ilike.%${search}%,alt_text.ilike.%${search}%`);
    query = query.order('created_at', { ascending: false }).range(offset, offset + Math.min(100, limit) - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [], pagination: { page: +page, limit: +limit, total: count || 0 } });
  } catch (err) { return fail(res, err.message, 500); }
}

export async function uploadMedia(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);

    const { url, original_name, file_name, mime_type, file_size, alt_text, title, description, tags, folder_path, is_public } = req.body;
    if (!url || !file_name) return fail(res, 'url and file_name are required');

    const { data, error } = await sb.from('media_assets').insert({
      company_id: companyId, url, original_name: original_name || file_name,
      file_name, mime_type: mime_type || 'application/octet-stream', file_size: file_size || 0,
      alt_text: alt_text || null, title: title || null, description: description || null,
      tags: tags || [], folder_path: folder_path || '/',
      is_public: is_public !== false, uploaded_by: req.user?.id
    }).select().single();

    if (error) throw new Error(error.message);
    return ok(res, data, 'Media uploaded', 201);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function getMedia(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('media_assets').select('*').eq('id', req.params.id).single();
    if (error || !data) return fail(res, 'Media not found', 404);
    return ok(res, data);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateMedia(req, res) {
  try {
    const sb = req.sb;
    const allowed = ['alt_text', 'title', 'description', 'tags', 'folder_path', 'is_public'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    payload.updated_at = new Date().toISOString();

    const { data, error } = await sb.from('media_assets').update(payload).eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Media not found', 404);
    return ok(res, data, 'Media updated');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function deleteMedia(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('media_assets').delete().eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Media not found', 404);
    return ok(res, null, 'Media deleted');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function listMediaFolders(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data, error } = await sb.from('media_assets')
      .select('folder_path').eq('company_id', companyId).not('folder_path', 'is', null);
    if (error) throw new Error(error.message);
    const folders = [...new Set((data || []).map(d => d.folder_path))].sort();
    return ok(res, folders);
  } catch (err) { return fail(res, err.message, 500); }
}

// ════════════════════════════════════════════════════════════════════════
// THEMES
// ════════════════════════════════════════════════════════════════════════

export async function listThemes(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data, error } = await sb.from('themes')
      .select('*').or(`company_id.eq.${companyId},company_id.is.null`).order('name');
    if (error) throw new Error(error.message);
    return ok(res, data || []);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function getTheme(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('themes').select('*').eq('id', req.params.id).single();
    if (error || !data) return fail(res, 'Theme not found', 404);
    return ok(res, data);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function createTheme(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { name, slug, description, settings } = req.body;
    if (!name) return fail(res, 'Theme name is required');

    const { data, error } = await sb.from('themes').insert({
      company_id: companyId, name, slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: description || null, settings: settings || {},
      is_active: true, created_by: req.user?.id
    }).select().single();

    if (error) throw new Error(error.message);
    return ok(res, data, 'Theme created', 201);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateTheme(req, res) {
  try {
    const sb = req.sb;
    const allowed = ['name', 'slug', 'description', 'settings', 'is_active'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    payload.updated_at = new Date().toISOString();

    const { data, error } = await sb.from('themes').update(payload).eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Theme not found', 404);
    return ok(res, data, 'Theme updated');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function getCompanyTheme(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data, error } = await sb.from('company_themes')
      .select('*, theme:themes(*)').eq('company_id', companyId).single();
    if (error || !data) return ok(res, null, 'No theme assigned');
    return ok(res, data);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateCompanyTheme(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { theme_id, overrides } = req.body;

    const { data: existing } = await sb.from('company_themes').select('id').eq('company_id', companyId).single();

    let result;
    if (existing) {
      const payload = { updated_at: new Date().toISOString() };
      if (theme_id) payload.theme_id = theme_id;
      if (overrides) payload.overrides = overrides;
      const { data, error } = await sb.from('company_themes').update(payload).eq('id', existing.id).select().single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await sb.from('company_themes').insert({
        company_id: companyId, theme_id, overrides: overrides || {},
        created_by: req.user?.id
      }).select().single();
      if (error) throw new Error(error.message);
      result = data;
    }

    return ok(res, result, 'Company theme updated');
  } catch (err) { return fail(res, err.message, 500); }
}

// ════════════════════════════════════════════════════════════════════════
// BRANDING
// ════════════════════════════════════════════════════════════════════════

export async function getBrandSettings(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data, error } = await sb.from('company_brand_settings').select('*').eq('company_id', companyId).single();
    if (error || !data) return ok(res, null, 'No brand settings');
    return ok(res, data);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateBrandSettings(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);

    const { data: existing } = await sb.from('company_brand_settings').select('id').eq('company_id', companyId).single();

    let result;
    if (existing) {
      const { data, error } = await sb.from('company_brand_settings')
        .update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await sb.from('company_brand_settings')
        .insert({ company_id: companyId, ...req.body, created_by: req.user?.id }).select().single();
      if (error) throw new Error(error.message);
      result = data;
    }
    return ok(res, result, 'Brand settings updated');
  } catch (err) { return fail(res, err.message, 500); }
}

// ════════════════════════════════════════════════════════════════════════
// NAVIGATION MENUS
// ════════════════════════════════════════════════════════════════════════

export async function listMenus(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data, error } = await sb.from('site_navigation_menus')
      .select('*, items:site_navigation_items(*)').eq('company_id', companyId).order('name');
    if (error) throw new Error(error.message);
    (data || []).forEach(m => { if (m.items) m.items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)); });
    return ok(res, data || []);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function getMenu(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('site_navigation_menus')
      .select('*, items:site_navigation_items(*)').eq('id', req.params.id).single();
    if (error || !data) return fail(res, 'Menu not found', 404);
    if (data.items) data.items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return ok(res, data);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function createMenu(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { name, slug, location } = req.body;
    if (!name) return fail(res, 'Menu name is required');

    const { data, error } = await sb.from('site_navigation_menus').insert({
      company_id: companyId, name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      location: location || 'header',
      is_active: true, created_by: req.user?.id
    }).select().single();
    if (error) throw new Error(error.message);
    return ok(res, data, 'Menu created', 201);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateMenu(req, res) {
  try {
    const sb = req.sb;
    const allowed = ['name', 'slug', 'location', 'is_active'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    payload.updated_at = new Date().toISOString();

    const { data, error } = await sb.from('site_navigation_menus').update(payload).eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Menu not found', 404);
    return ok(res, data, 'Menu updated');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function deleteMenu(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('site_navigation_menus').delete().eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Menu not found', 404);
    return ok(res, null, 'Menu deleted');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function listMenuItems(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('site_navigation_items')
      .select('*').eq('menu_id', req.params.menuId).order('sort_order');
    if (error) throw new Error(error.message);
    return ok(res, data || []);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function createMenuItem(req, res) {
  try {
    const sb = req.sb;
    const { menuId } = req.params;
    const { label, url, target, icon, is_active, sort_order, parent_id, css_classes } = req.body;
    if (!label) return fail(res, 'Label is required');

    const { data: existing } = await sb.from('site_navigation_items')
      .select('sort_order').eq('menu_id', menuId).order('sort_order', { ascending: false }).limit(1);
    const nextOrder = sort_order ?? ((existing?.[0]?.sort_order || 0) + 1);

    const { data, error } = await sb.from('site_navigation_items').insert({
      menu_id: menuId, label, url: url || '#', target: target || '_self',
      icon: icon || null, parent_id: parent_id || null,
      is_active: is_active !== false, sort_order: nextOrder,
      css_classes: css_classes || null
    }).select().single();
    if (error) throw new Error(error.message);
    return ok(res, data, 'Menu item created', 201);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateMenuItem(req, res) {
  try {
    const sb = req.sb;
    const allowed = ['label', 'url', 'target', 'icon', 'is_active', 'sort_order', 'parent_id', 'css_classes'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    payload.updated_at = new Date().toISOString();

    const { data, error } = await sb.from('site_navigation_items').update(payload).eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Menu item not found', 404);
    return ok(res, data, 'Menu item updated');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function deleteMenuItem(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('site_navigation_items').delete().eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Menu item not found', 404);
    return ok(res, null, 'Menu item deleted');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function reorderMenuItems(req, res) {
  try {
    const sb = req.sb;
    const { menuId } = req.params;
    const { item_ids } = req.body;
    if (!Array.isArray(item_ids)) return fail(res, 'item_ids must be an array');

    await Promise.all(item_ids.map((id, idx) =>
      sb.from('site_navigation_items').update({ sort_order: idx + 1 }).eq('id', id).eq('menu_id', menuId)
    ));
    const { data } = await sb.from('site_navigation_items').select('*').eq('menu_id', menuId).order('sort_order');
    return ok(res, data || [], 'Menu items reordered');
  } catch (err) { return fail(res, err.message, 500); }
}

// ════════════════════════════════════════════════════════════════════════
// HEADERS & FOOTERS
// ════════════════════════════════════════════════════════════════════════

export async function getHeader(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data, error } = await sb.from('site_headers').select('*').eq('company_id', companyId).single();
    if (error || !data) return ok(res, null, 'No header config');
    return ok(res, data);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateHeader(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const settings = req.body && typeof req.body === 'object' ? req.body : {};
    const { data: existing } = await sb.from('site_headers').select('id').eq('company_id', companyId).single();

    let result;
    if (existing) {
      const { data, error } = await sb.from('site_headers')
        .update({ settings, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await sb.from('site_headers')
        .insert({ company_id: companyId, settings, created_by: req.user?.id }).select().single();
      if (error) throw new Error(error.message);
      result = data;
    }
    return ok(res, result, 'Header updated');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function getFooter(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    // Use site_navigation_menus with location='footer' or a dedicated footer config
    const { data, error } = await sb.from('site_navigation_menus')
      .select('*, items:site_navigation_items(*)')
      .eq('company_id', companyId).eq('location', 'footer').single();
    if (error || !data) return ok(res, null, 'No footer config');
    if (data.items) data.items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return ok(res, data);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateFooter(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data: existing } = await sb.from('site_navigation_menus')
      .select('id').eq('company_id', companyId).eq('location', 'footer').single();

    let result;
    if (existing) {
      const allowed = ['name', 'location', 'is_active'];
      const settings = {};
      for (const k of allowed) if (req.body[k] !== undefined) settings[k] = req.body[k];
      const { data, error } = await sb.from('site_navigation_menus')
        .update({ ...settings, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await sb.from('site_navigation_menus').insert({
        company_id: companyId, name: req.body.name || 'Footer',
        slug: 'footer', location: 'footer', is_active: true,
        created_by: req.user?.id
      }).select().single();
      if (error) throw new Error(error.message);
      result = data;
    }
    return ok(res, result, 'Footer updated');
  } catch (err) { return fail(res, err.message, 500); }
}

// ════════════════════════════════════════════════════════════════════════
// CUSTOM CODE
// ════════════════════════════════════════════════════════════════════════

export async function listCustomCode(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data, error } = await sb.from('custom_code_blocks')
      .select('*').eq('company_id', companyId).order('name');
    if (error) throw new Error(error.message);
    return ok(res, data || []);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function createCustomCode(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { name, code_type, content, location, is_active, pages } = req.body;
    if (!name || !content) return fail(res, 'name and content are required');

    const { data, error } = await sb.from('custom_code_blocks').insert({
      company_id: companyId, name, code_type: code_type || 'html',
      content, location: location || 'body', is_active: is_active !== false,
      pages: pages || [], created_by: req.user?.id
    }).select().single();
    if (error) throw new Error(error.message);
    return ok(res, data, 'Custom code created', 201);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateCustomCode(req, res) {
  try {
    const sb = req.sb;
    const allowed = ['name', 'code_type', 'content', 'location', 'is_active', 'pages'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    payload.updated_at = new Date().toISOString();

    const { data, error } = await sb.from('custom_code_blocks').update(payload).eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Custom code not found', 404);
    return ok(res, data, 'Custom code updated');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function deleteCustomCode(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('custom_code_blocks').delete().eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Custom code not found', 404);
    return ok(res, null, 'Custom code deleted');
  } catch (err) { return fail(res, err.message, 500); }
}

// ════════════════════════════════════════════════════════════════════════
// URL REDIRECTS
// ════════════════════════════════════════════════════════════════════════

export async function listRedirects(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { data, error } = await sb.from('url_redirects')
      .select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ok(res, data || []);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function createRedirect(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const { source_path, target_url, redirect_type, is_active } = req.body;
    if (!source_path || !target_url) return fail(res, 'source_path and target_url are required');

    const { data, error } = await sb.from('url_redirects').insert({
      company_id: companyId, source_path, target_url,
      redirect_type: redirect_type || 301, is_active: is_active !== false,
      created_by: req.user?.id
    }).select().single();
    if (error) throw new Error(error.message);
    return ok(res, data, 'Redirect created', 201);
  } catch (err) { return fail(res, err.message, 500); }
}

export async function updateRedirect(req, res) {
  try {
    const sb = req.sb;
    const allowed = ['source_path', 'target_url', 'redirect_type', 'is_active'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    payload.updated_at = new Date().toISOString();

    const { data, error } = await sb.from('url_redirects').update(payload).eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Redirect not found', 404);
    return ok(res, data, 'Redirect updated');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function deleteRedirect(req, res) {
  try {
    const sb = req.sb;
    const { data, error } = await sb.from('url_redirects').delete().eq('id', req.params.id).select().single();
    if (error || !data) return fail(res, 'Redirect not found', 404);
    return ok(res, null, 'Redirect deleted');
  } catch (err) { return fail(res, err.message, 500); }
}

// ════════════════════════════════════════════════════════════════════════
// STOREFRONT CONFIG (public)
// ════════════════════════════════════════════════════════════════════════

/** GET /api/site/public/menus?company_id=X — menús activos por company (público, sin auth) */
export async function getPublicMenus(req, res, defaultSb) {
  try {
    const sb = req.sb || defaultSb;
    const { company_id } = req.query;
    if (!company_id) return fail(res, 'company_id is required', 400);

    const { data, error } = await sb.from('site_navigation_menus')
      .select('id, name, slug, location, is_active, items:site_navigation_items(id, menu_id, label, url, target, icon, is_active, sort_order, css_classes)')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('name');
    if (error) throw new Error(error.message);

    const menus = (data || []).map(m => ({
      ...m,
      items: (m.items || [])
        .filter(i => i.is_active !== false && i.sort_order !== null)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    }));
    return ok(res, menus, 'Menus fetched');
  } catch (err) { return fail(res, err.message, 500); }
}

export async function getStorefrontConfig(req, res, defaultSb) {
  try {
    const sb = req.sb || defaultSb;
    const { slug } = req.params;

    // Get company by slug
    const { data: company } = await sb.from('companies')
      .select('id, name, slug, logo_url, favicon_url, description:commercial_name, settings')
      .eq('slug', slug).eq('is_active', true).single();
    if (!company) return fail(res, 'Store not found', 404);

    // Get brand settings
    const { data: brand } = await sb.from('company_brand_settings')
      .select('*').eq('company_id', company.id).single().catch(() => ({ data: null }));

    // Get theme
    const { data: theme } = await sb.from('company_themes')
      .select('*, theme:themes(name, settings)').eq('company_id', company.id).single().catch(() => ({ data: null }));

    // Get header menu
    const { data: headerMenu } = await sb.from('site_navigation_menus')
      .select('*, items:site_navigation_items(id, label, url, target, icon, sort_order, css_classes)')
      .eq('company_id', company.id).eq('location', 'header').eq('is_active', true).single().catch(() => ({ data: null }));

    // Get footer menu
    const { data: footerMenu } = await sb.from('site_navigation_menus')
      .select('*, items:site_navigation_items(id, label, url, target, sort_order)')
      .eq('company_id', company.id).eq('location', 'footer').eq('is_active', true).single().catch(() => ({ data: null }));

    // Get active custom code
    const { data: customCode } = await sb.from('custom_code_blocks')
      .select('*').eq('company_id', company.id).eq('is_active', true).catch(() => ({ data: null }));

    return ok(res, {
      company: { name: company.name, slug: company.slug, logo: company.logo_url, favicon: company.favicon_url, description: company.description, seo: { title: company.meta_title, description: company.meta_description, keywords: company.meta_keywords, og_image: company.og_image_url } },
      brand: brand ? { colors: brand.primary_color ? { primary: brand.primary_color, secondary: brand.secondary_color, accent: brand.accent_color } : null, typography: brand.font_heading ? { heading: brand.font_heading, body: brand.font_body } : null, settings: brand } : null,
      theme: theme ? { name: theme.theme?.name, settings: theme.theme?.settings, overrides: theme.overrides } : null,
      navigation: {
        header: headerMenu ? { items: (headerMenu.items || []).filter(i => i.sort_order !== null).sort((a, b) => a.sort_order - b.sort_order) } : null,
        footer: footerMenu ? { items: (footerMenu.items || []).sort((a, b) => a.sort_order - b.sort_order) } : null
      },
      custom_code: customCode || [],
      settings: company.settings || {}
    });
  } catch (err) { return fail(res, err.message, 500); }
}

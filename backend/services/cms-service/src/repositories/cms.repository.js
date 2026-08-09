// ============================================================================
// CMS Repository — Supabase queries for pages, sections, components, templates
// ============================================================================

// ── PAGES ──────────────────────────────────────────────────────────────

export async function listPagesQuery(sb, companyId, { page, limit, offset, search, status, is_homepage }) {
  let query = sb
    .from('cms_pages')
    .select('*, sections:cms_page_sections(id, component_key, title, sort_order)', { count: 'exact' })
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }
  if (status === 'published') {
    query = query.eq('is_published', true);
  } else if (status === 'draft') {
    query = query.eq('is_published', false);
  } else if (status === 'review') {
    query = query.eq('review_status', 'in_review');
  }
  if (is_homepage !== undefined) {
    query = query.eq('is_homepage', is_homepage === 'true');
  }

  query = query.order('updated_at', { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { data: data || [], total: count || 0 };
}

// Public list of published pages (used by the landing page)
export async function listPublishedPages(sb, companyId) {
  let query = sb
    .from('cms_pages')
    .select('id, title, slug, meta_title, meta_description, updated_at')
    .eq('is_published', true)
    .is('deleted_at', null);

  if (companyId) query = query.eq('company_id', companyId);

  query = query.order('updated_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPageById(sb, id, companyId) {
  let query = sb
    .from('cms_pages')
    .select(`
      *,
      sections:cms_page_sections(
        id, component_key, title, settings, content, sort_order,
        instances:cms_component_instances(
          id, component_id, settings, content, sort_order,
          component:cms_component_registry(id, key, name, category)
        )
      ),
      published_by_user:users!cms_pages_published_by_fkey(id, name, email),
      created_by_user:users!cms_pages_created_by_fkey(id, name, email)
    `)
    .eq('id', id)
    .is('deleted_at', null);

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query.single();
  if (error) return null;

  // Sort sections by sort_order
  if (data?.sections) {
    data.sections.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    data.sections.forEach(s => {
      if (s.instances) s.instances.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });
  }

  return data;
}

export async function getPageBySlug(sb, slug, companyId) {
  let query = sb
    .from('cms_pages')
    .select(`
      *,
      sections:cms_page_sections(
        id, component_key, title, settings, content, sort_order,
        instances:cms_component_instances(
          id, component_id, settings, content, sort_order,
          component:cms_component_registry(id, key, name, category, icon)
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null);

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query.single();
  if (error) return null;

  if (data?.sections) {
    data.sections.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  return data;
}

export async function insertPage(sb, companyId, payload) {
  const { data, error } = await sb
    .from('cms_pages')
    .insert({
      company_id: companyId,
      slug: payload.slug,
      title: payload.title,
      meta_title: payload.meta_title || null,
      meta_description: payload.meta_description || null,
      meta_keywords: payload.meta_keywords || null,
      og_image_url: payload.og_image_url || null,
      template: payload.template || 'default',
      is_homepage: payload.is_homepage || false,
      settings: payload.settings || {},
      is_published: false,
      version: 1,
      created_by: payload.created_by || null,
      review_status: 'draft'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updatePageById(sb, id, companyId, updates) {
  const allowed = ['title', 'slug', 'meta_title', 'meta_description', 'meta_keywords',
                   'og_image_url', 'template', 'is_homepage', 'settings', 'review_status'];
  const payload = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) payload[key] = updates[key];
  }
  payload.updated_at = new Date().toISOString();

  let query = sb.from('cms_pages').update(payload).eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query.select().single();
  if (error) return null;
  return data;
}

export async function softDeletePage(sb, id, companyId) {
  let query = sb
    .from('cms_pages')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query.select().single();
  if (error) return null;
  return data;
}

// ── PAGE VERSIONS ──────────────────────────────────────────────────────

export async function listPageVersions(sb, pageId) {
  const { data, error } = await sb
    .from('cms_page_versions')
    .select('id, version, title, published_by, created_at')
    .eq('page_id', pageId)
    .order('version', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function insertPageVersion(sb, pageId, payload) {
  const { data, error } = await sb
    .from('cms_page_versions')
    .insert({
      page_id: pageId,
      company_id: payload.company_id,
      version: payload.version,
      title: payload.title,
      slug: payload.slug,
      content: payload.content || {},
      published_by: payload.published_by
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── SECTIONS ───────────────────────────────────────────────────────────

export async function listSectionsByPage(sb, pageId, companyId) {
  let query = sb
    .from('cms_page_sections')
    .select(`
      *,
      instances:cms_component_instances(
        id, component_id, settings, content, sort_order,
        component:cms_component_registry(id, key, name, category, icon)
      )
    `)
    .eq('page_id', pageId)
    .order('sort_order', { ascending: true });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Sort instances within each section
  (data || []).forEach(s => {
    if (s.instances) s.instances.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  });

  return data || [];
}

export async function insertSection(sb, pageId, payload) {
  // Get next sort_order
  const { data: existing } = await sb
    .from('cms_page_sections')
    .select('sort_order')
    .eq('page_id', pageId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = payload.sort_order ?? ((existing?.[0]?.sort_order || 0) + 1);

  const { data, error } = await sb
    .from('cms_page_sections')
    .insert({
      page_id: pageId,
      company_id: payload.company_id,
      component_key: payload.component_key,
      title: payload.title || null,
      settings: payload.settings || {},
      content: payload.content || {},
      sort_order: nextOrder,
      is_visible: true
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSectionById(sb, id, updates) {
  const allowed = ['title', 'settings', 'content', 'sort_order', 'is_visible', 'component_key'];
  const payload = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) payload[key] = updates[key];
  }
  payload.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from('cms_page_sections')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function deleteSectionById(sb, id) {
  const { data, error } = await sb
    .from('cms_page_sections')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data;
}

// ── COMPONENTS (Registry) ──────────────────────────────────────────────

export async function listComponentsQuery(sb, category) {
  let query = sb
    .from('cms_component_registry')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getComponentById(sb, id) {
  const { data, error } = await sb
    .from('cms_component_registry')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function insertComponent(sb, payload) {
  const { data, error } = await sb
    .from('cms_component_registry')
    .insert({
      key: payload.key,
      name: payload.name,
      description: payload.description || null,
      category: payload.category || 'custom',
      icon: payload.icon || null,
      settings_schema: payload.settings_schema || {},
      default_settings: payload.default_settings || {},
      is_active: true
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateComponentById(sb, id, updates) {
  const allowed = ['name', 'description', 'category', 'icon', 'settings_schema', 'default_settings', 'is_active'];
  const payload = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) payload[key] = updates[key];
  }
  payload.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from('cms_component_registry')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data;
}

// ── TEMPLATES ──────────────────────────────────────────────────────────

export async function listTemplatesQuery(sb, companyId) {
  const { data, error } = await sb
    .from('cms_page_templates')
    .select('*')
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getTemplateById(sb, id) {
  const { data, error } = await sb
    .from('cms_page_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function insertTemplate(sb, companyId, payload) {
  const { data, error } = await sb
    .from('cms_page_templates')
    .insert({
      company_id: companyId,
      name: payload.name,
      description: payload.description || null,
      layout: payload.layout || [],
      thumbnail_url: payload.thumbnail_url || null,
      is_default: payload.is_default || false,
      is_active: true,
      created_by: payload.created_by || null
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTemplateById(sb, id, companyId, updates) {
  const allowed = ['name', 'description', 'layout', 'thumbnail_url', 'is_default', 'is_active'];
  const payload = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) payload[key] = updates[key];
  }
  payload.updated_at = new Date().toISOString();

  const { data, error } = await sb
    .from('cms_page_templates')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data;
}

// ── VIEWS ──────────────────────────────────────────────────────────────

export async function incrementPageViews(sb, pageId) {
  // Use a raw increment approach
  await sb.rpc('increment_page_views', { page_id_param: pageId }).catch(() => {
    // Fallback: just increment the column
    sb.from('cms_pages').select('view_count').eq('id', pageId).single().then(({ data }) => {
      if (data) {
        sb.from('cms_pages').update({ view_count: (data.view_count || 0) + 1 }).eq('id', pageId);
      }
    }).catch(() => {});
  });
}

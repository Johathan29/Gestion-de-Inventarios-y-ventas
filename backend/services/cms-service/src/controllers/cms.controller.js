import {
  listPagesQuery, listPublishedPages, getPageById, insertPage, updatePageById, softDeletePage,
  listPageVersions, insertPageVersion,
  listSectionsByPage, insertSection, updateSectionById, deleteSectionById,
  listComponentsQuery, getComponentById, insertComponent, updateComponentById,
  listTemplatesQuery, getTemplateById, insertTemplate, updateTemplateById,
  getPageBySlug, incrementPageViews
} from '../repositories/cms.repository.js';

// ════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════
function ok(res, data, message, status = 200) {
  return res.status(status).json({ success: true, data, message });
}
function fail(res, error, status = 400) {
  return res.status(status).json({ success: false, error });
}
function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// ════════════════════════════════════════════════════════════════════════
// PAGES
// ════════════════════════════════════════════════════════════════════════

/** GET /cms/pages — list pages for the authenticated company */
export async function listPages(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);

    const { page, limit, offset } = paginate(req);
    const { search, status, is_homepage } = req.query;

    const result = await listPagesQuery(sb, companyId, { page, limit, offset, search, status, is_homepage });
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }
    });
  } catch (err) {
    console.error('[CMS] listPages:', err.message);
    return fail(res, err.message, 500);
  }
}

/** GET /cms/pages/:id — get page with sections and component instances */
export async function getPage(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const page = await getPageById(sb, id, companyId);
    if (!page) return fail(res, 'Page not found', 404);
    return ok(res, page);
  } catch (err) {
    console.error('[CMS] getPage:', err.message);
    return fail(res, err.message, 500);
  }
}

/** POST /cms/pages — create a new page */
export async function createPage(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);

    const { slug, title, meta_title, meta_description, meta_keywords, og_image_url,
            template, is_homepage, settings } = req.body;

    if (!title) return fail(res, 'Title is required');
    if (!slug && !title) return fail(res, 'Slug or title is required');

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const page = await insertPage(sb, companyId, {
      slug: finalSlug, title, meta_title, meta_description, meta_keywords,
      og_image_url, template: template || 'default', is_homepage: is_homepage || false,
      settings: settings || {}, created_by: req.user?.id
    });

    return ok(res, page, 'Page created', 201);
  } catch (err) {
    console.error('[CMS] createPage:', err.message);
    if (err.message?.includes('duplicate')) return fail(res, 'A page with this slug already exists', 409);
    return fail(res, err.message, 500);
  }
}

/** PUT /cms/pages/:id — update page metadata */
export async function updatePage(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const updates = req.body;
    const page = await updatePageById(sb, id, companyId, updates);
    if (!page) return fail(res, 'Page not found or access denied', 404);
    return ok(res, page, 'Page updated');
  } catch (err) {
    console.error('[CMS] updatePage:', err.message);
    return fail(res, err.message, 500);
  }
}

/** DELETE /cms/pages/:id — soft-delete a page */
export async function deletePage(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const deleted = await softDeletePage(sb, id, companyId);
    if (!deleted) return fail(res, 'Page not found', 404);
    return ok(res, null, 'Page deleted');
  } catch (err) {
    console.error('[CMS] deletePage:', err.message);
    return fail(res, err.message, 500);
  }
}

/** POST /cms/pages/:id/duplicate — duplicate a page with its sections */
export async function duplicatePage(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const original = await getPageById(sb, id, companyId);
    if (!original) return fail(res, 'Page not found', 404);

    const newSlug = `${original.slug}-copy-${Date.now()}`;
    const newPage = await insertPage(sb, companyId, {
      slug: newSlug,
      title: `${original.title} (Copy)`,
      meta_title: original.meta_title,
      meta_description: original.meta_description,
      template: original.template,
      settings: original.settings,
      created_by: req.user?.id
    });

    // Duplicate sections
    if (original.sections?.length) {
      for (const sec of original.sections) {
        await insertSection(sb, newPage.id, {
          company_id: companyId,
          component_key: sec.component_key,
          title: sec.title,
          settings: sec.settings,
          content: sec.content,
          sort_order: sec.sort_order
        });
      }
    }

    return ok(res, newPage, 'Page duplicated', 201);
  } catch (err) {
    console.error('[CMS] duplicatePage:', err.message);
    return fail(res, err.message, 500);
  }
}

// ── Publish / Unpublish / Versions ────────────────────────────────────

/** POST /cms/pages/:id/publish — publish page, create version snapshot */
export async function publishPage(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const page = await getPageById(sb, id, companyId);
    if (!page) return fail(res, 'Page not found', 404);

    // Create version snapshot before publishing
    await insertPageVersion(sb, id, {
      company_id: companyId,
      version: page.version || 1,
      title: page.title,
      slug: page.slug,
      content: page,
      published_by: req.user?.id
    });

    // Publish
    const { data, error } = await sb
      .from('cms_pages')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
        published_by: req.user?.id,
        version: (page.version || 1) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return ok(res, data, 'Page published');
  } catch (err) {
    console.error('[CMS] publishPage:', err.message);
    return fail(res, err.message, 500);
  }
}

/** POST /cms/pages/:id/unpublish — unpublish page */
export async function unpublishPage(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const { data, error } = await sb
      .from('cms_pages')
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) return fail(res, 'Page not found', 404);
    return ok(res, data, 'Page unpublished');
  } catch (err) {
    console.error('[CMS] unpublishPage:', err.message);
    return fail(res, err.message, 500);
  }
}

/** GET /cms/pages/:id/versions — list page version history */
export async function listVersions(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const versions = await listPageVersions(sb, id);
    return ok(res, versions);
  } catch (err) {
    console.error('[CMS] listVersions:', err.message);
    return fail(res, err.message, 500);
  }
}

/** POST /cms/pages/:id/restore/:version — restore page to a previous version */
export async function restoreVersion(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const version = req.params.version || req.params.versionId;
    const companyId = req.user?.companyId;

    // Find the version snapshot
    const { data: ver, error: verErr } = await sb
      .from('cms_page_versions')
      .select('*')
      .eq('page_id', id)
      .eq('version', parseInt(version))
      .single();

    if (verErr || !ver) return fail(res, 'Version not found', 404);

    // Restore fields from snapshot
    const snapshot = ver.content || {};
    const updates = {
      title: snapshot.title || ver.title,
      meta_title: snapshot.meta_title,
      meta_description: snapshot.meta_description,
      meta_keywords: snapshot.meta_keywords,
      og_image_url: snapshot.og_image_url,
      template: snapshot.template,
      settings: snapshot.settings || {},
      version: (ver.version || 1) + 1,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await sb
      .from('cms_pages')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return ok(res, data, `Restored to version ${version}`);
  } catch (err) {
    console.error('[CMS] restoreVersion:', err.message);
    return fail(res, err.message, 500);
  }
}

// ════════════════════════════════════════════════════════════════════════
// SECTIONS
// ════════════════════════════════════════════════════════════════════════

/** GET /cms/pages/:pageId/sections — list sections for a page */
export async function listSections(req, res) {
  try {
    const sb = req.sb;
    const { pageId } = req.params;
    const companyId = req.user?.companyId;
    const sections = await listSectionsByPage(sb, pageId, companyId);
    return ok(res, sections);
  } catch (err) {
    console.error('[CMS] listSections:', err.message);
    return fail(res, err.message, 500);
  }
}

/** POST /cms/pages/:pageId/sections — add a section to a page */
export async function createSection(req, res) {
  try {
    const sb = req.sb;
    const { pageId } = req.params;
    const companyId = req.user?.companyId;

    const { component_key, title, settings, content, sort_order } = req.body;
    if (!component_key) return fail(res, 'component_key is required');

    // Verify page belongs to company
    const page = await getPageById(sb, pageId, companyId);
    if (!page) return fail(res, 'Page not found or access denied', 404);

    const section = await insertSection(sb, pageId, {
      company_id: companyId,
      component_key, title, settings: settings || {}, content: content || {}, sort_order
    });

    return ok(res, section, 'Section added', 201);
  } catch (err) {
    console.error('[CMS] createSection:', err.message);
    return fail(res, err.message, 500);
  }
}

/** PUT /cms/sections/:id — update a section */
export async function updateSection(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const updates = req.body;

    const section = await updateSectionById(sb, id, updates);
    if (!section) return fail(res, 'Section not found', 404);
    return ok(res, section, 'Section updated');
  } catch (err) {
    console.error('[CMS] updateSection:', err.message);
    return fail(res, err.message, 500);
  }
}

/** DELETE /cms/sections/:id — delete a section */
export async function deleteSection(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const deleted = await deleteSectionById(sb, id);
    if (!deleted) return fail(res, 'Section not found', 404);
    return ok(res, null, 'Section deleted');
  } catch (err) {
    console.error('[CMS] deleteSection:', err.message);
    return fail(res, err.message, 500);
  }
}

/** PUT /cms/pages/:pageId/sections/reorder — reorder sections */
export async function reorderSections(req, res) {
  try {
    const sb = req.sb;
    const { pageId } = req.params;
    const { section_ids } = req.body; // ordered array of section IDs

    if (!Array.isArray(section_ids)) return fail(res, 'section_ids must be an array');

    // Update sort_order for each section
    const updates = section_ids.map((id, idx) =>
      sb.from('cms_page_sections').update({ sort_order: idx + 1 }).eq('id', id).eq('page_id', pageId)
    );
    await Promise.all(updates);

    const sections = await listSectionsByPage(sb, pageId, req.user?.companyId);
    return ok(res, sections, 'Sections reordered');
  } catch (err) {
    console.error('[CMS] reorderSections:', err.message);
    return fail(res, err.message, 500);
  }
}

/** POST /cms/sections/:id/duplicate — duplicate a section */
export async function duplicateSection(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;

    // Get original section
    const { data: original, error } = await sb
      .from('cms_page_sections').select('*').eq('id', id).single();

    if (error || !original) return fail(res, 'Section not found', 404);

    const newSection = await insertSection(sb, original.page_id, {
      company_id: original.company_id,
      component_key: original.component_key,
      title: `${original.title || 'Section'} (Copy)`,
      settings: original.settings,
      content: original.content,
      sort_order: (original.sort_order || 0) + 1
    });

    return ok(res, newSection, 'Section duplicated', 201);
  } catch (err) {
    console.error('[CMS] duplicateSection:', err.message);
    return fail(res, err.message, 500);
  }
}

// ════════════════════════════════════════════════════════════════════════
// COMPONENTS (Registry)
// ════════════════════════════════════════════════════════════════════════

/** GET /cms/components — list registered components */
export async function listComponents(req, res) {
  try {
    const sb = req.sb;
    const { category } = req.query;
    const components = await listComponentsQuery(sb, category);
    return ok(res, components);
  } catch (err) {
    console.error('[CMS] listComponents:', err.message);
    return fail(res, err.message, 500);
  }
}

/** GET /cms/components/:id — get component details */
export async function getComponent(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const component = await getComponentById(sb, id);
    if (!component) return fail(res, 'Component not found', 404);
    return ok(res, component);
  } catch (err) {
    console.error('[CMS] getComponent:', err.message);
    return fail(res, err.message, 500);
  }
}

/** POST /cms/components — register a new component */
export async function createComponent(req, res) {
  try {
    const sb = req.sb;
    const { key, name, description, category, icon, settings_schema, default_settings } = req.body;
    if (!key || !name) return fail(res, 'key and name are required');

    const component = await insertComponent(sb, {
      key, name, description, category, icon, settings_schema, default_settings
    });
    return ok(res, component, 'Component registered', 201);
  } catch (err) {
    console.error('[CMS] createComponent:', err.message);
    return fail(res, err.message, 500);
  }
}

/** PUT /cms/components/:id — update a component */
export async function updateComponent(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const component = await updateComponentById(sb, id, req.body);
    if (!component) return fail(res, 'Component not found', 404);
    return ok(res, component, 'Component updated');
  } catch (err) {
    console.error('[CMS] updateComponent:', err.message);
    return fail(res, err.message, 500);
  }
}

// ════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════════════════

/** GET /cms/templates — list templates */
export async function listTemplates(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    const templates = await listTemplatesQuery(sb, companyId);
    return ok(res, templates);
  } catch (err) {
    console.error('[CMS] listTemplates:', err.message);
    return fail(res, err.message, 500);
  }
}

/** GET /cms/templates/:id — get template details */
export async function getTemplate(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const template = await getTemplateById(sb, id);
    if (!template) return fail(res, 'Template not found', 404);
    return ok(res, template);
  } catch (err) {
    console.error('[CMS] getTemplate:', err.message);
    return fail(res, err.message, 500);
  }
}

/** POST /cms/templates — create a template */
export async function createTemplate(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);

    const template = await insertTemplate(sb, companyId, {
      ...req.body,
      created_by: req.user?.id
    });
    return ok(res, template, 'Template created', 201);
  } catch (err) {
    console.error('[CMS] createTemplate:', err.message);
    return fail(res, err.message, 500);
  }
}

/** PUT /cms/templates/:id — update a template */
export async function updateTemplate(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const template = await updateTemplateById(sb, id, companyId, req.body);
    if (!template) return fail(res, 'Template not found', 404);
    return ok(res, template, 'Template updated');
  } catch (err) {
    console.error('[CMS] updateTemplate:', err.message);
    return fail(res, err.message, 500);
  }
}

// ════════════════════════════════════════════════════════════════════════
// PREVIEW (public, slug-based)
// ════════════════════════════════════════════════════════════════════════

/** GET /cms/public/pages — public list of published pages (landing page) */
export async function listPublicPages(req, res, defaultSb) {
  try {
    const sb = req.sb || defaultSb;
    const companyId = req.query.company_id;
    const pages = await listPublishedPages(sb, companyId);
    return ok(res, pages);
  } catch (err) {
    console.error('[CMS] listPublicPages:', err.message);
    return fail(res, err.message, 500);
  }
}

/** GET /cms/preview/:slug — public preview of a published page */
export async function previewPage(req, res, defaultSb) {
  try {
    const sb = req.sb || defaultSb;
    const { slug } = req.params;
    const companyId = req.query.company_id;

    const page = await getPageBySlug(sb, slug, companyId);
    if (!page) return fail(res, 'Page not found', 404);

    // Increment view count (fire-and-forget)
    incrementPageViews(sb, page.id).catch(() => {});

    return ok(res, page);
  } catch (err) {
    console.error('[CMS] previewPage:', err.message);
    return fail(res, err.message, 500);
  }
}

// ============================================================================
// Form Builder Controller — forms, fields, submissions, workflows
// ============================================================================

function ok(res, data, message, status = 200) {
  return res.status(status).json({ success: true, data, message });
}
function fail(res, error, status = 400) {
  return res.status(status).json({ success: false, error });
}
function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
}
function slugify(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100) || 'field';
}

// ════════════════════════════════════════════════════════════════════════
// FORMS CRUD
// ════════════════════════════════════════════════════════════════════════

export async function listForms(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);

    const { page, limit, offset } = paginate(req);
    const { search, status, type } = req.query;

    let query = sb.from('dynamic_forms').select('*', { count: 'exact' })
      .eq('company_id', companyId).is('deleted_at', null);

    if (search) query = query.or(`title.ilike.%${search}%,name.ilike.%${search}%`);
    if (status === 'published') query = query.eq('is_published', true);
    else if (status === 'draft') query = query.eq('is_published', false);
    if (type) query = query.eq('form_type', type);

    query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    // Enrich with field count and submission count
    const enriched = await Promise.all((data || []).map(async (form) => {
      const { count: fieldCount } = await sb.from('dynamic_form_fields')
        .select('*', { count: 'exact', head: true }).eq('form_id', form.id);
      const { count: submissionCount } = await sb.from('dynamic_form_submissions')
        .select('*', { count: 'exact', head: true }).eq('form_id', form.id);
      return { ...form, field_count: fieldCount || 0, submission_count: submissionCount || 0, status: form.is_published ? 'published' : 'draft' };
    }));

    return res.json({ success: true, data: enriched, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } });
  } catch (err) {
    console.error('[FORM] listForms:', err.message);
    return fail(res, err.message, 500);
  }
}

export async function getForm(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    let query = sb.from('dynamic_forms').select(`
      *,
      fields:dynamic_form_fields(id, field_key, field_type, label, placeholder, required, options, validation_rules, default_value, settings, sort_order, is_active)
    `).eq('id', id).is('deleted_at', null);
    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query.single();
    if (error || !data) return fail(res, 'Form not found', 404);

    // Sort fields
    if (data.fields) data.fields.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return ok(res, data);
  } catch (err) {
    console.error('[FORM] getForm:', err.message);
    return fail(res, err.message, 500);
  }
}

export async function createForm(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;
    if (!companyId) return fail(res, 'Company context required', 403);

    const { title, name, description, form_type, settings, redirect_url, submit_button_text, notification_emails } = req.body;
    if (!title && !name) return fail(res, 'Title/name is required');

    const { data, error } = await sb.from('dynamic_forms').insert({
      company_id: companyId,
      title: title || name,
      name: name || title,
      description: description || null,
      form_type: form_type || 'contact',
      settings: settings || {},
      redirect_url: redirect_url || null,
      submit_button_text: submit_button_text || 'Enviar',
      notification_emails: notification_emails || [],
      is_published: false,
      created_by: req.user?.id
    }).select().single();

    if (error) throw new Error(error.message);
    return ok(res, data, 'Form created', 201);
  } catch (err) {
    console.error('[FORM] createForm:', err.message);
    return fail(res, err.message, 500);
  }
}

export async function updateForm(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const allowed = ['title', 'name', 'description', 'form_type', 'settings', 'redirect_url',
                     'submit_button_text', 'notification_emails', 'success_message', 'css_classes'];
    const payload = {};
    for (const key of allowed) { if (req.body[key] !== undefined) payload[key] = req.body[key]; }
    payload.updated_at = new Date().toISOString();

    let query = sb.from('dynamic_forms').update(payload).eq('id', id);
    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query.select().single();
    if (error || !data) return fail(res, 'Form not found', 404);
    return ok(res, data, 'Form updated');
  } catch (err) {
    console.error('[FORM] updateForm:', err.message);
    return fail(res, err.message, 500);
  }
}

export async function deleteForm(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    let query = sb.from('dynamic_forms').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query.select().single();
    if (error || !data) return fail(res, 'Form not found', 404);
    return ok(res, null, 'Form deleted');
  } catch (err) {
    console.error('[FORM] deleteForm:', err.message);
    return fail(res, err.message, 500);
  }
}

export async function duplicateForm(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    // Get original form + fields
    const { data: original } = await sb.from('dynamic_forms').select('*, fields:dynamic_form_fields(*)').eq('id', id).single();
    if (!original) return fail(res, 'Form not found', 404);

    // Create new form
    const { data: newForm, error } = await sb.from('dynamic_forms').insert({
      company_id: companyId,
      title: `${original.title} (Copy)`,
      name: `${original.name || original.title} (Copy)`,
      description: original.description,
      form_type: original.form_type,
      settings: original.settings,
      submit_button_text: original.submit_button_text,
      notification_emails: original.notification_emails,
      is_published: false,
      created_by: req.user?.id
    }).select().single();

    if (error) throw new Error(error.message);

    // Duplicate fields
    if (original.fields?.length) {
      const fields = original.fields.map(f => ({
        form_id: newForm.id,
        field_key: f.field_key,
        field_type: f.field_type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        options: f.options,
        validation_rules: f.validation_rules,
        default_value: f.default_value,
        settings: f.settings,
        sort_order: f.sort_order,
        is_active: f.is_active
      }));
      await sb.from('dynamic_form_fields').insert(fields);
    }

    return ok(res, newForm, 'Form duplicated', 201);
  } catch (err) {
    console.error('[FORM] duplicateForm:', err.message);
    return fail(res, err.message, 500);
  }
}

export async function publishForm(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    let query = sb.from('dynamic_forms').update({ is_published: true, published_at: new Date().toISOString() }).eq('id', id);
    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query.select().single();
    if (error || !data) return fail(res, 'Form not found', 404);
    return ok(res, data, 'Form published');
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function unpublishForm(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const companyId = req.user?.companyId;

    let query = sb.from('dynamic_forms').update({ is_published: false }).eq('id', id);
    if (companyId) query = query.eq('company_id', companyId);

    const { data, error } = await query.select().single();
    if (error || !data) return fail(res, 'Form not found', 404);
    return ok(res, data, 'Form unpublished');
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function formStats(req, res) {
  try {
    const sb = req.sb;
    const companyId = req.user?.companyId;

    const { count: total } = await sb.from('dynamic_forms')
      .select('*', { count: 'exact', head: true }).eq('company_id', companyId).is('deleted_at', null);
    const { count: published } = await sb.from('dynamic_forms')
      .select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_published', true);
    const { count: submissions } = await sb.from('dynamic_form_submissions')
      .select('*', { count: 'exact', head: true }).eq('company_id', companyId);

    return ok(res, { total: total || 0, published: published || 0, draft: (total || 0) - (published || 0), submissions: submissions || 0 });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

// ════════════════════════════════════════════════════════════════════════
// FIELDS
// ════════════════════════════════════════════════════════════════════════

export async function listFields(req, res) {
  try {
    const sb = req.sb;
    const { formId } = req.params;
    const { data, error } = await sb.from('dynamic_form_fields')
      .select('*').eq('form_id', formId).eq('is_active', true).order('sort_order');
    if (error) throw new Error(error.message);
    return ok(res, data || []);
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function createField(req, res) {
  try {
    const sb = req.sb;
    const { formId } = req.params;
    const { field_type, label, placeholder, options, validation_rules, default_value, settings, sort_order } = req.body;
    // El frontend envía is_required y NO envía field_key: lo generamos desde el label
    const field_key = req.body.field_key || slugify(label);
    const required = req.body.required ?? req.body.is_required ?? false;

    if (!field_type || !label) return fail(res, 'field_type and label are required');

    // Get next sort_order
    let nextOrder = parseInt(sort_order) || 0;
    if (!nextOrder) {
      const { data: existing } = await sb.from('dynamic_form_fields')
        .select('sort_order').eq('form_id', formId).order('sort_order', { ascending: false }).limit(1);
      nextOrder = (existing?.[0]?.sort_order || 0) + 1;
    }

    const { data, error } = await sb.from('dynamic_form_fields').insert({
      form_id: formId, field_key, field_type, label,
      placeholder: placeholder || null, required,
      options: options || null, validation_rules: validation_rules || {},
      default_value: default_value || null, settings: settings || {},
      sort_order: nextOrder, is_active: true
    }).select().single();

    if (error) throw new Error(error.message);
    return ok(res, data, 'Field created', 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function updateField(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const allowed = ['field_key', 'field_type', 'label', 'placeholder', 'required', 'options',
                     'validation_rules', 'default_value', 'settings', 'sort_order', 'is_active'];
    const payload = {};
    for (const key of allowed) { if (req.body[key] !== undefined) payload[key] = req.body[key]; }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await sb.from('dynamic_form_fields').update(payload).eq('id', id).select().single();
    if (error || !data) return fail(res, 'Field not found', 404);
    return ok(res, data, 'Field updated');
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function deleteField(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const { data, error } = await sb.from('dynamic_form_fields').delete().eq('id', id).select().single();
    if (error || !data) return fail(res, 'Field not found', 404);
    return ok(res, null, 'Field deleted');
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function updateFieldOrder(req, res) {
  try {
    const sb = req.sb;
    const { formId } = req.params;
    const { field_ids } = req.body;
    if (!Array.isArray(field_ids)) return fail(res, 'field_ids must be an array');

    await Promise.all(field_ids.map((id, idx) =>
      sb.from('dynamic_form_fields').update({ sort_order: idx + 1 }).eq('id', id).eq('form_id', formId)
    ));

    const { data } = await sb.from('dynamic_form_fields').select('*').eq('form_id', formId).order('sort_order');
    return ok(res, data || [], 'Fields reordered');
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

// ════════════════════════════════════════════════════════════════════════
// SUBMISSIONS
// ════════════════════════════════════════════════════════════════════════

export async function submitForm(req, res) {
  try {
    const sb = req.sb;
    const { formId } = req.params;
    const { data: form } = await sb.from('dynamic_forms').select('*, company_id').eq('id', formId).eq('is_published', true).single();
    if (!form) return fail(res, 'Form not found or not published', 404);

    const { data: fields } = await sb.from('dynamic_form_fields')
      .select('*').eq('form_id', formId).eq('is_active', true).order('sort_order');

    const { form_data, submitter_name, submitter_email, submitter_phone, source } = req.body;

    const { data, error } = await sb.from('dynamic_form_submissions').insert({
      form_id: formId,
      company_id: form.company_id,
      form_data: form_data || {},
      submitter_name: submitter_name || null,
      submitter_email: submitter_email || null,
      submitter_phone: submitter_phone || null,
      source: source || 'direct',
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null
    }).select().single();

    if (error) throw new Error(error.message);

    // Update submission count — el trigger de DB (035_trg_update_submission_count)
    // ya lo incrementa; este RPC es redundante y puede no existir en el esquema.
    try {
      await sb.rpc('increment_form_submission_count', { form_id_param: formId });
    } catch (rpcErr) {
      console.warn('[FORM] increment RPC no disponible (el trigger cubre el contador):', rpcErr?.message);
    }

    return ok(res, data, 'Submission received', 201);
  } catch (err) {
    console.error('[FORM] submitForm:', err.message);
    return fail(res, err.message, 500);
  }
}

export async function listSubmissions(req, res) {
  try {
    const sb = req.sb;
    const { formId } = req.params;
    const { page, limit, offset } = paginate(req);
    const { status, search } = req.query;

    let query = sb.from('dynamic_form_submissions')
      .select('*', { count: 'exact' }).eq('form_id', formId);
    if (status) query = query.eq('status', status);
    if (search) query = query.or(`submitter_name.ilike.%${search}%,submitter_email.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return res.json({ success: true, data: data || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function getSubmission(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const { data, error } = await sb.from('dynamic_form_submissions')
      .select('*, form:dynamic_forms(id, title, form_type)').eq('id', id).single();
    if (error || !data) return fail(res, 'Submission not found', 404);
    return ok(res, data);
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function deleteSubmission(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const { data, error } = await sb.from('dynamic_form_submissions').delete().eq('id', id).select().single();
    if (error || !data) return fail(res, 'Submission not found', 404);
    return ok(res, null, 'Submission deleted');
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function exportSubmissions(req, res) {
  try {
    const sb = req.sb;
    const { formId } = req.params;

    const { data, error } = await sb.from('dynamic_form_submissions')
      .select('*').eq('form_id', formId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    // Return as JSON (frontend can convert to CSV)
    return ok(res, data || []);
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

// ════════════════════════════════════════════════════════════════════════
// WORKFLOWS
// ════════════════════════════════════════════════════════════════════════

export async function listWorkflows(req, res) {
  try {
    const sb = req.sb;
    const { formId } = req.params;
    let query = sb.from('form_workflows').select('*').order('sort_order');
    if (formId) query = query.eq('form_id', formId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ok(res, data || []);
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function createWorkflow(req, res) {
  try {
    const sb = req.sb;
    const { formId } = req.params;
    const { name, trigger_type, conditions, actions, is_active } = req.body;

    if (!name || !trigger_type) return fail(res, 'name and trigger_type are required');

    const payload = {
      name, trigger_type,
      conditions: conditions || [],
      actions: actions || [],
      is_active: is_active !== false,
      created_by: req.user?.id
    };
    if (formId) payload.form_id = formId;

    const { data, error } = await sb.from('form_workflows').insert(payload).select().single();

    if (error) throw new Error(error.message);
    return ok(res, data, 'Workflow created', 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function updateWorkflow(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const allowed = ['name', 'trigger_type', 'conditions', 'actions', 'is_active'];
    const payload = {};
    for (const key of allowed) { if (req.body[key] !== undefined) payload[key] = req.body[key]; }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await sb.from('form_workflows').update(payload).eq('id', id).select().single();
    if (error || !data) return fail(res, 'Workflow not found', 404);
    return ok(res, data, 'Workflow updated');
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function deleteWorkflow(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;
    const { data, error } = await sb.from('form_workflows').delete().eq('id', id).select().single();
    if (error || !data) return fail(res, 'Workflow not found', 404);
    return ok(res, null, 'Workflow deleted');
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

export async function executeWorkflow(req, res) {
  try {
    const sb = req.sb;
    const { id } = req.params;

    // Get workflow
    const { data: workflow, error: wfErr } = await sb.from('form_workflows')
      .select('*').eq('id', id).single();
    if (wfErr || !workflow) return fail(res, 'Workflow not found', 404);

    // Log the execution
    const { data: log, error: logErr } = await sb.from('form_workflow_logs').insert({
      workflow_id: id,
      form_id: workflow.form_id,
      triggered_by: req.user?.id,
      trigger_data: req.body || {},
      status: 'executed'
    }).select().single();

    if (logErr) console.warn('[FORM] Failed to log workflow execution:', logErr.message);

    return ok(res, { workflow_id: id, status: 'executed', log_id: log?.id }, 'Workflow executed');
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

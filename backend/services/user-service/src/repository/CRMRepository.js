// ============================================================
// Supabase CRM Repository — Pipelines, Leads, Activities
// ============================================================

import { randomUUID } from 'crypto';
import { tenantStorage } from '@erp/shared-kernel';

function getSupabase(baseClient) {
  const store = tenantStorage.getStore();
  return store?.supabase || baseClient;
}

// ---- Pipelines ----
export class SupabasePipelineRepository {
  constructor(supabase) { this._base = supabase; }
  get _sb() { return getSupabase(this._base); }

  async findAll(companyId) {
    const { data, error } = await this._sb
      .from('crm_pipelines')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async findById(id, companyId) {
    const { data, error } = await this._sb
      .from('crm_pipelines')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    if (error) return null;
    return data;
  }

  async create(pipeline) {
    const slug =
      pipeline.slug ||
      String(pipeline.name || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') ||
      `pipeline_${Date.now()}`;
    const { data, error } = await this._sb
      .from('crm_pipelines')
      .insert({ ...pipeline, slug })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id, updates) {
    const { error } = await this._sb
      .from('crm_pipelines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const { data } = await this._sb.from('crm_pipelines').select('*').eq('id', id).single();
    return data;
  }

  async delete(id) {
    const { error } = await this._sb.from('crm_pipelines').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }
}

// ---- Pipeline Stages ----
export class SupabasePipelineStageRepository {
  constructor(supabase) { this._base = supabase; }
  get _sb() { return getSupabase(this._base); }

  async findByPipeline(pipelineId) {
    const { data, error } = await this._sb
      .from('pipeline_stages')
      .select('*, stage:lead_stages(*)')
      .eq('pipeline_id', pipelineId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async findById(id) {
    // id es el id de lead_stages devuelto por create()
    const { data, error } = await this._sb
      .from('lead_stages')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  }

  async create(stage) {
    // El esquema separa la definición de la etapa (lead_stages) del enlace
    // al pipeline (pipeline_stages: pipeline_id + stage_id + sort_order).
    const {
      name, slug, color, icon, sort_order, probability,
      is_won, is_lost, is_active, company_id, pipeline_id,
    } = stage;

    if (!company_id) throw new Error('Company context required');

    const baseSlug =
      slug ||
      String(name || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') ||
      `stage_${Date.now()}`;

    // (company_id, slug) es único: reintentar con sufijo si choca
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = attempt === 0 ? baseSlug : `${baseSlug}_${attempt + 1}`;
      const { data: leadStage, error: stageErr } = await this._sb
        .from('lead_stages')
        .insert({
          company_id,
          name,
          slug: candidate,
          color: color || '#6B7280',
          icon: icon || null,
          sort_order: sort_order ?? 0,
          probability: probability ?? 0,
          is_won: is_won ?? false,
          is_lost: is_lost ?? false,
          is_active: is_active !== false,
        })
        .select()
        .single();
      if (stageErr && stageErr.code === '23505') continue;
      if (stageErr) throw stageErr;

      const { data: link, error: linkErr } = await this._sb
        .from('pipeline_stages')
        .insert({
          pipeline_id,
          company_id,
          stage_id: leadStage.id,
          sort_order: sort_order ?? 0,
        })
        .select()
        .single();
      if (linkErr) throw linkErr;

      return { ...leadStage, pipeline_stage_id: link.id };
    }
    throw new Error('Could not create stage: slug conflict');
  }

  async update(id, updates) {
    const allowed = ['name', 'slug', 'color', 'icon', 'sort_order', 'probability', 'is_won', 'is_lost', 'is_active', 'auto_action', 'max_days'];
    const payload = {};
    for (const k of allowed) if (updates[k] !== undefined) payload[k] = updates[k];
    if (Object.keys(payload).length === 0) return this.findById(id);
    const { error } = await this._sb
      .from('lead_stages')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  }

  async delete(id) {
    await this._sb.from('pipeline_stages').delete().eq('stage_id', id);
    const { error } = await this._sb.from('lead_stages').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }
}

// ---- Leads ----
export class SupabaseLeadRepository {
  constructor(supabase) { this._base = supabase; }
  get _sb() { return getSupabase(this._base); }

  async findAll(companyId, { page = 1, limit = 50, pipeline_id, stage_id, search } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this._sb
      .from('leads')
      .select('*, lead_sources(id, name), users(id, name)', { count: 'exact' })
      .eq('company_id', companyId);

    if (pipeline_id) query = query.eq('pipeline_id', pipeline_id);
    if (stage_id) query = query.eq('stage_id', stage_id);
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return {
      data: data || [],
      pagination: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) },
    };
  }

  async findById(id, companyId) {
    const { data, error } = await this._sb
      .from('leads')
      .select('*, lead_sources(id, name), users(id, name), lead_stages(id, name)')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    if (error) return null;
    return data;
  }

  async create(lead) {
    const { data, error } = await this._sb
      .from('leads')
      .insert(lead)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id, updates) {
    const { error } = await this._sb
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const { data } = await this._sb.from('leads').select('*').eq('id', id).single();
    return data;
  }

  async moveStage(id, stageId) {
    const { error } = await this._sb
      .from('leads')
      .update({ stage_id: stageId, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const { data } = await this._sb.from('leads').select('*').eq('id', id).single();
    return data;
  }

  async convertToClient(id) {
    const { data: lead, error: leadErr } = await this._sb
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    if (leadErr || !lead) throw new Error('LEAD_NOT_FOUND');

    // Create client from lead data
    const { data: client, error: clientErr } = await this._sb
      .from('clients')
      .insert({
        id: randomUUID(),
        company_id: lead.company_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        is_active: true,
      })
      .select()
      .single();
    if (clientErr) throw clientErr;

    // Update lead as converted (columnas reales: converted_at + client_id)
    await this._sb
      .from('leads')
      .update({ converted_at: new Date().toISOString(), client_id: client.id, updated_at: new Date().toISOString() })
      .eq('id', id);

    return client;
  }

  async delete(id) {
    const { error } = await this._sb.from('leads').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }
}

// ---- Lead Activities ----
export class SupabaseLeadActivityRepository {
  constructor(supabase) { this._base = supabase; }
  get _sb() { return getSupabase(this._base); }

  async findByLead(leadId) {
    const { data, error } = await this._sb
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async create(activity) {
    const { data, error } = await this._sb
      .from('lead_activities')
      .insert(activity)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// ---- Lead Notes ----
export class SupabaseLeadNoteRepository {
  constructor(supabase) { this._base = supabase; }
  get _sb() { return getSupabase(this._base); }

  async findByLead(leadId) {
    const { data, error } = await this._sb
      .from('lead_notes')
      .select('*, users(id, name)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async create(note) {
    const { data, error } = await this._sb
      .from('lead_notes')
      .insert(note)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// ---- Lead Sources ----
export class SupabaseLeadSourceRepository {
  constructor(supabase) { this._base = supabase; }
  get _sb() { return getSupabase(this._base); }

  async findAll(companyId) {
    const { data, error } = await this._sb
      .from('lead_sources')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    if (error) throw error;
    return data || [];
  }
}

// ---- Tasks ----
export class SupabaseCRMTaskRepository {
  constructor(supabase) { this._base = supabase; }
  get _sb() { return getSupabase(this._base); }

  async findAll(companyId, { page = 1, limit = 50, lead_id, status } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this._sb
      .from('tasks')
      .select('*, leads(id, name), users(id, name)', { count: 'exact' })
      .eq('company_id', companyId);

    if (lead_id) query = query.eq('lead_id', lead_id);
    if (status) query = query.eq('status', status);

    const { data, count, error } = await query
      .range(from, to)
      .order('due_date', { ascending: true });
    if (error) throw error;
    return {
      data: data || [],
      pagination: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) },
    };
  }

  async create(task) {
    const { data, error } = await this._sb
      .from('tasks')
      .insert(task)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id, updates) {
    const { error } = await this._sb
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const { data } = await this._sb.from('tasks').select('*').eq('id', id).single();
    return data;
  }

  async complete(id) {
    return this.update(id, { status: 'completed', completed_at: new Date().toISOString() });
  }
}

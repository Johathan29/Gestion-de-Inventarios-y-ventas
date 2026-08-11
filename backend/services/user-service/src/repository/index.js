// ============================================================
// Supabase CRM Repository Adapters
// ============================================================

import { tenantStorage } from '@erp/shared-kernel';
import { ClientMapper, CreditAccountMapper, NotificationPreferenceMapper } from '../mappers/index.js';

export class SupabaseClientRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findAll({ page = 1, limit = 20, search, isActive } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this._supabase.from('clients').select('*', { count: 'exact' });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,document_number.ilike.%${search}%`
      );
    }
    if (isActive !== undefined && isActive !== null) {
      query = query.eq('is_active', isActive);
    }

    const { data, count, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return {
      data: (data || []).map(r => ClientMapper.toDomain(r)),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('clients')
      .select('*, sales(*, sale_items(*))')
      .eq('id', id)
      .single();
    if (error) return null;
    return ClientMapper.toDomain(data);
  }

  async findByUserId(userId) {
    const { data, error } = await this._supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return ClientMapper.toDomain(data);
  }

  async save(client) {
    const persistence = ClientMapper.toPersistence(client);
    const { data, error } = await this._supabase
      .from('clients')
      .insert(persistence)
      .select()
      .single();
    if (error) throw error;
    return ClientMapper.toDomain(data);
  }

  async update(client) {
    const persistence = ClientMapper.toPersistence(client);
    persistence.updated_at = new Date().toISOString();
    const { error } = await this._supabase
      .from('clients')
      .update(persistence)
      .eq('id', client.id);
    if (error) throw error;
    return this.findById(client.id);
  }

  async delete(id) {
    const { error } = await this._supabase
      .from('clients')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  }
}

export class SupabaseCreditAccountRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findByClientId(clientId) {
    const { data, error } = await this._supabase
      .from('client_credit_accounts')
      .select('*')
      .eq('client_id', clientId)
      .single();
    if (error) return null;
    return CreditAccountMapper.toDomain(data);
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('client_credit_accounts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return CreditAccountMapper.toDomain(data);
  }

  async save(account) {
    const persistence = CreditAccountMapper.toPersistence(account);
    const { data, error } = await this._supabase
      .from('client_credit_accounts')
      .insert(persistence)
      .select()
      .single();
    if (error) throw error;
    return CreditAccountMapper.toDomain(data);
  }

  async update(account) {
    const persistence = CreditAccountMapper.toPersistence(account);
    persistence.updated_at = new Date().toISOString();
    const { error } = await this._supabase
      .from('client_credit_accounts')
      .update(persistence)
      .eq('id', account.id);
    if (error) throw error;
    return this.findById(account.id);
  }
}

export class SupabaseNotificationPreferenceRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findByClientId(clientId) {
    const { data, error } = await this._supabase
      .from('client_notification_preferences')
      .select('*')
      .eq('client_id', clientId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? NotificationPreferenceMapper.toDomain(data) : null;
  }

  async upsert(prefs) {
    const persistence = NotificationPreferenceMapper.toPersistence(prefs);
    persistence.updated_at = new Date().toISOString();
    const { data, error } = await this._supabase
      .from('client_notification_preferences')
      // onConflict client_id: la fila ya existe (trigger al crear el cliente) → UPDATE
      .upsert({ client_id: prefs.clientId, ...persistence }, { onConflict: 'client_id' })
      .select()
      .single();
    if (error) throw error;
    return NotificationPreferenceMapper.toDomain(data);
  }
}

// ============================================================
// Supabase User Repository (Adapter)
// ============================================================

import { tenantStorage } from '@erp/shared-kernel';
import { IUserRepository } from './IUserRepository.js';
import { UserMapper } from '../mappers/index.js';

export class SupabaseUserRepository extends IUserRepository {
  constructor(supabaseClient) {
    super();
    this._supabase = supabaseClient;
  }

  get _db() { return tenantStorage.getStore()?.supabase || this._supabase; }

  // Explicit column list avoids schema-cache staleness issues (e.g. missing company_id)
  static #COLUMNS = 'id,email,name,password_hash,is_active,phone,last_login,created_at,updated_at,role_id,roles:role_id(name,permissions)';

  async findById(id) {
    const { data, error } = await this._db
      .from('users')
      .select(SupabaseUserRepository.#COLUMNS)
      .eq('id', id)
      .single();

    if (error) return null;
    return UserMapper.toDomain(data);
  }

  async findByEmail(email) {
    const { data, error } = await this._db
      .from('users')
      .select(SupabaseUserRepository.#COLUMNS)
      .eq('email', email.toLowerCase())
      .single();

    if (error) return null;
    return UserMapper.toDomain(data);
  }

  async findAll({ page = 1, limit = 20, search, role, isActive, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    let query = this._db
      .from('users')
      .select(SupabaseUserRepository.#COLUMNS, { count: 'exact' });

    // Filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (role) {
      query = query.eq('roles.name', role);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (error) throw error;

    return {
      data: UserMapper.toDomainList(data),
      total: count || 0,
      page,
      limit,
    };
  }

  async save(user) {
    const payload = UserMapper.toPersistence(user);
    const { data, error } = await this._db
      .from('users')
      .insert([{
        ...payload,
        id: user.id,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      }])
      .select(SupabaseUserRepository.#COLUMNS)
      .single();

    if (error) throw error;
    return UserMapper.toDomain(data);
  }

  async update(user) {
    const payload = UserMapper.toPersistence(user);
    delete payload.created_at; // Don't overwrite creation date

    const { data, error } = await this._db
      .from('users')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select(SupabaseUserRepository.#COLUMNS)
      .single();

    if (error) throw error;
    return UserMapper.toDomain(data);
  }

  async delete(id) {
    const { error } = await this._db
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async count(filters = {}) {
    let query = this._db.from('users').select('id', { count: 'exact', head: true });

    if (filters.role) {
      query = query.eq('roles.name', filters.role);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  async toggleActive(id) {
    // First get current status
    const { data: current, error: fetchError } = await this._db
      .from('users')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const newStatus = !current?.is_active;

    const { data, error } = await this._db
      .from('users')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, roles(name, permissions)')
      .single();

    if (error) throw error;
    return UserMapper.toDomain(data);
  }

  async updateRole(id, roleName) {
    // Resolve role id from name
    const { data: role, error: roleError } = await this._db
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError) throw new Error(`Role '${roleName}' not found`);

    const { data, error } = await this._db
      .from('users')
      .update({ role_id: role.id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, roles(name, permissions)')
      .single();

    if (error) throw error;
    return UserMapper.toDomain(data);
  }

  async getAccessHistory(id) {
    const { data, error } = await this._db
      .from('audit_logs')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }
}

export default SupabaseUserRepository;

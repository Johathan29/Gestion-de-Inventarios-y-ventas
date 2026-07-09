// ============================================================
// Supabase User Repository (Adapter)
// ============================================================

import { IUserRepository } from './IUserRepository.js';
import { UserMapper } from '../mappers/index.js';

export class SupabaseUserRepository extends IUserRepository {
  #supabase;

  constructor(supabaseClient) {
    super();
    this.#supabase = supabaseClient;
  }

  async findById(id) {
    const { data, error } = await this.#supabase
      .from('users')
      .select('*, roles(name, permissions)')
      .eq('id', id)
      .single();

    if (error) return null;
    return UserMapper.toDomain(data);
  }

  async findByEmail(email) {
    const { data, error } = await this.#supabase
      .from('users')
      .select('*, roles(name, permissions)')
      .eq('email', email.toLowerCase())
      .single();

    if (error) return null;
    return UserMapper.toDomain(data);
  }

  async findAll({ page = 1, limit = 20, search, role, isActive, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    let query = this.#supabase
      .from('users')
      .select('*, roles(name, permissions)', { count: 'exact' });

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
    const { data, error } = await this.#supabase
      .from('users')
      .insert([{
        ...payload,
        id: user.id,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      }])
      .select('*, roles(name, permissions)')
      .single();

    if (error) throw error;
    return UserMapper.toDomain(data);
  }

  async update(user) {
    const payload = UserMapper.toPersistence(user);
    delete payload.created_at; // Don't overwrite creation date

    const { data, error } = await this.#supabase
      .from('users')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('*, roles(name, permissions)')
      .single();

    if (error) throw error;
    return UserMapper.toDomain(data);
  }

  async delete(id) {
    const { error } = await this.#supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async count(filters = {}) {
    let query = this.#supabase.from('users').select('id', { count: 'exact', head: true });

    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
}

export default SupabaseUserRepository;

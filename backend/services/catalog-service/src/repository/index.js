// ============================================================
// Catalog Repository Interface & Supabase Implementation
// ============================================================

import { tenantStorage } from '@erp/shared-kernel';
import { ProductMapper, CategoryMapper, BrandMapper } from '../mappers/index.js';

// ---- Interface ----
export class IProductRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findBySku(sku) { throw new Error('Not implemented'); }
  async findAll(query) { throw new Error('Not implemented'); }
  async save(product) { throw new Error('Not implemented'); }
  async update(product) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
}

// ---- Supabase Implementation ----
export class SupabaseProductRepository extends IProductRepository {
  constructor(supabase) { super(); this._supabase = supabase; }

  get _db() { return tenantStorage.getStore()?.supabase || this._supabase; }

  async findById(id) {
    const { data } = await this._db.from('products').select('*, categories(name), brands(name)').eq('id', id).single();
    return ProductMapper.toDomain(data);
  }

  async findBySku(sku) {
    const { data } = await this._db.from('products').select('*').eq('sku', sku).single();
    return ProductMapper.toDomain(data);
  }

  async findAll({ page = 1, limit = 20, search, categoryId, brandId, status, minPrice, maxPrice, availableForSale, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    let query = this._db.from('products').select('*, categories(name), brands(name)', { count: 'exact' });

    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (brandId) query = query.eq('brand_id', brandId);
    if (status) query = query.eq('status', status);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);
    if (availableForSale !== undefined) query = query.eq('available_for_sale', availableForSale);

    const from = (page - 1) * limit;
    const { data, count } = await query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, from + limit - 1);

    return { data: ProductMapper.toDomainList(data), total: count || 0, page, limit };
  }

  async save(product) {
    const { data } = await this._db.from('products').insert(ProductMapper.toPersistence(product)).select('*, categories(name), brands(name)').single();
    return ProductMapper.toDomain(data);
  }

  async update(product) {
    const { data } = await this._db.from('products').update(ProductMapper.toPersistence(product)).eq('id', product.id).select('*, categories(name), brands(name)').single();
    return ProductMapper.toDomain(data);
  }

  async delete(id) {
    await this._db.from('products').update({ status: 'discontinued', available_for_sale: false }).eq('id', id);
  }
}

export class SupabaseCategoryRepository {
  constructor(supabase) { this._supabase = supabase; }

  get _db() { return tenantStorage.getStore()?.supabase || this._supabase; }

  async findAll({ page, limit, search } = {}) {
    let query = this._db.from('categories').select('*, parent:categories!parent_id(name)', { count: 'exact' });

    if (search) query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);

    if (page && limit) {
      const from = (page - 1) * limit;
      const { data, count } = await query.order('sort_order').range(from, from + limit - 1);
      return { data: CategoryMapper.toDomainList(data), total: count || 0, page, limit };
    }

    const { data } = await query.order('sort_order');
    return CategoryMapper.toDomainList(data);
  }

  async findById(id) {
    const { data } = await this._db.from('categories').select('*').eq('id', id).single();
    return CategoryMapper.toDomain(data);
  }

  async save(category) {
    const { data } = await this._db.from('categories').insert({
      name: category.name, description: category.description,
      parent_id: category.parentId, image_url: category.imageUrl,
      sort_order: category.sortOrder, is_active: category.isActive,
    }).select().single();
    return CategoryMapper.toDomain(data);
  }

  async update(category) {
    const { data } = await this._db.from('categories').update({
      name: category.name, description: category.description,
      parent_id: category.parentId, image_url: category.imageUrl,
      sort_order: category.sortOrder, is_active: category.isActive,
    }).eq('id', category.id).select().single();
    return CategoryMapper.toDomain(data);
  }

  async delete(id) { await this._db.from('categories').delete().eq('id', id); }
}

export class SupabaseBrandRepository {
  constructor(supabase) { this._supabase = supabase; }

  get _db() { return tenantStorage.getStore()?.supabase || this._supabase; }

  async findAll() {
    const { data } = await this._db.from('brands').select('*').order('name');
    return BrandMapper.toDomainList(data);
  }

  async findById(id) {
    const { data } = await this._db.from('brands').select('*').eq('id', id).single();
    return BrandMapper.toDomain(data);
  }

  async save(brand) {
    const { data } = await this._db.from('brands').insert({
      name: brand.name, description: brand.description,
      logo_url: brand.logoUrl, is_active: brand.isActive,
    }).select().single();
    return BrandMapper.toDomain(data);
  }

  async update(brand) {
    const { data } = await this._db.from('brands').update({
      name: brand.name, description: brand.description,
      logo_url: brand.logoUrl, is_active: brand.isActive,
    }).eq('id', brand.id).select().single();
    return BrandMapper.toDomain(data);
  }

  async delete(id) { await this._db.from('brands').delete().eq('id', id); }
}

export default { SupabaseProductRepository, SupabaseCategoryRepository, SupabaseBrandRepository };

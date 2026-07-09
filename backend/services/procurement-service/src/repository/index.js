// ============================================================
// Supabase Procurement Repository Adapters
// ============================================================

import { PurchaseMapper, SupplierMapper } from '../mappers/index.js';

export class SupabasePurchaseRepository {
  constructor(supabase) {
    this._supabase = supabase;
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('purchases')
      .select('*, suppliers(*), users(name), purchase_items(*, products(name, sku, barcode, images))')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    // Map purchase_items.products.images for product_image field
    if (data.purchase_items) {
      data.purchase_items = data.purchase_items.map(item => {
        if (!item.product_image && item.products) {
          const prod = item.products;
          item.product_name = item.product_name || prod?.name;
          item.sku = item.sku || prod?.sku;
          item.barcode = item.barcode || prod?.barcode;
          if (Array.isArray(prod?.images) && prod.images.length > 0) {
            item.product_image = typeof prod.images[0] === 'string' ? prod.images[0] : (prod.images[0]?.url || '');
          }
        }
        return item;
      });
    }
    return PurchaseMapper.toDomain(data);
  }

  async findMany({ page = 1, limit = 10, status, supplierId, fromDate, toDate } = {}) {
    const from = (page - 1) * limit;
    const toVal = from + limit - 1;

    let query = this._supabase
      .from('purchases')
      .select('*, suppliers(name, contact_name, phone), users(name)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (supplierId) query = query.eq('supplier_id', supplierId);
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);

    const { data, count, error } = await query
      .range(from, toVal)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data || []).map(r => PurchaseMapper.toDomain(r)), count: count || 0 };
  }

  async save(purchase) {
    const persistence = PurchaseMapper.toPersistence(purchase);
    const { data, error } = await this._supabase
      .from('purchases')
      .insert(persistence)
      .select()
      .single();

    if (error) throw error;

    // Insert items
    if (purchase.items && purchase.items.length > 0) {
      const itemsData = purchase.items.map(item => ({
        ...PurchaseMapper.itemToPersistence(item),
        purchase_id: data.id,
      }));
      const { error: itemsError } = await this._supabase
        .from('purchase_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;
    }

    return this.findById(data.id);
  }

  async update(id, data) {
    const { error } = await this._supabase
      .from('purchases')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return this.findById(id);
  }

  async updateStatus(id, status) {
    return this.update(id, { status });
  }

  async delete(id) {
    const { error } = await this._supabase
      .from('purchases')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getNextNumber() {
    const { data: lastPurchase } = await this._supabase
      .from('purchases')
      .select('purchase_number')
      .order('created_at', { ascending: false })
      .limit(1);

    let purchaseNumber = 'PO-00000001';
    if (lastPurchase && lastPurchase.length > 0) {
      const lastNum = parseInt(lastPurchase[0].purchase_number.replace('PO-', ''), 10);
      purchaseNumber = `PO-${String(lastNum + 1).padStart(8, '0')}`;
    }
    return purchaseNumber;
  }

  async countBySupplierId(supplierId) {
    const { count, error } = await this._supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId);

    if (error) throw error;
    return count || 0;
  }
}

export class SupabaseSupplierRepository {
  constructor(supabase) {
    this._supabase = supabase;
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return SupplierMapper.toDomain(data);
  }

  async findMany({ page = 1, limit = 20, search, isActive } = {}) {
    const from = (page - 1) * limit;
    const toVal = from + limit - 1;

    let query = this._supabase
      .from('suppliers')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    const { data, count, error } = await query
      .range(from, toVal)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: (data || []).map(r => SupplierMapper.toDomain(r)), count: count || 0 };
  }

  async save(supplier) {
    const persistence = SupplierMapper.toPersistence(supplier);
    const { data, error } = await this._supabase
      .from('suppliers')
      .insert(persistence)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('DUPLICATE_NAME');
      throw error;
    }
    return SupplierMapper.toDomain(data);
  }

  async update(id, data) {
    const { error } = await this._supabase
      .from('suppliers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return this.findById(id);
  }

  async delete(id) {
    const { error } = await this._supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async findByName(name) {
    const { data, error } = await this._supabase
      .from('suppliers')
      .select('id')
      .eq('name', name)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }
}

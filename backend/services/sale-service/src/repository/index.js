// ============================================================
// Supabase Sales Repository Adapters
// ============================================================

import { SaleMapper, CartMapper } from '../mappers/index.js';

export class SupabaseSaleRepository {
  constructor(supabase) {
    this._supabase = supabase;
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('sales')
      .select('*, clients(*), users!sales_user_id_fkey(name), sale_items(*, products(name, sku, price, barcode, images))')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    // Map product data into sale_items
    if (data.sale_items) {
      data.sale_items = data.sale_items.map(item => {
        if (item.products) {
          item.product_name = item.product_name || item.products.name;
          item.sku = item.sku || item.products.sku;
        }
        return item;
      });
    }
    return SaleMapper.toDomain(data);
  }

  async findMany({ page = 1, limit = 10, status, clientId, fromDate, toDate } = {}) {
    const from = (page - 1) * limit;
    const toVal = from + limit - 1;

    let query = this._supabase
      .from('sales')
      .select('*, clients(name, email), users!sales_user_id_fkey(name)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (clientId) query = query.eq('client_id', clientId);
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);

    const { data, count, error } = await query
      .range(from, toVal)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data || []).map(r => SaleMapper.toDomain(r)), count: count || 0 };
  }

  async findByClient(clientId, { page = 1, limit = 12 } = {}) {
    return this.findMany({ page, limit, clientId });
  }

  async save(sale) {
    const persistence = SaleMapper.toPersistence(sale);
    const { data, error } = await this._supabase
      .from('sales')
      .insert(persistence)
      .select()
      .single();

    if (error) throw error;

    // Insert items
    if (sale.items && sale.items.length > 0) {
      let itemsData = sale.items.map(item => ({
        ...SaleMapper.itemToPersistence(item),
        sale_id: data.id,
      }));

      // Fill in missing product_name by querying the products table
      const itemsMissingName = itemsData.filter(i => !i.product_name);
      if (itemsMissingName.length > 0) {
        const productIds = [...new Set(itemsMissingName.map(i => i.product_id))];
        const { data: products } = await this._supabase
          .from('products')
          .select('id, name, sku')
          .in('id', productIds);
        const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));
        itemsData = itemsData.map(i => ({
          ...i,
          product_name: i.product_name || productMap[i.product_id]?.name || '',
          sku: i.sku || productMap[i.product_id]?.sku || null,
        }));
      }

      const { error: itemsError } = await this._supabase
        .from('sale_items')
        .insert(itemsData);
      if (itemsError) throw itemsError;
    }

    return this.findById(data.id);
  }

  async updateStatus(id, status, paymentStatus) {
    const updateData = { status, updated_at: new Date().toISOString() };
    if (paymentStatus) updateData.payment_status = paymentStatus;
    const { error } = await this._supabase
      .from('sales')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
    return this.findById(id);
  }

  async getNextNumber() {
    const { data, error } = await this._supabase
      .rpc('generate_sale_number');

    if (!error && data) return data;

    // Fallback
    const { data: lastSale } = await this._supabase
      .from('sales')
      .select('sale_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNum = 1;
    if (lastSale?.sale_number) {
      const match = lastSale.sale_number.match(/SALE-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    return `SALE-${String(nextNum).padStart(8, '0')}`;
  }
}

export class SupabaseCartRepository {
  constructor(supabase) {
    this._supabase = supabase;
  }

  async findByUser(userId) {
    const { data, error } = await this._supabase
      .from('carts')
      .select('*, cart_items(*, products(id, name, sku, price, images, stock))')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return CartMapper.toDomain(data || null);
  }

  async create(userId) {
    const { data, error } = await this._supabase
      .from('carts')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return CartMapper.toDomain(data);
  }

  async findOrCreate(userId) {
    let cart = await this.findByUser(userId);
    if (!cart) cart = await this.create(userId);
    return cart;
  }

  async addItem(cartId, productId, quantity, unitPrice) {
    // Check if product already in cart
    const { data: existing } = await this._supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .single();

    if (existing) {
      const { error } = await this._supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await this._supabase
        .from('cart_items')
        .insert({ cart_id: cartId, product_id: productId, quantity, unit_price: unitPrice });
      if (error) throw error;
    }
  }

  async updateItemQuantity(itemId, quantity) {
    const { error } = await this._supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);
    if (error) throw error;
  }

  async removeItem(itemId) {
    const { error } = await this._supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
  }

  async clearCart(cartId) {
    const { error } = await this._supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);
    if (error) throw error;
  }

  async getItemWithProduct(itemId) {
    const { data, error } = await this._supabase
      .from('cart_items')
      .select('*, products(id, name, price, stock, status)')
      .eq('id', itemId)
      .single();

    if (error || !data) return null;
    return data;
  }
}

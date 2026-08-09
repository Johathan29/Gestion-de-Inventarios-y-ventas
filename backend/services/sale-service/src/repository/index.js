// ============================================================
// Supabase Sales Repository Adapters
// ============================================================

import { tenantStorage } from '@erp/shared-kernel';
import { SaleMapper, CartMapper } from '../mappers/index.js';

export class SupabaseSaleRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('sales')
      .select('*, clients(*), users!sales_user_id_fkey(name), sale_items(*, products(name, sku, price, barcode, images)), invoices!invoice_id(invoice_number)')
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

  async findMany({ page = 1, limit = 10, search, status, payment, clientId, fromDate, toDate } = {}) {
    const from = (page - 1) * limit;
    const toVal = from + limit - 1;

    let query = this._supabase
      .from('sales')
      .select('*, clients(name, email), users!sales_user_id_fkey(name), invoices!invoice_id(invoice_number), sale_items(*, products(id, name, sku, price, barcode, images))', { count: 'exact' });

    if (search) {
      query = query.or(
        `invoice_number.ilike.%${search}%,clients.name.ilike.%${search}%`
      );
    }
    if (status) query = query.eq('status', status);
    if (payment) {
      const pmt = payment.toLowerCase();
      if (pmt === 'cash') query = query.or('payment_type.eq.cash,payment_type.eq.efectivo');
      else if (pmt === 'card') query = query.or('payment_type.eq.card,payment_type.eq.tarjeta,payment_type.eq.credit_card,payment_type.eq.debit_card');
      else if (pmt === 'transfer') query = query.or('payment_type.eq.transfer,payment_type.eq.transferencia,payment_type.eq.bank_transfer');
    }
    if (clientId) query = query.eq('client_id', clientId);
    if (fromDate) query = query.gte('updated_at', fromDate);
    if (toDate) query = query.lte('updated_at', toDate);

    const { data, count, error } = await query
      .order('updated_at', { ascending: false })
      .range(from, toVal);

    if (error) throw error;
    return {
      data: (data || []).map(r => SaleMapper.toDomain(r)),
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    };
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

      // Fill in missing variant_name / variant_attributes by querying product_variants
      const itemsMissingVariant = itemsData.filter(i => i.variant_id && !i.variant_name);
      if (itemsMissingVariant.length > 0) {
        const variantIds = [...new Set(itemsMissingVariant.map(i => i.variant_id))];
        const { data: variants } = await this._supabase
          .from('product_variants')
          .select('id, name, attributes')
          .in('id', variantIds);
        const variantMap = Object.fromEntries((variants || []).map(v => [v.id, v]));
        itemsData = itemsData.map(i => ({
          ...i,
          variant_name: i.variant_name || variantMap[i.variant_id]?.name || null,
          variant_attributes: i.variant_attributes || variantMap[i.variant_id]?.attributes || null,
        }));
      }

      const { error: itemsError } = await this._supabase
        .from('sale_items')
        .insert(itemsData);
      if (itemsError) throw itemsError;
    }

    return this.findById(data.id);
  }

  /**
   * Guarda venta + items + decremento de stock + eventos outbox
   * en UNA sola transacción SQL vía RPC `sp_create_sale`.
   * Previene ventas huérfanas (sin items) y la sobreventa.
   */
  async saveAtomic(sale, { correlationId } = {}) {
    const companyId = tenantStorage.getStore()?.companyId || sale.companyId || null;
    const persistence = SaleMapper.toPersistence(sale);
    const items = (sale.items || []).map(item => ({
      product_id: item.productId,
      product_name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount: item.discount || 0,
      tax: item.tax || 0,
      total: item.total,
      variant_id: item.variantId || null,
      variant_name: item.variantName || null,
      variant_attributes: item.variantAttributes || null,
    }));

    const { data, error } = await this._supabase.rpc('sp_create_sale', {
      p_company_id: companyId,
      p_user_id: sale.userId,
      p_client_id: sale.clientId || null,
      p_sale_data: {
        status: persistence.status,
        subtotal: persistence.subtotal,
        tax: persistence.tax,
        discount: persistence.discount,
        total: persistence.total,
        payment_method: persistence.payment_method,
        payment_status: persistence.payment_status,
        notes: persistence.notes,
        shipping_address: persistence.shipping_address,
        source: persistence.source,
      },
      p_items: items,
      p_correlation_id: correlationId || null,
    });

    if (error) {
      // Si el RPC no existe (migración 049 sin aplicar), degradar al save() clásico
      if (error.code === 'PGRST202' || /function .* does not exist/i.test(error.message || '')) {
        return this.save(sale);
      }
      throw error;
    }

    const saved = await this.findById(data.sale_id);
    if (saved) saved._usedOutbox = true;
    return saved;
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
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findByUser(userId) {
    const { data, error } = await this._supabase
      .from('carts')
      .select('*, cart_items(*, products(id, name, sku, price, images))')
      .eq('user_id', userId)
      .maybeSingle();

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

  async addItem(cartId, productId, quantity, unitPrice, variantId) {
    // If unitPrice not provided, fetch from products or variant
    if (!unitPrice) {
      if (variantId) {
        const { data: variant, error: varErr } = await this._supabase
          .from('product_variants')
          .select('price, name, attributes')
          .eq('id', variantId)
          .single();
        if (varErr) throw varErr;
        if (!variant) throw new Error(`Variant ${variantId} not found`);
        unitPrice = variant.price;
      } else {
        const { data: product, error: prodErr } = await this._supabase
          .from('products')
          .select('price')
          .eq('id', productId)
          .single();
        if (prodErr) throw prodErr;
        if (!product) throw new Error(`Product ${productId} not found`);
        unitPrice = product.price;
      }
    }

    // Check if same product+variant already in cart
    let query = this._supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', productId);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    } else {
      query = query.is('variant_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      const { error } = await this._supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const insertData = {
        cart_id: cartId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
      };

      // If variant, fetch name/attributes and set variant fields
      if (variantId) {
        const { data: variant } = await this._supabase
          .from('product_variants')
          .select('name, attributes')
          .eq('id', variantId)
          .single();

        insertData.variant_id = variantId;
        insertData.variant_name = variant?.name || null;
        insertData.variant_attributes = variant?.attributes || null;
      }

      const { error } = await this._supabase
        .from('cart_items')
        .insert(insertData);
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
      .select('*, products(id, name, price, stock, status), product_variants!cart_items_variant_id_fkey(id, name, price, stock, attributes)')
      .eq('id', itemId)
      .single();

    if (error || !data) return null;
    return data;
  }
}

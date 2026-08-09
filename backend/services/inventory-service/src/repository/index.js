// ============================================================
// Supabase Inventory Repository Adapters
// ============================================================

import { tenantStorage } from '@erp/shared-kernel';
import { InventoryItemMapper, MovementMapper, ReservationMapper, WarehouseMapper } from '../mappers/index.js';

export class SupabaseInventoryRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findStock({ page = 1, limit = 20, warehouse, search, categoryId, status } = {}) {
    const from = (page - 1) * limit;
    const toVal = from + limit - 1;

    let query = this._supabase
      .from('inventory')
      .select('*, products!inner(name, sku, category_id, price, images, min_stock, max_stock)', { count: 'exact' });

    if (warehouse) query = query.eq('warehouse', warehouse);
    if (categoryId) query = query.eq('products.category_id', categoryId);
    if (status) query = query.eq('status', status);
    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`, { referencedTable: 'products' });

    const { data, count, error } = await query
      .range(from, toVal)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return { data: (data || []).map(r => InventoryItemMapper.toDomain(r)), count: count || 0 };
  }

  async findByProduct(productId) {
    const { data, error } = await this._supabase
      .from('inventory')
      .select('*, products(name, sku)')
      .eq('product_id', productId);

    if (error) throw error;
    return (data || []).map(r => InventoryItemMapper.toDomain(r));
  }

  async findOne(productId, warehouse) {
    const { data, error } = await this._supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('warehouse', warehouse)
      .single();

    if (error || !data) return null;
    return InventoryItemMapper.toDomain(data);
  }

  async upsert(productId, warehouse, data) {
    const existing = await this.findOne(productId, warehouse);
    if (existing) {
      const { error } = await this._supabase
        .from('inventory')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
      return this.findOne(productId, warehouse);
    } else {
      const { data: inserted, error } = await this._supabase
        .from('inventory')
        .insert({ product_id: productId, warehouse, ...data })
        .select()
        .single();
      if (error) throw error;
      return InventoryItemMapper.toDomain(inserted);
    }
  }

  /**
   * ENTRADA ATÓMICA vía RPC fn_stock_entry (INSERT ON CONFLICT DO UPDATE
   * + RETURNING en una sola sentencia → sin TOCTOU bajo concurrencia).
   * El RPC inserta TAMBIÉN el movimiento de kardex en la misma transacción
   * (migración 065) → kardex contiguo y sin ventana de auditoría.
   * Retorna { previousStock, newStock, movementId, inventory }.
   */
  async atomicEntry({ productId, warehouse = 'principal', quantity, unitCost = 0, reason, referenceType, referenceId, userId, variantId, movementType }) {
    const companyId = tenantStorage.getStore()?.companyId || null;
    const { data, error } = await this._supabase.rpc('fn_stock_entry', {
      p_product_id: productId,
      p_quantity: quantity,
      p_warehouse: warehouse,
      p_unit_cost: unitCost,
      p_reason: reason || null,
      p_reference_type: referenceType || null,
      p_reference_id: referenceId || null,
      p_user_id: userId || null,
      p_variant_id: variantId || null,
      p_company_id: companyId,
      p_movement_type: movementType || null,
    });
    if (error) {
      if ((error.message || '').includes('INVALID_QUANTITY')) throw new Error('INVALID_QUANTITY');
      throw error;
    }
    const inventory = await this.findOne(productId, warehouse);
    return { previousStock: data.previous_stock, newStock: data.new_stock, movementId: data.movement_id, inventory };
  }

  /**
   * SALIDA ATÓMICA vía RPC fn_stock_exit (UPDATE condicional stock >= qty
   * → imposible stock negativo, incluso con operaciones concurrentes).
   * Error INSUFFICIENT_STOCK si no hay stock suficiente.
   * El RPC inserta el kardex en la misma transacción.
   */
  async atomicExit({ productId, warehouse = 'principal', quantity, reason, referenceType, referenceId, userId, variantId, movementType }) {
    const companyId = tenantStorage.getStore()?.companyId || null;
    const { data, error } = await this._supabase.rpc('fn_stock_exit', {
      p_product_id: productId,
      p_quantity: quantity,
      p_warehouse: warehouse,
      p_reason: reason || null,
      p_reference_type: referenceType || null,
      p_reference_id: referenceId || null,
      p_user_id: userId || null,
      p_variant_id: variantId || null,
      p_company_id: companyId,
      p_movement_type: movementType || null,
    });
    if (error) {
      if ((error.message || '').includes('INSUFFICIENT_STOCK')) throw new Error('INSUFFICIENT_STOCK');
      if ((error.message || '').includes('PRODUCT_NOT_FOUND')) throw new Error('PRODUCT_NOT_FOUND');
      throw error;
    }
    const inventory = await this.findOne(productId, warehouse);
    return { previousStock: data.previous_stock, newStock: data.new_stock, movementId: data.movement_id, inventory };
  }

  /**
   * AJUSTE ATÓMICO vía RPC fn_stock_adjust (SELECT FOR UPDATE + UPDATE →
   * previous_stock correcto bajo concurrencia). Fija stock absoluto.
   * El RPC inserta el kardex en la misma transacción (movement_id null
   * si no hubo cambio real).
   */
  async atomicAdjust({ productId, warehouse = 'principal', newQuantity, reason, userId }) {
    const companyId = tenantStorage.getStore()?.companyId || null;
    const { data, error } = await this._supabase.rpc('fn_stock_adjust', {
      p_product_id: productId,
      p_new_quantity: newQuantity,
      p_warehouse: warehouse,
      p_reason: reason || null,
      p_user_id: userId || null,
      p_company_id: companyId,
    });
    if (error) {
      if ((error.message || '').includes('INVALID_QUANTITY')) throw new Error('INVALID_QUANTITY');
      throw error;
    }
    const inventory = await this.findOne(productId, warehouse);
    return { previousStock: data.previous_stock, newStock: data.new_stock, movementId: data.movement_id, inventory };
  }

  async getAlerts(threshold = 5) {
    const [lowStock, outOfStock] = await Promise.all([
      this._supabase
        .from('inventory')
        .select('*, products(name, sku, min_stock, max_stock)')
        .lte('stock', threshold)
        .gt('stock', 0),
      this._supabase
        .from('inventory')
        .select('*, products(name, sku, min_stock, max_stock)')
        .eq('stock', 0),
    ]);

    if (lowStock.error) throw lowStock.error;
    if (outOfStock.error) throw outOfStock.error;

    const all = [...(lowStock.data || []), ...(outOfStock.data || [])]
      .map(item => ({
        ...InventoryItemMapper.toDomain(item).toJSON(),
        name: item.products?.name || 'Producto',
        sku: item.products?.sku || 'N/A',
      }));

    return all;
  }

  async getSummary() {
    const { data, error } = await this._supabase
      .from('inventory')
      .select('product_id, stock, status, products(name, sku, price, cost_price, min_stock)')
      .order('product_id');

    if (error) throw error;

    const totalProducts = data.length;
    const totalStock = data.reduce((sum, s) => sum + (s.stock || 0), 0);
    const totalValue = data.reduce((sum, s) => sum + ((s.stock || 0) * (s.products?.cost_price || 0)), 0);
    const totalValueRetail = data.reduce((sum, s) => sum + ((s.stock || 0) * (s.products?.price || 0)), 0);
    const lowStock = data.filter(s => s.stock > 0 && s.stock < (s.products?.min_stock || 5)).length;
    const outOfStock = data.filter(s => s.stock === 0).length;
    const pending = data.filter(s => s.status === 'pending').length;
    const blocked = data.filter(s => s.status === 'blocked').length;

    return { totalProducts, totalStock, totalValue, totalValueRetail, lowStock, outOfStock, pending, blocked, items: data };
  }
}

export class SupabaseMovementRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findMany({ page = 1, limit = 20, type, productId, fromDate, toDate } = {}) {
    const from = (page - 1) * limit;
    const toVal = from + limit - 1;

    let query = this._supabase
      .from('inventory_movements')
      .select('*, products(name, sku), users(name)', { count: 'exact' });

    if (type) query = query.eq('type', type);
    if (productId) query = query.eq('product_id', productId);
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);

    const { data, count, error } = await query
      .range(from, toVal)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data || []).map(r => MovementMapper.toDomain(r)), count: count || 0 };
  }

  async getKardex(productId) {
    const { data, error } = await this._supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    let balance = 0;
    return (data || []).map(m => {
      const domain = MovementMapper.toDomain(m);
      if (m.type === 'transfer' || m.type === 'count') {
        // neutral: no change to overall balance
      } else if (['entry', 'entry_purchase', 'return_client', 'adjustment_plus', 'initial_balance', 'production', 'release'].includes(m.type)) {
        balance += m.quantity;
      } else {
        balance -= m.quantity;
      }
      return { ...domain.toJSON(), balance };
    });
  }

  async save(movement) {
    const persistence = MovementMapper.toPersistence(movement);
    const { data, error } = await this._supabase
      .from('inventory_movements')
      .insert(persistence)
      .select()
      .single();

    if (error) throw error;
    return MovementMapper.toDomain(data);
  }
}

export class SupabaseReservationRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findActiveByProduct(productId) {
    const { data, error } = await this._supabase
      .from('inventory_reservations')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []).map(r => ReservationMapper.toDomain(r));
  }

  async save(reservation) {
    const { data, error } = await this._supabase
      .from('inventory_reservations')
      .insert({
        product_id: reservation.productId,
        warehouse_id: reservation.warehouseId,
        quantity: reservation.quantity,
        order_type: reservation.orderType,
        order_id: reservation.orderId,
        user_id: reservation.userId,
        status: reservation.status,
        expires_at: reservation.expiresAt?.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return ReservationMapper.toDomain(data);
  }

  async updateStatus(id, status) {
    const { error } = await this._supabase
      .from('inventory_reservations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
}

export class SupabaseWarehouseRepository {
  constructor(supabase) {
    const baseClient = supabase;
    Object.defineProperty(this, '_supabase', {
      get() { return tenantStorage.getStore()?.supabase || baseClient; },
      configurable: true, enumerable: true,
    });
  }

  async findAll() {
    const { data, error } = await this._supabase
      .from('warehouses')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(r => WarehouseMapper.toDomain(r));
  }

  async findById(id) {
    const { data, error } = await this._supabase
      .from('warehouses')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return WarehouseMapper.toDomain(data);
  }
}

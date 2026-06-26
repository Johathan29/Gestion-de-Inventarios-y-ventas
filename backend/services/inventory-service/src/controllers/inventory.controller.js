const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Obtener stock de todos los productos
 */
const getStock = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, warehouse_id } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('inventory')
      .select('*, products(name, sku, category_id)', { count: 'exact' });

    if (warehouse_id) query = query.eq('warehouse', warehouse_id);
    query = query.range(from, to).order('updated_at', { ascending: false });

    const { data: stock, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: stock,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener stock de un producto específico
 */
const getStockByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const { data: stock, error } = await supabase
      .from('inventory')
      .select('*, products(name, sku)')
      .eq('product_id', productId);

    if (error) throw error;

    const totalStock = stock.reduce((sum, s) => sum + Number(s.stock || 0), 0);

    res.json({
      success: true,
      data: {
        product_id: productId,
        total_stock: totalStock,
        warehouses: stock
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener movimientos de inventario
 */
const getMovements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, product_id, from_date, to_date } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('inventory_movements')
      .select('*, products(name, sku), users(name)', { count: 'exact' });

    if (type) query = query.eq('type', type);
    if (product_id) query = query.eq('product_id', product_id);
    if (from_date) query = query.gte('created_at', from_date);
    if (to_date) query = query.lte('created_at', to_date);

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: movements, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener Kardex de un producto
 */
const getKardex = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const { data: movements, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Calcular saldos acumulados
    let balance = 0;
    const kardex = movements.map(m => {
      balance += m.type === 'entry' ? m.quantity : -m.quantity;
      return { ...m, balance };
    });

    res.json({ success: true, data: kardex });
  } catch (error) {
    next(error);
  }
};

/**
 * Registrar entrada de inventario
 */
const createEntry = async (req, res, next) => {
  try {
    const { product_id, warehouse_id, quantity, unit_cost, notes, reference } = req.body;

    if (!product_id || !warehouse_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Producto, bodega y cantidad requeridos' }
      });
    }

    // Actualizar o insertar en inventario
    const { data: existingStock } = await supabase
      .from('inventory')
      .select('id, stock, total_cost')
      .eq('product_id', product_id)
      .eq('warehouse', warehouse_id)
      .single();

    const movement = {
      product_id, warehouse_id, type: 'entry',
      quantity, unit_cost: unit_cost || 0,
      total_cost: (unit_cost || 0) * quantity,
      notes, reference,
      created_by: req.user.id
    };

    if (existingStock) {
      const newQuantity = Number(existingStock.stock || 0) + Number(quantity);
      const newTotalCost = Number(existingStock.total_cost || 0) + (Number(unit_cost || 0) * Number(quantity));

      await supabase
        .from('inventory')
        .update({ stock: newQuantity, total_cost: newTotalCost })
        .eq('id', existingStock.id);
    } else {
      await supabase
        .from('inventory')
        .insert({ product_id, warehouse: warehouse_id, stock: Number(quantity), total_cost: (Number(unit_cost || 0) * Number(quantity)) });
    }

    const { data: entry, error } = await supabase
      .from('inventory_movements')
      .insert(movement)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

/**
 * Registrar salida de inventario
 */
const createExit = async (req, res, next) => {
  try {
    const { product_id, warehouse_id, quantity, notes, reference } = req.body;

    if (!product_id || !warehouse_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Producto, bodega y cantidad requeridos' }
      });
    }

    // Verificar stock suficiente
    const { data: existingStock } = await supabase
      .from('inventory')
      .select('id, stock')
      .eq('product_id', product_id)
      .eq('warehouse', warehouse_id)
      .single();

    if (!existingStock || Number(existingStock.stock || 0) < Number(quantity)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INSUFFICIENT_STOCK', message: 'Stock insuficiente' }
      });
    }

    const newQuantity = Number(existingStock.stock || 0) - Number(quantity);

    await supabase
      .from('inventory')
      .update({ stock: newQuantity })
      .eq('id', existingStock.id);

    const { data: exit, error } = await supabase
      .from('inventory_movements')
      .insert({
        product_id, warehouse_id, type: 'exit',
        quantity, notes, reference,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: exit });
  } catch (error) {
    next(error);
  }
};

/**
 * Ajuste de inventario
 */
const createAdjustment = async (req, res, next) => {
  try {
    const { product_id, warehouse_id, new_quantity, reason } = req.body;

    if (!product_id || !warehouse_id || new_quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Producto, bodega y nueva cantidad requeridos' }
      });
    }

    const { data: existingStock } = await supabase
      .from('inventory')
      .select('id, stock')
      .eq('product_id', product_id)
      .eq('warehouse', warehouse_id)
      .single();

    const oldQuantity = Number(existingStock?.stock || 0);
    const difference = Number(new_quantity) - oldQuantity;

    if (existingStock) {
      await supabase
        .from('inventory')
        .update({ stock: Number(new_quantity) })
        .eq('id', existingStock.id);
    } else {
      await supabase
        .from('inventory')
        .insert({ product_id, warehouse: warehouse_id, stock: Number(new_quantity) });
    }

    const { data: adjustment, error } = await supabase
      .from('inventory_movements')
      .insert({
        product_id, warehouse_id,
        type: difference > 0 ? 'adjustment_positive' : 'adjustment_negative',
        quantity: Math.abs(difference),
        notes: `Ajuste: ${reason || 'Sin razón'}. Cantidad anterior: ${oldQuantity}`,
        reference: `ADJ-${Date.now()}`,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: adjustment });
  } catch (error) {
    next(error);
  }
};

/**
 * Transferencia entre bodegas
 */
const createTransfer = async (req, res, next) => {
  try {
    const { product_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;

    if (!product_id || !from_warehouse_id || !to_warehouse_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Todos los campos son requeridos' }
      });
    }

    // Verificar stock en origen
    const { data: sourceStock } = await supabase
      .from('inventory')
      .select('id, stock')
      .eq('product_id', product_id)
      .eq('warehouse', from_warehouse_id)
      .single();

    if (!sourceStock || Number(sourceStock.stock || 0) < Number(quantity)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INSUFFICIENT_STOCK', message: 'Stock insuficiente en bodega origen' }
      });
    }

    // Restar de origen
    const newSourceQty = Number(sourceStock.stock || 0) - Number(quantity);
    await supabase
      .from('inventory')
      .update({ stock: newSourceQty })
      .eq('id', sourceStock.id);

    // Sumar a destino
    const { data: destStock } = await supabase
      .from('inventory')
      .select('id, stock')
      .eq('product_id', product_id)
      .eq('warehouse', to_warehouse_id)
      .single();

    if (destStock) {
      const newDestQty = Number(destStock.stock || 0) + Number(quantity);
      await supabase
        .from('inventory')
        .update({ stock: newDestQty })
        .eq('id', destStock.id);
    } else {
      await supabase
        .from('inventory')
        .insert({ product_id, warehouse: to_warehouse_id, stock: Number(quantity) });
    }

    // Registrar movimiento de salida
    await supabase.from('inventory_movements').insert({
      product_id, warehouse_id: from_warehouse_id, type: 'transfer_out',
      quantity, notes: `Transferencia a bodega ${to_warehouse_id}: ${notes || ''}`,
      reference: `TRF-${Date.now()}`, created_by: req.user.id
    });

    // Registrar movimiento de entrada
    await supabase.from('inventory_movements').insert({
      product_id, warehouse_id: to_warehouse_id, type: 'transfer_in',
      quantity, notes: `Transferencia desde bodega ${from_warehouse_id}: ${notes || ''}`,
      reference: `TRF-${Date.now()}`, created_by: req.user.id
    });

    res.json({ success: true, message: 'Transferencia completada exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Alertas de stock bajo
 */
const getStockAlerts = async (req, res, next) => {
  try {
    // Primero obtener el umbral desde la BD o usar 5 por defecto
    const { data: configData } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'low_stock_threshold')
      .eq('section', 'inventory')
      .single();

    const threshold = configData?.value || 5;

    const [lowStockResult, outOfStockResult] = await Promise.all([
      supabase
        .from('inventory')
        .select('*, products(name, sku, min_stock, max_stock)')
        .lte('stock', threshold)
        .gt('stock', 0),
      supabase
        .from('inventory')
        .select('*, products(name, sku, min_stock, max_stock)')
        .eq('stock', 0)
    ]);

    if (lowStockResult.error) throw lowStockResult.error;
    if (outOfStockResult.error) throw outOfStockResult.error;

    // Combinar y aplanar datos de productos para el frontend
    const allAlerts = [
      ...(lowStockResult.data || []),
      ...(outOfStockResult.data || [])
    ].map(item => ({
      ...item,
      name: item.products?.name || item.name || 'Producto',
      sku: item.products?.sku || item.sku || 'N/A',
      category_name: item.products?.categories?.name || '',
      products: undefined
    }));

    res.json({ success: true, data: allAlerts });
  } catch (error) {
    next(error);
  }
};

/**
 * Resumen de inventario
 */
const getInventorySummary = async (req, res, next) => {
  try {
    const { data: summary, error } = await supabase
      .from('inventory')
      .select(`
        product_id,
        quantity,
        products(name, sku, price, cost_price)
      `)
      .order('product_id');

    if (error) throw error;

    const totalProducts = summary.length;
    const totalStock = summary.reduce((sum, s) => sum + s.quantity, 0);
    const totalValue = summary.reduce((sum, s) => sum + (s.quantity * (s.products?.cost_price || 0)), 0);

    const lowStock = summary.filter(s => s.quantity <= (s.products?.min_stock || 0));
    const outOfStock = summary.filter(s => s.quantity <= 0);

    res.json({
      success: true,
      data: {
        total_products: totalProducts,
        total_stock: totalStock,
        total_value: totalValue,
        low_stock_count: lowStock.length,
        out_of_stock_count: outOfStock.length,
        low_stock_products: lowStock.slice(0, 10),
        out_of_stock_products: outOfStock.slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStock, getStockByProduct, getKardex, getMovements,
  createEntry, createExit, createAdjustment, createTransfer,
  getStockAlerts, getInventorySummary
};

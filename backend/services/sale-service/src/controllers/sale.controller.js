const { getSupabaseClient } = require('@inventory/shared');

const supabase = getSupabaseClient();

/**
 * Listar ventas
 */
const getSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, client_id, from_date, to_date } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('sales')
      .select('*, clients(name, email), users(name)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (client_id) query = query.eq('client_id', client_id);
    if (from_date) query = query.gte('created_at', from_date);
    if (to_date) query = query.lte('created_at', to_date);

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: sales, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: sales,
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
 * Obtener venta por ID
 */
const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: sale, error } = await supabase
      .from('sales')
      .select('*, clients(*), users(name), sale_items(*, products(name, sku, price, barcode, images))')
      .eq('id', id)
      .single();

    if (error || !sale) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Venta no encontrada' }
      });
    }

    res.json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear venta
 */
const createSale = async (req, res, next) => {
  try {
    const { client_id, items, payment_method, notes } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Productos requeridos' }
      });
    }

    // Generar número de venta (con fallback si la función RPC no existe)
    let saleNumber;
    const { data: saleNumberData, error: saleNumberError } = await supabase
      .rpc('generate_sale_number');

    if (saleNumberError || !saleNumberData) {
      // Fallback: generar número manualmente
      const { data: lastSale } = await supabase
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
      saleNumber = `SALE-${String(nextNum).padStart(8, '0')}`;
    } else {
      saleNumber = saleNumberData;
    }

    // Validar y calcular totales
    let subtotal = 0;
    const saleItems = [];

    for (const item of items) {
      // Obtener producto (el stock está en inventory, no en products)
      const { data: product } = await supabase
        .from('products')
        .select('id, price, name, sku')
        .eq('id', item.product_id)
        .single();

      if (!product) {
        return res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: `Producto ${item.product_id} no encontrado` }
        });
      }

      // Obtener stock desde inventory
      const { data: inventoryRecord } = await supabase
        .from('inventory')
        .select('id, stock, warehouse')
        .eq('product_id', item.product_id)
        .maybeSingle();

      const currentStock = inventoryRecord?.stock || 0;

      if (currentStock < item.quantity) {
        return res.status(400).json({
          success: false,
          error: { code: 'INSUFFICIENT_STOCK', message: `Stock insuficiente para ${product.name} (disponible: ${currentStock})` }
        });
      }

      const unitPrice = item.unit_price || product.price;
      const itemTotal = item.quantity * unitPrice;
      subtotal += itemTotal;

      saleItems.push({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unit_price: unitPrice,
        total: itemTotal
      });
    }

    const discount = req.body.discount || 0;
    const taxRate = req.body.tax_rate || 0.19;
    const tax = (subtotal - discount) * taxRate;
    const total = subtotal - discount + tax;

    // Crear venta
    const { data: sale, error } = await supabase
      .from('sales')
      .insert({
        sale_number: saleNumber,
        client_id: client_id || null,
        user_id: req.user.id,
        subtotal, discount, tax, total,
        payment_method: payment_method || 'cash',
        payment_status: 'paid',
        status: 'completed',
        notes
      })
      .select()
      .single();

    if (error) throw error;

    // Insertar items
    const itemsWithSaleId = saleItems.map(item => ({
      ...item,
      sale_id: sale.id
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsWithSaleId);

    if (itemsError) throw itemsError;

    // Actualizar stock y registrar movimientos
    for (const item of items) {
      const { data: currentStock } = await supabase
        .from('inventory')
        .select('id, stock, warehouse')
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (currentStock) {
        const previousStock = currentStock.stock;
        const newStock = previousStock - item.quantity;

        await supabase
          .from('inventory')
          .update({ stock: newStock })
          .eq('id', currentStock.id);

        // Registrar movimiento de salida por venta
        await supabase.from('inventory_movements').insert({
          product_id: item.product_id,
          warehouse: currentStock.warehouse || 'principal',
          type: 'exit',
          quantity: item.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_type: 'sale',
          reference_id: sale.id,
          reason: `Venta #${saleNumber}`,
          notes: `Salida por venta: ${saleNumber}`,
          user_id: req.user.id
        });
      }
    }

    res.status(201).json({
      success: true,
      data: { ...sale, items: itemsWithSaleId }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancelar venta
 */
const cancelSale = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: sale } = await supabase
      .from('sales')
      .select('*')
      .eq('id', id)
      .single();

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Venta no encontrada' }
      });
    }

    if (sale.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CANCELLED', message: 'La venta ya está cancelada' }
      });
    }

    // Revertir stock
    const { data: items } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', id);

    for (const item of items) {
      const { data: inventoryRecord } = await supabase
        .from('inventory')
        .select('id, stock, warehouse')
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (inventoryRecord) {
        const previousStock = inventoryRecord.stock;
        const newStock = previousStock + item.quantity;

        await supabase
          .from('inventory')
          .update({ stock: newStock })
          .eq('id', inventoryRecord.id);

        await supabase.from('inventory_movements').insert({
          product_id: item.product_id,
          warehouse: inventoryRecord.warehouse || 'principal',
          type: 'entry',
          quantity: item.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_type: 'sale_cancellation',
          reference_id: id,
          reason: `Cancelación de venta #${sale.sale_number}`,
          notes: `Reingreso por cancelación de venta: ${sale.sale_number}`,
          user_id: req.user.id
        });
      }
    }

    const { data: cancelled, error } = await supabase
      .from('sales')
      .update({ status: 'cancelled', payment_status: 'refunded' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: cancelled });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener ventas del cliente autenticado (para clientes)
 */
const getClientSales = async (req, res, next) => {
  try {
    // Obtener el client_id desde el usuario autenticado
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cliente no encontrado. Completa tu perfil primero.' }
      });
    }

    const { page = 1, limit = 12 } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: sales, count, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)', { count: 'exact' })
      .eq('client_id', client.id)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: {
        sales: sales || [],
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSales, getSaleById, createSale, cancelSale, getClientSales };

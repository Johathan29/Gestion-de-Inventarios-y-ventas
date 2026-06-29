const { getSupabaseClient } = require('@inventory/shared');

const supabase = getSupabaseClient();

/**
 * Listar compras
 */
const getPurchases = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, supplier_id, from_date, to_date } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('purchases')
      .select('*, suppliers(*), users(name)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (supplier_id) query = query.eq('supplier_id', supplier_id);
    if (from_date) query = query.gte('created_at', from_date);
    if (to_date) query = query.lte('created_at', to_date);

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: purchases, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: purchases,
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
 * Obtener compra por ID
 */
const getPurchaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: purchase, error } = await supabase
      .from('purchases')
      .select('*, suppliers(*), users(name), purchase_items(*, products(name, sku, barcode, images))')
      .eq('id', id)
      .single();

    if (error || !purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Compra no encontrada' }
      });
    }

    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear compra
 */
const createPurchase = async (req, res, next) => {
  try {
    let { supplier_id, items, notes } = req.body;

    if (!supplier_id || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Proveedor y productos requeridos' }
      });
    }

    // Obtener datos de productos (incluyendo barcode e imagen)
    const productIds = items.map(i => i.product_id).filter(Boolean);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku, barcode, images')
      .in('id', productIds);

    const productMap = {};
    if (products) {
      products.forEach(p => { productMap[p.id] = p; });
    }

    // Generar número de compra
    const { data: lastPurchase } = await supabase
      .from('purchases')
      .select('purchase_number')
      .order('created_at', { ascending: false })
      .limit(1);

    let purchaseNumber = 'PO-00000001';
    if (lastPurchase && lastPurchase.length > 0) {
      const lastNum = parseInt(lastPurchase[0].purchase_number.replace('PO-', ''), 10);
      purchaseNumber = `PO-${String(lastNum + 1).padStart(8, '0')}`;
    }

    // Calcular totales
    let subtotal = 0;
    const purchaseItems = items.map(item => {
      const unitCost = item.unit_cost || 0;
      const qty = item.quantity || 1;
      const itemTotal = qty * unitCost;
      subtotal += itemTotal;
      const product = productMap[item.product_id] || {};
      const productImage = Array.isArray(product.images) && product.images.length > 0
        ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url || '')
        : (item.product_image || '');
      return {
        product_id: item.product_id || null,
        product_name: product.name || item.product_name || 'Producto',
        sku: product.sku || item.sku || '',
        barcode: product.barcode || item.barcode || '',
        product_image: productImage,
        quantity: qty,
        unit_price: unitCost,
        total: itemTotal
      };
    });

    const tax = subtotal * 0.19; // IVA 19%
    const total = subtotal + tax;

    // Crear compra
    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        supplier_id,
        subtotal, tax, total,
        status: 'received',
        notes,
        user_id: req.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('[PurchaseService] Error creating purchase:', error);
      throw error;
    }

    // Insertar items
    const itemsWithPurchaseId = purchaseItems.map(item => ({
      ...item,
      purchase_id: purchase.id
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(itemsWithPurchaseId);

    if (itemsError) {
      console.error('[PurchaseService] Error inserting items:', itemsError);
      throw itemsError;
    }

    // Actualizar inventario (entrada) para cada producto
    for (const item of items) {
      const product = productMap[item.product_id] || {};
      const qty = item.quantity || 1;
      const unitCost = item.unit_cost || 0;

      // Actualizar/crear registro en inventory
      const { data: existingStock } = await supabase
        .from('inventory')
        .select('id, stock, total_cost')
        .eq('product_id', item.product_id)
        .single();

      if (existingStock) {
        await supabase
          .from('inventory')
          .update({
            stock: existingStock.stock + qty,
            total_cost: (existingStock.total_cost || 0) + (qty * unitCost),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStock.id);
      } else {
        await supabase
          .from('inventory')
          .insert({
            product_id: item.product_id,
            warehouse: 'principal',
            stock: qty,
            total_cost: qty * unitCost
          });
      }

      // Crear movimiento de inventario
      const { data: currentStock } = await supabase
        .from('inventory')
        .select('stock')
        .eq('product_id', item.product_id)
        .single();

      const prevStock = existingStock?.stock || 0;
      const newStock = currentStock?.stock || qty;

      await supabase
        .from('inventory_movements')
        .insert({
          product_id: item.product_id,
          warehouse: 'principal',
          type: 'entry',
          quantity: qty,
          previous_stock: prevStock,
          new_stock: newStock,
          reference_type: 'purchase',
          reference_id: purchase.id,
          reason: `Entrada por compra #${purchaseNumber}`,
          user_id: req.user.id,
          created_at: new Date().toISOString()
        });

      // Actualizar cost_price en products
      await supabase
        .from('products')
        .update({ cost_price: unitCost, updated_at: new Date().toISOString() })
        .eq('id', item.product_id);
    }

    res.status(201).json({
      success: true,
      data: { ...purchase, items: itemsWithPurchaseId }
    });
  } catch (error) {
    console.error('[PurchaseService] createPurchase error:', error);
    next(error);
  }
};

/**
 * Actualizar estado de compra
 */
const updatePurchaseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Estado inválido' }
      });
    }

    const { data: purchase, error } = await supabase
      .from('purchases')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener el siguiente número de compra
 */
const getNextPurchaseNumber = async (req, res, next) => {
  try {
    const { data: lastPurchase } = await supabase
      .from('purchases')
      .select('purchase_number')
      .order('created_at', { ascending: false })
      .limit(1);

    let purchaseNumber = 'PO-00000001';
    if (lastPurchase && lastPurchase.length > 0) {
      const lastNum = parseInt(lastPurchase[0].purchase_number.replace('PO-', ''), 10);
      purchaseNumber = `PO-${String(lastNum + 1).padStart(8, '0')}`;
    }

    res.json({ success: true, data: { purchase_number: purchaseNumber } });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancelar compra
 */
const cancelPurchase = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: purchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', id)
      .single();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Compra no encontrada' }
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CANCELLED', message: 'La compra ya está cancelada' }
      });
    }

    // Revertir inventario
    const { data: items } = await supabase
      .from('purchase_items')
      .select('*')
      .eq('purchase_id', id);

    for (const item of items) {
      const { data: stock } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .single();

      if (stock) {
        await supabase
          .from('inventory')
          .update({ quantity: stock.quantity - item.quantity })
          .eq('id', stock.id);
      }

      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        type: 'purchase_cancellation',
        quantity: item.quantity,
        notes: `Cancelación de compra #${id}`,
        reference: `CANCEL-${id}`,
        created_by: req.user.id
      });
    }

    const { data: cancelled, error } = await supabase
      .from('purchases')
      .update({ status: 'cancelled' })
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
 * Enviar productos de una compra a inventario
 * Procesa los items que aún no se han enviado a inventario/products
 */
const sendToInventory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: purchase } = await supabase
      .from('purchases')
      .select('*, purchase_items(*)')
      .eq('id', id)
      .single();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Compra no encontrada' }
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'No se puede procesar una compra cancelada' }
      });
    }

    const results = [];

    for (const item of purchase.purchase_items) {
      if (!item.product_id) continue;

      const qty = item.quantity || 1;
      const unitCost = item.unit_price || 0;

      // 1. Actualizar/crear registro en inventory
      const { data: existingStock } = await supabase
        .from('inventory')
        .select('id, stock, total_cost')
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (existingStock) {
        await supabase
          .from('inventory')
          .update({
            stock: existingStock.stock + qty,
            total_cost: (existingStock.total_cost || 0) + (qty * unitCost),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStock.id);
      } else {
        await supabase
          .from('inventory')
          .insert({
            product_id: item.product_id,
            warehouse: 'principal',
            stock: qty,
            total_cost: qty * unitCost
          });
      }

      // 2. Crear movimiento de inventario
      const { data: currentStock } = await supabase
        .from('inventory')
        .select('stock')
        .eq('product_id', item.product_id)
        .single();

      const prevStock = existingStock?.stock || 0;
      const newStock = currentStock?.stock || qty;

      await supabase
        .from('inventory_movements')
        .insert({
          product_id: item.product_id,
          warehouse: 'principal',
          type: 'entry',
          quantity: qty,
          previous_stock: prevStock,
          new_stock: newStock,
          reference_type: 'purchase',
          reference_id: purchase.id,
          reason: `Entrada por compra #${purchase.purchase_number}`,
          user_id: req.user.id,
          created_at: new Date().toISOString()
        });

      // 3. Actualizar cost_price en products
      await supabase
        .from('products')
        .update({ cost_price: unitCost, updated_at: new Date().toISOString() })
        .eq('id', item.product_id);

      results.push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: qty,
        status: 'processed'
      });
    }

    // 4. Si la compra está pendiente, marcarla como recibida
    if (purchase.status === 'pending' || purchase.status === 'approved') {
      await supabase
        .from('purchases')
        .update({ status: 'received', received_at: new Date().toISOString() })
        .eq('id', id);
    }

    res.json({
      success: true,
      message: 'Productos enviados a inventario correctamente',
      data: { processed: results.length, items: results }
    });
  } catch (error) {
    console.error('[PurchaseService] sendToInventory error:', error);
    next(error);
  }
};

/**
 * Actualizar un item de compra
 */
const updatePurchaseItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { product_name, quantity, unit_price, barcode, product_image } = req.body;

    // Verificar que la compra existe y no está cancelada
    const { data: purchase } = await supabase
      .from('purchases')
      .select('status')
      .eq('id', id)
      .single();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Compra no encontrada' }
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'No se puede modificar items de una compra cancelada' }
      });
    }

    const updateData = {};
    if (product_name !== undefined) updateData.product_name = product_name;
    if (quantity !== undefined) {
      updateData.quantity = quantity;
      updateData.total = quantity * (unit_price || 0);
    }
    if (unit_price !== undefined) {
      updateData.unit_price = unit_price;
      updateData.total = (quantity || 1) * unit_price;
    }
    if (barcode !== undefined) updateData.barcode = barcode;
    if (product_image !== undefined) updateData.product_image = product_image;

    const { data: updated, error } = await supabase
      .from('purchase_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('purchase_id', id)
      .select()
      .single();

    if (error) throw error;

    // Recalcular totales de la compra
    const { data: items } = await supabase
      .from('purchase_items')
      .select('total')
      .eq('purchase_id', id);

    const newSubtotal = items?.reduce((s, i) => s + Number(i.total || 0), 0) || 0;
    const newTax = newSubtotal * 0.19;
    const newTotal = newSubtotal + newTax;

    await supabase
      .from('purchases')
      .update({ subtotal: newSubtotal, tax: newTax, total: newTotal })
      .eq('id', id);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar un item de compra
 */
const deletePurchaseItem = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;

    // Verificar que la compra existe y no está cancelada
    const { data: purchase } = await supabase
      .from('purchases')
      .select('status')
      .eq('id', id)
      .single();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Compra no encontrada' }
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'No se puede modificar items de una compra cancelada' }
      });
    }

    const { error } = await supabase
      .from('purchase_items')
      .delete()
      .eq('id', itemId)
      .eq('purchase_id', id);

    if (error) throw error;

    // Recalcular totales de la compra
    const { data: items } = await supabase
      .from('purchase_items')
      .select('total')
      .eq('purchase_id', id);

    const newSubtotal = items?.reduce((s, i) => s + Number(i.total || 0), 0) || 0;
    const newTax = newSubtotal * 0.19;
    const newTotal = newSubtotal + newTax;

    await supabase
      .from('purchases')
      .update({ subtotal: newSubtotal, tax: newTax, total: newTotal })
      .eq('id', id);

    res.json({ success: true, message: 'Item eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchases, getPurchaseById, createPurchase, getNextPurchaseNumber,
  updatePurchaseStatus, cancelPurchase, sendToInventory,
  updatePurchaseItem, deletePurchaseItem
};

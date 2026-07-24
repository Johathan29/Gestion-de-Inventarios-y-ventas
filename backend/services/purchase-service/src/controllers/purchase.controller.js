const { getSupabaseClient } = require('@inventory/shared');

const supabase = getSupabaseClient();

/**
 * Listar compras
 */
const getPurchases = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, verification_status, supplier_id, from_date, to_date, search } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('purchases')
      .select('*, suppliers(*), users!purchases_user_id_fkey(name)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (verification_status) query = query.eq('verification_status', verification_status);
    if (supplier_id) query = query.eq('supplier_id', supplier_id);
    if (from_date) query = query.gte('created_at', from_date);
    if (to_date) query = query.lte('created_at', to_date);
    if (search) {
      query = query.or(`purchase_number.ilike.%${search}%,notes.ilike.%${search}%`);
    }

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
      .select('*, suppliers(*), users!purchases_user_id_fkey(name), purchase_items(*, products!purchase_items_product_id_fkey(name, sku, barcode, images))')
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
      return {
        product_id: item.product_id || null,
        product_name: product.name || item.product_name || 'Producto',
        sku: product.sku || item.sku || '',
        quantity: qty,
        unit_price: unitCost,
        total: itemTotal
      };
    });

    const tax = subtotal * 0.19; // IVA 19%
    const total = subtotal + tax;

    // Crear compra con verification_status = 'pending'
    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert({
        purchase_number: purchaseNumber,
        supplier_id,
        subtotal, tax, total,
        status: 'received',
        verification_status: 'pending',
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

      // Actualizar/crear registro en inventory con status='pending'
      // El stock se registra pero no está disponible para venta hasta verificación
      const { data: existingStock } = await supabase
        .from('inventory')
        .select('id, stock')
        .eq('product_id', item.product_id)
        .single();

      const currentQty = existingStock?.stock || 0;

      if (existingStock) {
        await supabase
          .from('inventory')
          .update({
            stock: currentQty + qty,
            status: 'pending',
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
            status: 'pending'
          });
      }

      // Crear movimiento de inventario
      await supabase
        .from('inventory_movements')
        .insert({
          product_id: item.product_id,
          warehouse: 'principal',
          type: 'entry',
          quantity: qty,
          previous_stock: currentQty,
          new_stock: currentQty + qty,
          reference_type: 'purchase',
          reference_id: purchase.id,
          reason: `Entrada por compra #${purchaseNumber} (pendiente de verificación)`,
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
      const { data: invRecord } = await supabase
        .from('inventory')
        .select('id, stock')
        .eq('product_id', item.product_id)
        .single();

      if (invRecord) {
        await supabase
          .from('inventory')
          .update({ stock: invRecord.stock - item.quantity })
          .eq('id', invRecord.id);
      }

      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        warehouse: 'principal',
        type: 'adjustment',
        quantity: item.quantity,
        previous_stock: invRecord?.stock || 0,
        new_stock: (invRecord?.stock || 0) - item.quantity,
        reference_type: 'purchase_cancellation',
        reference_id: id,
        reason: `Cancelación de compra #${purchase.purchase_number}`,
        user_id: req.user.id
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
      const qty = item.quantity || 1;
      const unitCost = item.unit_price || 0;
      let productId = item.product_id;

      // ============================================================
      // Si el item no tiene product_id, buscar por SKU o CREAR producto
      // ============================================================
      if (!productId) {
        // Intentar encontrar producto existente por SKU
        if (item.sku) {
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('sku', item.sku)
            .maybeSingle();
          if (existingProduct) {
            productId = existingProduct.id;
          }
        }

        // Si aún no hay productId, crear un nuevo producto
        if (!productId) {
          const productSlug = item.sku
            ? item.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            : 'producto-' + Date.now();

          const { data: newProduct, error: createError } = await supabase
            .from('products')
            .insert({
              name: item.product_name || 'Producto sin nombre',
              sku: item.sku || `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              barcode: item.barcode || null,
              slug: productSlug,
              price: unitCost, // Precio de venta por defecto = costo
              cost_price: unitCost,
              unit: 'unidad',
              min_stock: 5,
              images: item.product_image ? [item.product_image] : [],
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (createError) {
            console.error(`[PurchaseService] Error creating product for item "${item.product_name}":`, createError);
            results.push({
              product_id: null,
              product_name: item.product_name,
              quantity: qty,
              status: 'error',
              error: createError.message
            });
            continue;
          }

          productId = newProduct.id;

          // Actualizar el purchase_item con el nuevo product_id
          await supabase
            .from('purchase_items')
            .update({ product_id: productId })
            .eq('id', item.id);
        }
      }

      // 1. Actualizar/crear registro en inventory con status='pending'
      const { data: existingStock } = await supabase
        .from('inventory')
        .select('id, stock')
        .eq('product_id', productId)
        .maybeSingle();

      const currentQty = existingStock?.stock || 0;

      if (existingStock) {
        await supabase
          .from('inventory')
          .update({
            stock: currentQty + qty,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStock.id);
      } else {
        await supabase
          .from('inventory')
          .insert({
            product_id: productId,
            warehouse: 'principal',
            stock: qty,
            status: 'pending'
          });
      }

      // 2. Crear movimiento de inventario
      await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          warehouse: 'principal',
          type: 'entry',
          quantity: qty,
          previous_stock: currentQty,
          new_stock: currentQty + qty,
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
        .eq('id', productId);

      results.push({
        product_id: productId,
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

/**
 * Verificar una compra y marcar productos como disponibles para venta
 * Acepta verificación a nivel de items (cantidades verificadas/rechazadas)
 */
const verifyPurchase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items: verificationItems } = req.body;

    // Obtener compra con items
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select('*, purchase_items(*)')
      .eq('id', id)
      .single();

    if (fetchError || !purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Compra no encontrada' }
      });
    }

    if (purchase.verification_status === 'verified') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_VERIFIED', message: 'La compra ya está verificada' }
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'No se puede verificar una compra cancelada' }
      });
    }

    const now = new Date().toISOString();

    // Si se enviaron items de verificación, procesar cada uno
    if (verificationItems && verificationItems.length > 0) {
      for (const vi of verificationItems) {
        const purchaseItem = purchase.purchase_items.find(pi => pi.id === vi.item_id);
        if (!purchaseItem) continue;

        const verifiedQty = vi.verified_qty || 0;
        const rejectedQty = vi.rejected_qty || 0;

        await supabase
          .from('purchase_items')
          .update({
            verified_qty: verifiedQty,
            rejected_qty: rejectedQty,
            rejected_reason: vi.rejected_reason || null,
            verified_at: now,
            verified_by: req.user.id
          })
          .eq('id', vi.item_id);
      }
    } else {
      // Si no se enviaron items, verificar todo como aceptado
      for (const item of purchase.purchase_items) {
        await supabase
          .from('purchase_items')
          .update({
            verified_qty: item.quantity,
            rejected_qty: 0,
            verified_at: now,
            verified_by: req.user.id
          })
          .eq('id', item.id);
      }
    }

    // Actualizar verification_status de la compra
    await supabase
      .from('purchases')
      .update({
        verification_status: 'verified',
        verified_at: now,
        verified_by: req.user.id
      })
      .eq('id', id);

    // Actualizar inventory.status a 'available' para cada producto
    for (const item of purchase.purchase_items) {
      const { data: invRecord } = await supabase
        .from('inventory')
        .select('id, status')
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (invRecord && invRecord.status === 'pending') {
        await supabase
          .from('inventory')
          .update({ status: 'available', updated_at: now })
          .eq('id', invRecord.id);
      }
    }

    // Obtener compra actualizada
    const { data: updated } = await supabase
      .from('purchases')
      .select('*, purchase_items(*), suppliers(*), users!purchases_user_id_fkey(name)')
      .eq('id', id)
      .single();

    res.json({
      success: true,
      message: 'Compra verificada correctamente. Productos disponibles para venta.',
      data: updated
    });
  } catch (error) {
    console.error('[PurchaseService] verifyPurchase error:', error);
    next(error);
  }
};

module.exports = {
  getPurchases, getPurchaseById, createPurchase, getNextPurchaseNumber,
  updatePurchaseStatus, cancelPurchase, sendToInventory,
  updatePurchaseItem, deletePurchaseItem, verifyPurchase
};

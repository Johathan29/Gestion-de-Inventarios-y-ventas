const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TAX_RATE = 0.19;

/**
 * Obtener carrito del usuario
 */
const getCart = async (req, res, next) => {
  try {
    const { data: cart, error } = await supabase
      .from('carts')
      .select('*, cart_items(*, products(id, name, sku, price, images, stock))')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!cart) {
      return res.json({
        success: true,
        data: { items: [], subtotal: 0, tax: 0, discount: 0, total: 0, item_count: 0 }
      });
    }

    const items = cart.cart_items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const discount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
    const tax = (subtotal - discount) * TAX_RATE;
    const total = subtotal - discount + tax;

    res.json({
      success: true,
      data: {
        id: cart.id,
        items: items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product: item.products,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          subtotal: item.quantity * item.unit_price
        })),
        subtotal, discount, tax, total,
        item_count: items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Agregar item al carrito
 */
const addItem = async (req, res, next) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Producto requerido' }
      });
    }

    // Verificar producto y stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, stock, status')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado' }
      });
    }

    if (product.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { code: 'PRODUCT_INACTIVE', message: 'Producto no disponible' }
      });
    }

    // Obtener o crear carrito
    let { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!cart) {
      const { data: newCart, error: cartError } = await supabase
        .from('carts')
        .insert({ user_id: req.user.id })
        .select()
        .single();

      if (cartError) throw cartError;
      cart = newCart;
    }

    // Verificar si el producto ya está en el carrito
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('product_id', product_id)
      .single();

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          error: { code: 'INSUFFICIENT_STOCK', message: `Stock insuficiente. Disponible: ${product.stock}` }
        });
      }

      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id);

      if (updateError) throw updateError;
    } else {
      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          error: { code: 'INSUFFICIENT_STOCK', message: `Stock insuficiente. Disponible: ${product.stock}` }
        });
      }

      const { error: insertError } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id,
          quantity,
          unit_price: product.price
        });

      if (insertError) throw insertError;
    }

    res.status(201).json({ success: true, message: 'Producto agregado al carrito' });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar cantidad de un item
 */
const updateItemQuantity = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Cantidad inválida' }
      });
    }

    // Verificar stock
    const { data: item } = await supabase
      .from('cart_items')
      .select('*, products(stock)')
      .eq('id', itemId)
      .single();

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Item no encontrado en el carrito' }
      });
    }

    if (quantity > item.products.stock) {
      return res.status(400).json({
        success: false,
        error: { code: 'INSUFFICIENT_STOCK', message: `Stock insuficiente. Disponible: ${item.products.stock}` }
      });
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    if (error) throw error;

    res.json({ success: true, message: 'Cantidad actualizada' });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar item del carrito
 */
const removeItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    res.json({ success: true, message: 'Producto eliminado del carrito' });
  } catch (error) {
    next(error);
  }
};

/**
 * Vaciar carrito
 */
const clearCart = async (req, res, next) => {
  try {
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (cart) {
      await supabase.from('cart_items').delete().eq('cart_id', cart.id);
    }

    res.json({ success: true, message: 'Carrito vaciado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCart, addItem, updateItemQuantity, removeItem, clearCart };

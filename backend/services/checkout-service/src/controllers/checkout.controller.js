const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TAX_RATE = 0.19;

/**
 * Procesar checkout completo
 */
const processCheckout = async (req, res, next) => {
  try {
    const { shipping_address, payment_method, notes } = req.body;

    // Obtener carrito del usuario
    const { data: cart } = await supabase
      .from('carts')
      .select('*, cart_items(*, products(id, name, price, stock, status))')
      .eq('user_id', req.user.id)
      .single();

    if (!cart || !cart.cart_items?.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMPTY_CART', message: 'El carrito está vacío' }
      });
    }

    // Validar stock y calcular totales
    let subtotal = 0;
    const items = [];

    for (const item of cart.cart_items) {
      const product = item.products;

      if (!product || product.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: { code: 'PRODUCT_UNAVAILABLE', message: `${product?.name || 'Producto'} no disponible` }
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          error: { code: 'INSUFFICIENT_STOCK', message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` }
        });
      }

      const itemTotal = item.unit_price * item.quantity;
      subtotal += itemTotal;

      items.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: itemTotal
      });
    }

    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    // Crear la venta
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        client_id: req.user.id,
        subtotal,
        tax,
        total,
        payment_method: payment_method || 'cash',
        status: 'completed',
        notes,
        shipping_address: shipping_address || null,
        created_by: req.user.id,
        sale_date: new Date().toISOString()
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Insertar items de venta
    const saleItems = items.map(item => ({ ...item, sale_id: sale.id }));
    const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
    if (itemsError) throw itemsError;

    // Actualizar stock y registrar movimientos
    for (const item of items) {
      await supabase
        .from('products')
        .update({ stock: supabase.rpc('decrement', { x: item.quantity }) })
        .eq('id', item.product_id);

      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        type: 'sale_exit',
        quantity: item.quantity,
        notes: `Venta #${sale.id} - Checkout`,
        reference: `SALE-${sale.id}`,
        created_by: req.user.id
      });
    }

    // Generar factura automáticamente
    const invoiceNumber = `INV-${String(Date.now()).slice(-8)}`;
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        sale_id: sale.id,
        client_id: req.user.id,
        invoice_number: invoiceNumber,
        subtotal, tax, total,
        status: 'generated',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    // Limpiar carrito
    await supabase.from('cart_items').delete().eq('cart_id', cart.id);

    res.status(201).json({
      success: true,
      data: {
        sale: { id: sale.id, total, status: sale.status, created_at: sale.created_at },
        invoice: { id: invoice.id, number: invoiceNumber },
        items: saleItems
      },
      message: 'Compra realizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener métodos de pago disponibles
 */
const getPaymentMethods = async (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'cash', name: 'Efectivo' },
      { id: 'credit_card', name: 'Tarjeta de Crédito' },
      { id: 'debit_card', name: 'Tarjeta Débito' },
      { id: 'transfer', name: 'Transferencia Bancaria' },
      { id: 'nequi', name: 'Nequi' },
      { id: 'daviplata', name: 'Daviplata' }
    ]
  });
};

module.exports = { processCheckout, getPaymentMethods };

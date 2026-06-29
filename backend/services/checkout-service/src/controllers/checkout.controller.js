const { getSupabaseClient, BadRequestError, validate, checkoutSchema } = require('@inventory/shared');

const supabase = getSupabaseClient();

/**
 * Procesar checkout completo
 */
const processCheckout = [
  validate(checkoutSchema),
  async (req, res, next) => {
    try {
      const { shipping_address, payment_method, notes } = req.validatedBody;

      // Obtener carrito del usuario
      const { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('*, cart_items(*, products!inner(id, name, price, stock, status))')
        .eq('user_id', req.user.id)
        .single();

      if (cartError) throw cartError;

      if (!cart || !cart.cart_items?.length) {
        throw new BadRequestError('El carrito está vacío');
      }

      // Validar stock y calcular totales
      let subtotal = 0;
      const items = [];

      for (const item of cart.cart_items) {
        const product = item.products;

        if (!product || product.status !== 'active') {
          throw new BadRequestError(`${product?.name || 'Producto'} no disponible`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestError(
            `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`
          );
        }

        const itemTotal = Number((item.unit_price * item.quantity).toFixed(2));
        subtotal += itemTotal;

        items.push({
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: itemTotal
        });
      }

      // Obtener IVA desde configuración del sistema
      const { data: config } = await supabase
        .from('system_config')
        .select('iva_rate')
        .single();
      const taxRate = config?.iva_rate ? parseFloat(config.iva_rate) / 100 : 0.19;

      const tax = Number((subtotal * taxRate).toFixed(2));
      const total = Number((subtotal + tax).toFixed(2));

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

      // Actualizar stock y registrar movimientos (usando UPDATE directo, no RPC)
      for (const item of items) {
        // Leer stock actual antes de actualizar (transaccional)
        const { data: currentProduct, error: fetchError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        if (fetchError) throw fetchError;
        if (!currentProduct || currentProduct.stock < item.quantity) {
          throw new BadRequestError(
            `Stock insuficiente para el producto ${item.product_name}`
          );
        }

        const newStock = currentProduct.stock - item.quantity;
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product_id);

        if (stockError) throw stockError;

        const { error: movError } = await supabase.from('inventory_movements').insert({
          product_id: item.product_id,
          type: 'sale_exit',
          quantity: item.quantity,
          notes: `Venta #${sale.id} - Checkout`,
          reference: `SALE-${sale.id}`,
          created_by: req.user.id
        });

        if (movError) throw movError;
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
}];

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

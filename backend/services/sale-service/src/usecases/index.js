// ============================================================
// Sales Use Cases
// ============================================================

import { Sale, SaleItem, SALE_STATUSES, PAYMENT_STATUSES } from '../domain/sales.js';
import { SaleCreatedEvent, SaleCancelledEvent, SaleCompletedEvent, CheckoutCompletedEvent } from '../events/index.js';

/**
 * Stock real de un producto base = suma de `inventory.stock` en todos los
 * almacenes. `products` NO tiene columna `stock`; el inventario vive en `inventory`.
 */
async function getProductStock(supabase, productId) {
  const { data, error } = await supabase
    .from('inventory')
    .select('stock')
    .eq('product_id', productId)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).reduce((sum, r) => sum + (Number(r.stock) || 0), 0);
}

/**
 * Reduce inventory stock and record movement for each sale item
 */
async function updateInventoryStock(supabase, items, saleId, userId, isRestore = false) {
  for (const item of items) {
    if (item.variantId) {
      // Handle variant items
      if (isRestore) {
        // DB revert trigger may not fire, so restore variant stock at app level
        const { data: variant, error: findErr } = await supabase
          .from('product_variants')
          .select('stock')
          .eq('id', item.variantId)
          .maybeSingle();

        if (findErr || !variant) continue;

        const newStock = variant.stock + item.quantity;

        await supabase
          .from('product_variants')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.variantId);

        // Also restore main inventory stock for consistency
        const { data: inv } = await supabase
          .from('inventory')
          .select('id, stock')
          .eq('product_id', item.productId)
          .maybeSingle();

        if (inv) {
          await supabase
            .from('inventory')
            .update({ stock: inv.stock + item.quantity, updated_at: new Date().toISOString() })
            .eq('id', inv.id);
        }

        await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.productId,
            type: 'entry',
            quantity: item.quantity,
            previous_stock: variant.stock,
            new_stock: newStock,
            reference_type: 'sale_cancel',
            reference_id: saleId,
            reason: 'Venta anulada - reversión de inventario (variante: ' + (item.variantName || '') + ')',
            user_id: userId || null,
            variant_id: item.variantId,
          });
      }
      // On sale creation, the DB trigger decrease_stock_from_sale() handles variant stock
      // AND inventory stock (updated in migration 025)
      continue;
    }

    // Non-variant item: update main inventory
    const { data: inv, error: findError } = await supabase
      .from('inventory')
      .select('id, stock')
      .eq('product_id', item.productId)
      .maybeSingle();

    if (findError) continue; // skip if error

    if (inv) {
      const quantityChange = isRestore ? item.quantity : -item.quantity;
      const newStock = Math.max(0, inv.stock + quantityChange);
      const movementType = isRestore ? 'entry' : 'exit';

      // Update stock
      await supabase
        .from('inventory')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', inv.id);

      // Record movement
      await supabase
        .from('inventory_movements')
        .insert({
          product_id: item.productId,
          type: movementType,
          quantity: item.quantity,
          previous_stock: inv.stock,
          new_stock: newStock,
          reference_type: 'sale',
          reference_id: saleId,
          reason: isRestore ? 'Venta anulada' : 'Venta realizada',
          user_id: userId || null,
        });
    }
  }
}

/**
 * Map internal payment method key to human-readable name
 */
const PAYMENT_METHOD_NAMES = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  check: 'Cheque',
  credit: 'Crédito',
};

/**
 * Auto-generate an invoice record from a completed sale,
 * enriching it with client details, seller info, and all
 * fiscal/electronic fields available in the invoices table.
 */
async function autoCreateInvoice(supabase, sale, userId, source) {
  // -------------------------------------------------------
  // 1. Enrich client data from the clients table
  // -------------------------------------------------------
  let clientId = sale.clientId || null;
  let clientName = '';
  let clientEmail = '';
  let clientPhone = '';
  let clientDocumentType = '';
  let clientDocumentNumber = '';
  let clientAddress = '';

  // If no clientId, try to look up by userId (e-commerce checkout)
  if (!clientId && userId) {
    const { data: clientByUser } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (clientByUser) {
      clientId = clientByUser.id;
    }
  }

  // If still no client, use generic "Consumidor Final" for POS
  if (!clientId) {
    const { data: genericClient } = await supabase
      .from('clients')
      .select('id')
      .eq('document_number', '0000000000')
      .maybeSingle();
    if (genericClient) {
      clientId = genericClient.id;
    }
  }

  if (clientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('name, email, phone, document_type, document_number, address, city, state')
      .eq('id', clientId)
      .maybeSingle();

    if (client) {
      clientName = client.name || '';
      clientEmail = client.email || '';
      clientPhone = client.phone || '';
      clientDocumentType = (client.document_type || '').toUpperCase();
      clientDocumentNumber = client.document_number || '';
      const cityState = [client.city, client.state].filter(Boolean).join(', ');
      clientAddress = [client.address, cityState].filter(Boolean).join(', ');
    }
  }

  // -------------------------------------------------------
  // 2. Enrich seller data from the users table
  // -------------------------------------------------------
  let sellerName = '';
  if (userId) {
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .maybeSingle();

    if (user) {
      sellerName = user.name || '';
    }
  }

  // -------------------------------------------------------
  // 3. Generate invoice number (sequential INV-XXXXXXXX)
  // -------------------------------------------------------
  const { data: lastInv } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (lastInv?.invoice_number) {
    const match = lastInv.invoice_number.match(/INV-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const invoiceNumber = `INV-${String(nextNum).padStart(8, '0')}`;

  // -------------------------------------------------------
  // 4. Map payment method to display name
  // -------------------------------------------------------
  const paymentMethodKey = sale.paymentMethod || 'cash';
  const paymentMethodName = PAYMENT_METHOD_NAMES[paymentMethodKey] || paymentMethodKey;

  // -------------------------------------------------------
  // 5. Build & insert the invoice with ALL available fields
  // -------------------------------------------------------
  const invoicePayload = {
    invoice_number: invoiceNumber,
    sale_id: sale.id,
    client_id: clientId,
    user_id: userId,
    subtotal: sale.subtotal || 0,
    discount: sale.discount || 0,
    tax: sale.tax || 0,
    total: sale.total || 0,
    status: 'issued',
    invoice_type: 'consumer_final',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

    // --- Client fiscal info ---
    client_document_type: clientDocumentType,
    client_document_number: clientDocumentNumber,
    client_name: clientName,
    client_address: clientAddress,
    client_phone: clientPhone,
    client_email: clientEmail,

    // --- Seller / business info ---
    seller_name: sellerName,
    payment_method_name: paymentMethodName,
    branch: '',
    cash_register: '',

    // --- Electronic invoice defaults ---
    ncf: null,
    is_electronic: false,
    electronic_status: 'pending',
  };

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert(invoicePayload)
    .select()
    .single();

  if (error) {
    console.error('Failed to auto-create invoice:', error);
    return null;
  }

  // -------------------------------------------------------
  // 6. Items: snapshot fiscal inmutable en invoice_items (Fase 7)
  //    Se copian los sale_items recién creados → la factura
  //    histórica NO cambia aunque el producto cambie después.
  // -------------------------------------------------------
  if (invoice && sale.id) {
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('id, product_id, product_name, sku, quantity, unit_price, discount, tax, total, variant_id, variant_name, variant_attributes')
      .eq('sale_id', sale.id);

    if (saleItems && saleItems.length > 0) {
      // Fallback robusto: si algún sale_item no tiene product_name/sku
      // (ventas POS legadas o flujos que no los enviaron), resolverlos
      // desde `products` para que el snapshot fiscal quede completo.
      const needsEnrich = saleItems.some(si => !si.product_name || !si.sku);
      if (needsEnrich) {
        const ids = [...new Set(saleItems.map(si => si.product_id).filter(Boolean))];
        if (ids.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name, sku')
            .in('id', ids);
          const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));
          for (const si of saleItems) {
            const p = productMap[si.product_id] || {};
            if (!si.product_name) si.product_name = p.name || '';
            if (!si.sku) si.sku = p.sku || '';
          }
        }
      }

      const rows = saleItems.map(si => ({
        invoice_id: invoice.id,
        sale_item_id: si.id,
        product_id: si.product_id,
        description: si.product_name,
        sku: si.sku,
        quantity: si.quantity,
        unit_price: si.unit_price,
        discount: si.discount || 0,
        tax: si.tax || 0,
        total: si.total,
        variant_id: si.variant_id,
        variant_name: si.variant_name,
        variant_attributes: si.variant_attributes,
      }));
      const { error: itemsErr } = await supabase
        .from('invoice_items')
        .insert(rows);
      if (itemsErr) {
        console.error('Failed to write invoice_items snapshot:', itemsErr);
      }
    }
  }

  return invoice;
}

export class CreateSaleUseCase {
  constructor({ saleRepository, eventBus, supabase }) {
    this._saleRepository = saleRepository;
    this._eventBus = eventBus;
    this._supabase = supabase;
  }

  async execute({ clientId, items, paymentMethod, notes, shippingAddress, discount = 0, taxRate = 0.19, userId, source }) {
    const saleNumber = await this._saleRepository.getNextNumber();

    const sale = new Sale({
      id: crypto.randomUUID(),
      saleNumber,
      clientId: clientId || null,
      userId,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: PAYMENT_STATUSES.PAID,
      status: SALE_STATUSES.COMPLETED,
      notes: notes || '',
      shippingAddress: shippingAddress || null,
      source: source || 'pos',
    });

    // Enriquecer items POS con nombre/SKU/precio del producto: el snapshot
    // fiscal (invoice_items) y las respuestas de venta necesitan product_name;
    // el precio SIEMPRE proviene del servidor cuando el cliente no lo envía.
    const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
    let productMeta = {};
    let variantMeta = {};
    if (this._supabase && productIds.length > 0) {
      const { data: products } = await this._supabase
        .from('products')
        .select('id, name, sku, price')
        .in('id', productIds);
      if (products && products.length > 0) {
        productMeta = Object.fromEntries(products.map(p => [p.id, p]));
      }
      const variantIds = [...new Set(items.map(i => i.variantId).filter(Boolean))];
      if (variantIds.length > 0) {
        const { data: variants } = await this._supabase
          .from('product_variants')
          .select('id, price')
          .in('id', variantIds);
        if (variants && variants.length > 0) {
          variantMeta = Object.fromEntries(variants.map(v => [v.id, v]));
        }
      }
    }

    const saleItems = items.map(i => {
      const p = productMeta[i.productId] || {};
      const v = variantMeta[i.variantId] || {};
      const unitPrice = Number(i.unitPrice) || Number(v.price) || Number(p.price) || 0;
      return new SaleItem({
        id: crypto.randomUUID(),
        productId: i.productId,
        productName: i.productName || p.name || '',
        sku: i.sku || p.sku || '',
        quantity: i.quantity,
        unitPrice,
        discount: i.discount || 0,
        total: i.quantity * unitPrice - (i.discount || 0),
        variantId: i.variantId || null,
      });
    });

    sale.setItems(saleItems);
    sale._discount = discount;
    sale._tax = (sale._subtotal - discount) * taxRate;
    sale._total = sale._subtotal - discount + sale._tax;

    const saved = await this._saleRepository.saveAtomic(sale);

    // Auto-generate invoice from the completed sale
    if (this._supabase && saved) {
      const invoice = await autoCreateInvoice(this._supabase, saved, userId, source || 'pos');
      if (invoice) {
        // Link the invoice back to the sale so GET /sales/:id returns invoiceId
        await this._supabase.from('sales').update({ invoice_id: invoice.id }).eq('id', saved.id);
        saved._invoiceId = invoice.id;
      }
    }

    // Con outbox (migración 049) los eventos ya se escribieron en la misma
    // transacción y el relay los publica. Solo publicar manualmente si el RPC
    // no existe (fallback al save() clásico) para no duplicar eventos.
    if (!saved?._usedOutbox) {
      await this._eventBus.publish(new SaleCreatedEvent(saved));
      await this._eventBus.publish(new SaleCompletedEvent(saved));
    }

    return saved;
  }
}

export class GetSaleUseCase {
  constructor({ saleRepository }) {
    this._saleRepository = saleRepository;
  }

  async execute(id) {
    const sale = await this._saleRepository.findById(id);
    if (!sale) throw new Error('NOT_FOUND');
    return sale;
  }
}

export class ListSalesUseCase {
  constructor({ saleRepository }) {
    this._saleRepository = saleRepository;
  }

  async execute(query) {
    return this._saleRepository.findMany(query);
  }
}

export class GetClientSalesUseCase {
  constructor({ saleRepository }) {
    this._saleRepository = saleRepository;
  }

  async execute(clientId, query) {
    return this._saleRepository.findByClient(clientId, query);
  }
}

export class CancelSaleUseCase {
  constructor({ saleRepository, eventBus, supabase }) {
    this._saleRepository = saleRepository;
    this._eventBus = eventBus;
    this._supabase = supabase;
  }

  async execute({ id, userId }) {
    const sale = await this._saleRepository.findById(id);
    if (!sale) throw new Error('NOT_FOUND');
    if (sale.status === SALE_STATUSES.CANCELLED) throw new Error('ALREADY_CANCELLED');

    sale.cancel();
    await this._saleRepository.updateStatus(sale.id, sale.status, sale.paymentStatus);

    // Restore inventory stock
    if (this._supabase && sale.items?.length) {
      await updateInventoryStock(this._supabase, sale.items, sale.id, userId, true);
    }

    await this._eventBus.publish(new SaleCancelledEvent(sale));
    return this._saleRepository.findById(sale.id);
  }
}

export class GetCartUseCase {
  constructor({ cartRepository }) {
    this._cartRepository = cartRepository;
  }

  async execute(userId) {
    const cart = await this._cartRepository.findByUser(userId);
    if (!cart) {
      return { items: [], subtotal: 0, discount: 0, tax: 0, total: 0, itemCount: 0 };
    }
    return cart.toJSON();
  }
}

export class AddCartItemUseCase {
  constructor({ cartRepository, supabase }) {
    this._cartRepository = cartRepository;
    this._supabase = supabase;
  }

  async execute({ productId, quantity, userId, variantId }) {
    // Seguridad: el precio SIEMPRE proviene del servidor, nunca del cliente.
    const product = await this._resolveServerProduct(productId, variantId);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    const qty = quantity || 1;
    if (product.stock <= 0) throw new Error('OUT_OF_STOCK');

    let unitPrice = product.price;

    // Aplicar oferta activa si existe (solo para producto base, no variantes)
    if (!variantId) {
      try {
        const { data: offer } = await this._supabase
          .from('offers')
          .select('discount_percent')
          .eq('product_id', productId)
          .eq('active', true)
          .or(`end_date.gte.${new Date().toISOString()},end_date.is.null`)
          .maybeSingle();

        if (offer) {
          unitPrice = product.price * (1 - Number(offer.discount_percent) / 100);
        }
      } catch (err) {
        console.warn(`[AddCartItem] Error checking offers: ${err.message}`);
      }
    }

    const cart = await this._cartRepository.findOrCreate(userId);
    await this._cartRepository.addItem(cart.id, productId, qty, unitPrice, variantId);
    return this._cartRepository.findByUser(userId);
  }

  /**
   * Resuelve producto o variante desde el servidor con su precio y stock reales.
   */
  async _resolveServerProduct(productId, variantId) {
    if (variantId) {
      const { data: variant, error } = await this._supabase
        .from('product_variants')
        .select('id, product_id, price, stock')
        .eq('id', variantId)
        .maybeSingle();
      if (error) throw error;
      return variant
        ? { id: variant.product_id, price: Number(variant.price) || 0, stock: Number(variant.stock) || 0 }
        : null;
    }
    const { data: product, error } = await this._supabase
      .from('products')
      .select('id, price')
      .eq('id', productId)
      .maybeSingle();
    if (error) throw error;
    if (!product) return null;
    const stock = await getProductStock(this._supabase, productId);
    return { id: product.id, price: Number(product.price) || 0, stock };
  }
}

export class UpdateCartItemUseCase {
  constructor({ cartRepository }) {
    this._cartRepository = cartRepository;
  }

  async execute({ itemId, quantity }) {
    await this._cartRepository.updateItemQuantity(itemId, quantity);
  }
}

export class RemoveCartItemUseCase {
  constructor({ cartRepository }) {
    this._cartRepository = cartRepository;
  }

  async execute(itemId) {
    await this._cartRepository.removeItem(itemId);
  }
}

export class ClearCartUseCase {
  constructor({ cartRepository }) {
    this._cartRepository = cartRepository;
  }

  async execute(userId) {
    const cart = await this._cartRepository.findByUser(userId);
    if (cart) {
      await this._cartRepository.clearCart(cart.id);
    }
  }
}

export class CheckoutUseCase {
  constructor({ cartRepository, saleRepository, eventBus, supabase }) {
    this._cartRepository = cartRepository;
    this._saleRepository = saleRepository;
    this._eventBus = eventBus;
    this._supabase = supabase;
  }

  async execute({ shipping, payment, shippingAddress, paymentMethod, notes, userId, source }) {
    const cart = await this._cartRepository.findByUser(userId);
    if (!cart || cart.items.length === 0) throw new Error('EMPTY_CART');

    // Normalizar pago y envío: nueva forma { shipping, payment } o antigua (POS)
    const method = payment?.method || paymentMethod || 'cash';
    const address = shipping
      ? [shipping.address, shipping.city, shipping.state].filter(Boolean).join(', ')
      : shippingAddress || null;

    // Seguridad: validar existencias antes de crear la venta
    await this._validateStock(cart.items);

    // Resolve client from the authenticated user
    let clientId = null;
    if (this._supabase && userId) {
      const { data: clientByUser } = await this._supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (clientByUser) {
        clientId = clientByUser.id;
      }
    }

    const saleNumber = await this._saleRepository.getNextNumber();
    const sale = new Sale({
      id: crypto.randomUUID(),
      saleNumber,
      clientId,
      userId,
      paymentMethod: method,
      paymentStatus: PAYMENT_STATUSES.PAID,
      status: SALE_STATUSES.COMPLETED,
      notes: notes || '',
      shippingAddress: address,
      source: source || 'ecommerce',
    });

    // ---------------------------------------------------------------
    // Pago con tarjeta tokenizada → cobrar vía payment-service (pasarela)
    // Se cobra ANTES de crear la venta: si el pago es rechazado, la
    // venta ni siquiera se crea. El token NUNCA se persiste.
    // ---------------------------------------------------------------
    const token = payment?.token || null;
    const savedCardId = payment?.savedCardId || null;

    if (method === 'card' && (token || savedCardId)) {
      const paymentStatus = await this._chargeWithGateway({
        saleId: sale.id,
        amount: sale.total,
        token,
        savedCardId,
      });
      if (paymentStatus === 'failed') throw new Error('PAYMENT_DECLINED');
      sale._paymentStatus = paymentStatus; // 'paid' | 'pending'
    }

    const saleItems = cart.items.map(i => new SaleItem({
      id: crypto.randomUUID(),
      productId: i.productId,
      productName: i.product?.name || '',
      sku: i.product?.sku || '',
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.quantity * i.unitPrice,
      variantId: i.variantId || null,
      variantName: i.variantName || null,
      variantAttributes: i.variantAttributes || null,
    }));

    sale.setItems(saleItems);
    const savedSale = await this._saleRepository.saveAtomic(sale);

    // Auto-generate invoice from the completed sale
    if (this._supabase && savedSale) {
      const invoice = await autoCreateInvoice(this._supabase, savedSale, userId, source || 'ecommerce');
      if (invoice) {
        // Link the invoice back to the sale so GET /sales/:id returns invoiceId
        await this._supabase.from('sales').update({ invoice_id: invoice.id }).eq('id', savedSale.id);
        savedSale._invoiceId = invoice.id;
      }
    }

    // Clear cart
    await this._cartRepository.clearCart(cart.id);

    // Con outbox (migración 049) los eventos ya se escribieron en la misma
    // transacción y el relay los publica. Solo publicar manualmente si el RPC
    // no existe (fallback al save() clásico) para no duplicar eventos.
    if (!savedSale?._usedOutbox) {
      await this._eventBus.publish(new CheckoutCompletedEvent({ cart, sale: savedSale }));
      await this._eventBus.publish(new SaleCreatedEvent(savedSale));
      await this._eventBus.publish(new SaleCompletedEvent(savedSale));
    }

    return savedSale;
  }

  /**
   * Cobra el pago con tarjeta tokenizada vía payment-service.
   * Devuelve 'paid' | 'pending' | 'failed'.
   * Fallback tolerante: si payment-service no responde, la venta se
   * crea con payment_status 'pending' (se cobrará/verificará luego).
   */
  async _chargeWithGateway({ saleId, amount, token, savedCardId }) {
    const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3019';
    const payload = {
      saleId,
      paymentMethodCode: 'card',
      amount,
      idempotencyKey: saleId, // reintentos seguros: misma venta = mismo cobro
      ...(token ? { token } : {}),
      ...(savedCardId ? { cardId: savedCardId } : {}),
    };

    try {
      const resp = await fetch(`${PAYMENT_SERVICE_URL}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        const message = errBody.message || errBody.error || '';
        // Si el error indica tarjeta rechazada → fallar el checkout
        if (/declin|rechaz|PAYMENT_DECLINED/i.test(message)) return 'failed';
        return 'pending';
      }

      const body = await resp.json();
      const status = body?.data?.status;
      // Máquina de estados Fase 6: 'captured' es el estado objetivo;
      // 'completed' se acepta por retro-compatibilidad (migración 074).
      if (status === 'captured' || status === 'completed') return 'paid';
      if (status === 'failed') return 'failed';
      return 'pending';
    } catch (err) {
      console.warn(`[Checkout] payment-service no disponible (${err.message}); venta marcada como pending`);
      return 'pending';
    }
  }

  /**
   * Verifica que exista stock suficiente para cada item del carrito
   * (productos y variantes) antes de crear la venta.
   */
  async _validateStock(items) {
    if (!this._supabase) return;

    // Productos base — el stock real se agrega desde `inventory` (products no tiene columna stock)
    const productIds = [...new Set(items.filter(i => !i.variantId).map(i => i.productId))];
    if (productIds.length > 0) {
      const { data: invRows, error } = await this._supabase
        .from('inventory')
        .select('product_id, stock')
        .in('product_id', productIds)
        .is('deleted_at', null);
      if (error) throw error;
      const stockMap = {};
      for (const row of invRows || []) {
        stockMap[row.product_id] = (stockMap[row.product_id] || 0) + (Number(row.stock) || 0);
      }
      for (const item of items) {
        if (item.variantId) continue;
        const available = stockMap[item.productId] ?? 0;
        if (available < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${item.productId}`);
        }
      }
    }

    // Variantes
    const variantIds = [...new Set(items.filter(i => i.variantId).map(i => i.variantId))];
    if (variantIds.length > 0) {
      const { data: variants, error } = await this._supabase
        .from('product_variants')
        .select('id, stock')
        .in('id', variantIds);
      if (error) throw error;
      const stockMap = Object.fromEntries((variants || []).map(v => [v.id, Number(v.stock) || 0]));
      for (const item of items) {
        if (!item.variantId) continue;
        const available = stockMap[item.variantId] ?? 0;
        if (available < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${item.variantId}`);
        }
      }
    }
  }
}

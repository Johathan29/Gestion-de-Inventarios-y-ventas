// ============================================================
// Sales Use Cases
// ============================================================

import { Sale, SaleItem, SALE_STATUSES, PAYMENT_STATUSES } from '../domain/sales.js';
import { SaleCreatedEvent, SaleCancelledEvent, SaleCompletedEvent, CheckoutCompletedEvent } from '../events/index.js';

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
  // 6. Items: No se insertan en tabla separada.
  //    Se obtienen dinámicamente desde sale_items vía sale_id
  //    (ver invoice-service repository findById).
  // -------------------------------------------------------

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

    const saleItems = items.map(i => new SaleItem({
      id: crypto.randomUUID(),
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice || 0,
      discount: i.discount || 0,
      total: i.quantity * (i.unitPrice || 0) - (i.discount || 0),
      variantId: i.variantId || null,
    }));

    sale.setItems(saleItems);
    sale._discount = discount;
    sale._tax = (sale._subtotal - discount) * taxRate;
    sale._total = sale._subtotal - discount + sale._tax;

    const saved = await this._saleRepository.save(sale);

    // Auto-generate invoice from the completed sale
    if (this._supabase && saved) {
      await autoCreateInvoice(this._supabase, saved, userId, source || 'pos');
    }

    await this._eventBus.publish(new SaleCreatedEvent(saved));
    await this._eventBus.publish(new SaleCompletedEvent(saved));

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

  async execute({ productId, quantity, unitPrice, userId, variantId }) {
    // If unitPrice not provided, check for active offers first
    if (!unitPrice && !variantId) {
      try {
        const { data: offer } = await this._supabase
          .from('offers')
          .select('discount_percent')
          .eq('product_id', productId)
          .eq('active', true)
          .or(`end_date.gte.${new Date().toISOString()},end_date.is.null`)
          .maybeSingle();

        if (offer) {
          const { data: product } = await this._supabase
            .from('products')
            .select('price')
            .eq('id', productId)
            .single();

          if (product) {
            unitPrice = product.price * (1 - Number(offer.discount_percent) / 100);
          }
        }
      } catch (err) {
        console.warn(`[AddCartItem] Error checking offers: ${err.message}`);
      }
    }

    const cart = await this._cartRepository.findOrCreate(userId);
    await this._cartRepository.addItem(cart.id, productId, quantity, unitPrice, variantId);
    return this._cartRepository.findByUser(userId);
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

  async execute({ shippingAddress, paymentMethod, notes, userId, source }) {
    const cart = await this._cartRepository.findByUser(userId);
    if (!cart || cart.items.length === 0) throw new Error('EMPTY_CART');

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
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: PAYMENT_STATUSES.PAID,
      status: SALE_STATUSES.COMPLETED,
      notes: notes || '',
      shippingAddress: shippingAddress || null,
    });

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
    const savedSale = await this._saleRepository.save(sale);

    // Auto-generate invoice from the completed sale
    if (this._supabase && savedSale) {
      await autoCreateInvoice(this._supabase, savedSale, userId, source || 'ecommerce');
    }

    // Clear cart
    await this._cartRepository.clearCart(cart.id);

    await this._eventBus.publish(new CheckoutCompletedEvent({ cart, sale: savedSale }));
    await this._eventBus.publish(new SaleCreatedEvent(savedSale));
    await this._eventBus.publish(new SaleCompletedEvent(savedSale));

    return savedSale;
  }
}

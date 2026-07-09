// ============================================================
// Sales Domain — Sale, SaleItem, Cart, CartItem, Checkout
// ============================================================

import { AggregateRoot, Entity } from '@erp/shared-kernel';

export const SALE_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};

export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'check', 'credit'];

export class SaleItem extends Entity {
  constructor({ id, saleId, productId, productName, sku, quantity, unitPrice, discount, total, createdAt }) {
    super(id);
    this._saleId = saleId;
    this._productId = productId;
    this._productName = productName;
    this._sku = sku;
    this._quantity = quantity;
    this._unitPrice = unitPrice;
    this._discount = discount || 0;
    this._total = total || (quantity * unitPrice);
    this._createdAt = createdAt || new Date();
  }

  get saleId() { return this._saleId; }
  get productId() { return this._productId; }
  get productName() { return this._productName; }
  get sku() { return this._sku; }
  get quantity() { return this._quantity; }
  get unitPrice() { return this._unitPrice; }
  get discount() { return this._discount; }
  get total() { return this._total; }
  get createdAt() { return this._createdAt; }

  toJSON() {
    return {
      id: this.id, saleId: this._saleId, productId: this._productId,
      productName: this._productName, sku: this._sku,
      quantity: this._quantity, unitPrice: this._unitPrice,
      discount: this._discount, total: this._total,
      createdAt: this._createdAt,
    };
  }
}

export class Sale extends AggregateRoot {
  constructor({ id, saleNumber, clientId, client, userId, items, subtotal, discount, tax, total, status, paymentMethod, paymentStatus, notes, shippingAddress, source, createdAt, updatedAt }) {
    super(id);
    this._saleNumber = saleNumber;
    this._clientId = clientId;
    this._client = client || null;
    this._userId = userId;
    this._items = items || [];
    this._subtotal = subtotal || 0;
    this._discount = discount || 0;
    this._tax = tax || 0;
    this._total = total || 0;
    this._status = status || SALE_STATUSES.PENDING;
    this._paymentMethod = paymentMethod || 'cash';
    this._paymentStatus = paymentStatus || PAYMENT_STATUSES.PENDING;
    this._notes = notes || '';
    this._shippingAddress = shippingAddress || null;
    this._source = source || 'pos';
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get saleNumber() { return this._saleNumber; }
  get clientId() { return this._clientId; }
  get client() { return this._client; }
  get userId() { return this._userId; }
  get items() { return this._items; }
  get subtotal() { return this._subtotal; }
  get discount() { return this._discount; }
  get tax() { return this._tax; }
  get total() { return this._total; }
  get status() { return this._status; }
  get paymentMethod() { return this._paymentMethod; }
  get paymentStatus() { return this._paymentStatus; }
  get notes() { return this._notes; }
  get shippingAddress() { return this._shippingAddress; }
  get source() { return this._source; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  complete() {
    this._status = SALE_STATUSES.COMPLETED;
    this._paymentStatus = PAYMENT_STATUSES.PAID;
    this._updatedAt = new Date();
  }

  cancel() {
    if (this._status === SALE_STATUSES.CANCELLED) throw new Error('ALREADY_CANCELLED');
    this._status = SALE_STATUSES.CANCELLED;
    this._paymentStatus = PAYMENT_STATUSES.REFUNDED;
    this._updatedAt = new Date();
  }

  refund() {
    if (this._status !== SALE_STATUSES.COMPLETED) throw new Error('CANNOT_REFUND');
    this._status = SALE_STATUSES.REFUNDED;
    this._paymentStatus = PAYMENT_STATUSES.REFUNDED;
    this._updatedAt = new Date();
  }

  setItems(items) {
    this._items = items.map(i => i instanceof SaleItem ? i : new SaleItem(i));
    this._recalculateTotals();
  }

  _recalculateTotals() {
    this._subtotal = this._items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    this._discount = this._items.reduce((sum, i) => sum + (i.discount || 0), 0);
    this._tax = (this._subtotal - this._discount) * 0.19;
    this._total = this._subtotal - this._discount + this._tax;
  }

  toJSON() {
    return {
      id: this.id, saleNumber: this._saleNumber,
      clientId: this._clientId, client: this._client,
      userId: this._userId,
      items: this._items.map(i => i.toJSON()),
      subtotal: this._subtotal, discount: this._discount,
      tax: this._tax, total: this._total,
      status: this._status, paymentMethod: this._paymentMethod,
      paymentStatus: this._paymentStatus, notes: this._notes,
      shippingAddress: this._shippingAddress, source: this._source,
      createdAt: this._createdAt, updatedAt: this._updatedAt,
    };
  }
}

export class Cart extends Entity {
  constructor({ id, userId, items, createdAt, updatedAt }) {
    super(id);
    this._userId = userId;
    this._items = items || [];
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get userId() { return this._userId; }
  get items() { return this._items; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  get subtotal() { return this._items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0); }
  get discount() { return this._items.reduce((s, i) => s + (i.discount || 0), 0); }
  get tax() { return (this.subtotal - this.discount) * 0.19; }
  get total() { return this.subtotal - this.discount + this.tax; }
  get itemCount() { return this._items.reduce((s, i) => s + i.quantity, 0); }

  toJSON() {
    return {
      id: this.id, userId: this._userId,
      items: this._items.map(i => i.toJSON()),
      subtotal: this.subtotal, discount: this.discount,
      tax: this.tax, total: this.total,
      itemCount: this.itemCount,
      createdAt: this._createdAt, updatedAt: this._updatedAt,
    };
  }
}

export class CartItem extends Entity {
  constructor({ id, cartId, productId, product, quantity, unitPrice, discount, createdAt }) {
    super(id);
    this._cartId = cartId;
    this._productId = productId;
    this._product = product || null;
    this._quantity = quantity;
    this._unitPrice = unitPrice;
    this._discount = discount || 0;
    this._createdAt = createdAt || new Date();
  }

  get cartId() { return this._cartId; }
  get productId() { return this._productId; }
  get product() { return this._product; }
  get quantity() { return this._quantity; }
  get unitPrice() { return this._unitPrice; }
  get discount() { return this._discount; }
  get subtotal() { return this._quantity * this._unitPrice; }
  get createdAt() { return this._createdAt; }

  toJSON() {
    return {
      id: this.id, cartId: this._cartId,
      productId: this._productId, product: this._product,
      quantity: this._quantity, unitPrice: this._unitPrice,
      discount: this._discount, subtotal: this.subtotal,
      createdAt: this._createdAt,
    };
  }
}

// ============================================================
// Sales Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class SaleCreatedEvent extends DomainEvent {
  constructor(sale) {
    super({ aggregateId: sale.id, eventType: 'sales.sale.created', payload: { sale: sale.toJSON() } });
  }
}

export class SaleCancelledEvent extends DomainEvent {
  constructor(sale) {
    super({ aggregateId: sale.id, eventType: 'sales.sale.cancelled', payload: {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      items: sale.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    }});
  }
}

export class SaleCompletedEvent extends DomainEvent {
  constructor(sale) {
    super({ aggregateId: sale.id, eventType: 'sales.sale.completed', payload: {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      items: sale.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
    }});
  }
}

export class CartUpdatedEvent extends DomainEvent {
  constructor(cart) {
    super({ aggregateId: cart.id, eventType: 'sales.cart.updated', payload: { cartId: cart.id, userId: cart.userId, itemCount: cart.itemCount } });
  }
}

export class CheckoutCompletedEvent extends DomainEvent {
  constructor({ cart, sale }) {
    super({ aggregateId: sale.id, eventType: 'sales.checkout.completed', payload: {
      cartId: cart.id,
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      userId: cart.userId,
      total: sale.total,
    }});
  }
}

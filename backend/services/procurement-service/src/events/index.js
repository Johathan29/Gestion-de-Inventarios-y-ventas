// ============================================================
// Procurement Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class PurchaseCreatedEvent extends DomainEvent {
  constructor(purchase) {
    super('procurement.purchase.created', { purchase: purchase.toJSON() });
  }
}

export class PurchaseApprovedEvent extends DomainEvent {
  constructor(purchase) {
    super('procurement.purchase.approved', {
      purchaseId: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      supplierId: purchase.supplierId,
      total: purchase.total,
      items: purchase.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      userId: purchase.userId,
    });
  }
}

export class PurchaseReceivedEvent extends DomainEvent {
  constructor(purchase) {
    super('procurement.purchase.received', {
      purchaseId: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      supplierId: purchase.supplierId,
      items: purchase.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      userId: purchase.userId,
    });
  }
}

export class PurchaseCancelledEvent extends DomainEvent {
  constructor(purchase) {
    super('procurement.purchase.cancelled', {
      purchaseId: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      reason: 'Purchase cancelled',
      items: purchase.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      userId: purchase.userId,
    });
  }
}

export class SupplierCreatedEvent extends DomainEvent {
  constructor(supplier) {
    super('procurement.supplier.created', { supplier: supplier.toJSON() });
  }
}

export class SupplierUpdatedEvent extends DomainEvent {
  constructor(supplier) {
    super('procurement.supplier.updated', { supplier: supplier.toJSON() });
  }
}

// ============================================================
// Inventory Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class StockEntryCreatedEvent extends DomainEvent {
  constructor(movement) {
    super({ aggregateId: movement.id, eventType: 'inventory.stock.entry', payload: { movement: movement.toJSON() } });
  }
}

export class StockExitCreatedEvent extends DomainEvent {
  constructor(movement) {
    super({ aggregateId: movement.id, eventType: 'inventory.stock.exit', payload: { movement: movement.toJSON() } });
  }
}

export class StockAdjustedEvent extends DomainEvent {
  constructor(movement) {
    super({ aggregateId: movement.id, eventType: 'inventory.stock.adjusted', payload: { movement: movement.toJSON() } });
  }
}

export class StockTransferCreatedEvent extends DomainEvent {
  constructor({ fromMovement, toMovement }) {
    super({ aggregateId: fromMovement.id, eventType: 'inventory.stock.transfer', payload: {
      from: fromMovement.toJSON(),
      to: toMovement.toJSON(),
    }});
  }
}

export class LowStockAlertEvent extends DomainEvent {
  constructor({ productId, warehouse, currentStock, minStock }) {
    super({ aggregateId: productId, eventType: 'inventory.stock.low_stock', payload: {
      productId,
      warehouse,
      currentStock,
      minStock,
    }});
  }
}

export class OutOfStockEvent extends DomainEvent {
  constructor({ productId, warehouse }) {
    super({ aggregateId: productId, eventType: 'inventory.stock.out_of_stock', payload: { productId, warehouse } });
  }
}

export class ReservationCreatedEvent extends DomainEvent {
  constructor(reservation) {
    super({ aggregateId: reservation.id, eventType: 'inventory.reservation.created', payload: { reservation: reservation.toJSON() } });
  }
}

export class ReservationReleasedEvent extends DomainEvent {
  constructor(reservation) {
    super({ aggregateId: reservation.id, eventType: 'inventory.reservation.released', payload: { reservation: reservation.toJSON() } });
  }
}

export class ReservationConfirmedEvent extends DomainEvent {
  constructor(reservation) {
    super({ aggregateId: reservation.id, eventType: 'inventory.reservation.confirmed', payload: { reservation: reservation.toJSON() } });
  }
}

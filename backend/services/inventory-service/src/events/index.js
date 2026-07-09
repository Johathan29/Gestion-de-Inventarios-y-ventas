// ============================================================
// Inventory Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class StockEntryCreatedEvent extends DomainEvent {
  constructor(movement) {
    super('inventory.stock.entry', { movement: movement.toJSON() });
  }
}

export class StockExitCreatedEvent extends DomainEvent {
  constructor(movement) {
    super('inventory.stock.exit', { movement: movement.toJSON() });
  }
}

export class StockAdjustedEvent extends DomainEvent {
  constructor(movement) {
    super('inventory.stock.adjusted', { movement: movement.toJSON() });
  }
}

export class StockTransferCreatedEvent extends DomainEvent {
  constructor({ fromMovement, toMovement }) {
    super('inventory.stock.transfer', {
      from: fromMovement.toJSON(),
      to: toMovement.toJSON(),
    });
  }
}

export class LowStockAlertEvent extends DomainEvent {
  constructor({ productId, warehouse, currentStock, minStock }) {
    super('inventory.stock.low_stock', {
      productId,
      warehouse,
      currentStock,
      minStock,
    });
  }
}

export class OutOfStockEvent extends DomainEvent {
  constructor({ productId, warehouse }) {
    super('inventory.stock.out_of_stock', { productId, warehouse });
  }
}

export class ReservationCreatedEvent extends DomainEvent {
  constructor(reservation) {
    super('inventory.reservation.created', { reservation: reservation.toJSON() });
  }
}

export class ReservationReleasedEvent extends DomainEvent {
  constructor(reservation) {
    super('inventory.reservation.released', { reservation: reservation.toJSON() });
  }
}

export class ReservationConfirmedEvent extends DomainEvent {
  constructor(reservation) {
    super('inventory.reservation.confirmed', { reservation: reservation.toJSON() });
  }
}

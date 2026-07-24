// ============================================================
// Inventory Use Cases
// ============================================================

import {
  InventoryItem, InventoryMovement, InventoryReservation,
  MOVEMENT_TYPES
} from '../domain/inventory.js';
import {
  StockEntryCreatedEvent, StockExitCreatedEvent,
  StockAdjustedEvent, StockTransferCreatedEvent,
  LowStockAlertEvent, OutOfStockEvent,
  ReservationCreatedEvent, ReservationReleasedEvent,
} from '../events/index.js';

export class GetStockUseCase {
  constructor({ inventoryRepository }) {
    this._inventoryRepository = inventoryRepository;
  }

  async execute(query) {
    return this._inventoryRepository.findStock(query);
  }
}

export class GetStockByProductUseCase {
  constructor({ inventoryRepository }) {
    this._inventoryRepository = inventoryRepository;
  }

  async execute(productId) {
    const items = await this._inventoryRepository.findByProduct(productId);
    const totalStock = items.reduce((sum, i) => sum + i.stock, 0);
    return { productId, totalStock, warehouses: items.map(i => i.toJSON()) };
  }
}

export class CreateEntryUseCase {
  constructor({ inventoryRepository, movementRepository, eventBus }) {
    this._inventoryRepository = inventoryRepository;
    this._movementRepository = movementRepository;
    this._eventBus = eventBus;
  }

  async execute({ productId, warehouse, quantity, unitCost = 0, notes, reference, userId, variantId }) {
    const existing = await this._inventoryRepository.findOne(productId, warehouse);
    const prevStock = existing?.stock || 0;

    const updated = await this._inventoryRepository.upsert(productId, warehouse, {
      stock: prevStock + quantity,
      total_cost: (existing?.totalCost || 0) + (quantity * unitCost),
      unit_cost: unitCost,
    });

    const movement = new InventoryMovement({
      productId, warehouse, type: MOVEMENT_TYPES.ENTRY,
      quantity, previousStock: prevStock, newStock: updated.stock,
      unitCost, totalCost: quantity * unitCost,
      reason: notes || 'Manual entry',
      notes, reference, userId, variantId,
    });

    const saved = await this._movementRepository.save(movement);
    await this._eventBus.publish(new StockEntryCreatedEvent(saved));

    return { inventory: updated, movement: saved };
  }
}

export class CreateExitUseCase {
  constructor({ inventoryRepository, movementRepository, eventBus }) {
    this._inventoryRepository = inventoryRepository;
    this._movementRepository = movementRepository;
    this._eventBus = eventBus;
  }

  async execute({ productId, warehouse, quantity, notes, reference, userId, variantId }) {
    const existing = await this._inventoryRepository.findOne(productId, warehouse);
    if (!existing || existing.stock < quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    const prevStock = existing.stock;
    existing.removeStock(quantity);

    await this._inventoryRepository.upsert(productId, warehouse, {
      stock: existing.stock,
      total_cost: existing.totalCost,
      unit_cost: existing.unitCost,
    });

    const movement = new InventoryMovement({
      productId, warehouse, type: MOVEMENT_TYPES.EXIT,
      quantity, previousStock: prevStock, newStock: existing.stock,
      reason: notes || 'Manual exit',
      notes, reference, userId, variantId,
    });

    const saved = await this._movementRepository.save(movement);
    await this._eventBus.publish(new StockExitCreatedEvent(saved));

    // Check for alerts
    if (existing.isOutOfStock) {
      await this._eventBus.publish(new OutOfStockEvent({ productId, warehouse }));
    } else if (existing.isLowStock) {
      await this._eventBus.publish(new LowStockAlertEvent({
        productId, warehouse,
        currentStock: existing.stock,
        minStock: existing.minStock,
      }));
    }

    return { inventory: existing, movement: saved };
  }
}

export class CreateAdjustmentUseCase {
  constructor({ inventoryRepository, movementRepository, eventBus }) {
    this._inventoryRepository = inventoryRepository;
    this._movementRepository = movementRepository;
    this._eventBus = eventBus;
  }

  async execute({ productId, warehouse, newQuantity, reason, userId }) {
    const existing = await this._inventoryRepository.findOne(productId, warehouse);
    const oldQuantity = existing?.stock || 0;
    const difference = newQuantity - oldQuantity;

    const adjustmentType = difference > 0
      ? MOVEMENT_TYPES.ADJUSTMENT_POSITIVE
      : MOVEMENT_TYPES.ADJUSTMENT_NEGATIVE;

    await this._inventoryRepository.upsert(productId, warehouse, { stock: newQuantity });

    const movement = new InventoryMovement({
      productId, warehouse, type: adjustmentType,
      quantity: Math.abs(difference),
      previousStock: oldQuantity,
      newStock: newQuantity,
      reason: reason || `Adjustment from ${oldQuantity} to ${newQuantity}`,
      userId,
    });

    const saved = await this._movementRepository.save(movement);
    await this._eventBus.publish(new StockAdjustedEvent(saved));

    return { inventory: { productId, warehouse, stock: newQuantity }, movement: saved };
  }
}

export class CreateTransferUseCase {
  constructor({ inventoryRepository, movementRepository, eventBus }) {
    this._inventoryRepository = inventoryRepository;
    this._movementRepository = movementRepository;
    this._eventBus = eventBus;
  }

  async execute({ productId, fromWarehouse, toWarehouse, quantity, notes, userId }) {
    // Check source stock
    const source = await this._inventoryRepository.findOne(productId, fromWarehouse);
    if (!source || source.stock < quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    const sourcePrevStock = source.stock;
    source.removeStock(quantity);
    await this._inventoryRepository.upsert(productId, fromWarehouse, { stock: source.stock });

    // Add to destination
    const dest = await this._inventoryRepository.findOne(productId, toWarehouse);
    const destPrevStock = dest?.stock || 0;
    await this._inventoryRepository.upsert(productId, toWarehouse, {
      stock: destPrevStock + quantity,
    });

    const fromMovement = new InventoryMovement({
      productId, warehouse: fromWarehouse, type: MOVEMENT_TYPES.TRANSFER_OUT,
      quantity, previousStock: sourcePrevStock, newStock: source.stock,
      reason: `Transfer to ${toWarehouse}: ${notes || ''}`, userId,
    });

    const toMovement = new InventoryMovement({
      productId, warehouse: toWarehouse, type: MOVEMENT_TYPES.TRANSFER_IN,
      quantity, previousStock: destPrevStock, newStock: destPrevStock + quantity,
      reason: `Transfer from ${fromWarehouse}: ${notes || ''}`, userId,
    });

    const savedFrom = await this._movementRepository.save(fromMovement);
    const savedTo = await this._movementRepository.save(toMovement);

    await this._eventBus.publish(new StockTransferCreatedEvent({
      fromMovement: savedFrom,
      toMovement: savedTo,
    }));

    return { fromMovement: savedFrom, toMovement: savedTo };
  }
}

export class GetMovementsUseCase {
  constructor({ movementRepository }) {
    this._movementRepository = movementRepository;
  }

  async execute(query) {
    return this._movementRepository.findMany(query);
  }
}

export class GetKardexUseCase {
  constructor({ movementRepository }) {
    this._movementRepository = movementRepository;
  }

  async execute(productId) {
    return this._movementRepository.getKardex(productId);
  }
}

export class GetStockAlertsUseCase {
  constructor({ inventoryRepository }) {
    this._inventoryRepository = inventoryRepository;
  }

  async execute(threshold = 5) {
    return this._inventoryRepository.getAlerts(threshold);
  }
}

export class GetInventorySummaryUseCase {
  constructor({ inventoryRepository }) {
    this._inventoryRepository = inventoryRepository;
  }

  async execute() {
    return this._inventoryRepository.getSummary();
  }
}

export class CreateReservationUseCase {
  constructor({ reservationRepository, inventoryRepository, eventBus }) {
    this._reservationRepository = reservationRepository;
    this._inventoryRepository = inventoryRepository;
    this._eventBus = eventBus;
  }

  async execute({ productId, warehouseId, quantity, orderType, orderId, userId, expiresAt }) {
    // Verify stock availability
    const item = await this._inventoryRepository.findOne(productId, warehouseId);
    if (!item || item.stock < quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    // Check existing reservations
    const activeReservations = await this._reservationRepository.findActiveByProduct(productId);
    const reservedQty = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
    const available = item.stock - reservedQty;

    if (available < quantity) {
      throw new Error('INSUFFICIENT_AVAILABLE_STOCK');
    }

    const reservation = new InventoryReservation({
      productId, warehouseId, quantity, orderType, orderId, userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    const saved = await this._reservationRepository.save(reservation);
    await this._eventBus.publish(new ReservationCreatedEvent(saved));

    return saved;
  }
}

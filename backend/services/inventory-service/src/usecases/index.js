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
    // Entrada atómica (RPC fn_stock_entry): el stock se incrementa en UNA
    // sentencia (INSERT ON CONFLICT DO UPDATE + RETURNING) → sin TOCTOU.
    // El RPC inserta el kardex en la misma transacción (migración 065).
    const { previousStock, newStock, movementId, inventory } = await this._inventoryRepository.atomicEntry({
      productId, warehouse: warehouse || 'principal', quantity, unitCost,
      reason: notes, referenceType: reference?.type, referenceId: reference?.id,
      userId, variantId,
    });

    const movement = new InventoryMovement({
      id: movementId,
      productId, warehouse: warehouse || 'principal', type: MOVEMENT_TYPES.ENTRY,
      quantity, previousStock, newStock,
      unitCost, totalCost: quantity * unitCost,
      reason: notes || 'Manual entry',
      notes, reference, userId, variantId,
    });

    await this._eventBus.publish(new StockEntryCreatedEvent(movement));

    return { inventory, movement };
  }
}

export class CreateExitUseCase {
  constructor({ inventoryRepository, movementRepository, eventBus }) {
    this._inventoryRepository = inventoryRepository;
    this._movementRepository = movementRepository;
    this._eventBus = eventBus;
  }

  async execute({ productId, warehouse, quantity, notes, reference, userId, variantId }) {
    // Salida atómica (RPC fn_stock_exit): UPDATE condicional stock >= qty.
    // Bajo concurrencia la fila queda lockeada → imposible stock negativo.
    // Lanza INSUFFICIENT_STOCK si no hay stock (mismo contrato que antes).
    // El RPC inserta el kardex en la misma transacción (migración 065).
    const { previousStock, newStock, movementId, inventory } = await this._inventoryRepository.atomicExit({
      productId, warehouse: warehouse || 'principal', quantity,
      reason: notes, referenceType: reference?.type, referenceId: reference?.id,
      userId, variantId,
    });

    const movement = new InventoryMovement({
      id: movementId,
      productId, warehouse: warehouse || 'principal', type: MOVEMENT_TYPES.EXIT,
      quantity, previousStock, newStock,
      reason: notes || 'Manual exit',
      notes, reference, userId, variantId,
    });

    await this._eventBus.publish(new StockExitCreatedEvent(movement));

    // Check for alerts
    if (inventory?.isOutOfStock) {
      await this._eventBus.publish(new OutOfStockEvent({ productId, warehouse: warehouse || 'principal' }));
    } else if (inventory?.isLowStock) {
      await this._eventBus.publish(new LowStockAlertEvent({
        productId, warehouse: warehouse || 'principal',
        currentStock: newStock,
        minStock: inventory.minStock,
      }));
    }

    return { inventory, movement };
  }
}

export class CreateAdjustmentUseCase {
  constructor({ inventoryRepository, movementRepository, eventBus }) {
    this._inventoryRepository = inventoryRepository;
    this._movementRepository = movementRepository;
    this._eventBus = eventBus;
  }

  async execute({ productId, warehouse, newQuantity, reason, userId }) {
    // Ajuste atómico (RPC fn_stock_adjust): SELECT FOR UPDATE + UPDATE →
    // previous_stock correcto incluso con operaciones concurrentes.
    // El RPC inserta el kardex en la misma transacción (migración 065);
    // movementId es null si no hubo cambio real (new == prev).
    const { previousStock, newStock, movementId, inventory } = await this._inventoryRepository.atomicAdjust({
      productId, warehouse: warehouse || 'principal', newQuantity, reason, userId,
    });

    const difference = newStock - previousStock;
    const adjustmentType = difference > 0
      ? MOVEMENT_TYPES.ADJUSTMENT_POSITIVE
      : MOVEMENT_TYPES.ADJUSTMENT_NEGATIVE;

    const movement = new InventoryMovement({
      id: movementId,
      productId, warehouse: warehouse || 'principal', type: adjustmentType,
      quantity: Math.abs(difference),
      previousStock,
      newStock,
      reason: reason || `Adjustment from ${previousStock} to ${newStock}`,
      userId,
    });

    if (movementId) {
      await this._eventBus.publish(new StockAdjustedEvent(movement));
    }

    return { inventory: inventory || { productId, warehouse: warehouse || 'principal', stock: newStock }, movement };
  }
}

export class CreateTransferUseCase {
  constructor({ inventoryRepository, movementRepository, eventBus }) {
    this._inventoryRepository = inventoryRepository;
    this._movementRepository = movementRepository;
    this._eventBus = eventBus;
  }

  async execute({ productId, fromWarehouse, toWarehouse, quantity, notes, userId }) {
    // Salida atómica del origen (valida stock bajo lock) + entrada atómica
    // del destino → el par origen/destino nunca puede quedar inconsistente
    // por una lectura intermedia obsoleta. Ambos RPCs insertan su kardex
    // (type 'transfer') en la misma transacción que el cambio de stock.
    const sourceResult = await this._inventoryRepository.atomicExit({
      productId, warehouse: fromWarehouse, quantity,
      reason: `Transfer to ${toWarehouse}: ${notes || ''}`,
      referenceType: 'transfer', userId, movementType: 'transfer',
    });
    const sourcePrevStock = sourceResult.previousStock;
    const sourceNewStock = sourceResult.newStock;

    const destResult = await this._inventoryRepository.atomicEntry({
      productId, warehouse: toWarehouse, quantity,
      reason: `Transfer from ${fromWarehouse}: ${notes || ''}`,
      referenceType: 'transfer', userId, movementType: 'transfer',
    });
    const destPrevStock = destResult.previousStock;
    const destNewStock = destResult.newStock;

    const fromMovement = new InventoryMovement({
      id: sourceResult.movementId,
      productId, warehouse: fromWarehouse, type: MOVEMENT_TYPES.TRANSFER_OUT,
      quantity, previousStock: sourcePrevStock, newStock: sourceNewStock,
      reason: `Transfer to ${toWarehouse}: ${notes || ''}`, userId,
    });

    const toMovement = new InventoryMovement({
      id: destResult.movementId,
      productId, warehouse: toWarehouse, type: MOVEMENT_TYPES.TRANSFER_IN,
      quantity, previousStock: destPrevStock, newStock: destNewStock,
      reason: `Transfer from ${fromWarehouse}: ${notes || ''}`, userId,
    });

    await this._eventBus.publish(new StockTransferCreatedEvent({
      fromMovement,
      toMovement,
    }));

    return { fromMovement, toMovement };
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

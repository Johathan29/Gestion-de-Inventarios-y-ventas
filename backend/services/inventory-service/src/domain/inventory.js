// ============================================================
// Inventory Domain — Stock, Movement, Reservation, Warehouse
// ============================================================

import { AggregateRoot, Entity } from '@erp/shared-kernel';

export const MOVEMENT_TYPES = {
  ENTRY: 'entry',
  EXIT: 'exit',
  ADJUSTMENT_POSITIVE: 'adjustment_plus',
  ADJUSTMENT_NEGATIVE: 'adjustment_minus',
  TRANSFER_OUT: 'transfer',
  TRANSFER_IN: 'transfer',
  SALE_EXIT: 'exit_sale',
  PURCHASE_ENTRY: 'entry_purchase',
  RETURN_IN: 'return_client',
  RETURN_OUT: 'return_supplier',
};

export const VALID_MOVEMENT_TYPES = Object.values(MOVEMENT_TYPES);

export class InventoryItem extends Entity {
  constructor({ id, productId, product, warehouse, stock, totalCost, unitCost, minStock, maxStock, createdAt, updatedAt, status }) {
    super(id);
    this._productId = productId;
    this._product = product || null;
    this._warehouse = warehouse;
    this._stock = stock || 0;
    this._totalCost = totalCost || 0;
    this._unitCost = unitCost || 0;
    this._minStock = minStock || 0;
    this._maxStock = maxStock || null;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
    this._status = status || 'available';
  }

  get productId() { return this._productId; }
  get product() { return this._product; }
  get warehouse() { return this._warehouse; }
  get stock() { return this._stock; }
  get totalCost() { return this._totalCost; }
  get unitCost() { return this._unitCost; }
  get minStock() { return this._minStock; }
  get maxStock() { return this._maxStock; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }
  get status() { return this._status; }
  get isPending() { return this._status === 'pending'; }
  get isAvailable() { return this._status === 'available'; }
  get isBlocked() { return this._status === 'blocked'; }

  get isLowStock() { return this._stock <= this._minStock && this._stock > 0; }
  get isOutOfStock() { return this._stock <= 0; }

  addStock(quantity, unitCost) {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    this._totalCost = this._totalCost + (quantity * unitCost);
    this._stock = this._stock + quantity;
    this._unitCost = this._totalCost / this._stock;
    this._updatedAt = new Date();
  }

  removeStock(quantity) {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    if (this._stock < quantity) throw new Error('INSUFFICIENT_STOCK');
    this._stock = this._stock - quantity;
    if (this._stock === 0) this._totalCost = 0;
    this._updatedAt = new Date();
  }

  setStock(newQuantity, reason) {
    this._stock = newQuantity;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      productId: this._productId,
      product: this._product,
      warehouse: this._warehouse,
      stock: this._stock,
      totalCost: this._totalCost,
      unitCost: this._unitCost,
      minStock: this._minStock,
      maxStock: this._maxStock,
      isLowStock: this.isLowStock,
      isOutOfStock: this.isOutOfStock,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

export class InventoryMovement extends Entity {
  constructor({ id, productId, warehouse, type, quantity, previousStock, newStock, unitCost, totalCost, referenceType, referenceId, reason, notes, userId, createdAt, variantId }) {
    super(id);
    this._productId = productId;
    this._warehouse = warehouse;
    this._type = type;
    this._quantity = quantity;
    this._previousStock = previousStock;
    this._newStock = newStock;
    this._unitCost = unitCost || 0;
    this._totalCost = totalCost || 0;
    this._referenceType = referenceType;
    this._referenceId = referenceId;
    this._reason = reason;
    this._notes = notes;
    this._userId = userId;
    this._createdAt = createdAt || new Date();
    this._variantId = variantId || null;
  }

  get productId() { return this._productId; }
  get warehouse() { return this._warehouse; }
  get type() { return this._type; }
  get quantity() { return this._quantity; }
  get previousStock() { return this._previousStock; }
  get newStock() { return this._newStock; }
  get unitCost() { return this._unitCost; }
  get totalCost() { return this._totalCost; }
  get referenceType() { return this._referenceType; }
  get referenceId() { return this._referenceId; }
  get reason() { return this._reason; }
  get notes() { return this._notes; }
  get userId() { return this._userId; }
  get createdAt() { return this._createdAt; }
  get variantId() { return this._variantId; }

  toJSON() {
    return {
      id: this.id,
      productId: this._productId,
      warehouse: this._warehouse,
      type: this._type,
      quantity: this._quantity,
      previousStock: this._previousStock,
      newStock: this._newStock,
      unitCost: this._unitCost,
      totalCost: this._totalCost,
      referenceType: this._referenceType,
      referenceId: this._referenceId,
      reason: this._reason,
      notes: this._notes,
      userId: this._userId,
      createdAt: this._createdAt,
      variantId: this._variantId,
    };
  }
}

export class InventoryReservation extends Entity {
  constructor({ id, productId, warehouseId, quantity, orderType, orderId, userId, status, expiresAt, createdAt }) {
    super(id);
    this._productId = productId;
    this._warehouseId = warehouseId;
    this._quantity = quantity;
    this._orderType = orderType;
    this._orderId = orderId;
    this._userId = userId;
    this._status = status || 'active';
    this._expiresAt = expiresAt;
    this._createdAt = createdAt || new Date();
  }

  get productId() { return this._productId; }
  get warehouseId() { return this._warehouseId; }
  get quantity() { return this._quantity; }
  get orderType() { return this._orderType; }
  get orderId() { return this._orderId; }
  get userId() { return this._userId; }
  get status() { return this._status; }
  get expiresAt() { return this._expiresAt; }
  get createdAt() { return this._createdAt; }

  isExpired() {
    return this._expiresAt && new Date() > new Date(this._expiresAt);
  }

  release() {
    this._status = 'released';
  }

  confirm() {
    this._status = 'confirmed';
  }

  toJSON() {
    return {
      id: this.id,
      productId: this._productId,
      warehouseId: this._warehouseId,
      quantity: this._quantity,
      orderType: this._orderType,
      orderId: this._orderId,
      userId: this._userId,
      status: this._status,
      expiresAt: this._expiresAt,
      createdAt: this._createdAt,
    };
  }
}

export class Warehouse extends Entity {
  constructor({ id, name, code, address, city, isActive, companyId, createdAt, updatedAt }) {
    super(id);
    this._name = name;
    this._code = code;
    this._address = address;
    this._city = city;
    this._isActive = isActive !== undefined ? isActive : true;
    this._companyId = companyId;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get name() { return this._name; }
  get code() { return this._code; }
  get address() { return this._address; }
  get city() { return this._city; }
  get isActive() { return this._isActive; }
  get companyId() { return this._companyId; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  toJSON() {
    return {
      id: this.id,
      name: this._name,
      code: this._code,
      address: this._address,
      city: this._city,
      isActive: this._isActive,
      companyId: this._companyId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

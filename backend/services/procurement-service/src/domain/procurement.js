// ============================================================
// Procurement Domain — Purchase, PurchaseItem, Supplier
// ============================================================

import { AggregateRoot, Entity, ValueObject } from '@erp/shared-kernel';

/**
 * Purchase status lifecycle:
 * draft → pending_approval → approved → received → cancelled
 */
export const PURCHASE_STATUSES = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
};

export const VALID_PURCHASE_STATUSES = Object.values(PURCHASE_STATUSES);

export const PURCHASE_STATUS_TRANSITIONS = {
  [PURCHASE_STATUSES.DRAFT]: [PURCHASE_STATUSES.PENDING_APPROVAL, PURCHASE_STATUSES.CANCELLED],
  [PURCHASE_STATUSES.PENDING_APPROVAL]: [PURCHASE_STATUSES.APPROVED, PURCHASE_STATUSES.CANCELLED],
  [PURCHASE_STATUSES.APPROVED]: [PURCHASE_STATUSES.RECEIVED, PURCHASE_STATUSES.CANCELLED],
  [PURCHASE_STATUSES.RECEIVED]: [],
  [PURCHASE_STATUSES.CANCELLED]: [],
};

export class PurchaseItem extends Entity {
  constructor({ id, purchaseId, productId, productName, sku, barcode, productImage, quantity, unitPrice, total, createdAt, updatedAt }) {
    super(id);
    this._purchaseId = purchaseId;
    this._productId = productId;
    this._productName = productName;
    this._sku = sku;
    this._barcode = barcode;
    this._productImage = productImage;
    this._quantity = quantity;
    this._unitPrice = unitPrice;
    this._total = total;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get purchaseId() { return this._purchaseId; }
  get productId() { return this._productId; }
  get productName() { return this._productName; }
  get sku() { return this._sku; }
  get barcode() { return this._barcode; }
  get productImage() { return this._productImage; }
  get quantity() { return this._quantity; }
  get unitPrice() { return this._unitPrice; }
  get total() { return this._total; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  toJSON() {
    return {
      id: this.id,
      purchaseId: this._purchaseId,
      productId: this._productId,
      productName: this._productName,
      sku: this._sku,
      barcode: this._barcode,
      productImage: this._productImage,
      quantity: this._quantity,
      unitPrice: this._unitPrice,
      total: this._total,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

export class Supplier extends Entity {
  constructor({ id, name, contactName, email, phone, address, city, taxId, paymentTerms, notes, isActive, createdAt, updatedAt }) {
    super(id);
    this._name = name;
    this._contactName = contactName;
    this._email = email;
    this._phone = phone;
    this._address = address;
    this._city = city;
    this._taxId = taxId;
    this._paymentTerms = paymentTerms;
    this._notes = notes;
    this._isActive = isActive !== undefined ? isActive : true;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get name() { return this._name; }
  get contactName() { return this._contactName; }
  get email() { return this._email; }
  get phone() { return this._phone; }
  get address() { return this._address; }
  get city() { return this._city; }
  get taxId() { return this._taxId; }
  get paymentTerms() { return this._paymentTerms; }
  get notes() { return this._notes; }
  get isActive() { return this._isActive; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  updateDetails(data) {
    if (data.name !== undefined) this._name = data.name;
    if (data.contactName !== undefined) this._contactName = data.contactName;
    if (data.email !== undefined) this._email = data.email;
    if (data.phone !== undefined) this._phone = data.phone;
    if (data.address !== undefined) this._address = data.address;
    if (data.city !== undefined) this._city = data.city;
    if (data.taxId !== undefined) this._taxId = data.taxId;
    if (data.paymentTerms !== undefined) this._paymentTerms = data.paymentTerms;
    if (data.notes !== undefined) this._notes = data.notes;
    if (data.isActive !== undefined) this._isActive = data.isActive;
    this._updatedAt = new Date();
  }

  deactivate() {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate() {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      name: this._name,
      contactName: this._contactName,
      email: this._email,
      phone: this._phone,
      address: this._address,
      city: this._city,
      taxId: this._taxId,
      paymentTerms: this._paymentTerms,
      notes: this._notes,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

export class Purchase extends AggregateRoot {
  constructor({ id, purchaseNumber, supplierId, supplier, items, subtotal, tax, total, status, notes, userId, createdAt, updatedAt }) {
    super(id);
    this._purchaseNumber = purchaseNumber;
    this._supplierId = supplierId;
    this._supplier = supplier || null;
    this._items = items || [];
    this._subtotal = subtotal || 0;
    this._tax = tax || 0;
    this._total = total || 0;
    this._status = status || PURCHASE_STATUSES.DRAFT;
    this._notes = notes || '';
    this._userId = userId;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get purchaseNumber() { return this._purchaseNumber; }
  get supplierId() { return this._supplierId; }
  get supplier() { return this._supplier; }
  get items() { return this._items; }
  get subtotal() { return this._subtotal; }
  get tax() { return this._tax; }
  get total() { return this._total; }
  get status() { return this._status; }
  get notes() { return this._notes; }
  get userId() { return this._userId; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  canTransitionTo(newStatus) {
    const allowed = PURCHASE_STATUS_TRANSITIONS[this._status];
    return allowed && allowed.includes(newStatus);
  }

  requestApproval() {
    if (!this.canTransitionTo(PURCHASE_STATUSES.PENDING_APPROVAL)) {
      throw new Error(`Cannot transition from ${this._status} to pending_approval`);
    }
    this._status = PURCHASE_STATUSES.PENDING_APPROVAL;
    this._updatedAt = new Date();
  }

  approve() {
    if (!this.canTransitionTo(PURCHASE_STATUSES.APPROVED)) {
      throw new Error(`Cannot transition from ${this._status} to approved`);
    }
    this._status = PURCHASE_STATUSES.APPROVED;
    this._updatedAt = new Date();
  }

  receive() {
    if (!this.canTransitionTo(PURCHASE_STATUSES.RECEIVED)) {
      throw new Error(`Cannot transition from ${this._status} to received`);
    }
    this._status = PURCHASE_STATUSES.RECEIVED;
    this._updatedAt = new Date();
  }

  cancel() {
    if (!this.canTransitionTo(PURCHASE_STATUSES.CANCELLED)) {
      throw new Error(`Cannot transition from ${this._status} to cancelled`);
    }
    this._status = PURCHASE_STATUSES.CANCELLED;
    this._updatedAt = new Date();
  }

  setItems(items) {
    this._items = items.map(i => i instanceof PurchaseItem ? i : new PurchaseItem(i));
    this._recalculateTotals();
  }

  _recalculateTotals() {
    this._subtotal = this._items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    this._tax = this._subtotal * 0.19; // IVA 19%
    this._total = this._subtotal + this._tax;
  }

  toJSON() {
    return {
      id: this.id,
      purchaseNumber: this._purchaseNumber,
      supplierId: this._supplierId,
      supplier: this._supplier,
      items: this._items.map(i => i.toJSON()),
      subtotal: this._subtotal,
      tax: this._tax,
      total: this._total,
      status: this._status,
      notes: this._notes,
      userId: this._userId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

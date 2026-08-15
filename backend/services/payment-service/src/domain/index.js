// ============================================================
// Payments Domain — PaymentMethod, CashRegister, PaymentTransaction
// ============================================================

import { AggregateRoot, Entity } from '@erp/shared-kernel';

export const PAYMENT_TYPES = ['cash', 'card', 'transfer', 'check', 'credit', 'wallet', 'other'];
// Máquina de estados formal (docs/payments/PAYMENT-STATE-MACHINE.md, Fase 6)
export const TRANSACTION_STATUSES = {
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  // Alias legacy: antes 'completed' → ahora 'captured' (migración 074)
  COMPLETED: 'captured',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};
export const CASH_REGISTER_STATUSES = {
  OPEN: 'open',
  CLOSED: 'closed',
  SUSPENDED: 'suspended',
};

export class PaymentMethod extends Entity {
  constructor({ id, code, name, type, isActive, requiresReference }) {
    super(id);
    this._code = code;
    this._name = name;
    this._type = type;
    this._isActive = isActive !== false;
    this._requiresReference = requiresReference || false;
  }

  get code() { return this._code; }
  get name() { return this._name; }
  get type() { return this._type; }
  get isActive() { return this._isActive; }
  get requiresReference() { return this._requiresReference; }

  toJSON() {
    return {
      id: this.id, code: this._code, name: this._name,
      type: this._type, isActive: this._isActive,
      requiresReference: this._requiresReference,
    };
  }
}

export class CashRegister extends AggregateRoot {
  constructor({ id, companyId, warehouseId, code, name, isActive, openingBalance, currentBalance, status, openedAt, closedAt, openedBy, closedBy, createdAt, updatedAt }) {
    super(id);
    this._companyId = companyId;
    this._warehouseId = warehouseId;
    this._code = code;
    this._name = name;
    this._isActive = isActive !== false;
    this._openingBalance = openingBalance || 0;
    this._currentBalance = currentBalance || 0;
    this._status = status || CASH_REGISTER_STATUSES.CLOSED;
    this._openedAt = openedAt || null;
    this._closedAt = closedAt || null;
    this._openedBy = openedBy || null;
    this._closedBy = closedBy || null;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get companyId() { return this._companyId; }
  get warehouseId() { return this._warehouseId; }
  get code() { return this._code; }
  get name() { return this._name; }
  get isActive() { return this._isActive; }
  get openingBalance() { return this._openingBalance; }
  get currentBalance() { return this._currentBalance; }
  get status() { return this._status; }
  get openedAt() { return this._openedAt; }
  get closedAt() { return this._closedAt; }
  get openedBy() { return this._openedBy; }
  get closedBy() { return this._closedBy; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  open(userId, openingBalance = 0) {
    if (this._status === CASH_REGISTER_STATUSES.OPEN) throw new Error('ALREADY_OPEN');
    this._status = CASH_REGISTER_STATUSES.OPEN;
    this._openingBalance = openingBalance;
    this._currentBalance = openingBalance;
    this._openedBy = userId;
    this._openedAt = new Date();
    this._updatedAt = new Date();
  }

  close(userId, finalBalance) {
    if (this._status !== CASH_REGISTER_STATUSES.OPEN) throw new Error('NOT_OPEN');
    this._status = CASH_REGISTER_STATUSES.CLOSED;
    this._currentBalance = finalBalance || this._currentBalance;
    this._closedBy = userId;
    this._closedAt = new Date();
    this._updatedAt = new Date();
  }

  addTransaction(amount) {
    this._currentBalance = (this._currentBalance || 0) + amount;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id, companyId: this._companyId,
      warehouseId: this._warehouseId, code: this._code,
      name: this._name, isActive: this._isActive,
      openingBalance: this._openingBalance,
      currentBalance: this._currentBalance,
      status: this._status,
      openedAt: this._openedAt, closedAt: this._closedAt,
      openedBy: this._openedBy, closedBy: this._closedBy,
      createdAt: this._createdAt, updatedAt: this._updatedAt,
    };
  }
}

export class PaymentTransaction extends AggregateRoot {
  constructor({ id, saleId, invoiceId, paymentMethodId, paymentMethodName, amount, reference, status, processedBy, processedAt, notes, idempotencyKey, authorizedAt, capturedAt, refundedAt, expiresAt, gatewayTransactionId, createdAt, updatedAt }) {
    super(id);
    this._saleId = saleId;
    this._invoiceId = invoiceId;
    this._paymentMethodId = paymentMethodId;
    this._paymentMethodName = paymentMethodName;
    this._amount = amount;
    this._reference = reference || '';
    this._status = status || TRANSACTION_STATUSES.PENDING;
    this._processedBy = processedBy;
    this._processedAt = processedAt || null;
    this._notes = notes || '';
    this._idempotencyKey = idempotencyKey || null;
    this._authorizedAt = authorizedAt || null;
    this._capturedAt = capturedAt || null;
    this._refundedAt = refundedAt || null;
    this._expiresAt = expiresAt || null;
    this._gatewayTransactionId = gatewayTransactionId || null;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get saleId() { return this._saleId; }
  get invoiceId() { return this._invoiceId; }
  get paymentMethodId() { return this._paymentMethodId; }
  get paymentMethodName() { return this._paymentMethodName; }
  get amount() { return this._amount; }
  get reference() { return this._reference; }
  get status() { return this._status; }
  get processedBy() { return this._processedBy; }
  get processedAt() { return this._processedAt; }
  get notes() { return this._notes; }
  get idempotencyKey() { return this._idempotencyKey; }
  get authorizedAt() { return this._authorizedAt; }
  get capturedAt() { return this._capturedAt; }
  get refundedAt() { return this._refundedAt; }
  get expiresAt() { return this._expiresAt; }
  get gatewayTransactionId() { return this._gatewayTransactionId; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  /** Marca la transacción como expirada (TTL) o la lanza según la máquina de estados */
  _transition(to, { processed = false, reason = null } = {}) {
    const from = this._status;
    const allowed = {
      [TRANSACTION_STATUSES.PENDING]: ['authorized', 'captured', 'failed', 'cancelled', 'expired'],
      [TRANSACTION_STATUSES.AUTHORIZED]: ['captured', 'failed'],
      [TRANSACTION_STATUSES.CAPTURED]: ['refunded', 'partially_refunded'],
      [TRANSACTION_STATUSES.PARTIALLY_REFUNDED]: ['refunded'],
    };
    if (!allowed[from]?.includes(to)) {
      throw new Error(`INVALID_TRANSITION:${from}->${to}`);
    }
    this._status = to;
    if (processed) this._processedAt = new Date();
    if (reason) this._notes = reason;
    this._updatedAt = new Date();
  }

  authorize() {
    this._transition(TRANSACTION_STATUSES.AUTHORIZED);
    this._authorizedAt = new Date();
  }

  capture() {
    this._transition(TRANSACTION_STATUSES.CAPTURED, { processed: true });
    this._capturedAt = new Date();
  }

  /** Alias legacy de capture() (código previo a Fase 6) */
  complete() {
    this.capture();
  }

  fail(reason) {
    this._transition(TRANSACTION_STATUSES.FAILED, { reason });
  }

  cancel() {
    this._transition(TRANSACTION_STATUSES.CANCELLED);
  }

  expire() {
    this._transition(TRANSACTION_STATUSES.EXPIRED);
  }

  partialRefund() {
    this._transition(TRANSACTION_STATUSES.PARTIALLY_REFUNDED);
    this._refundedAt = new Date();
  }

  refund() {
    this._transition(TRANSACTION_STATUSES.REFUNDED);
    this._refundedAt = new Date();
  }

  isTerminal() {
    return [TRANSACTION_STATUSES.FAILED, TRANSACTION_STATUSES.CANCELLED,
      TRANSACTION_STATUSES.EXPIRED, TRANSACTION_STATUSES.REFUNDED].includes(this._status);
  }

  toJSON() {
    return {
      id: this.id, saleId: this._saleId,
      invoiceId: this._invoiceId,
      paymentMethodId: this._paymentMethodId,
      paymentMethodName: this._paymentMethodName,
      amount: this._amount, reference: this._reference,
      status: this._status, processedBy: this._processedBy,
      processedAt: this._processedAt, notes: this._notes,
      authorizedAt: this._authorizedAt, capturedAt: this._capturedAt,
      refundedAt: this._refundedAt, expiresAt: this._expiresAt,
      gatewayTransactionId: this._gatewayTransactionId,
      createdAt: this._createdAt, updatedAt: this._updatedAt,
    };
  }
}

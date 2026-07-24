// ============================================================
// Billing Domain — Invoice, InvoiceItem, NcfSequence, Fiscal
// ============================================================

import { AggregateRoot, Entity, ValueObject } from '@erp/shared-kernel';

// ============================================================
// Statuses & Constants
// ============================================================

export const INVOICE_STATUSES = {
  GENERATED: 'generated',
  ISSUED: 'issued',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  VOIDED: 'voided',
};

export const INVOICE_TYPES = [
  'consumer_final', 'credit_fiscal', 'governmental',
  'special', 'export', 'credit_note', 'debit_note', 'cancellation',
];

export const ELECTRONIC_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const CLIENT_DOCUMENT_TYPES = ['', 'RNC', 'CEDULA', 'PASAPORTE'];

// ============================================================
// InvoiceItem Entity
// ============================================================

export class InvoiceItem extends Entity {
  constructor({ id, invoiceId, productId, productName, sku, quantity, unitPrice, discount, tax, total, createdAt, variantId, variantName, variantAttributes }) {
    super(id);
    this._invoiceId = invoiceId;
    this._productId = productId;
    this._productName = productName;
    this._sku = sku;
    this._quantity = quantity;
    this._unitPrice = unitPrice;
    this._discount = discount || 0;
    this._tax = tax || 0;
    this._total = total || (quantity * unitPrice - (discount || 0));
    this._createdAt = createdAt || new Date();
    this._variantId = variantId || null;
    this._variantName = variantName || null;
    this._variantAttributes = variantAttributes || null;
  }

  get invoiceId() { return this._invoiceId; }
  get productId() { return this._productId; }
  get productName() { return this._productName; }
  get sku() { return this._sku; }
  get quantity() { return this._quantity; }
  get unitPrice() { return this._unitPrice; }
  get discount() { return this._discount; }
  get tax() { return this._tax; }
  get total() { return this._total; }
  get createdAt() { return this._createdAt; }
  get variantId() { return this._variantId; }
  get variantName() { return this._variantName; }
  get variantAttributes() { return this._variantAttributes; }

  toJSON() {
    return {
      id: this.id, invoiceId: this._invoiceId,
      productId: this._productId, productName: this._productName,
      sku: this._sku, quantity: this._quantity,
      unitPrice: this._unitPrice, discount: this._discount,
      tax: this._tax, total: this._total,
      createdAt: this._createdAt,
      variantId: this._variantId,
      variantName: this._variantName,
      variantAttributes: this._variantAttributes,
    };
  }
}

// ============================================================
// Invoice AggregateRoot
// ============================================================

export class Invoice extends AggregateRoot {
  constructor({
    id, invoiceNumber, ncf, saleId, clientId,
    clientDocumentType, clientDocumentNumber, clientName,
    clientAddress, clientPhone, clientEmail,
    userId, items,
    subtotal, discount, tax, total,
    status, invoiceType, fiscalDocumentTypeId, ncfSequenceId,
    referenceInvoiceId, cancellationReason,
    dueDate, paidAt, cancelledAt,
    paymentMethodName, paymentTerm,
    sellerName, branch, cashRegister,
    electronicStatus, xmlUrl, signature, qrCodeText, fiscalRegistration,
    source, notes,
    createdAt, updatedAt,
  }) {
    super(id);
    this._invoiceNumber = invoiceNumber;
    this._ncf = ncf || null;
    this._saleId = saleId;
    this._clientId = clientId;
    this._clientDocumentType = clientDocumentType || '';
    this._clientDocumentNumber = clientDocumentNumber || '';
    this._clientName = clientName || '';
    this._clientAddress = clientAddress || '';
    this._clientPhone = clientPhone || '';
    this._clientEmail = clientEmail || '';
    this._userId = userId;
    this._items = items || [];
    this._subtotal = subtotal || 0;
    this._discount = discount || 0;
    this._tax = tax || 0;
    this._total = total || 0;
    this._status = status || INVOICE_STATUSES.GENERATED;
    this._invoiceType = invoiceType || 'consumer_final';
    this._fiscalDocumentTypeId = fiscalDocumentTypeId || null;
    this._ncfSequenceId = ncfSequenceId || null;
    this._referenceInvoiceId = referenceInvoiceId || null;
    this._cancellationReason = cancellationReason || '';
    this._dueDate = dueDate || null;
    this._paidAt = paidAt || null;
    this._cancelledAt = cancelledAt || null;
    this._paymentMethodName = paymentMethodName || '';
    this._paymentTerm = paymentTerm || '';
    this._sellerName = sellerName || '';
    this._branch = branch || '';
    this._cashRegister = cashRegister || '';
    this._electronicStatus = electronicStatus || ELECTRONIC_STATUSES.PENDING;
    this._xmlUrl = xmlUrl || '';
    this._signature = signature || '';
    this._qrCodeText = qrCodeText || '';
    this._fiscalRegistration = fiscalRegistration || '';
    this._source = source || 'pos';
    this._notes = notes || '';
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  // Getters
  get invoiceNumber() { return this._invoiceNumber; }
  get ncf() { return this._ncf; }
  get saleId() { return this._saleId; }
  get clientId() { return this._clientId; }
  get clientDocumentType() { return this._clientDocumentType; }
  get clientDocumentNumber() { return this._clientDocumentNumber; }
  get clientName() { return this._clientName; }
  get clientAddress() { return this._clientAddress; }
  get clientPhone() { return this._clientPhone; }
  get clientEmail() { return this._clientEmail; }
  get userId() { return this._userId; }
  get items() { return this._items; }
  get subtotal() { return this._subtotal; }
  get discount() { return this._discount; }
  get tax() { return this._tax; }
  get total() { return this._total; }
  get status() { return this._status; }
  get invoiceType() { return this._invoiceType; }
  get fiscalDocumentTypeId() { return this._fiscalDocumentTypeId; }
  get ncfSequenceId() { return this._ncfSequenceId; }
  get referenceInvoiceId() { return this._referenceInvoiceId; }
  get cancellationReason() { return this._cancellationReason; }
  get dueDate() { return this._dueDate; }
  get paidAt() { return this._paidAt; }
  get cancelledAt() { return this._cancelledAt; }
  get paymentMethodName() { return this._paymentMethodName; }
  get paymentTerm() { return this._paymentTerm; }
  get sellerName() { return this._sellerName; }
  get branch() { return this._branch; }
  get cashRegister() { return this._cashRegister; }
  get electronicStatus() { return this._electronicStatus; }
  get xmlUrl() { return this._xmlUrl; }
  get signature() { return this._signature; }
  get qrCodeText() { return this._qrCodeText; }
  get fiscalRegistration() { return this._fiscalRegistration; }
  get source() { return this._source; }
  get notes() { return this._notes; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  // Business methods
  issue(ncf, fiscalDocumentTypeId, ncfSequenceId) {
    if (this._status !== INVOICE_STATUSES.GENERATED) throw new Error('INVOICE_ALREADY_ISSUED');
    this._ncf = ncf;
    this._fiscalDocumentTypeId = fiscalDocumentTypeId;
    this._ncfSequenceId = ncfSequenceId;
    this._status = INVOICE_STATUSES.ISSUED;
    this._electronicStatus = ELECTRONIC_STATUSES.SENT;
    this._updatedAt = new Date();
  }

  markPaid(paidAt) {
    this._status = INVOICE_STATUSES.PAID;
    this._paidAt = paidAt || new Date();
    this._updatedAt = new Date();
  }

  cancel(reason) {
    if (this._status === INVOICE_STATUSES.CANCELLED) throw new Error('ALREADY_CANCELLED');
    this._status = INVOICE_STATUSES.CANCELLED;
    this._cancelledAt = new Date();
    this._cancellationReason = reason || '';
    this._updatedAt = new Date();
  }

  void() {
    this._status = INVOICE_STATUSES.VOIDED;
    this._cancelledAt = new Date();
    this._updatedAt = new Date();
  }

  setItems(items) {
    this._items = items.map(i => i instanceof InvoiceItem ? i : new InvoiceItem(i));
    this._recalculate();
  }

  assignNcf(ncf) {
    this._ncf = ncf;
    this._updatedAt = new Date();
  }

  setElectronicInfo({ xmlUrl, signature, qrCodeText, status }) {
    if (xmlUrl) this._xmlUrl = xmlUrl;
    if (signature) this._signature = signature;
    if (qrCodeText) this._qrCodeText = qrCodeText;
    if (status) this._electronicStatus = status;
    this._updatedAt = new Date();
  }

  _recalculate() {
    this._subtotal = this._items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
    this._discount = this._items.reduce((s, i) => s + (i.discount || 0), 0);
    this._tax = this._items.reduce((s, i) => s + (i.tax || 0), 0);
    this._total = this._subtotal - this._discount + this._tax;
  }

  toJSON() {
    return {
      id: this.id, invoiceNumber: this._invoiceNumber,
      ncf: this._ncf, saleId: this._saleId,
      clientId: this._clientId,
      clientDocumentType: this._clientDocumentType,
      clientDocumentNumber: this._clientDocumentNumber,
      clientName: this._clientName,
      clientAddress: this._clientAddress,
      clientPhone: this._clientPhone,
      clientEmail: this._clientEmail,
      userId: this._userId,
      items: this._items.map(i => i.toJSON()),
      subtotal: this._subtotal, discount: this._discount,
      tax: this._tax, total: this._total,
      status: this._status, invoiceType: this._invoiceType,
      fiscalDocumentTypeId: this._fiscalDocumentTypeId,
      ncfSequenceId: this._ncfSequenceId,
      referenceInvoiceId: this._referenceInvoiceId,
      cancellationReason: this._cancellationReason,
      dueDate: this._dueDate, paidAt: this._paidAt,
      cancelledAt: this._cancelledAt,
      paymentMethodName: this._paymentMethodName,
      paymentTerm: this._paymentTerm,
      sellerName: this._sellerName, branch: this._branch,
      cashRegister: this._cashRegister,
      electronicStatus: this._electronicStatus,
      xmlUrl: this._xmlUrl, signature: this._signature,
      qrCodeText: this._qrCodeText,
      fiscalRegistration: this._fiscalRegistration,
      source: this._source, notes: this._notes,
      createdAt: this._createdAt, updatedAt: this._updatedAt,
    };
  }
}

// ============================================================
// NcfSequence Value Object
// ============================================================

export class NcfSequence extends ValueObject {
  constructor({ id, companyId, fiscalDocumentTypeId, serie, prefix, currentNumber, maxNumber, validFrom, validTo, isActive, branch }) {
    super();
    this._id = id;
    this._companyId = companyId;
    this._fiscalDocumentTypeId = fiscalDocumentTypeId;
    this._serie = serie;
    this._prefix = prefix;
    this._currentNumber = currentNumber;
    this._maxNumber = maxNumber;
    this._validFrom = validFrom;
    this._validTo = validTo;
    this._isActive = isActive !== false;
    this._branch = branch || '';
  }

  get id() { return this._id; }
  get companyId() { return this._companyId; }
  get fiscalDocumentTypeId() { return this._fiscalDocumentTypeId; }
  get serie() { return this._serie; }
  get prefix() { return this._prefix; }
  get currentNumber() { return this._currentNumber; }
  get maxNumber() { return this._maxNumber; }
  get validFrom() { return this._validFrom; }
  get validTo() { return this._validTo; }
  get isActive() { return this._isActive; }
  get branch() { return this._branch; }
  get isExhausted() { return this._currentNumber >= this._maxNumber; }

  get nextNcf() {
    if (this.isExhausted) throw new Error('NCF_SEQUENCE_EXHAUSTED');
    const next = this._currentNumber + 1;
    return `${this._prefix}-${String(next).padStart(8, '0')}`;
  }

  equals(other) {
    return other instanceof NcfSequence && this._id === other._id;
  }

  toJSON() {
    return {
      id: this._id, companyId: this._companyId,
      fiscalDocumentTypeId: this._fiscalDocumentTypeId,
      serie: this._serie, prefix: this._prefix,
      currentNumber: this._currentNumber,
      maxNumber: this._maxNumber,
      validFrom: this._validFrom, validTo: this._validTo,
      isActive: this._isActive, branch: this._branch,
    };
  }
}

// ============================================================
// FiscalDocumentType Value Object
// ============================================================

export class FiscalDocumentType extends ValueObject {
  constructor({ id, code, name, type, prefix, isActive, requiresIdentification }) {
    super();
    this._id = id;
    this._code = code;
    this._name = name;
    this._type = type;
    this._prefix = prefix;
    this._isActive = isActive !== false;
    this._requiresIdentification = requiresIdentification !== false;
  }

  get id() { return this._id; }
  get code() { return this._code; }
  get name() { return this._name; }
  get type() { return this._type; }
  get prefix() { return this._prefix; }
  get isActive() { return this._isActive; }
  get requiresIdentification() { return this._requiresIdentification; }

  toJSON() {
    return {
      id: this._id, code: this._code, name: this._name,
      type: this._type, prefix: this._prefix,
      isActive: this._isActive,
      requiresIdentification: this._requiresIdentification,
    };
  }
}

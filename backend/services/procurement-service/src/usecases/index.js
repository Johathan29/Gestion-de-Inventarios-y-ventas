// ============================================================
// Procurement Use Cases
// ============================================================

import { Purchase, PurchaseItem, Supplier, PURCHASE_STATUSES } from '../domain/procurement.js';
import { PurchaseCreatedEvent, PurchaseApprovedEvent, PurchaseReceivedEvent, PurchaseCancelledEvent, SupplierCreatedEvent, SupplierUpdatedEvent } from '../events/index.js';

// ─── Purchase Use Cases ─────────────────────────────────────

export class CreatePurchaseUseCase {
  constructor({ purchaseRepository, eventBus }) {
    this._purchaseRepository = purchaseRepository;
    this._eventBus = eventBus;
  }

  async execute({ supplierId, items, notes, userId }) {
    const purchaseNumber = await this._purchaseRepository.getNextNumber();

    const purchase = new Purchase({
      purchaseNumber,
      supplierId,
      status: PURCHASE_STATUSES.DRAFT,
      notes: notes || '',
      userId,
    });

    const purchaseItems = items.map(i => new PurchaseItem({
      productId: i.productId,
      productName: i.productName || '',
      sku: i.sku || '',
      barcode: i.barcode || '',
      productImage: i.productImage || '',
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.quantity * i.unitPrice,
    }));

    purchase.setItems(purchaseItems);

    const saved = await this._purchaseRepository.save(purchase);

    await this._eventBus.publish(new PurchaseCreatedEvent(saved));

    return saved;
  }
}

export class GetPurchaseUseCase {
  constructor({ purchaseRepository }) {
    this._purchaseRepository = purchaseRepository;
  }

  async execute(id) {
    const purchase = await this._purchaseRepository.findById(id);
    if (!purchase) throw new Error('NOT_FOUND');
    return purchase;
  }
}

export class ListPurchasesUseCase {
  constructor({ purchaseRepository }) {
    this._purchaseRepository = purchaseRepository;
  }

  async execute({ page, limit, status, supplierId, fromDate, toDate } = {}) {
    return this._purchaseRepository.findMany({ page, limit, status, supplierId, fromDate, toDate });
  }
}

export class UpdatePurchaseStatusUseCase {
  constructor({ purchaseRepository, eventBus }) {
    this._purchaseRepository = purchaseRepository;
    this._eventBus = eventBus;
  }

  async execute({ id, status, userId }) {
    const purchase = await this._purchaseRepository.findById(id);
    if (!purchase) throw new Error('NOT_FOUND');

    switch (status) {
      case PURCHASE_STATUSES.PENDING_APPROVAL:
        purchase.requestApproval();
        break;
      case PURCHASE_STATUSES.APPROVED:
        purchase.approve();
        await this._eventBus.publish(new PurchaseApprovedEvent(purchase));
        break;
      case PURCHASE_STATUSES.RECEIVED:
        purchase.receive();
        await this._eventBus.publish(new PurchaseReceivedEvent(purchase));
        break;
      case PURCHASE_STATUSES.CANCELLED:
        purchase.cancel();
        await this._eventBus.publish(new PurchaseCancelledEvent(purchase));
        break;
      default:
        throw new Error(`Invalid status: ${status}`);
    }

    await this._purchaseRepository.updateStatus(purchase.id, purchase.status);
    return this._purchaseRepository.findById(purchase.id);
  }
}

export class CancelPurchaseUseCase {
  constructor({ purchaseRepository, eventBus }) {
    this._purchaseRepository = purchaseRepository;
    this._eventBus = eventBus;
  }

  async execute({ id, userId }) {
    const purchase = await this._purchaseRepository.findById(id);
    if (!purchase) throw new Error('NOT_FOUND');
    if (purchase.status === PURCHASE_STATUSES.CANCELLED) throw new Error('ALREADY_CANCELLED');

    purchase.cancel();
    await this._purchaseRepository.updateStatus(purchase.id, purchase.status);
    await this._eventBus.publish(new PurchaseCancelledEvent(purchase));
    return this._purchaseRepository.findById(purchase.id);
  }
}

export class GetNextPurchaseNumberUseCase {
  constructor({ purchaseRepository }) {
    this._purchaseRepository = purchaseRepository;
  }

  async execute() {
    return this._purchaseRepository.getNextNumber();
  }
}

// ─── Supplier Use Cases ─────────────────────────────────────

export class CreateSupplierUseCase {
  constructor({ supplierRepository, eventBus }) {
    this._supplierRepository = supplierRepository;
    this._eventBus = eventBus;
  }

  async execute(data) {
    const existing = await this._supplierRepository.findByName(data.name);
    if (existing) throw new Error('DUPLICATE_NAME');

    const supplier = new Supplier({ name: data.name, ...data });
    const saved = await this._supplierRepository.save(supplier);
    await this._eventBus.publish(new SupplierCreatedEvent(saved));
    return saved;
  }
}

export class UpdateSupplierUseCase {
  constructor({ supplierRepository, eventBus }) {
    this._supplierRepository = supplierRepository;
    this._eventBus = eventBus;
  }

  async execute({ id, data }) {
    const supplier = await this._supplierRepository.findById(id);
    if (!supplier) throw new Error('NOT_FOUND');

    supplier.updateDetails(data);
    const saved = await this._supplierRepository.update(id, {
      name: supplier.name,
      contact_name: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      tax_id: supplier.taxId,
      payment_terms: supplier.paymentTerms,
      notes: supplier.notes,
      is_active: supplier.isActive,
    });

    await this._eventBus.publish(new SupplierUpdatedEvent(saved));
    return saved;
  }
}

export class GetSupplierUseCase {
  constructor({ supplierRepository }) {
    this._supplierRepository = supplierRepository;
  }

  async execute(id) {
    const supplier = await this._supplierRepository.findById(id);
    if (!supplier) throw new Error('NOT_FOUND');
    return supplier;
  }
}

export class ListSuppliersUseCase {
  constructor({ supplierRepository }) {
    this._supplierRepository = supplierRepository;
  }

  async execute({ page, limit, search, isActive } = {}) {
    return this._supplierRepository.findMany({ page, limit, search, isActive });
  }
}

export class DeleteSupplierUseCase {
  constructor({ supplierRepository, purchaseRepository }) {
    this._supplierRepository = supplierRepository;
    this._purchaseRepository = purchaseRepository;
  }

  async execute(id) {
    const supplier = await this._supplierRepository.findById(id);
    if (!supplier) throw new Error('NOT_FOUND');

    const purchaseCount = await this._purchaseRepository.countBySupplierId(id);
    if (purchaseCount > 0) {
      throw new Error('HAS_RELATIONS');
    }

    await this._supplierRepository.delete(id);
  }
}

// ============================================================
// Procurement Application Service — Façade
// ============================================================

import {
  CreatePurchaseUseCase, GetPurchaseUseCase, ListPurchasesUseCase,
  UpdatePurchaseStatusUseCase, CancelPurchaseUseCase, GetNextPurchaseNumberUseCase,
  CreateSupplierUseCase, UpdateSupplierUseCase, GetSupplierUseCase,
  ListSuppliersUseCase, DeleteSupplierUseCase,
} from '../usecases/index.js';

export class ProcurementApplicationService {
  constructor({ purchaseRepository, supplierRepository, eventBus }) {
    this._purchaseRepo = purchaseRepository;
    this._supplierRepo = supplierRepository;
    this._eventBus = eventBus;
  }

  // ── Purchase Commands ─────────────────────────────────────

  async createPurchase({ supplierId, items, notes, userId }) {
    const useCase = new CreatePurchaseUseCase({
      purchaseRepository: this._purchaseRepo,
      eventBus: this._eventBus,
    });
    return useCase.execute({ supplierId, items, notes, userId });
  }

  async getPurchase(id) {
    const useCase = new GetPurchaseUseCase({ purchaseRepository: this._purchaseRepo });
    return useCase.execute(id);
  }

  async listPurchases(query) {
    const useCase = new ListPurchasesUseCase({ purchaseRepository: this._purchaseRepo });
    return useCase.execute(query);
  }

  async updatePurchaseStatus({ id, status, userId }) {
    const useCase = new UpdatePurchaseStatusUseCase({
      purchaseRepository: this._purchaseRepo,
      eventBus: this._eventBus,
    });
    return useCase.execute({ id, status, userId });
  }

  async cancelPurchase({ id, userId }) {
    const useCase = new CancelPurchaseUseCase({
      purchaseRepository: this._purchaseRepo,
      eventBus: this._eventBus,
    });
    return useCase.execute({ id, userId });
  }

  async getNextPurchaseNumber() {
    const useCase = new GetNextPurchaseNumberUseCase({ purchaseRepository: this._purchaseRepo });
    return useCase.execute();
  }

  // ── Supplier Commands ─────────────────────────────────────

  async createSupplier(data) {
    const useCase = new CreateSupplierUseCase({
      supplierRepository: this._supplierRepo,
      eventBus: this._eventBus,
    });
    return useCase.execute(data);
  }

  async updateSupplier({ id, data }) {
    const useCase = new UpdateSupplierUseCase({
      supplierRepository: this._supplierRepo,
      eventBus: this._eventBus,
    });
    return useCase.execute({ id, data });
  }

  async getSupplier(id) {
    const useCase = new GetSupplierUseCase({ supplierRepository: this._supplierRepo });
    return useCase.execute(id);
  }

  async listSuppliers(query) {
    const useCase = new ListSuppliersUseCase({ supplierRepository: this._supplierRepo });
    return useCase.execute(query);
  }

  async deleteSupplier(id) {
    const useCase = new DeleteSupplierUseCase({
      supplierRepository: this._supplierRepo,
      purchaseRepository: this._purchaseRepo,
    });
    return useCase.execute(id);
  }
}

// ============================================================
// Procurement Repository Ports (Interfaces)
// ============================================================

/**
 * @interface IPurchaseRepository
 * Port for purchase persistence
 */
export class IPurchaseRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findMany({ page, limit, status, supplierId, fromDate, toDate }) { throw new Error('Not implemented'); }
  async save(purchase) { throw new Error('Not implemented'); }
  async update(purchase) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
  async findItems(purchaseId) { throw new Error('Not implemented'); }
  async getNextNumber() { throw new Error('Not implemented'); }
  async countBySupplierId(supplierId) { throw new Error('Not implemented'); }
}

/**
 * @interface ISupplierRepository
 * Port for supplier persistence
 */
export class ISupplierRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findMany({ page, limit, search, isActive }) { throw new Error('Not implemented'); }
  async save(supplier) { throw new Error('Not implemented'); }
  async update(supplier) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
  async findByName(name) { throw new Error('Not implemented'); }
}

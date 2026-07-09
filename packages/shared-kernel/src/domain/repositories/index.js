// ============================================================
// Repository Interfaces — Ports for hexagonal architecture
// ============================================================

/**
 * Base Repository interface
 * All repositories should extend this
 */
export class IRepository {
  /**
   * @param {string|UUID} id
   * @returns {Promise<AggregateRoot|null>}
   */
  async findById(id) {
    throw new Error('IRepository.findById() must be implemented');
  }

  /**
   * @param {AggregateRoot} entity
   * @returns {Promise<void>}
   */
  async save(entity) {
    throw new Error('IRepository.save() must be implemented');
  }

  /**
   * @param {AggregateRoot} entity
   * @returns {Promise<void>}
   */
  async delete(entity) {
    throw new Error('IRepository.delete() must be implemented');
  }

  /**
   * @returns {Promise<number>}
   */
  async count() {
    throw new Error('IRepository.count() must be implemented');
  }
}

/**
 * Generic Repository interface with pagination support
 */
export class IGenericRepository extends IRepository {
  /**
   * @param {Object} filters
   * @param {Object} options - { page, limit, sortBy, sortOrder }
   * @returns {Promise<{ data: Array, total: number, page: number, limit: number }>}
   */
  async findAll(filters = {}, options = {}) {
    throw new Error('IGenericRepository.findAll() must be implemented');
  }
}

/**
 * Specification pattern interface
 */
export class ISpecification {
  /**
   * @param {AggregateRoot} entity
   * @returns {boolean}
   */
  isSatisfiedBy(entity) {
    throw new Error('ISpecification.isSatisfiedBy() must be implemented');
  }
}

export default { IRepository, IGenericRepository, ISpecification };

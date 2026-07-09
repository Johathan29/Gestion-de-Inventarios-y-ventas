// ============================================================
// Identity Repository Interface (Port)
// ============================================================

/**
 * Interface for UserRepository
 * This is a PORT in hexagonal architecture
 */
export class IUserRepository {
  async findById(id) {
    throw new Error('IUserRepository.findById not implemented');
  }

  async findByEmail(email) {
    throw new Error('IUserRepository.findByEmail not implemented');
  }

  async findAll(query = {}) {
    throw new Error('IUserRepository.findAll not implemented');
  }

  async save(user) {
    throw new Error('IUserRepository.save not implemented');
  }

  async update(user) {
    throw new Error('IUserRepository.update not implemented');
  }

  async delete(id) {
    throw new Error('IUserRepository.delete not implemented');
  }

  async count(filters = {}) {
    throw new Error('IUserRepository.count not implemented');
  }
}

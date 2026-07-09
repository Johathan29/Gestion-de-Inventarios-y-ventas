// ============================================================
// User Mapper — Domain <-> DTO <-> Persistence
// ============================================================

import { User } from '../domain/user.js';

export class UserMapper {
  /**
   * Map persistence row to Domain entity
   */
  static toDomain(row) {
    if (!row) return null;

    return new User({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      role: row.roles?.name || row.role,
      isActive: row.is_active,
      companyId: row.company_id,
      phone: row.phone || '',
      lastLogin: row.last_login ? new Date(row.last_login) : null,
    });
  }

  /**
   * Map Domain entity to persistence format
   */
  static toPersistence(user) {
    return {
      id: user.id,
      email: user.email.address,
      name: user.name,
      password_hash: user.passwordHash,
      role: user.role,
      is_active: user.isActive,
      company_id: user.companyId,
      phone: user.phone,
      last_login: user.lastLogin?.toISOString(),
    };
  }

  /**
   * Map Domain entity to API response (DTO)
   */
  static toDTO(user) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email.address,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      companyId: user.companyId,
      phone: user.phone,
      lastLogin: user.lastLogin?.toISOString(),
      createdAt: user.createdAt?.toISOString(),
    };
  }

  /**
   * Map multiple rows to Domain entities
   */
  static toDomainList(rows) {
    return (rows || []).map(row => UserMapper.toDomain(row));
  }

  /**
   * Map multiple Domain entities to DTO list
   */
  static toDTOList(users) {
    return (users || []).map(user => UserMapper.toDTO(user));
  }
}

export default UserMapper;

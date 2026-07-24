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

    // Map DB permission module names to permission prefix (e.g. 'users' -> 'user')
    const MODULE_MAP = {
      sales: 'sale', purchases: 'purchase', products: 'product',
      inventory: 'inventory', users: 'user', clients: 'client',
      suppliers: 'supplier', invoices: 'invoice', reports: 'report',
      categories: 'category', ecommerce: 'ecommerce',
      notifications: 'notification', audit: 'audit', config: 'config',
      accounting: 'accounting', admin: 'admin',
    };

    // Flatten role permissions object into array of "category:action" strings
    const permissions = [];
    if (row.roles?.permissions && typeof row.roles.permissions === 'object') {
      for (const [category, actions] of Object.entries(row.roles.permissions)) {
        const prefix = MODULE_MAP[category] || category;
        if (Array.isArray(actions)) {
          actions.forEach(action => permissions.push(`${prefix}:${action}`));
        }
      }
    }

    return new User({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      role: row.roles?.name || row.role || null,
      isActive: row.is_active,
      companyId: row.company_id || row.companyid || null,
      phone: row.phone || '',
      lastLogin: row.last_login ? new Date(row.last_login) : null,
      permissions,
    });
  }

  /**
   * Map Domain entity to persistence format
   */
  static toPersistence(user) {
    const result = {
      id: user.id,
      email: user.email.address,
      name: user.name,
      password_hash: user.passwordHash,
      is_active: user.isActive,
      phone: user.phone,
      last_login: user.lastLogin?.toISOString(),
    };
    // Only include company_id if it exists in DB (some environments lack this column)
    if (user.companyId) {
      result.company_id = user.companyId;
    }
    return result;
  }

  /**
   * Map Domain entity to API response (DTO)
   */
  static toDTO(user) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email?.address || user.email,
      name: user.name,
      role_name: user.role,
      is_active: user.isActive,
      company_id: user.companyId || null,
      phone: user.phone,
      last_login: user.lastLogin?.toISOString?.() || user.lastLogin,
      created_at: user.createdAt?.toISOString?.() || user.createdAt,
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

// ============================================================
// Identity Domain — User, Role Aggregates
// ============================================================

import { AggregateRoot, Entity, Email, ValueObject } from '@erp/shared-kernel';

/**
 * User Aggregate Root
 */
export class User extends AggregateRoot {
  constructor({ id, email, name, passwordHash, role, isActive, companyId, phone, lastLogin, permissions }) {
    super(id);
    this._email = email instanceof Email ? email : new Email(email);
    this._name = name;
    this._passwordHash = passwordHash;
    this._role = role;
    this._isActive = isActive !== false;
    this._companyId = companyId || null;
    this._phone = phone || '';
    this._lastLogin = lastLogin || null;
    this._permissions = Array.isArray(permissions) ? permissions : [];
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  get email() { return this._email; }
  get name() { return this._name; }
  get passwordHash() { return this._passwordHash; }
  get role() { return this._role; }
  get isActive() { return this._isActive; }
  get companyId() { return this._companyId; }
  get phone() { return this._phone; }
  get lastLogin() { return this._lastLogin; }
  get permissions() { return [...this._permissions]; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  // Business methods
  activate() {
    this._isActive = true;
    this._updatedAt = new Date();
    this.addDomainEvent(new UserActivatedEvent({ aggregateId: this.id, userId: this.id }));
  }

  deactivate() {
    this._isActive = false;
    this._updatedAt = new Date();
    this.addDomainEvent(new UserDeactivatedEvent({ aggregateId: this.id, userId: this.id }));
  }

  recordLogin() {
    this._lastLogin = new Date();
    this._updatedAt = new Date();
  }

  updateProfile({ name, phone } = {}) {
    if (name) this._name = name;
    if (phone !== undefined) this._phone = phone;
    this._updatedAt = new Date();
  }

  changePassword(newHash) {
    this._passwordHash = newHash;
    this._updatedAt = new Date();
    this.addDomainEvent(new UserPasswordChangedEvent({ aggregateId: this.id, userId: this.id }));
  }

  assignRole(role) {
    this._role = role;
    this._updatedAt = new Date();
    this.addDomainEvent(new UserRoleChangedEvent({ aggregateId: this.id, userId: this.id, role }));
  }

  toJSON() {
    return {
      id: this.id,
      email: this._email.address,
      name: this._name,
      role: this._role,
      isActive: this._isActive,
      companyId: this._companyId,
      phone: this._phone,
      lastLogin: this._lastLogin?.toISOString(),
      permissions: this._permissions,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}

/**
 * Role entity
 */
export class Role extends Entity {
  constructor({ id, name, description, permissions = [] }) {
    super(id);
    this._name = name;
    this._description = description || '';
    this._permissions = [...permissions];
  }

  get name() { return this._name; }
  get description() { return this._description; }
  get permissions() { return [...this._permissions]; }

  setPermissions(perms) {
    this._permissions = [...perms];
  }

  toJSON() {
    return {
      id: this.id,
      name: this._name,
      description: this._description,
      permissions: this._permissions,
    };
  }
}

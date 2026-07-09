// ============================================================
// Use Cases — Identity & Authentication
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { InvariantError, UnauthorizedError, NotFoundError } from '@erp/shared-kernel';
import { User } from '../domain/user.js';
import {
  UserRegisteredEvent, UserLoggedInEvent, UserPasswordChangedEvent, UserRoleChangedEvent,
} from '../events/index.js';

const SALT_ROUNDS = 12;

export class RegisterUserUseCase {
  #userRepository;
  #eventBus;

  constructor({ userRepository, eventBus }) {
    this.#userRepository = userRepository;
    this.#eventBus = eventBus;
  }

  async execute({ name, email, password, phone, role = 'cliente', companyId }) {
    // Check for existing user
    const existing = await this.#userRepository.findByEmail(email);
    if (existing) {
      throw new InvariantError('Ya existe un usuario con este email', { email });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create domain entity
    const user = new User({
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash,
      role,
      phone,
      companyId,
    });

    // Persist
    const saved = await this.#userRepository.save(user);

    // Publish event
    await this.#eventBus.publish(new UserRegisteredEvent({
      aggregateId: saved.id,
      userId: saved.id,
      email: saved.email.address,
      name: saved.name,
      role: saved.role,
    }));

    return saved;
  }
}

export class LoginUseCase {
  #userRepository;
  #eventBus;
  #jwtConfig;

  constructor({ userRepository, eventBus, jwtConfig }) {
    this.#userRepository = userRepository;
    this.#eventBus = eventBus;
    this.#jwtConfig = jwtConfig;
  }

  async execute({ email, password, ipAddress }) {
    // Find user
    const user = await this.#userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Check active
    if (!user.isActive) {
      throw new UnauthorizedError('Usuario desactivado');
    }

    // Record login
    user.recordLogin();
    await this.#userRepository.update(user);

    // Generate tokens
    const tokens = this.#generateTokens(user);

    // Publish event
    await this.#eventBus.publish(new UserLoggedInEvent({
      aggregateId: user.id,
      userId: user.id,
      ipAddress,
    }));

    return { user, ...tokens };
  }

  #generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email.address,
      role: user.role,
      permissions: user.permissions,
      companyId: user.companyId,
    };

    const accessToken = jwt.sign(
      payload,
      this.#jwtConfig.secret,
      { expiresIn: this.#jwtConfig.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      this.#jwtConfig.refreshSecret,
      { expiresIn: this.#jwtConfig.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }
}

export class RefreshTokenUseCase {
  #jwtConfig;

  constructor({ jwtConfig }) {
    this.#jwtConfig = jwtConfig;
  }

  async execute({ refreshToken }) {
    try {
      const decoded = jwt.verify(refreshToken, this.#jwtConfig.refreshSecret);
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Token inválido');
      }

      const payload = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      const newAccessToken = jwt.sign(
        payload,
        this.#jwtConfig.secret,
        { expiresIn: this.#jwtConfig.expiresIn }
      );

      return { accessToken: newAccessToken };
    } catch (err) {
      throw new UnauthorizedError('Refresh token inválido o expirado');
    }
  }
}

export class ChangePasswordUseCase {
  #userRepository;
  #eventBus;

  constructor({ userRepository, eventBus }) {
    this.#userRepository = userRepository;
    this.#eventBus = eventBus;
  }

  async execute({ userId, currentPassword, newPassword }) {
    const user = await this.#userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado', userId);
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Contraseña actual incorrecta');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.changePassword(newHash);
    await this.#userRepository.update(user);

    await this.#eventBus.publish(new UserPasswordChangedEvent({
      aggregateId: user.id,
      userId: user.id,
    }));

    return user;
  }
}

export class UpdateUserUseCase {
  #userRepository;
  #eventBus;

  constructor({ userRepository, eventBus }) {
    this.#userRepository = userRepository;
    this.#eventBus = eventBus;
  }

  async execute({ id, updates }) {
    const user = await this.#userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado', id);
    }

    if (updates.name || updates.phone !== undefined) {
      user.updateProfile({ name: updates.name, phone: updates.phone });
    }

    if (updates.role) {
      user.assignRole(updates.role);
      await this.#eventBus.publish(new UserRoleChangedEvent({
        aggregateId: user.id,
        userId: user.id,
        role: updates.role,
      }));
    }

    if (updates.isActive === false) user.deactivate();
    if (updates.isActive === true) user.activate();

    return await this.#userRepository.update(user);
  }
}

export class GetUserUseCase {
  #userRepository;

  constructor({ userRepository }) {
    this.#userRepository = userRepository;
  }

  async execute(id) {
    const user = await this.#userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado', id);
    }
    return user;
  }
}

export class ListUsersUseCase {
  #userRepository;

  constructor({ userRepository }) {
    this.#userRepository = userRepository;
  }

  async execute(query) {
    return await this.#userRepository.findAll(query);
  }
}

export default {
  RegisterUserUseCase, LoginUseCase, RefreshTokenUseCase,
  ChangePasswordUseCase, UpdateUserUseCase, GetUserUseCase, ListUsersUseCase,
};

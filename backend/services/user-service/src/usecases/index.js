// ============================================================
// CRM Use Cases
// ============================================================

import { Client, CreditAccount, NotificationPreference } from '../domain/index.js';
import { ClientCreatedEvent, ClientUpdatedEvent, ClientDeactivatedEvent, CreditAccountCreatedEvent, NotificationPrefsUpdatedEvent } from '../events/index.js';

export class ListClientsUseCase {
  constructor({ clientRepo }) {
    this._clientRepo = clientRepo;
  }

  async execute(filters) {
    return this._clientRepo.findAll(filters);
  }
}

export class GetClientUseCase {
  constructor({ clientRepo }) {
    this._clientRepo = clientRepo;
  }

  async execute(id) {
    const client = await this._clientRepo.findById(id);
    if (!client) throw new Error('NOT_FOUND');
    return client;
  }
}

export class GetClientByUserIdUseCase {
  constructor({ clientRepo }) {
    this._clientRepo = clientRepo;
  }

  async execute(userId) {
    const client = await this._clientRepo.findByUserId(userId);
    if (!client) throw new Error('NOT_FOUND');
    return client;
  }
}

export class CreateClientUseCase {
  constructor({ clientRepo, eventBus }) {
    this._clientRepo = clientRepo;
    this._eventBus = eventBus;
  }

  async execute(input) {
    const client = new Client(input);
    const saved = await this._clientRepo.save(client);
    await this._eventBus.publish(new ClientCreatedEvent(saved));
    return saved;
  }
}

export class UpdateClientUseCase {
  constructor({ clientRepo, eventBus }) {
    this._clientRepo = clientRepo;
    this._eventBus = eventBus;
  }

  async execute(id, input) {
    const client = await this._clientRepo.findById(id);
    if (!client) throw new Error('NOT_FOUND');

    client.updateInfo(input);
    const saved = await this._clientRepo.update(client);
    await this._eventBus.publish(new ClientUpdatedEvent(saved));
    return saved;
  }
}

export class DeleteClientUseCase {
  constructor({ clientRepo, eventBus }) {
    this._clientRepo = clientRepo;
    this._eventBus = eventBus;
  }

  async execute(id) {
    const client = await this._clientRepo.findById(id);
    if (!client) throw new Error('NOT_FOUND');

    client.deactivate();
    await this._clientRepo.update(client);
    await this._eventBus.publish(new ClientDeactivatedEvent(client));
    return { success: true };
  }
}

export class GetCreditAccountUseCase {
  constructor({ creditAccountRepo, clientRepo }) {
    this._creditAccountRepo = creditAccountRepo;
    this._clientRepo = clientRepo;
  }

  async execute(clientId) {
    const account = await this._creditAccountRepo.findByClientId(clientId);
    if (!account) throw new Error('NOT_FOUND');
    return account;
  }

  async executeByUserId(userId) {
    const client = await this._clientRepo.findByUserId(userId);
    if (!client) throw new Error('CLIENT_NOT_FOUND');
    return this.execute(client.id);
  }
}

export class CreateCreditAccountUseCase {
  constructor({ creditAccountRepo, clientRepo, eventBus }) {
    this._creditAccountRepo = creditAccountRepo;
    this._clientRepo = clientRepo;
    this._eventBus = eventBus;
  }

  async execute(input) {
    const account = new CreditAccount(input);
    const saved = await this._creditAccountRepo.save(account);
    await this._eventBus.publish(new CreditAccountCreatedEvent(saved));
    return saved;
  }
}

export class UpdateCreditAccountUseCase {
  constructor({ creditAccountRepo }) {
    this._creditAccountRepo = creditAccountRepo;
  }

  async execute(id, input) {
    const account = await this._creditAccountRepo.findById(id);
    if (!account) throw new Error('NOT_FOUND');

    account.update(input);
    return this._creditAccountRepo.update(account);
  }
}

export class GetNotificationPrefsUseCase {
  constructor({ notifRepo, clientRepo }) {
    this._notifRepo = notifRepo;
    this._clientRepo = clientRepo;
  }

  async execute(clientId) {
    const prefs = await this._notifRepo.findByClientId(clientId);
    if (!prefs) throw new Error('NOT_FOUND');
    return prefs;
  }
}

export class UpdateNotificationPrefsUseCase {
  constructor({ notifRepo, eventBus }) {
    this._notifRepo = notifRepo;
    this._eventBus = eventBus;
  }

  async execute(clientId, input) {
    let prefs = await this._notifRepo.findByClientId(clientId);
    if (!prefs) {
      prefs = new NotificationPreference({ clientId, ...input });
    } else {
      prefs.update(input);
    }
    const saved = await this._notifRepo.upsert(prefs);
    await this._eventBus.publish(new NotificationPrefsUpdatedEvent(saved));
    return saved;
  }
}

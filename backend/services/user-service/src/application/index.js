// ============================================================
// CRM Application Service — Façade
// ============================================================

import {
  ListClientsUseCase, GetClientUseCase, GetClientByUserIdUseCase,
  CreateClientUseCase, UpdateClientUseCase, DeleteClientUseCase,
  GetCreditAccountUseCase, CreateCreditAccountUseCase, UpdateCreditAccountUseCase,
  GetNotificationPrefsUseCase, UpdateNotificationPrefsUseCase,
} from '../usecases/index.js';

export class CRMApplicationService {
  constructor({ clientRepo, creditAccountRepo, notifRepo, eventBus }) {
    this._clientRepo = clientRepo;
    this._creditAccountRepo = creditAccountRepo;
    this._notifRepo = notifRepo;
    this._eventBus = eventBus;

    this._listClients = new ListClientsUseCase({ clientRepo });
    this._getClient = new GetClientUseCase({ clientRepo });
    this._getClientByUserId = new GetClientByUserIdUseCase({ clientRepo });
    this._createClient = new CreateClientUseCase({ clientRepo, eventBus });
    this._updateClient = new UpdateClientUseCase({ clientRepo, eventBus });
    this._deleteClient = new DeleteClientUseCase({ clientRepo, eventBus });
    this._getCreditAccount = new GetCreditAccountUseCase({ creditAccountRepo, clientRepo });
    this._createCreditAccount = new CreateCreditAccountUseCase({ creditAccountRepo, clientRepo, eventBus });
    this._updateCreditAccount = new UpdateCreditAccountUseCase({ creditAccountRepo });
    this._getNotificationPrefs = new GetNotificationPrefsUseCase({ notifRepo, clientRepo });
    this._updateNotificationPrefs = new UpdateNotificationPrefsUseCase({ notifRepo, eventBus });
  }

  listClients(filters) { return this._listClients.execute(filters); }
  getClient(id) { return this._getClient.execute(id); }
  getClientByUserId(userId) { return this._getClientByUserId.execute(userId); }
  createClient(input) { return this._createClient.execute(input); }
  updateClient(id, input) { return this._updateClient.execute(id, input); }
  deleteClient(id) { return this._deleteClient.execute(id); }
  getCreditAccount(clientId) { return this._getCreditAccount.execute(clientId); }

  async getCreditAccountByUserId(userId) {
    return this._getCreditAccount.executeByUserId(userId);
  }

  async createCreditAccount(input) {
    // If userId provided instead of clientId, resolve it
    if (input.userId && !input.clientId) {
      const client = await this._clientRepo.findByUserId(input.userId);
      if (!client) throw new Error('CLIENT_NOT_FOUND');
      input.clientId = client.id;
    }
    return this._createCreditAccount.execute(input);
  }

  updateCreditAccount(id, input) { return this._updateCreditAccount.execute(id, input); }

  async getNotificationPrefs(clientId) {
    return this._getNotificationPrefs.execute(clientId);
  }

  async getNotificationPrefsByUserId(userId) {
    const client = await this._clientRepo.findByUserId(userId);
    if (!client) throw new Error('CLIENT_NOT_FOUND');
    return this._getNotificationPrefs.execute(client.id);
  }

  async updateNotificationPrefs(clientId, input) {
    return this._updateNotificationPrefs.execute(clientId, input);
  }

  async updateNotificationPrefsByUserId(userId, input) {
    const client = await this._clientRepo.findByUserId(userId);
    if (!client) throw new Error('CLIENT_NOT_FOUND');
    return this._updateNotificationPrefs.execute(client.id, input);
  }
}

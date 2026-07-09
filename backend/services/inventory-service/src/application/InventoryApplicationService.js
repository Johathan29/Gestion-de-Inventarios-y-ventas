// ============================================================
// Inventory Application Service — Façade
// ============================================================

import {
  GetStockUseCase, GetStockByProductUseCase,
  CreateEntryUseCase, CreateExitUseCase,
  CreateAdjustmentUseCase, CreateTransferUseCase,
  GetMovementsUseCase, GetKardexUseCase,
  GetStockAlertsUseCase, GetInventorySummaryUseCase,
  CreateReservationUseCase,
} from '../usecases/index.js';

export class InventoryApplicationService {
  constructor({ inventoryRepository, movementRepository, reservationRepository, eventBus }) {
    this._inventoryRepo = inventoryRepository;
    this._movementRepo = movementRepository;
    this._reservationRepo = reservationRepository;
    this._eventBus = eventBus;
  }

  async getStock(query) {
    return new GetStockUseCase({ inventoryRepository: this._inventoryRepo }).execute(query);
  }

  async getStockByProduct(productId) {
    return new GetStockByProductUseCase({ inventoryRepository: this._inventoryRepo }).execute(productId);
  }

  async createEntry(data) {
    return new CreateEntryUseCase({
      inventoryRepository: this._inventoryRepo,
      movementRepository: this._movementRepo,
      eventBus: this._eventBus,
    }).execute(data);
  }

  async createExit(data) {
    return new CreateExitUseCase({
      inventoryRepository: this._inventoryRepo,
      movementRepository: this._movementRepo,
      eventBus: this._eventBus,
    }).execute(data);
  }

  async createAdjustment(data) {
    return new CreateAdjustmentUseCase({
      inventoryRepository: this._inventoryRepo,
      movementRepository: this._movementRepo,
      eventBus: this._eventBus,
    }).execute(data);
  }

  async createTransfer(data) {
    return new CreateTransferUseCase({
      inventoryRepository: this._inventoryRepo,
      movementRepository: this._movementRepo,
      eventBus: this._eventBus,
    }).execute(data);
  }

  async getMovements(query) {
    return new GetMovementsUseCase({ movementRepository: this._movementRepo }).execute(query);
  }

  async getKardex(productId) {
    return new GetKardexUseCase({ movementRepository: this._movementRepo }).execute(productId);
  }

  async getAlerts(threshold) {
    return new GetStockAlertsUseCase({ inventoryRepository: this._inventoryRepo }).execute(threshold);
  }

  async getSummary() {
    return new GetInventorySummaryUseCase({ inventoryRepository: this._inventoryRepo }).execute();
  }

  async createReservation(data) {
    return new CreateReservationUseCase({
      reservationRepository: this._reservationRepo,
      inventoryRepository: this._inventoryRepo,
      eventBus: this._eventBus,
    }).execute(data);
  }
}

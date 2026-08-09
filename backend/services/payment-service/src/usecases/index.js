// ============================================================
// Payments Use Cases
// ============================================================

import { PaymentTransaction, CashRegister, TRANSACTION_STATUSES, CASH_REGISTER_STATUSES } from '../domain/index.js';
import { PaymentProcessedEvent, PaymentRefundedEvent, CashRegisterOpenedEvent, CashRegisterClosedEvent } from '../events/index.js';
import { PaymentGatewayClient } from '../infrastructure/payment-gateway.js';

export class ProcessPaymentUseCase {
  constructor({ paymentMethodRepo, transactionRepo, eventBus }) {
    this._paymentMethodRepo = paymentMethodRepo;
    this._transactionRepo = transactionRepo;
    this._eventBus = eventBus;
    this._gateway = new PaymentGatewayClient();
  }

  async execute({ saleId, invoiceId, paymentMethodCode, amount, reference, notes, userId, token, idempotencyKey, cardId }) {
    // Find payment method
    const method = await this._paymentMethodRepo.findByCode(paymentMethodCode);
    if (!method) throw new Error('PAYMENT_METHOD_NOT_FOUND');

    // Idempotencia: si ya existe una transacción completada con esta clave, no cobrar de nuevo
    if (idempotencyKey) {
      const existing = await this._transactionRepo.findByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }

    // Create transaction
    const transaction = new PaymentTransaction({
      saleId,
      invoiceId,
      paymentMethodId: method.id,
      paymentMethodName: method.name,
      amount,
      reference: reference || '',
      status: TRANSACTION_STATUSES.PENDING,
      processedBy: userId,
      notes: notes || '',
      idempotencyKey: idempotencyKey || null,
    });

    // Pago con tarjeta tokenizada → cobrar vía pasarela (PSP)
    if (token || cardId) {
      let result;
      try {
        result = await this._gateway.charge({
          token,
          cardId,
          amount,
          idempotencyKey: idempotencyKey || saleId,
          description: `Venta ${saleId}`,
        });
      } catch (gatewayErr) {
        transaction.fail(`Error de pasarela: ${gatewayErr.message}`);
        const failed = await this._transactionRepo.save(transaction);
        throw new Error('PAYMENT_GATEWAY_ERROR');
      }

      // Referencia de la pasarela (nunca el token)
      transaction._reference = result.gatewayReference || transaction.reference;
      transaction._notes = result.message || transaction.notes;

      if (result.status === 'approved') {
        transaction.complete();
      } else if (result.status === 'pending') {
        transaction._status = TRANSACTION_STATUSES.PENDING;
        transaction._processedAt = null;
      } else {
        transaction.fail(result.message || 'Tarjeta rechazada');
        const failed = await this._transactionRepo.save(transaction);
        throw new Error('PAYMENT_DECLINED');
      }
    } else {
      // Métodos sin token (cash/transfer) — se completan directamente
      transaction.complete();
    }

    const saved = await this._transactionRepo.save(transaction);
    await this._eventBus.publish(new PaymentProcessedEvent(saved));

    return saved;
  }
}

export class RefundPaymentUseCase {
  constructor({ transactionRepo, eventBus }) {
    this._transactionRepo = transactionRepo;
    this._eventBus = eventBus;
  }

  async execute({ transactionId, reason, userId }) {
    const transaction = await this._transactionRepo.findById(transactionId);
    if (!transaction) throw new Error('NOT_FOUND');

    transaction.refund();
    const saved = await this._transactionRepo.updateStatus(transactionId, transaction.status);
    await this._eventBus.publish(new PaymentRefundedEvent(saved));

    return saved;
  }
}

export class ListPaymentMethodsUseCase {
  constructor({ paymentMethodRepo }) {
    this._paymentMethodRepo = paymentMethodRepo;
  }

  async execute() {
    return this._paymentMethodRepo.findAll();
  }
}

export class OpenCashRegisterUseCase {
  constructor({ cashRegisterRepo, eventBus }) {
    this._cashRegisterRepo = cashRegisterRepo;
    this._eventBus = eventBus;
  }

  async execute({ code, name, openingBalance, warehouseId, userId }) {
    const register = new CashRegister({ code, name });
    register.open(userId, openingBalance || 0);
    if (warehouseId) register._warehouseId = warehouseId;

    const saved = await this._cashRegisterRepo.save(register);
    await this._eventBus.publish(new CashRegisterOpenedEvent(saved, userId));

    return saved;
  }
}

export class CloseCashRegisterUseCase {
  constructor({ cashRegisterRepo, eventBus }) {
    this._cashRegisterRepo = cashRegisterRepo;
    this._eventBus = eventBus;
  }

  async execute({ id, finalBalance, userId }) {
    const register = await this._cashRegisterRepo.findById(id);
    if (!register) throw new Error('NOT_FOUND');

    register.close(userId, finalBalance);
    const saved = await this._cashRegisterRepo.update(register);
    await this._eventBus.publish(new CashRegisterClosedEvent(saved, userId));

    return saved;
  }
}

export class ListCashRegistersUseCase {
  constructor({ cashRegisterRepo }) {
    this._cashRegisterRepo = cashRegisterRepo;
  }

  async execute(filters) {
    return this._cashRegisterRepo.findAll(filters);
  }
}

export class GetPaymentTransactionsUseCase {
  constructor({ transactionRepo }) {
    this._transactionRepo = transactionRepo;
  }

  async execute(saleId) {
    return this._transactionRepo.findBySale(saleId);
  }
}

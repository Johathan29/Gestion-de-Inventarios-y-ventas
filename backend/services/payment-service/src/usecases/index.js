// ============================================================
// Payments Use Cases
// ============================================================

import crypto from 'crypto';
import { PaymentTransaction, CashRegister, TRANSACTION_STATUSES, CASH_REGISTER_STATUSES } from '../domain/index.js';
import {
  PaymentProcessedEvent, PaymentRefundedEvent, PaymentAuthorizedEvent,
  PaymentCapturedEvent, PaymentFailedEvent, PaymentExpiredEvent,
  PaymentPartiallyRefundedEvent, CashRegisterOpenedEvent, CashRegisterClosedEvent,
} from '../events/index.js';
import { PaymentGatewayClient } from '../infrastructure/payment-gateway.js';

// TTL de pagos pendientes (máquina de estados: PAYMENT_PENDING → PAYMENT_EXPIRED)
const PENDING_TTL_MS = 15 * 60 * 1000;

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
      id: crypto.randomUUID(),
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
    if (method.type === 'card') {
      if (!token && !cardId) {
        throw new Error('CARD_PAYMENT_TOKEN_REQUIRED');
      }
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
        await this._transactionRepo.save(transaction);
        throw new Error('PAYMENT_GATEWAY_ERROR');
      }

      // Referencia de la pasarela (nunca el token)
      transaction._reference = result.gatewayReference || transaction.reference;
      transaction._gatewayTransactionId = result.gatewayReference || null;
      transaction._notes = result.message || transaction.notes;

      if (result.status === 'approved') {
        // El PSP mock hace auth+capture en 1 paso → captura directa
        transaction.capture();
      } else if (result.status === 'pending') {
        // Pago pendiente: TTL de expiración (máquina de estados)
        transaction._expiresAt = new Date(Date.now() + PENDING_TTL_MS);
        transaction._processedAt = null;
      } else {
        transaction.fail(result.message || 'Tarjeta rechazada');
        await this._transactionRepo.save(transaction);
        throw new Error('PAYMENT_DECLINED');
      }
    } else {
      // Métodos sin token (cash/transfer) — se completan directamente (POS nunca pasa por gateway)
      transaction.capture();
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

    // Refund total: solo desde captured o partially_refunded
    transaction.refund();
    const saved = await this._transactionRepo.update(transaction);
    await this._eventBus.publish(new PaymentRefundedEvent(saved));

    return saved;
  }
}

/**
 * Procesa un webhook de la pasarela (payment.authorized/captured/failed/...).
 * Seguridad: la firma se verifica en el controlador; aquí se garantiza
 * idempotencia (dedup por event_id) y transiciones válidas de la máquina
 * de estados. Un evento duplicado o replay es un no-op / rechazo.
 */
export class HandleGatewayWebhookUseCase {
  constructor({ transactionRepo, eventBus }) {
    this._transactionRepo = transactionRepo;
    this._eventBus = eventBus;
  }

  async execute({ eventId, eventType, createdAt, transactionId, gatewayTransactionId, payload }) {
    // 1) Idempotencia: el mismo event_id solo se procesa una vez
    const existing = await this._transactionRepo.findWebhookEvent(eventId);
    if (existing) return { status: 'duplicate', eventId };

    // 2) Replay protection: evento demasiado antiguo → rechazo
    const received = new Date(createdAt || Date.now());
    if (Date.now() - received.getTime() > 5 * 60 * 1000) {
      return { status: 'replay_rejected', eventId };
    }

    // 3) Buscar la transacción (por id o por gateway_transaction_id)
    let transaction = null;
    if (transactionId) transaction = await this._transactionRepo.findById(transactionId);
    if (!transaction && gatewayTransactionId) {
      transaction = await this._transactionRepo.findByGatewayTransactionId(gatewayTransactionId);
    }
    if (!transaction) return { status: 'not_found', eventId };

    // 4) Aplicar la transición según el tipo de evento
    const map = {
      'payment.authorized': (t) => t.authorize(),
      'payment.captured': (t) => t.capture(),
      'payment.failed': (t) => t.fail(payload?.failure_reason || 'Rechazado por pasarela'),
      'payment.expired': (t) => t.expire(),
      'payment.refunded': (t) => t.refund(),
      'payment.partially_refunded': (t) => t.partialRefund(),
    };
    const apply = map[eventType];
    if (!apply) return { status: 'unknown_event', eventId };

    try {
      apply(transaction);
    } catch (err) {
      // Transición inválida (p.ej. captured → failed): registrar y no-op
      return { status: 'invalid_transition', eventId, message: err.message };
    }

    // 5) Persistir la transición + dedup del evento (misma operación)
    const saved = await this._transactionRepo.update(transaction);
    await this._transactionRepo.saveWebhookEvent({ eventId, eventType, transactionId: transaction.id, payload });
    await this._publishEvent(eventType, saved);

    return { status: 'processed', eventId, transaction: saved };
  }

  _publishEvent(eventType, transaction) {
    switch (eventType) {
      case 'payment.authorized': return this._eventBus.publish(new PaymentAuthorizedEvent(transaction));
      case 'payment.captured': return this._eventBus.publish(new PaymentCapturedEvent(transaction));
      case 'payment.failed': return this._eventBus.publish(new PaymentFailedEvent(transaction));
      case 'payment.expired': return this._eventBus.publish(new PaymentExpiredEvent(transaction));
      case 'payment.refunded': return this._eventBus.publish(new PaymentRefundedEvent(transaction));
      case 'payment.partially_refunded': return this._eventBus.publish(new PaymentPartiallyRefundedEvent(transaction));
      default: return Promise.resolve();
    }
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

// ============================================================
// Payments Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class PaymentProcessedEvent extends DomainEvent {
  constructor(transaction) {
    super('payments.payment.processed', {
      transactionId: transaction.id,
      saleId: transaction.saleId,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethodName,
      status: transaction.status,
    });
  }
}

export class PaymentRefundedEvent extends DomainEvent {
  constructor(transaction) {
    super('payments.payment.refunded', {
      transactionId: transaction.id,
      saleId: transaction.saleId,
      amount: transaction.amount,
    });
  }
}

export class CashRegisterOpenedEvent extends DomainEvent {
  constructor(cashRegister, userId) {
    super('payments.cash_register.opened', {
      cashRegisterId: cashRegister.id,
      code: cashRegister.code,
      openingBalance: cashRegister.openingBalance,
      openedBy: userId,
    });
  }
}

export class CashRegisterClosedEvent extends DomainEvent {
  constructor(cashRegister, userId) {
    super('payments.cash_register.closed', {
      cashRegisterId: cashRegister.id,
      code: cashRegister.code,
      finalBalance: cashRegister.currentBalance,
      closedBy: userId,
    });
  }
}

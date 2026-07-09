// ============================================================
// Payments Application Service — Façade
// ============================================================

import {
  ProcessPaymentUseCase, RefundPaymentUseCase, ListPaymentMethodsUseCase,
  OpenCashRegisterUseCase, CloseCashRegisterUseCase,
  ListCashRegistersUseCase, GetPaymentTransactionsUseCase,
} from '../usecases/index.js';

export class PaymentsApplicationService {
  constructor({ paymentMethodRepo, cashRegisterRepo, transactionRepo, eventBus }) {
    this._processPayment = new ProcessPaymentUseCase({ paymentMethodRepo, transactionRepo, eventBus });
    this._refundPayment = new RefundPaymentUseCase({ transactionRepo, eventBus });
    this._listPaymentMethods = new ListPaymentMethodsUseCase({ paymentMethodRepo });
    this._openCashRegister = new OpenCashRegisterUseCase({ cashRegisterRepo, eventBus });
    this._closeCashRegister = new CloseCashRegisterUseCase({ cashRegisterRepo, eventBus });
    this._listCashRegisters = new ListCashRegistersUseCase({ cashRegisterRepo });
    this._getPaymentTransactions = new GetPaymentTransactionsUseCase({ transactionRepo });
  }

  processPayment(input) { return this._processPayment.execute(input); }
  refundPayment(input) { return this._refundPayment.execute(input); }
  listPaymentMethods() { return this._listPaymentMethods.execute(); }
  openCashRegister(input) { return this._openCashRegister.execute(input); }
  closeCashRegister(input) { return this._closeCashRegister.execute(input); }
  listCashRegisters(filters) { return this._listCashRegisters.execute(filters); }
  getPaymentTransactions(saleId) { return this._getPaymentTransactions.execute(saleId); }
}

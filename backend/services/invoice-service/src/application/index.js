// ============================================================
// Billing Application Service — Façade
// ============================================================

import {
  GenerateInvoiceUseCase, GetInvoiceUseCase, ListInvoicesUseCase,
  UpdatePaymentStatusUseCase, GenerateInvoicePdfUseCase,
  SendInvoiceEmailUseCase, CancelInvoiceUseCase,
  ListFiscalDocumentTypesUseCase, ListNcfSequencesUseCase,
} from '../usecases/index.js';

export class BillingApplicationService {
  constructor({ invoiceRepository, ncfRepository, pdfService, eventBus }) {
    this._generateInvoice = new GenerateInvoiceUseCase({ invoiceRepository, ncfRepository, pdfService, eventBus });
    this._getInvoice = new GetInvoiceUseCase({ invoiceRepository });
    this._listInvoices = new ListInvoicesUseCase({ invoiceRepository });
    this._updatePaymentStatus = new UpdatePaymentStatusUseCase({ invoiceRepository, eventBus });
    this._generatePdf = new GenerateInvoicePdfUseCase({ invoiceRepository, pdfService });
    this._sendEmail = new SendInvoiceEmailUseCase({ invoiceRepository, eventBus });
    this._cancelInvoice = new CancelInvoiceUseCase({ invoiceRepository, eventBus });
    this._listFiscalTypes = new ListFiscalDocumentTypesUseCase({ ncfRepository });
    this._listNcfSequences = new ListNcfSequencesUseCase({ ncfRepository });
  }

  generateInvoice(input) { return this._generateInvoice.execute(input); }
  getInvoice(id) { return this._getInvoice.execute(id); }
  listInvoices(query) { return this._listInvoices.execute(query); }
  updatePaymentStatus(input) { return this._updatePaymentStatus.execute(input); }
  generatePdf(id) { return this._generatePdf.execute(id); }
  sendEmail(input) { return this._sendEmail.execute(input); }
  cancelInvoice(input) { return this._cancelInvoice.execute(input); }
  listFiscalDocumentTypes() { return this._listFiscalTypes.execute(); }
  listNcfSequences(filters) { return this._listNcfSequences.execute(filters); }
}

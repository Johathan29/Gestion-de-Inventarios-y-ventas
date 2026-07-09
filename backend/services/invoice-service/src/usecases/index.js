// ============================================================
// Billing Use Cases
// ============================================================

import { Invoice, InvoiceItem, INVOICE_STATUSES, ELECTRONIC_STATUSES } from '../domain/index.js';
import {
  InvoiceGeneratedEvent, InvoiceIssuedEvent, InvoicePaidEvent,
  InvoiceCancelledEvent, InvoiceEmailedEvent,
} from '../events/index.js';

export class GenerateInvoiceUseCase {
  constructor({ invoiceRepository, ncfRepository, pdfService, eventBus }) {
    this._invoiceRepository = invoiceRepository;
    this._ncfRepository = ncfRepository;
    this._pdfService = pdfService;
    this._eventBus = eventBus;
  }

  async execute({ saleId, invoiceType, fiscalDocumentTypeId, dueDate, notes, userId }) {
    // Generate invoice number
    const invoiceNumber = await this._invoiceRepository.getNextNumber();

    // Create domain Invoice
    const invoice = new Invoice({
      invoiceNumber,
      saleId,
      userId,
      invoiceType: invoiceType || 'consumer_final',
      status: INVOICE_STATUSES.GENERATED,
      notes: notes || '',
      dueDate: dueDate || (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
      })(),
      source: 'pos',
    });

    const saved = await this._invoiceRepository.save(invoice);
    await this._eventBus.publish(new InvoiceGeneratedEvent(saved));

    // Try to issue with NCF if fiscal document type is specified
    if (fiscalDocumentTypeId) {
      try {
        const ncf = await this._ncfRepository.getNextNcf(fiscalDocumentTypeId);
        saved.assignNcf(ncf);
        saved._fiscalDocumentTypeId = fiscalDocumentTypeId;
        saved._status = INVOICE_STATUSES.ISSUED;
        saved._electronicStatus = ELECTRONIC_STATUSES.SENT;
        await this._invoiceRepository.update(saved);
        await this._eventBus.publish(new InvoiceIssuedEvent(saved));
      } catch (err) {
        console.warn(`NCF assignment skipped: ${err.message}`);
      }
    }

    return this._invoiceRepository.findById(saved.id);
  }
}

export class GetInvoiceUseCase {
  constructor({ invoiceRepository }) {
    this._invoiceRepository = invoiceRepository;
  }

  async execute(id) {
    const invoice = await this._invoiceRepository.findById(id);
    if (!invoice) throw new Error('NOT_FOUND');
    return invoice;
  }
}

export class ListInvoicesUseCase {
  constructor({ invoiceRepository }) {
    this._invoiceRepository = invoiceRepository;
  }

  async execute(query) {
    return this._invoiceRepository.findMany(query);
  }
}

export class UpdatePaymentStatusUseCase {
  constructor({ invoiceRepository, eventBus }) {
    this._invoiceRepository = invoiceRepository;
    this._eventBus = eventBus;
  }

  async execute({ id, status, reason, userId }) {
    const invoice = await this._invoiceRepository.findById(id);
    if (!invoice) throw new Error('NOT_FOUND');

    const extraFields = {};
    switch (status) {
      case 'paid':
        invoice.markPaid();
        await this._eventBus.publish(new InvoicePaidEvent(invoice));
        extraFields.paid_at = invoice.paidAt?.toISOString();
        break;
      case 'cancelled':
        invoice.cancel(reason || '');
        await this._eventBus.publish(new InvoiceCancelledEvent(invoice));
        extraFields.cancelled_at = invoice.cancelledAt?.toISOString();
        extraFields.cancellation_reason = invoice.cancellationReason;
        break;
      case 'voided':
        invoice.void();
        extraFields.cancelled_at = invoice.cancelledAt?.toISOString();
        break;
      case 'issued':
        invoice._status = INVOICE_STATUSES.ISSUED;
        break;
    }

    return this._invoiceRepository.updateStatus(id, invoice.status, extraFields);
  }
}

export class GenerateInvoicePdfUseCase {
  constructor({ invoiceRepository, pdfService }) {
    this._invoiceRepository = invoiceRepository;
    this._pdfService = pdfService;
  }

  async execute(id) {
    const invoice = await this._invoiceRepository.findById(id);
    if (!invoice) throw new Error('NOT_FOUND');

    // Generate QR text
    const qrText = JSON.stringify({
      invoice: invoice.invoiceNumber,
      ncf: invoice.ncf,
      total: invoice.total,
      date: invoice.createdAt,
      company: process.env.INVOICE_COMPANY_NAME || '',
      nit: process.env.INVOICE_COMPANY_NIT || '',
    });

    invoice.setElectronicInfo({ qrCodeText: qrText });
    await this._invoiceRepository.update(invoice);

    return this._pdfService.generate(invoice);
  }
}

export class SendInvoiceEmailUseCase {
  constructor({ invoiceRepository, eventBus }) {
    this._invoiceRepository = invoiceRepository;
    this._eventBus = eventBus;
  }

  async execute({ id, email, message }) {
    const invoice = await this._invoiceRepository.findById(id);
    if (!invoice) throw new Error('NOT_FOUND');

    const targetEmail = email || invoice.clientEmail;
    if (!targetEmail) throw new Error('NO_EMAIL');

    // In production, integrate with email service here
    console.log(`[SendInvoiceEmail] Would send invoice ${invoice.invoiceNumber} to ${targetEmail}`);

    await this._eventBus.publish(
      new InvoiceEmailedEvent(invoice.id, invoice.invoiceNumber, targetEmail)
    );

    return { sent: true, email: targetEmail, invoiceNumber: invoice.invoiceNumber };
  }
}

export class CancelInvoiceUseCase {
  constructor({ invoiceRepository, eventBus }) {
    this._invoiceRepository = invoiceRepository;
    this._eventBus = eventBus;
  }

  async execute({ id, reason, userId }) {
    const invoice = await this._invoiceRepository.findById(id);
    if (!invoice) throw new Error('NOT_FOUND');

    invoice.cancel(reason || '');
    await this._invoiceRepository.update(invoice);
    await this._eventBus.publish(new InvoiceCancelledEvent(invoice));

    return this._invoiceRepository.findById(invoice.id);
  }
}

export class ListFiscalDocumentTypesUseCase {
  constructor({ ncfRepository }) {
    this._ncfRepository = ncfRepository;
  }

  async execute() {
    return this._ncfRepository.listDocumentTypes();
  }
}

export class ListNcfSequencesUseCase {
  constructor({ ncfRepository }) {
    this._ncfRepository = ncfRepository;
  }

  async execute(filters) {
    return this._ncfRepository.listSequences(filters);
  }
}

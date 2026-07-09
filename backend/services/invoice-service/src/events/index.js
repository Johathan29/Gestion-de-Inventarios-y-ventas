// ============================================================
// Billing Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class InvoiceGeneratedEvent extends DomainEvent {
  constructor(invoice) {
    super('billing.invoice.generated', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      saleId: invoice.saleId,
      total: invoice.total,
      clientName: invoice.clientName,
    });
  }
}

export class InvoiceIssuedEvent extends DomainEvent {
  constructor(invoice) {
    super('billing.invoice.issued', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      ncf: invoice.ncf,
      fiscalDocumentTypeId: invoice.fiscalDocumentTypeId,
    });
  }
}

export class InvoicePaidEvent extends DomainEvent {
  constructor(invoice) {
    super('billing.invoice.paid', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paidAt: invoice.paidAt,
    });
  }
}

export class InvoiceCancelledEvent extends DomainEvent {
  constructor(invoice) {
    super('billing.invoice.cancelled', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      reason: invoice.cancellationReason,
    });
  }
}

export class InvoiceEmailedEvent extends DomainEvent {
  constructor(invoiceId, invoiceNumber, email) {
    super('billing.invoice.emailed', {
      invoiceId,
      invoiceNumber,
      email,
      sentAt: new Date().toISOString(),
    });
  }
}

export class NcfAssignedEvent extends DomainEvent {
  constructor(invoiceId, ncf, sequenceId) {
    super('billing.ncf.assigned', {
      invoiceId,
      ncf,
      sequenceId,
    });
  }
}

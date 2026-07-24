// ============================================================
// Billing Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class InvoiceGeneratedEvent extends DomainEvent {
  constructor(invoice) {
    super({
      aggregateId: invoice.id,
      eventType: 'billing.invoice.generated',
      payload: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        saleId: invoice.saleId,
        total: invoice.total,
        clientName: invoice.clientName,
      },
    });
  }
}

export class InvoiceIssuedEvent extends DomainEvent {
  constructor(invoice) {
    super({
      aggregateId: invoice.id,
      eventType: 'billing.invoice.issued',
      payload: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        ncf: invoice.ncf,
        fiscalDocumentTypeId: invoice.fiscalDocumentTypeId,
      },
    });
  }
}

export class InvoicePaidEvent extends DomainEvent {
  constructor(invoice) {
    super({
      aggregateId: invoice.id,
      eventType: 'billing.invoice.paid',
      payload: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paidAt: invoice.paidAt,
      },
    });
  }
}

export class InvoiceCancelledEvent extends DomainEvent {
  constructor(invoice) {
    super({
      aggregateId: invoice.id,
      eventType: 'billing.invoice.cancelled',
      payload: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        reason: invoice.cancellationReason,
      },
    });
  }
}

export class InvoiceEmailedEvent extends DomainEvent {
  constructor(invoiceId, invoiceNumber, email) {
    super({
      aggregateId: invoiceId,
      eventType: 'billing.invoice.emailed',
      payload: {
        invoiceId,
        invoiceNumber,
        email,
        sentAt: new Date().toISOString(),
      },
    });
  }
}

export class NcfAssignedEvent extends DomainEvent {
  constructor(invoiceId, ncf, sequenceId) {
    super({
      aggregateId: invoiceId,
      eventType: 'billing.ncf.assigned',
      payload: {
        invoiceId,
        ncf,
        sequenceId,
      },
    });
  }
}

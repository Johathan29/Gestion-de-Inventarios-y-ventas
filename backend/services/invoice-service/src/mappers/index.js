// ============================================================
// Billing Mappers — InvoiceMapper
// ============================================================

import { Invoice, InvoiceItem, NcfSequence, FiscalDocumentType } from '../domain/index.js';

export class InvoiceMapper {
  static toDomain(raw) {
    if (!raw) return null;
    const items = (raw.invoice_items || []).map(i => InvoiceMapper._itemToDomain(i, raw.id));
    return new Invoice({
      id: raw.id,
      invoiceNumber: raw.invoice_number,
      ncf: raw.ncf || '',
      saleId: raw.sale_id,
      clientId: raw.client_id,
      clientDocumentType: raw.client_document_type || '',
      clientDocumentNumber: raw.client_document_number || '',
      clientName: raw.client_name || '',
      clientAddress: raw.client_address || '',
      clientPhone: raw.client_phone || '',
      clientEmail: raw.client_email || '',
      userId: raw.user_id,
      items,
      subtotal: raw.subtotal,
      discount: raw.discount,
      tax: raw.tax,
      total: raw.total,
      status: raw.status,
      invoiceType: raw.invoice_type || 'consumer_final',
      fiscalDocumentTypeId: raw.fiscal_document_type_id,
      ncfSequenceId: raw.ncf_sequence_id,
      referenceInvoiceId: raw.reference_invoice_id,
      cancellationReason: raw.cancellation_reason || '',
      dueDate: raw.due_date,
      paidAt: raw.paid_at,
      cancelledAt: raw.cancelled_at,
      paymentMethodName: raw.payment_method_name || '',
      paymentTerm: raw.payment_term || '',
      sellerName: raw.seller_name || '',
      branch: raw.branch || '',
      cashRegister: raw.cash_register || '',
      electronicStatus: raw.electronic_status || 'pending',
      xmlUrl: raw.xml_url || '',
      signature: raw.signature || '',
      qrCodeText: raw.qr_code_text || '',
      fiscalRegistration: raw.fiscal_registration || '',
      source: raw.source || 'pos',
      notes: raw.notes || '',
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : undefined,
    });
  }

  static _itemToDomain(raw, invoiceId) {
    return new InvoiceItem({
      id: raw.id,
      invoiceId: raw.invoice_id || invoiceId,
      productId: raw.product_id,
      productName: raw.product_name || '',
      sku: raw.sku || '',
      quantity: raw.quantity,
      unitPrice: raw.unit_price,
      discount: raw.discount || 0,
      tax: raw.tax || 0,
      total: raw.total,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      variantId: raw.variant_id,
      variantName: raw.variant_name,
      variantAttributes: raw.variant_attributes,
    });
  }

  static toPersistence(domain) {
    return {
      invoice_number: domain.invoiceNumber,
      ncf: domain.ncf,
      sale_id: domain.saleId,
      client_id: domain.clientId,
      client_document_type: domain.clientDocumentType,
      client_document_number: domain.clientDocumentNumber,
      client_name: domain.clientName,
      client_address: domain.clientAddress,
      client_phone: domain.clientPhone,
      client_email: domain.clientEmail,
      user_id: domain.userId,
      subtotal: domain.subtotal,
      discount: domain.discount,
      tax: domain.tax,
      total: domain.total,
      status: domain.status,
      invoice_type: domain.invoiceType,
      fiscal_document_type_id: domain.fiscalDocumentTypeId,
      ncf_sequence_id: domain.ncfSequenceId,
      reference_invoice_id: domain.referenceInvoiceId,
      cancellation_reason: domain.cancellationReason,
      due_date: domain.dueDate,
      paid_at: domain.paidAt,
      cancelled_at: domain.cancelledAt,
      payment_method_name: domain.paymentMethodName,
      payment_term: domain.paymentTerm,
      seller_name: domain.sellerName,
      branch: domain.branch,
      cash_register: domain.cashRegister,
      electronic_status: domain.electronicStatus,
      xml_url: domain.xmlUrl,
      signature: domain.signature,
      qr_code_text: domain.qrCodeText,
      fiscal_registration: domain.fiscalRegistration,
      notes: domain.notes,
    };
  }

  static itemToPersistence(domain) {
    return {
      invoice_id: domain.invoiceId,
      product_id: domain.productId,
      product_name: domain.productName,
      sku: domain.sku,
      quantity: domain.quantity,
      unit_price: domain.unitPrice,
      discount: domain.discount || 0,
      tax: domain.tax || 0,
      total: domain.total,
    };
  }

  static toDTO(domain) {
    return {
      id: domain.id,
      invoiceNumber: domain.invoiceNumber,
      ncf: domain.ncf,
      saleId: domain.saleId,
      clientId: domain.clientId,
      clientDocumentType: domain.clientDocumentType,
      clientDocumentNumber: domain.clientDocumentNumber,
      clientName: domain.clientName,
      clientAddress: domain.clientAddress,
      clientPhone: domain.clientPhone,
      clientEmail: domain.clientEmail,
      userId: domain.userId,
      items: domain.items.map(i => ({
        id: i.id, productId: i.productId, productName: i.productName,
        sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice,
        discount: i.discount, tax: i.tax, total: i.total,
      })),
      subtotal: domain.subtotal,
      discount: domain.discount,
      tax: domain.tax,
      total: domain.total,
      status: domain.status,
      invoiceType: domain.invoiceType,
      fiscalDocumentTypeId: domain.fiscalDocumentTypeId,
      ncfSequenceId: domain.ncfSequenceId,
      referenceInvoiceId: domain.referenceInvoiceId,
      cancellationReason: domain.cancellationReason,
      dueDate: domain.dueDate,
      paidAt: domain.paidAt,
      cancelledAt: domain.cancelledAt,
      paymentMethodName: domain.paymentMethodName,
      paymentTerm: domain.paymentTerm,
      sellerName: domain.sellerName,
      branch: domain.branch,
      cashRegister: domain.cashRegister,
      electronicStatus: domain.electronicStatus,
      xmlUrl: domain.xmlUrl,
      signature: domain.signature,
      qrCodeText: domain.qrCodeText,
      fiscalRegistration: domain.fiscalRegistration,
      source: domain.source,
      notes: domain.notes,
      createdAt: domain.createdAt?.toISOString(),
      updatedAt: domain.updatedAt?.toISOString(),
    };
  }

  static toDTOList(domains) {
    return domains.map(d => InvoiceMapper.toDTO(d));
  }
}

export class NcfSequenceMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new NcfSequence({
      id: raw.id,
      companyId: raw.company_id,
      fiscalDocumentTypeId: raw.fiscal_document_type_id,
      serie: raw.serie,
      prefix: raw.prefix,
      currentNumber: raw.current_number,
      maxNumber: raw.max_number,
      validFrom: raw.valid_from,
      validTo: raw.valid_to,
      isActive: raw.is_active,
      branch: raw.branch || '',
    });
  }

  static toDTO(domain) {
    return domain.toJSON();
  }
}

export class FiscalDocumentTypeMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new FiscalDocumentType({
      id: raw.id,
      code: raw.code,
      name: raw.name,
      type: raw.type,
      prefix: raw.prefix,
      isActive: raw.is_active,
      requiresIdentification: raw.requires_identification,
    });
  }

  static toDTO(domain) {
    return domain.toJSON();
  }
}

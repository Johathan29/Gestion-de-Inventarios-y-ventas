// ============================================================
// Payments Mappers
// ============================================================

import { PaymentMethod, CashRegister, PaymentTransaction } from '../domain/index.js';

export class PaymentMethodMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new PaymentMethod({
      id: raw.id,
      code: raw.code,
      name: raw.name,
      type: raw.type,
      isActive: raw.is_active,
      requiresReference: raw.requires_reference,
    });
  }

  static toDTO(domain) {
    return domain.toJSON();
  }

  static toDTOList(domains) {
    return domains.map(d => PaymentMethodMapper.toDTO(d));
  }
}

export class CashRegisterMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new CashRegister({
      id: raw.id,
      companyId: raw.company_id,
      warehouseId: raw.warehouse_id,
      code: raw.code,
      name: raw.name,
      isActive: raw.is_active,
      openingBalance: raw.opening_balance,
      currentBalance: raw.current_balance,
      status: raw.status,
      openedAt: raw.opened_at,
      closedAt: raw.closed_at,
      openedBy: raw.opened_by,
      closedBy: raw.closed_by,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  static toPersistence(domain) {
    return {
      company_id: domain.companyId,
      warehouse_id: domain.warehouseId,
      code: domain.code,
      name: domain.name,
      is_active: domain.isActive,
      opening_balance: domain.openingBalance,
      current_balance: domain.currentBalance,
      status: domain.status,
      opened_at: domain.openedAt?.toISOString(),
      closed_at: domain.closedAt?.toISOString(),
      opened_by: domain.openedBy,
      closed_by: domain.closedBy,
    };
  }

  static toDTO(domain) {
    return domain.toJSON();
  }
}

export class PaymentTransactionMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new PaymentTransaction({
      id: raw.id,
      saleId: raw.sale_id,
      invoiceId: raw.invoice_id,
      paymentMethodId: raw.payment_method_id,
      paymentMethodName: raw.payment_method_name || '',
      amount: raw.amount,
      reference: raw.reference || '',
      status: raw.status,
      processedBy: raw.processed_by,
      processedAt: raw.processed_at,
      notes: raw.notes || '',
      idempotencyKey: raw.idempotency_key || null,
      authorizedAt: raw.authorized_at || null,
      capturedAt: raw.captured_at || null,
      refundedAt: raw.refunded_at || null,
      expiresAt: raw.expires_at || null,
      gatewayTransactionId: raw.gateway_transaction_id || null,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  static toPersistence(domain) {
    return {
      // Dominio (payment-service)
      sale_id: domain.saleId,
      invoice_id: domain.invoiceId,
      payment_method_id: domain.paymentMethodId,
      payment_method_name: domain.paymentMethodName,
      amount: domain.amount,
      reference: domain.reference,
      status: domain.status,
      processed_by: domain.processedBy,
      processed_at: domain.processedAt?.toISOString(),
      notes: domain.notes,
      idempotency_key: domain.idempotencyKey || null,
      authorized_at: domain.authorizedAt?.toISOString() || null,
      captured_at: domain.capturedAt?.toISOString() || null,
      refunded_at: domain.refundedAt?.toISOString() || null,
      expires_at: domain.expiresAt?.toISOString() || null,
      gateway_transaction_id: domain.gatewayTransactionId || null,
      // Auditoría genérica (028/055): mantener la referencia a la entidad
      reference_type: domain.saleId ? 'sale' : (domain.invoiceId ? 'invoice' : null),
      reference_id: domain.saleId || domain.invoiceId || null,
    };
  }

  static toDTO(domain) {
    return domain.toJSON();
  }
}

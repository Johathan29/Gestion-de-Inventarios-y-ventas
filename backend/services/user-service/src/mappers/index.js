// ============================================================
// CRM Mappers
// ============================================================

import { Client, CreditAccount, NotificationPreference } from '../domain/index.js';

export class ClientMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new Client({
      id: raw.id,
      userId: raw.user_id,
      name: raw.name,
      email: raw.email || '',
      phone: raw.phone || '',
      documentType: raw.document_type,
      documentNumber: raw.document_number,
      address: raw.address,
      city: raw.city,
      state: raw.state,
      postalCode: raw.postal_code,
      notes: raw.notes,
      isActive: raw.is_active,
      sales: raw.sales || [],
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  static toPersistence(domain) {
    return {
      id: domain.id,
      user_id: domain.userId,
      name: domain.name,
      email: domain.email || null,
      phone: domain.phone || null,
      document_type: domain.documentType || null,
      document_number: domain.documentNumber || null,
      address: domain.address || null,
      city: domain.city || null,
      state: domain.state || null,
      postal_code: domain.postalCode || null,
      notes: domain.notes || null,
      is_active: domain.isActive,
    };
  }

  static toDTO(domain) {
    return domain.toJSON();
  }

  static toDTOList(domains) {
    return domains.map(d => ClientMapper.toDTO(d));
  }
}

export class CreditAccountMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new CreditAccount({
      id: raw.id,
      clientId: raw.client_id,
      accountNumber: raw.account_number,
      accountType: raw.account_type,
      creditLimit: raw.credit_limit,
      currentBalance: raw.current_balance,
      isActive: raw.is_active,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  static toPersistence(domain) {
    return {
      client_id: domain.clientId,
      account_number: domain.accountNumber,
      account_type: domain.accountType,
      credit_limit: domain.creditLimit,
      current_balance: domain.currentBalance,
      is_active: domain.isActive,
    };
  }

  static toDTO(domain) {
    return domain.toJSON();
  }
}

export class NotificationPreferenceMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new NotificationPreference({
      id: raw.id,
      clientId: raw.client_id,
      emailNotifications: raw.email_notifications,
      smsNotifications: raw.sms_notifications,
      whatsappNotifications: raw.whatsapp_notifications,
      pushNotifications: raw.push_notifications,
      purchaseConfirmationEmail: raw.purchase_confirmation_email,
      purchaseConfirmationWhatsapp: raw.purchase_confirmation_whatsapp,
      shippingUpdatesEmail: raw.shipping_updates_email,
      shippingUpdatesWhatsapp: raw.shipping_updates_whatsapp,
      promoEmails: raw.promo_emails,
      updatedAt: raw.updated_at,
    });
  }

  static toPersistence(domain) {
    return {
      client_id: domain.clientId,
      email_notifications: domain.emailNotifications,
      sms_notifications: domain.smsNotifications,
      whatsapp_notifications: domain.whatsappNotifications,
      push_notifications: domain.pushNotifications,
      purchase_confirmation_email: domain.purchaseConfirmationEmail,
      purchase_confirmation_whatsapp: domain.purchaseConfirmationWhatsapp,
      shipping_updates_email: domain.shippingUpdatesEmail,
      shipping_updates_whatsapp: domain.shippingUpdatesWhatsapp,
      promo_emails: domain.promoEmails,
    };
  }

  // Contrato público de la API (el frontend usa snake_case, igual que la tabla)
  static toDTO(domain) {
    return {
      id: domain.id,
      clientId: domain.clientId,
      email_notifications: domain.emailNotifications,
      sms_notifications: domain.smsNotifications,
      whatsapp_notifications: domain.whatsappNotifications,
      push_notifications: domain.pushNotifications,
      purchase_confirmation_email: domain.purchaseConfirmationEmail,
      purchase_confirmation_whatsapp: domain.purchaseConfirmationWhatsapp,
      shipping_updates_email: domain.shippingUpdatesEmail,
      shipping_updates_whatsapp: domain.shippingUpdatesWhatsapp,
      promo_emails: domain.promoEmails,
      updated_at: domain.updatedAt,
    };
  }
}

// ============================================================
// Procurement Mappers — Purchase, Supplier
// ============================================================

import { Purchase, PurchaseItem, Supplier } from '../domain/procurement.js';

export class PurchaseMapper {
  static toDomain(raw) {
    if (!raw) return null;
    const items = (raw.purchase_items || raw.items || []).map(i => PurchaseMapper._itemToDomain(i, raw.id));
    return new Purchase({
      id: raw.id,
      purchaseNumber: raw.purchase_number,
      supplierId: raw.supplier_id,
      supplier: raw.suppliers || null,
      items,
      subtotal: raw.subtotal,
      tax: raw.tax,
      total: raw.total,
      status: raw.status,
      notes: raw.notes,
      userId: raw.user_id,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : undefined,
    });
  }

  static _itemToDomain(raw, purchaseId) {
    return new PurchaseItem({
      id: raw.id,
      purchaseId: raw.purchase_id || purchaseId,
      productId: raw.product_id,
      productName: raw.product_name,
      sku: raw.sku,
      barcode: raw.barcode,
      productImage: raw.product_image,
      quantity: raw.quantity,
      unitPrice: raw.unit_price,
      total: raw.total,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : undefined,
    });
  }

  static toPersistence(domain) {
    return {
      purchase_number: domain.purchaseNumber,
      supplier_id: domain.supplierId,
      subtotal: domain.subtotal,
      tax: domain.tax,
      total: domain.total,
      status: domain.status,
      notes: domain.notes,
      user_id: domain.userId,
    };
  }

  static itemToPersistence(domain) {
    return {
      purchase_id: domain.purchaseId,
      product_id: domain.productId,
      product_name: domain.productName,
      sku: domain.sku,
      barcode: domain.barcode,
      product_image: domain.productImage,
      quantity: domain.quantity,
      unit_price: domain.unitPrice,
      total: domain.total,
    };
  }

  static toDTO(domain) {
    return {
      id: domain.id,
      purchaseNumber: domain.purchaseNumber,
      supplierId: domain.supplierId,
      supplier: domain.supplier,
      items: domain.items.map(i => PurchaseMapper.itemToDTO(i)),
      subtotal: domain.subtotal,
      tax: domain.tax,
      total: domain.total,
      status: domain.status,
      notes: domain.notes,
      userId: domain.userId,
      createdAt: domain.createdAt?.toISOString(),
      updatedAt: domain.updatedAt?.toISOString(),
    };
  }

  static itemToDTO(domain) {
    return {
      id: domain.id,
      productId: domain.productId,
      productName: domain.productName,
      sku: domain.sku,
      barcode: domain.barcode,
      productImage: domain.productImage,
      quantity: domain.quantity,
      unitPrice: domain.unitPrice,
      total: domain.total,
    };
  }

  static toDTOList(domains) {
    return domains.map(d => PurchaseMapper.toDTO(d));
  }
}

export class SupplierMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new Supplier({
      id: raw.id,
      name: raw.name,
      contactName: raw.contact_name,
      email: raw.email,
      phone: raw.phone,
      address: raw.address,
      city: raw.city,
      taxId: raw.tax_id,
      paymentTerms: raw.payment_terms,
      notes: raw.notes,
      isActive: raw.is_active,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : undefined,
    });
  }

  static toPersistence(domain) {
    return {
      name: domain.name,
      contact_name: domain.contactName,
      email: domain.email,
      phone: domain.phone,
      address: domain.address,
      city: domain.city,
      tax_id: domain.taxId,
      payment_terms: domain.paymentTerms,
      notes: domain.notes,
      is_active: domain.isActive,
    };
  }

  static toDTO(domain) {
    return {
      id: domain.id,
      name: domain.name,
      contactName: domain.contactName,
      email: domain.email,
      phone: domain.phone,
      address: domain.address,
      city: domain.city,
      taxId: domain.taxId,
      paymentTerms: domain.paymentTerms,
      notes: domain.notes,
      isActive: domain.isActive,
      createdAt: domain.createdAt?.toISOString(),
      updatedAt: domain.updatedAt?.toISOString(),
    };
  }

  static toDTOList(domains) {
    return domains.map(d => SupplierMapper.toDTO(d));
  }
}

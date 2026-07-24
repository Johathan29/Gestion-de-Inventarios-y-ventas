// ============================================================
// Sales Mappers — Sale, Cart
// ============================================================

import { Sale, SaleItem, Cart, CartItem } from '../domain/sales.js';

export class SaleMapper {
  static toDomain(raw) {
    if (!raw) return null;
    const items = (raw.sale_items || []).map(i => SaleMapper._itemToDomain(i, raw.id));
    return new Sale({
      id: raw.id,
      saleNumber: raw.sale_number,
      clientId: raw.client_id,
      client: raw.clients || null,
      userId: raw.user_id,
      invoiceId: raw.invoice_id,
      invoice: raw.invoices || null,
      items,
      subtotal: raw.subtotal,
      discount: raw.discount,
      tax: raw.tax,
      total: raw.total,
      status: raw.status,
      paymentMethod: raw.payment_method,
      paymentStatus: raw.payment_status,
      notes: raw.notes,
      shippingAddress: raw.shipping_address,
      source: raw.source,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : undefined,
    });
  }

  static _itemToDomain(raw, saleId) {
    return new SaleItem({
      id: raw.id,
      saleId: raw.sale_id || saleId,
      productId: raw.product_id,
      productName: raw.product_name,
      sku: raw.sku,
      quantity: raw.quantity,
      unitPrice: raw.unit_price,
      discount: raw.discount || 0,
      total: raw.total,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      variantId: raw.variant_id,
      variantName: raw.variant_name,
      variantAttributes: raw.variant_attributes,
    });
  }

  static toPersistence(domain) {
    return {
      id: domain.id,
      sale_number: domain.saleNumber,
      client_id: domain.clientId,
      user_id: domain.userId,
      subtotal: domain.subtotal,
      discount: domain.discount,
      tax: domain.tax,
      total: domain.total,
      status: domain.status,
      payment_method: domain.paymentMethod,
      payment_status: domain.paymentStatus,
      notes: domain.notes,
      shipping_address: domain.shippingAddress,
      source: domain.source,
    };
  }

  static itemToPersistence(domain) {
    return {
      sale_id: domain.saleId,
      product_id: domain.productId,
      product_name: domain.productName,
      sku: domain.sku,
      quantity: domain.quantity,
      unit_price: domain.unitPrice,
      discount: domain.discount || 0,
      total: domain.total,
      variant_id: domain.variantId,
      variant_name: domain.variantName,
      variant_attributes: domain.variantAttributes,
    };
  }

  static toDTO(domain) {
    return {
      id: domain.id,
      saleNumber: domain.saleNumber,
      clientId: domain.clientId,
      client: domain.client,
      userId: domain.userId,
      invoiceId: domain.invoiceId,
      invoice: domain.invoice,
      items: domain.items.map(i => ({
        id: i.id, productId: i.productId, productName: i.productName,
        sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice,
        discount: i.discount, total: i.total,
        variantId: i.variantId, variantName: i.variantName,
        variantAttributes: i.variantAttributes,
      })),
      subtotal: domain.subtotal,
      discount: domain.discount,
      tax: domain.tax,
      total: domain.total,
      status: domain.status,
      paymentMethod: domain.paymentMethod,
      paymentStatus: domain.paymentStatus,
      notes: domain.notes,
      shippingAddress: domain.shippingAddress,
      source: domain.source,
      createdAt: domain.createdAt?.toISOString(),
      updatedAt: domain.updatedAt?.toISOString(),
    };
  }

  static toDTOList(domains) {
    return domains.map(d => SaleMapper.toDTO(d));
  }
}

export class CartMapper {
  static toDomain(raw) {
    if (!raw) return null;
    const items = (raw.cart_items || []).map(i => CartMapper._itemToDomain(i, raw.id));
    return new Cart({
      id: raw.id,
      userId: raw.user_id,
      items,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : undefined,
    });
  }

  static _itemToDomain(raw, cartId) {
    return new CartItem({
      id: raw.id,
      cartId: raw.cart_id || cartId,
      productId: raw.product_id,
      product: raw.products || null,
      quantity: raw.quantity,
      unitPrice: raw.unit_price,
      discount: raw.discount || 0,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      variantId: raw.variant_id,
      variantName: raw.variant_name,
      variantAttributes: raw.variant_attributes,
    });
  }

  static toDTO(domain) {
    return {
      id: domain.id,
      userId: domain.userId,
      items: domain.items.map(i => ({
        id: i.id, productId: i.productId, product: i.product,
        quantity: i.quantity, unitPrice: i.unitPrice,
        discount: i.discount, subtotal: i.subtotal,
        variantId: i.variantId,
        variantName: i.variantName,
        variantAttributes: i.variantAttributes,
      })),
      subtotal: domain.subtotal,
      discount: domain.discount,
      tax: domain.tax,
      total: domain.total,
      itemCount: domain.itemCount,
      createdAt: domain.createdAt?.toISOString(),
      updatedAt: domain.updatedAt?.toISOString(),
    };
  }
}

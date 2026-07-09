// ============================================================
// Inventory Mappers — Stock, Movement, Warehouse
// ============================================================

import { InventoryItem, InventoryMovement, InventoryReservation, Warehouse } from '../domain/inventory.js';

export class InventoryItemMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new InventoryItem({
      id: raw.id,
      productId: raw.product_id,
      product: raw.products || null,
      warehouse: raw.warehouse,
      stock: raw.stock,
      totalCost: raw.total_cost,
      unitCost: raw.unit_cost || 0,
      minStock: raw.products?.min_stock || 0,
      maxStock: raw.products?.max_stock || null,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : undefined,
    });
  }

  static toPersistence(domain) {
    return {
      product_id: domain.productId,
      warehouse: domain.warehouse,
      stock: domain.stock,
      total_cost: domain.totalCost,
      unit_cost: domain.unitCost,
    };
  }

  static toDTO(domain) {
    return {
      id: domain.id,
      productId: domain.productId,
      product: domain.product,
      warehouse: domain.warehouse,
      stock: domain.stock,
      totalCost: domain.totalCost,
      unitCost: domain.unitCost,
      minStock: domain.minStock,
      maxStock: domain.maxStock,
      isLowStock: domain.isLowStock,
      isOutOfStock: domain.isOutOfStock,
      createdAt: domain.createdAt?.toISOString(),
      updatedAt: domain.updatedAt?.toISOString(),
    };
  }

  static toDTOList(domains) {
    return domains.map(d => InventoryItemMapper.toDTO(d));
  }
}

export class MovementMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new InventoryMovement({
      id: raw.id,
      productId: raw.product_id,
      warehouse: raw.warehouse || raw.warehouse_id,
      type: raw.type,
      quantity: raw.quantity,
      previousStock: raw.previous_stock,
      newStock: raw.new_stock,
      unitCost: raw.unit_cost,
      totalCost: raw.total_cost,
      referenceType: raw.reference_type,
      referenceId: raw.reference_id,
      reason: raw.reason,
      notes: raw.notes,
      userId: raw.user_id || raw.created_by,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
    });
  }

  static toPersistence(domain) {
    return {
      product_id: domain.productId,
      warehouse_id: domain.warehouse,
      type: domain.type,
      quantity: domain.quantity,
      previous_stock: domain.previousStock,
      new_stock: domain.newStock,
      unit_cost: domain.unitCost,
      total_cost: domain.totalCost,
      reference_type: domain.referenceType,
      reference_id: domain.referenceId,
      reason: domain.reason,
      notes: domain.notes,
      user_id: domain.userId,
    };
  }

  static toDTO(domain) {
    return {
      id: domain.id,
      productId: domain.productId,
      warehouse: domain.warehouse,
      type: domain.type,
      quantity: domain.quantity,
      previousStock: domain.previousStock,
      newStock: domain.newStock,
      unitCost: domain.unitCost,
      totalCost: domain.totalCost,
      referenceType: domain.referenceType,
      referenceId: domain.referenceId,
      reason: domain.reason,
      notes: domain.notes,
      userId: domain.userId,
      createdAt: domain.createdAt?.toISOString(),
    };
  }

  static toDTOList(domains) {
    return domains.map(d => MovementMapper.toDTO(d));
  }
}

export class ReservationMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new InventoryReservation({
      id: raw.id,
      productId: raw.product_id,
      warehouseId: raw.warehouse_id,
      quantity: raw.quantity,
      orderType: raw.order_type,
      orderId: raw.order_id,
      userId: raw.user_id,
      status: raw.status,
      expiresAt: raw.expires_at ? new Date(raw.expires_at) : undefined,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
    });
  }

  static toDTO(domain) {
    return {
      id: domain.id,
      productId: domain.productId,
      warehouseId: domain.warehouseId,
      quantity: domain.quantity,
      orderType: domain.orderType,
      orderId: domain.orderId,
      userId: domain.userId,
      status: domain.status,
      expiresAt: domain.expiresAt?.toISOString(),
      createdAt: domain.createdAt?.toISOString(),
    };
  }
}

export class WarehouseMapper {
  static toDomain(raw) {
    if (!raw) return null;
    return new Warehouse({
      id: raw.id,
      name: raw.name,
      code: raw.code,
      address: raw.address,
      city: raw.city,
      isActive: raw.is_active,
      companyId: raw.company_id,
      createdAt: raw.created_at ? new Date(raw.created_at) : undefined,
      updatedAt: raw.updated_at ? new Date(raw.updated_at) : undefined,
    });
  }

  static toDTO(domain) {
    return {
      id: domain.id,
      name: domain.name,
      code: domain.code,
      address: domain.address,
      city: domain.city,
      isActive: domain.isActive,
      companyId: domain.companyId,
      createdAt: domain.createdAt?.toISOString(),
      updatedAt: domain.updatedAt?.toISOString(),
    };
  }

  static toDTOList(domains) {
    return domains.map(d => WarehouseMapper.toDTO(d));
  }
}

// ============================================================
// Catalog Domain Events
// ============================================================

import { DomainEvent } from '@erp/shared-kernel';

export class ProductCreatedEvent extends DomainEvent {
  constructor({ aggregateId, productId, name, sku, price }) {
    super({ aggregateId, eventType: 'catalog.product.created', payload: { productId, name, sku, price } });
  }
}

export class ProductUpdatedEvent extends DomainEvent {
  constructor({ aggregateId, productId, changes }) {
    super({ aggregateId, eventType: 'catalog.product.updated', payload: { productId, changes } });
  }
}

export class ProductPublishedEvent extends DomainEvent {
  constructor({ aggregateId, productId }) {
    super({ aggregateId, eventType: 'catalog.product.published', payload: { productId } });
  }
}

export class ProductDiscontinuedEvent extends DomainEvent {
  constructor({ aggregateId, productId }) {
    super({ aggregateId, eventType: 'catalog.product.discontinued', payload: { productId } });
  }
}

export class CategoryCreatedEvent extends DomainEvent {
  constructor({ aggregateId, categoryId, name }) {
    super({ aggregateId, eventType: 'catalog.category.created', payload: { categoryId, name } });
  }
}

export class BrandCreatedEvent extends DomainEvent {
  constructor({ aggregateId, brandId, name }) {
    super({ aggregateId, eventType: 'catalog.brand.created', payload: { brandId, name } });
  }
}

export default {
  ProductCreatedEvent, ProductUpdatedEvent, ProductPublishedEvent,
  ProductDiscontinuedEvent, CategoryCreatedEvent, BrandCreatedEvent,
};

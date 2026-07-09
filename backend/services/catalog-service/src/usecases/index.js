// ============================================================
// Catalog Use Cases
// ============================================================

import { InvariantError, NotFoundError } from '@erp/shared-kernel';
import { Product, Category, Brand } from '../domain/catalog.js';
import {
  ProductCreatedEvent, ProductUpdatedEvent, ProductPublishedEvent,
  ProductDiscontinuedEvent, CategoryCreatedEvent, BrandCreatedEvent,
} from '../events/index.js';

export class CreateProductUseCase {
  #repo; #eventBus;
  constructor({ productRepository, eventBus }) { this.#repo = productRepository; this.#eventBus = eventBus; }

  async execute(dto) {
    if (dto.sku) {
      const existing = await this.#repo.findBySku(dto.sku);
      if (existing) throw new InvariantError('SKU ya existe', { sku: dto.sku });
    }

    const product = new Product({ id: crypto.randomUUID(), ...dto });
    const saved = await this.#repo.save(product);
    await this.#eventBus.publish(new ProductCreatedEvent({
      aggregateId: saved.id, productId: saved.id, name: saved.name, sku: saved.sku, price: saved.price.amount,
    }));
    return saved;
  }
}

export class UpdateProductUseCase {
  #repo; #eventBus;
  constructor({ productRepository, eventBus }) { this.#repo = productRepository; this.#eventBus = eventBus; }

  async execute({ id, updates }) {
    const product = await this.#repo.findById(id);
    if (!product) throw new NotFoundError('Producto no encontrado', id);

    product.updateDetails(updates);
    if (updates.price) product.updatePrice(updates.price);
    if (updates.costPrice !== undefined) product.updateCost(updates.costPrice);
    if (updates.status === 'published') product.publish();
    if (updates.status === 'discontinued') product.discontinue();
    if (updates.status === 'hidden') product.unpublish();
    if (updates.images) updates.images.forEach(img => product.addImage(img));
    if (updates.tags) product.setTags(updates.tags);

    const saved = await this.#repo.update(product);
    await this.#eventBus.publish(new ProductUpdatedEvent({
      aggregateId: saved.id, productId: saved.id, changes: Object.keys(updates),
    }));
    return saved;
  }
}

export class GetProductUseCase {
  #repo;
  constructor({ productRepository }) { this.#repo = productRepository; }
  async execute(id) {
    const product = await this.#repo.findById(id);
    if (!product) throw new NotFoundError('Producto no encontrado', id);
    return product;
  }
}

export class ListProductsUseCase {
  #repo;
  constructor({ productRepository }) { this.#repo = productRepository; }
  async execute(query) { return this.#repo.findAll(query); }
}

export class PublishProductUseCase {
  #repo; #eventBus;
  constructor({ productRepository, eventBus }) { this.#repo = productRepository; this.#eventBus = eventBus; }
  async execute(id) {
    const product = await this.#repo.findById(id);
    if (!product) throw new NotFoundError('Producto no encontrado', id);
    product.publish();
    const saved = await this.#repo.update(product);
    await this.#eventBus.publish(new ProductPublishedEvent({ aggregateId: saved.id, productId: saved.id }));
    return saved;
  }
}

export class CreateCategoryUseCase {
  #repo; #eventBus;
  constructor({ categoryRepository, eventBus }) { this.#repo = categoryRepository; this.#eventBus = eventBus; }
  async execute(dto) {
    const category = new Category({ id: crypto.randomUUID(), ...dto, isActive: true });
    const saved = await this.#repo.save(category);
    await this.#eventBus.publish(new CategoryCreatedEvent({ aggregateId: saved.id, categoryId: saved.id, name: saved.name }));
    return saved;
  }
}

export class CreateBrandUseCase {
  #repo; #eventBus;
  constructor({ brandRepository, eventBus }) { this.#repo = brandRepository; this.#eventBus = eventBus; }
  async execute(dto) {
    const brand = new Brand({ id: crypto.randomUUID(), ...dto, isActive: true });
    const saved = await this.#repo.save(brand);
    await this.#eventBus.publish(new BrandCreatedEvent({ aggregateId: saved.id, brandId: saved.id, name: saved.name }));
    return saved;
  }
}

export default {
  CreateProductUseCase, UpdateProductUseCase, GetProductUseCase,
  ListProductsUseCase, PublishProductUseCase,
  CreateCategoryUseCase, CreateBrandUseCase,
};

// ============================================================
// Catalog Domain — Product, Category, Brand Aggregates
// ============================================================

import { AggregateRoot, Entity, Money } from '@erp/shared-kernel';

/**
 * Product Aggregate Root
 */
export class Product extends AggregateRoot {
  constructor({ id, name, sku, barcode, description, price, costPrice, categoryId, brandId, companyId,
    minStock, unit, images, tags, isCatalogOnly, availableForSale, status, attributes = [] }) {
    super(id);
    this._name = name;
    this._sku = sku || '';
    this._barcode = barcode || '';
    this._description = description || '';
    this._price = price instanceof Money ? price : new Money(price);
    this._costPrice = costPrice ? (costPrice instanceof Money ? costPrice : new Money(costPrice)) : new Money(0);
    this._categoryId = categoryId || null;
    this._brandId = brandId || null;
    this._companyId = companyId || null;
    this._minStock = minStock || 0;
    this._unit = unit || 'unit';
    this._images = [...(images || [])];
    this._tags = [...(tags || [])];
    this._isCatalogOnly = isCatalogOnly || false;
    this._availableForSale = availableForSale !== false;
    this._status = status || 'draft';
    this._attributes = [...(attributes || [])];
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  // Getters
  get name() { return this._name; }
  get sku() { return this._sku; }
  get barcode() { return this._barcode; }
  get description() { return this._description; }
  get price() { return this._price; }
  get costPrice() { return this._costPrice; }
  get categoryId() { return this._categoryId; }
  get brandId() { return this._brandId; }
  get companyId() { return this._companyId; }
  get minStock() { return this._minStock; }
  get unit() { return this._unit; }
  get images() { return [...this._images]; }
  get tags() { return [...this._tags]; }
  get isCatalogOnly() { return this._isCatalogOnly; }
  get availableForSale() { return this._availableForSale; }
  get status() { return this._status; }
  get attributes() { return [...this._attributes]; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }
  get margin() { return this._price.amount - this._costPrice.amount; }
  get marginPercent() {
    return this._costPrice.amount > 0
      ? Math.round((this.margin / this._costPrice.amount) * 100)
      : 0;
  }

  // Business methods
  publish() {
    this._status = 'published';
    this._availableForSale = true;
    this._updatedAt = new Date();
  }

  unpublish() {
    this._status = 'hidden';
    this._updatedAt = new Date();
  }

  discontinue() {
    this._status = 'discontinued';
    this._availableForSale = false;
    this._updatedAt = new Date();
  }

  updatePrice(newPrice) {
    this._price = newPrice instanceof Money ? newPrice : new Money(newPrice);
    this._updatedAt = new Date();
  }

  updateCost(newCost) {
    this._costPrice = newCost instanceof Money ? newCost : new Money(newCost);
    this._updatedAt = new Date();
  }

  updateDetails({ name, description, sku, barcode, unit, minStock, categoryId, brandId } = {}) {
    if (name) this._name = name;
    if (description !== undefined) this._description = description;
    if (sku) this._sku = sku;
    if (barcode !== undefined) this._barcode = barcode;
    if (unit) this._unit = unit;
    if (minStock !== undefined) this._minStock = minStock;
    if (categoryId !== undefined) this._categoryId = categoryId;
    if (brandId !== undefined) this._brandId = brandId;
    this._updatedAt = new Date();
  }

  addImage(url) {
    if (!this._images.includes(url)) {
      this._images.push(url);
      this._updatedAt = new Date();
    }
  }

  removeImage(url) {
    this._images = this._images.filter(img => img !== url);
    this._updatedAt = new Date();
  }

  setTags(tags) {
    this._tags = [...tags];
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      name: this._name,
      sku: this._sku,
      barcode: this._barcode,
      description: this._description,
      price: this._price.amount,
      costPrice: this._costPrice.amount,
      currency: this._price.currency,
      categoryId: this._categoryId,
      brandId: this._brandId,
      companyId: this._companyId,
      minStock: this._minStock,
      unit: this._unit,
      images: this._images,
      tags: this._tags,
      isCatalogOnly: this._isCatalogOnly,
      availableForSale: this._availableForSale,
      status: this._status,
      attributes: this._attributes,
      margin: this.margin,
      marginPercent: this.marginPercent,
      createdAt: this._createdAt?.toISOString(),
      updatedAt: this._updatedAt?.toISOString(),
    };
  }
}

/**
 * Category Entity
 */
export class Category extends Entity {
  constructor({ id, name, description, parentId, isActive, imageUrl, sortOrder }) {
    super(id);
    this._name = name;
    this._description = description || '';
    this._parentId = parentId || null;
    this._isActive = isActive !== false;
    this._imageUrl = imageUrl || '';
    this._sortOrder = sortOrder || 0;
  }

  get name() { return this._name; }
  get description() { return this._description; }
  get parentId() { return this._parentId; }
  get isActive() { return this._isActive; }
  get imageUrl() { return this._imageUrl; }
  get sortOrder() { return this._sortOrder; }

  activate() { this._isActive = true; }
  deactivate() { this._isActive = false; }

  toJSON() {
    return {
      id: this.id, name: this._name, description: this._description,
      parentId: this._parentId, isActive: this._isActive,
      imageUrl: this._imageUrl, sortOrder: this._sortOrder,
    };
  }
}

/**
 * Brand Entity
 */
export class Brand extends Entity {
  constructor({ id, name, description, logoUrl, isActive }) {
    super(id);
    this._name = name;
    this._description = description || '';
    this._logoUrl = logoUrl || '';
    this._isActive = isActive !== false;
  }

  get name() { return this._name; }
  get description() { return this._description; }
  get logoUrl() { return this._logoUrl; }
  get isActive() { return this._isActive; }

  toJSON() {
    return {
      id: this.id, name: this._name, description: this._description,
      logoUrl: this._logoUrl, isActive: this._isActive,
    };
  }
}

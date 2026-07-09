// ============================================================
// Catalog Mappers
// ============================================================

import { Product, Category, Brand } from '../domain/catalog.js';

export class ProductMapper {
  static toDomain(row) {
    if (!row) return null;
    return new Product({
      id: row.id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      description: row.description,
      price: row.price,
      costPrice: row.cost_price,
      categoryId: row.category_id,
      brandId: row.brand_id,
      companyId: row.company_id,
      minStock: row.min_stock,
      unit: row.unit,
      images: row.images || [],
      tags: row.tags || [],
      isCatalogOnly: row.is_catalog_only,
      availableForSale: row.available_for_sale,
      status: row.status,
    });
  }

  static toPersistence(product) {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku || null,
      barcode: product.barcode || null,
      description: product.description,
      price: product.price.amount,
      cost_price: product.costPrice.amount,
      category_id: product.categoryId,
      brand_id: product.brandId,
      company_id: product.companyId,
      min_stock: product.minStock,
      unit: product.unit,
      images: product.images,
      tags: product.tags,
      is_catalog_only: product.isCatalogOnly,
      available_for_sale: product.availableForSale,
      status: product.status,
    };
  }

  static toDTO(product) {
    if (!product) return null;
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      price: product.price.amount,
      costPrice: product.costPrice.amount,
      categoryId: product.categoryId,
      brandId: product.brandId,
      companyId: product.companyId,
      minStock: product.minStock,
      unit: product.unit,
      images: product.images,
      tags: product.tags,
      isCatalogOnly: product.isCatalogOnly,
      availableForSale: product.availableForSale,
      status: product.status,
      margin: product.margin,
      marginPercent: product.marginPercent,
      createdAt: product.createdAt?.toISOString(),
    };
  }

  static toDTOList(products) { return (products || []).map(p => ProductMapper.toDTO(p)); }
}

export class CategoryMapper {
  static toDomain(row) {
    if (!row) return null;
    return new Category({
      id: row.id, name: row.name, description: row.description,
      parentId: row.parent_id, isActive: row.is_active,
      imageUrl: row.image_url, sortOrder: row.sort_order,
    });
  }

  static toDTO(cat) {
    if (!cat) return null;
    return {
      id: cat.id, name: cat.name, description: cat.description,
      parentId: cat.parentId, isActive: cat.isActive,
      imageUrl: cat.imageUrl, sortOrder: cat.sortOrder,
    };
  }

  static toDTOList(cats) { return (cats || []).map(c => CategoryMapper.toDTO(c)); }
}

export class BrandMapper {
  static toDomain(row) {
    if (!row) return null;
    return new Brand({
      id: row.id, name: row.name, description: row.description,
      logoUrl: row.logo_url, isActive: row.is_active,
    });
  }

  static toDTO(brand) {
    if (!brand) return null;
    return {
      id: brand.id, name: brand.name, description: brand.description,
      logoUrl: brand.logoUrl, isActive: brand.isActive,
    };
  }

  static toDTOList(brands) { return (brands || []).map(b => BrandMapper.toDTO(b)); }
}

export default { ProductMapper, CategoryMapper, BrandMapper };

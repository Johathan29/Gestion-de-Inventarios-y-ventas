// ============================================================
// Catalog Controller — Express routes
// ============================================================

import { Router } from 'express';
import { authenticate, authorize, hasPermission, validate, apiResponse, asyncHandler } from '@erp/common';
import { CreateProductDTO, UpdateProductDTO, ProductQueryDTO, CreateCategoryDTO, CreateBrandDTO } from '../DTOs/index.js';
import { ProductMapper, CategoryMapper, BrandMapper } from '../mappers/index.js';

export function createCatalogRouter({ appService }) {
  const router = Router();

  // ================================================================
  // Products
  // ================================================================

  router.get('/products', authenticate, asyncHandler(async (req, res) => {
    const query = ProductQueryDTO.parse(req.query);
    const result = await appService.listProductsFn(query);
    res.json(apiResponse({
      data: ProductMapper.toDTOList(result.data),
      pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) },
    }));
  }));

  router.get('/products/:id', authenticate, hasPermission('product:read'), asyncHandler(async (req, res) => {
    const product = await appService.getProductFn(req.params.id);
    res.json(apiResponse({ data: ProductMapper.toDTO(product) }));
  }));

  router.post('/products', authenticate, hasPermission('product:create'), validate(CreateProductDTO), asyncHandler(async (req, res) => {
    const product = await appService.createProductFn(req.body);
    res.status(201).json(apiResponse({ message: 'Producto creado', data: ProductMapper.toDTO(product) }));
  }));

  router.put('/products/:id', authenticate, hasPermission('product:update'), validate(UpdateProductDTO), asyncHandler(async (req, res) => {
    const product = await appService.updateProductFn(req.params.id, req.body);
    res.json(apiResponse({ message: 'Producto actualizado', data: ProductMapper.toDTO(product) }));
  }));

  router.patch('/products/:id/publish', authenticate, hasPermission('product:update'), asyncHandler(async (req, res) => {
    const product = await appService.publishProductFn(req.params.id);
    res.json(apiResponse({ message: 'Producto publicado', data: ProductMapper.toDTO(product) }));
  }));

  // ================================================================
  // Categories
  // ================================================================

  router.get('/categories', authenticate, asyncHandler(async (req, res) => {
    const categories = await appService.getCategories();
    res.json(apiResponse({ data: CategoryMapper.toDTOList(categories) }));
  }));

  router.get('/categories/:id', authenticate, asyncHandler(async (req, res) => {
    const category = await appService.getCategory(req.params.id);
    res.json(apiResponse({ data: CategoryMapper.toDTO(category) }));
  }));

  router.post('/categories', authenticate, hasPermission('product:create'), validate(CreateCategoryDTO), asyncHandler(async (req, res) => {
    const category = await appService.createCategoryFn(req.body);
    res.status(201).json(apiResponse({ message: 'Categoría creada', data: CategoryMapper.toDTO(category) }));
  }));

  router.put('/categories/:id', authenticate, hasPermission('product:update'), asyncHandler(async (req, res) => {
    const category = await appService.updateCategory(req.params.id, req.body);
    res.json(apiResponse({ message: 'Categoría actualizada', data: CategoryMapper.toDTO(category) }));
  }));

  // ================================================================
  // Brands
  // ================================================================

  router.get('/brands', authenticate, asyncHandler(async (req, res) => {
    const brands = await appService.getBrands();
    res.json(apiResponse({ data: BrandMapper.toDTOList(brands) }));
  }));

  router.get('/brands/:id', authenticate, asyncHandler(async (req, res) => {
    const brand = await appService.getBrand(req.params.id);
    res.json(apiResponse({ data: BrandMapper.toDTO(brand) }));
  }));

  router.post('/brands', authenticate, hasPermission('product:create'), validate(CreateBrandDTO), asyncHandler(async (req, res) => {
    const brand = await appService.createBrandFn(req.body);
    res.status(201).json(apiResponse({ message: 'Marca creada', data: BrandMapper.toDTO(brand) }));
  }));

  router.put('/brands/:id', authenticate, hasPermission('product:update'), asyncHandler(async (req, res) => {
    const brand = await appService.updateBrand(req.params.id, req.body);
    res.json(apiResponse({ message: 'Marca actualizada', data: BrandMapper.toDTO(brand) }));
  }));

  return router;
}

export default createCatalogRouter;

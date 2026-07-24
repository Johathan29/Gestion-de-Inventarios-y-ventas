// ============================================================
// Catalog Application Service
// ============================================================

import {
  CreateProductUseCase, UpdateProductUseCase, GetProductUseCase,
  ListProductsUseCase, PublishProductUseCase,
  CreateCategoryUseCase, CreateBrandUseCase,
} from '../usecases/index.js';

export class CatalogApplicationService {
  constructor(deps) {
    this.createProduct = new CreateProductUseCase(deps);
    this.updateProduct = new UpdateProductUseCase(deps);
    this.getProduct = new GetProductUseCase(deps);
    this.listProducts = new ListProductsUseCase(deps);
    this.publishProduct = new PublishProductUseCase(deps);
    this.createCategory = new CreateCategoryUseCase(deps);
    this.createBrand = new CreateBrandUseCase(deps);
    this.categoryRepo = deps.categoryRepository;
    this.brandRepo = deps.brandRepository;
  }

  async createProductFn(dto) { return this.createProduct.execute(dto); }
  async updateProductFn(id, updates) { return this.updateProduct.execute({ id, updates }); }
  async getProductFn(id) { return this.getProduct.execute(id); }
  async listProductsFn(query) { return this.listProducts.execute(query); }
  async publishProductFn(id) { return this.publishProduct.execute(id); }
  async createCategoryFn(dto) { return this.createCategory.execute(dto); }
  async createBrandFn(dto) { return this.createBrand.execute(dto); }
  async getCategories(filters = {}) { return this.categoryRepo.findAll(filters); }
  async getBrands() { return this.brandRepo.findAll(); }
  async getCategory(id) { return this.categoryRepo.findById(id); }
  async getBrand(id) { return this.brandRepo.findById(id); }
  async updateCategory(id, data) {
    const cat = await this.categoryRepo.findById(id);
    if (!cat) throw new (await import('@erp/shared-kernel')).NotFoundError('Categoría no encontrada', id);
    Object.assign(cat, data);
    return this.categoryRepo.update(cat);
  }
  async updateBrand(id, data) {
    const brand = await this.brandRepo.findById(id);
    if (!brand) throw new (await import('@erp/shared-kernel')).NotFoundError('Marca no encontrada', id);
    Object.assign(brand, data);
    return this.brandRepo.update(brand);
  }
}

export default CatalogApplicationService;

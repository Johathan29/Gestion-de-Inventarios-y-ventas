# Template de Servicio Hexagonal

Este template documenta la arquitectura hexagonal utilizada en los microservicios del ERP.
Los servicios `identity-service`, `catalog-service`, `procurement-service`, `inventory-service`, y `sale-service` implementan este patrón.

## Estructura de Carpetas

```
services/mi-servicio/
├── src/
│   ├── application/          # Casos de uso (orquestan la lógica)
│   │   ├── use-cases/
│   │   │   ├── CreateProductUseCase.js
│   │   │   └── GetProductUseCase.js
│   │   └── ports/            # Interfaces (puertos) de entrada
│   │       ├── inbound/
│   │       │   └── IProductService.js
│   │       └── outbound/
│   │           ├── IProductRepository.js
│   │           └── IEventBus.js
│   │
│   ├── domain/               # Entidades, Value Objects, reglas de negocio
│   │   ├── entities/
│   │   │   ├── Product.js
│   │   │   └── Category.js
│   │   ├── value-objects/
│   │   │   ├── Money.js
│   │   │   ├── SKU.js
│   │   │   └── Email.js
│   │   ├── events/
│   │   │   ├── ProductCreatedEvent.js
│   │   │   └── ProductPriceChangedEvent.js
│   │   └── errors/
│   │       ├── ProductNotFoundError.js
│   │       └── DuplicateSKUError.js
│   │
│   ├── infrastructure/       # Implementaciones concretas (adaptadores)
│   │   ├── persistence/
│   │   │   ├── SupabaseProductRepository.js
│   │   │   └── mappers/
│   │   │       └── ProductMapper.js
│   │   ├── event-bus/
│   │   │   └── RabbitMQEventAdapter.js
│   │   ├── http/
│   │   │   ├── routes.js
│   │   │   ├── controllers/
│   │   │   │   └── ProductController.js
│   │   │   ├── middleware/
│   │   │   │   ├── validateRequest.js
│   │   │   │   └── errorHandler.js
│   │   │   └── validators/
│   │   │       └── productValidators.js
│   │   └── config/
│   │       └── index.js
│   │
│   └── server.js             # Punto de entrada (Express setup)
│
├── Dockerfile
├── package.json
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## Principios

### 1. Dependencias hacia adentro
- `domain/` NO depende de nada externo
- `application/` depende solo de `domain/`
- `infrastructure/` depende de `application/` y `domain/`

### 2. Inversión de dependencias
- `application/ports/outbound/` define interfaces que `infrastructure/` implementa
- Los casos de uso reciben dependencias por constructor (DI manual)

### 3. Value Objects inmutables
- Encapsulan validación y lógica de negocio
- Se comparan por valor (implementar `equals()`)

## Template de Código

### Domain Entity
```javascript
// src/domain/entities/Product.js
export class Product {
  constructor({ id, name, sku, price, categoryId, isActive = true, createdAt, updatedAt }) {
    this._id = id;
    this._name = name;
    this._sku = sku;
    this._price = price;
    this._categoryId = categoryId;
    this._isActive = isActive;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  // Getters
  get id() { return this._id; }
  get name() { return this._name; }
  get sku() { return this._sku; }
  get price() { return this._price; }
  get categoryId() { return this._categoryId; }
  get isActive() { return this._isActive; }

  // Comportamiento de negocio
  activate() { this._isActive = true; this._updatedAt = new Date(); }
  deactivate() { this._isActive = false; this._updatedAt = new Date(); }
  changePrice(newPrice) {
    if (newPrice <= 0) throw new Error('Price must be positive');
    this._price = newPrice;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this._id, name: this._name, sku: this._sku,
      price: this._price, categoryId: this._categoryId,
      isActive: this._isActive, createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}
```

### Use Case (Application)
```javascript
// src/application/use-cases/CreateProductUseCase.js
export class CreateProductUseCase {
  constructor(productRepository, eventBus) {
    this._productRepository = productRepository;  // IProductRepository
    this._eventBus = eventBus;                     // IEventBus
  }

  async execute({ name, sku, price, categoryId }) {
    // 1. Validar SKU único
    const existing = await this._productRepository.findBySku(sku);
    if (existing) {
      throw new DuplicateSKUError(`SKU ${sku} already exists`);
    }

    // 2. Crear entidad
    const product = new Product({ name, sku, price, categoryId });

    // 3. Persistir
    const saved = await this._productRepository.save(product);

    // 4. Publicar evento
    await this._eventBus.publish(new ProductCreatedEvent(saved));

    return saved;
  }
}
```

### Repository Interface (Port)
```javascript
// src/application/ports/outbound/IProductRepository.js
export class IProductRepository {
  async findAll(filters) { throw new Error('Not implemented'); }
  async findById(id) { throw new Error('Not implemented'); }
  async findBySku(sku) { throw new Error('Not implemented'); }
  async save(product) { throw new Error('Not implemented'); }
  async update(product) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
}
```

### Repository Implementation (Adapter)
```javascript
// src/infrastructure/persistence/SupabaseProductRepository.js
export class SupabaseProductRepository extends IProductRepository {
  constructor(supabaseClient) {
    super();
    this._supabase = supabaseClient;
    this._table = 'products';
  }

  async findAll(filters = {}) {
    let query = this._supabase.from(this._table).select('*');
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(ProductMapper.toDomain);
  }

  async findById(id) {
    const { data, error } = await this._supabase.from(this._table).select('*').eq('id', id).single();
    if (error) return null;
    return ProductMapper.toDomain(data);
  }

  async save(product) {
    const { data, error } = await this._supabase.from(this._table).insert(ProductMapper.toPersistence(product)).select().single();
    if (error) throw error;
    return ProductMapper.toDomain(data);
  }

  async update(product) {
    const { data, error } = await this._supabase.from(this._table)
      .update(ProductMapper.toPersistence(product))
      .eq('id', product.id).select().single();
    if (error) throw error;
    return ProductMapper.toDomain(data);
  }

  async delete(id) {
    const { error } = await this._supabase.from(this._table).delete().eq('id', id);
    if (error) throw error;
  }
}
```

### Controller (HTTP Adapter)
```javascript
// src/infrastructure/http/controllers/ProductController.js
import { successResponse, errorResponse, ErrorCodes } from '../../../../shared/middleware/apiResponse.js';

export class ProductController {
  constructor(createProductUseCase, getProductUseCase, listProductsUseCase) {
    this._createProduct = createProductUseCase;
    this._getProduct = getProductUseCase;
    this._listProducts = listProductsUseCase;
  }

  async create(req, res, next) {
    try {
      const product = await this._createProduct.execute(req.body);
      return successResponse(res, product, 'Producto creado exitosamente', 201);
    } catch (err) {
      if (err.code === 'DUPLICATE_SKU') {
        return errorResponse(res, err.message, 409, 'DUPLICATE_SKU');
      }
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await this._getProduct.execute(req.params.id);
      if (!product) return errorResponse(res, 'Producto no encontrado', 404, 'NOT_FOUND');
      return successResponse(res, product);
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const result = await this._listProducts.execute(req.query);
      return successResponse(res, result);
    } catch (err) {
      next(err);
    }
  }
}
```

### Routes
```javascript
// src/infrastructure/http/routes.js
import { Router } from 'express';
import { ProductController } from './controllers/ProductController.js';
import { validateRequest } from './middleware/validateRequest.js';
import { createProductSchema } from './validators/productValidators.js';
import { authenticate, authorize } from '../../../../shared/middleware/auth.js';

export function createRouter(container) {
  const router = Router();
  const controller = new ProductController(
    container.createProductUseCase,
    container.getProductUseCase,
    container.listProductsUseCase
  );

  router.get('/', controller.list.bind(controller));
  router.get('/:id', controller.getById.bind(controller));
  router.post('/', authenticate, authorize(['admin', 'inventario']), validateRequest(createProductSchema), controller.create.bind(controller));

  return router;
}
```

### Dependency Injection (Container)
```javascript
// src/infrastructure/config/container.js
import { createClient } from '@supabase/supabase-js';
import { SupabaseProductRepository } from '../persistence/SupabaseProductRepository.js';
import { RabbitMQEventBus } from '@erp/event-bus';
import { CreateProductUseCase } from '../../application/use-cases/CreateProductUseCase.js';
import { GetProductUseCase } from '../../application/use-cases/GetProductUseCase.js';
import { ListProductsUseCase } from '../../application/use-cases/ListProductsUseCase.js';

export function buildContainer() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const productRepository = new SupabaseProductRepository(supabase);
  const eventBus = new RabbitMQEventBus({ url: process.env.RABBITMQ_URL || 'amqp://localhost:5672' });

  const createProductUseCase = new CreateProductUseCase(productRepository, eventBus);
  const getProductUseCase = new GetProductUseCase(productRepository);
  const listProductsUseCase = new ListProductsUseCase(productRepository);

  return {
    productRepository,
    eventBus,
    createProductUseCase,
    getProductUseCase,
    listProductsUseCase
  };
}
```

### Server Entry Point
```javascript
// src/server.js
import express from 'express';
import { buildContainer } from './infrastructure/config/container.js';
import { createRouter } from './infrastructure/http/routes.js';
import { errorHandler } from './infrastructure/http/middleware/errorHandler.js';
import { requestLoggerMiddleware } from '../../shared/middleware/logger.js';

const app = express();
const PORT = process.env.PORT || 30XX;

app.use(express.json());
app.use(requestLoggerMiddleware);

const container = buildContainer();
const router = createRouter(container);

app.use('/api/mi-servicio', router);
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'mi-servicio' }));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[mi-servicio] Running on port ${PORT}`);
  container.eventBus.connect().catch(err => console.error('[mi-servicio] EventBus connection failed:', err.message));
});
```

## Eventos Recomendados

Cada servicio debe publicar eventos para los cambios de estado importantes:

- `product.created` / `product.updated` / `product.deleted`
- `inventory.updated` / `inventory.low-stock` / `inventory.out-of-stock`
- `sale.created` / `sale.cancelled`
- `purchase.created` / `purchase.verified`
- `user.registered` / `user.updated`

## Validación de DTOs

Usar el validador centralizado en `backend/shared/validation/`:

```javascript
import { validate } from '../../shared/validation/index.js';
import Joi from 'joi';

const createProductSchema = Joi.object({
  name: Joi.string().required().min(2).max(200),
  sku: Joi.string().required().pattern(/^[A-Z0-9-]+$/),
  price: Joi.number().positive().required(),
  categoryId: Joi.number().integer().required()
});

// En el controller
const { error, value } = validate(createProductSchema, req.body);
if (error) return res.status(400).json({ success: false, error });
```

## Pruebas

### Unitarias (dominio y casos de uso con mocks)
```javascript
// tests/unit/CreateProductUseCase.test.js
describe('CreateProductUseCase', () => {
  it('should create a product with unique SKU', async () => {
    const mockRepo = { findBySku: jest.fn().mockResolvedValue(null), save: jest.fn().mockResolvedValue({ id: 1 }) };
    const mockBus = { publish: jest.fn() };
    const useCase = new CreateProductUseCase(mockRepo, mockBus);
    const result = await useCase.execute({ name: 'Test', sku: 'TST-001', price: 100, categoryId: 1 });
    expect(result).toBeDefined();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(mockBus.publish).toHaveBeenCalled();
  });
});
```

### Integración (contra Supabase de prueba)
```javascript
// tests/integration/product.test.js
describe('Product API', () => {
  it('should create and retrieve a product', async () => {
    const res = await request(app).post('/api/products').send({ name: 'Test', sku: 'TST-001', price: 100 });
    expect(res.status).toBe(201);
    const getRes = await request(app).get(`/api/products/${res.body.data.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('Test');
  });
});
```

## Kitchen Sink Checklist

- [ ] ¿Las entidades de dominio encapsulan reglas de negocio?
- [ ] ¿Los casos de uso orquestan sin depender de infraestructura?
- [ ] ¿Los repositorios son interfaces en `application/ports/`?
- [ ] ¿Los controladores son delgados (delegan a casos de uso)?
- [ ] ¿Los Value Objects son inmutables?
- [ ] ¿Los eventos de dominio se publican después de persistir?
- [ ] ¿Las dependencias se inyectan (DI manual)?
- [ ] ¿Las rutas Express usan `validateRequest` middleware?
- [ ] ¿Las respuestas siguen `successResponse`/`errorResponse`?
- [ ] ¿Hay tests unitarios para dominio y casos de uso?

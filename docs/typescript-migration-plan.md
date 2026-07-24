# Plan de Migración a TypeScript

## Objetivo
Migrar progresivamente el backend de JavaScript a TypeScript para mejorar la mantenibilidad, reducir errores en tiempo de ejecución y facilitar la colaboración en equipo.

## Fases

### Fase 0: Setup (1-2 días)
- [ ] Instalar TypeScript (`npm i -D typescript @types/node`)
- [ ] Crear `tsconfig.json` base con `strict: true`
- [ ] Configurar `ts-node` o `tsx` para desarrollo
- [ ] Configurar build con `tsc` y output en `dist/`
- [ ] Actualizar `package.json` scripts
- [ ] Configurar ESLint + TypeScript

### Fase 1: Shared Kernel y Packages (3-5 días)
- [ ] Migrar `packages/shared-kernel/` (Value Objects, interfaces)
- [ ] Migrar `packages/event-bus/` (Event Bus interfaces e implementaciones)
- [ ] Migrar `packages/common/` (middleware, validación)
- [ ] Migrar `backend/shared/` (database, errors, middleware, types, validation)

**Beneficio inmediato**: Los tipos base estarán disponibles para todos los servicios.

### Fase 2: Servicios Core (5-7 días por servicio)
Orden recomendado (de menor a mayor complejidad):
1. `config-service` (sencillo, CRUD básico)
2. `category-service` (CRUD con tree)
3. `email-service` (integraciones externas)
4. `whatsapp-service` (integraciones externas)
5. `notification-service` (CRUD + triggers)
6. `audit-service` (solo lectura)

### Fase 3: Servicios de Negocio (7-10 días por servicio)
1. `auth-service` / `identity-service` (JWT, sesiones)
2. `user-service` (roles, permisos)
3. `product-service` (variantes, imágenes)
4. `catalog-service` (búsqueda, filtros)
5. `inventory-service` (movimientos, kardex, lotes)
6. `purchase-service` / `procurement-service` (órdenes, verificación)
7. `sale-service` (ventas, carrito, checkout)
8. `invoice-service` (facturación electrónica)
9. `ecommerce-service` (banners, reseñas, config)
10. `report-service` (reportes, dashboard)

### Fase 4: API Gateway (2-3 días)
- [ ] Migrar `api-gateway/src/` (rutas, proxy)
- [ ] Tipar configuraciones de servicios

### Fase 5: Frontend (Opcional, 5-7 días)
- [ ] Agregar tipos para API responses
- [ ] Migrar stores a Pinia + TypeScript
- [ ] Tipar componentes con `defineProps`/`defineEmits` tipados

## Configuración TypeScript

### tsconfig.json base
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "allowJs": true,
    "checkJs": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@erp/shared-kernel": ["./packages/shared-kernel/src"],
      "@erp/event-bus": ["./packages/event-bus/src"],
      "@erp/common": ["./packages/common/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### package.json scripts
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch"
  }
}
```

## Estrategia de Migración

### Enfoque híbrido (archivo por archivo)
1. Renombrar `.js` → `.ts`
2. Agregar tipos básicos (nunca `any`)
3. Ejecutar `tsc --noEmit` para verificar
4. Corregir errores gradualmente

### Tipos globales compartidos
```typescript
// backend/shared/types/global.d.ts
declare namespace ERP {
  interface User {
    id: number;
    email: string;
    role: 'admin' | 'supervisor' | 'cajero' | 'inventario' | 'cliente';
    name: string;
  }

  interface PaginatedResponse<T> {
    success: true;
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }

  interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
      code: string;
      message: string;
      correlationId?: string;
      details?: any;
    };
  }
}
```

### Patrón de migración para Express
```typescript
// Antes (JS)
const { createProxyMiddleware } = require('http-proxy-middleware');

// Después (TS)
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
```

### Patrón para servicios con DI
```typescript
// Antes
export class CreateProductUseCase {
  constructor(productRepository, eventBus) { ... }
}

// Después
import { IProductRepository } from '../ports/IProductRepository.js';
import { IEventBus } from '@erp/event-bus';
import { Product } from '../domain/entities/Product.js';

interface CreateProductDTO {
  name: string;
  sku: string;
  price: number;
  categoryId: number;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(dto: CreateProductDTO): Promise<Product> {
    const existing = await this.productRepository.findBySku(dto.sku);
    if (existing) throw new DuplicateSKUError(`SKU ${dto.sku} already exists`);
    const product = new Product(dto);
    const saved = await this.productRepository.save(product);
    await this.eventBus.publish(new ProductCreatedEvent(saved));
    return saved;
  }
}
```

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Tiempo de migración muy largo | Alto | Priorizar servicios críticos primero |
| Breaking changes en producción | Alto | CI/CD con tests antes de deploy |
| Curva de aprendizaje del equipo | Medio | Sesiones de pair programming |
| Dependencias sin tipos (supabase, etc.) | Bajo | Usar `@types/` o declarar módulos |
| Archivos muy grandes difíciles de tipar | Medio | Refactorizar antes de migrar |

## Estimación Total

| Fase | Días estimados |
|------|---------------|
| Fase 0: Setup | 2 |
| Fase 1: Shared Kernel | 5 |
| Fase 2: Servicios Core (6 servicios × 3 días) | 18 |
| Fase 3: Servicios Negocio (10 servicios × 5 días) | 50 |
| Fase 4: API Gateway | 3 |
| Fase 5: Frontend (opcional) | 7 |
| **Total** | **~85 días hábiles (4 meses)** |

## Recomendaciones

1. **No detener el desarrollo de features** durante la migración
2. **Migrar de abajo hacia arriba** (shared kernel → servicios → gateway)
3. **Usar `allowJs: true`** para convivencia JS/TS
4. **ConfigurarCI** para ejecutar `tsc --noEmit` en cada PR
5. **Documentar tipos compartidos** en `backend/shared/types/`
6. **Migrar los tests** junto con cada archivo
7. **Priorizar servicios con más bugs** por falta de tipos

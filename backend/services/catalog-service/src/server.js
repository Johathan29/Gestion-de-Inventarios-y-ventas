// ============================================================
// Catalog Service — Entry Point (Hexagonal Architecture)
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { loadConfig, createLogger, errorHandler } from '@erp/common';
import { InMemoryEventBus } from '@erp/event-bus';
import { SupabaseProductRepository, SupabaseCategoryRepository, SupabaseBrandRepository } from './repository/index.js';
import { CatalogApplicationService } from './application/CatalogApplicationService.js';
import { createCatalogRouter } from './controller/index.js';

const config = loadConfig();
const logger = createLogger('catalog-service');
const app = express();

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
const eventBus = new InMemoryEventBus();

const productRepository = new SupabaseProductRepository(supabase);
const categoryRepository = new SupabaseCategoryRepository(supabase);
const brandRepository = new SupabaseBrandRepository(supabase);

const appService = new CatalogApplicationService({ productRepository, categoryRepository, brandRepository, eventBus });

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'catalog-service', timestamp: new Date().toISOString() });
});

app.use('/api', createCatalogRouter({ appService }));
app.use(errorHandler);

const PORT = process.env.CATALOG_SERVICE_PORT || 3003;
app.listen(PORT, () => {
  logger.info(`Catalog Service running on port ${PORT}`);
});

export default app;

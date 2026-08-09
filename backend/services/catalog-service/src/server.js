// ============================================================
// Catalog Service — Entry Point (Hexagonal Architecture)
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { loadConfig, createLogger, errorHandler } from '@erp/common';
import { tenantContext } from '@erp/shared-kernel';
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
app.use(tenantContext);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'catalog-service', timestamp: new Date().toISOString() });
});

app.use('/api', createCatalogRouter({ appService }));
app.use(errorHandler);

const PORT = process.env.CATALOG_SERVICE_PORT || 3013;
app.listen(PORT, () => {
  logger.info(`Catalog Service running on port ${PORT}`);
});

export default app;

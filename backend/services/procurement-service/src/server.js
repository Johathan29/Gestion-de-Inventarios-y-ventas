// ============================================================
// Procurement Service — Entry Point (Hexagonal Architecture)
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { loadConfig, createLogger, errorHandler } from '@erp/common';
import { InMemoryEventBus } from '@erp/event-bus';
import { SupabasePurchaseRepository, SupabaseSupplierRepository } from './repository/index.js';
import { ProcurementApplicationService } from './application/ProcurementApplicationService.js';
import { createProcurementRouter } from './controller/index.js';
import { registerProcurementSubscribers } from './subscribers/index.js';

const config = loadConfig();
const logger = createLogger('procurement-service');
const app = express();

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
const eventBus = new InMemoryEventBus();

const purchaseRepository = new SupabasePurchaseRepository(supabase);
const supplierRepository = new SupabaseSupplierRepository(supabase);

registerProcurementSubscribers(eventBus);

const appService = new ProcurementApplicationService({ purchaseRepository, supplierRepository, eventBus });

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'procurement-service', timestamp: new Date().toISOString() });
});

app.use('/api', createProcurementRouter({ appService }));
app.use(errorHandler);

const PORT = process.env.PURCHASE_SERVICE_PORT || 3006;
app.listen(PORT, () => {
  logger.info(`Procurement Service running on port ${PORT}`);
});

export default app;

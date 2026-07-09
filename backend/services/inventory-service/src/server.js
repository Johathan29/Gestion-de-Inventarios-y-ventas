// ============================================================
// Inventory Service — Entry Point (Hexagonal Architecture)
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
import { InMemoryEventBus } from '@erp/event-bus';
import {
  SupabaseInventoryRepository,
  SupabaseMovementRepository,
  SupabaseReservationRepository,
  SupabaseWarehouseRepository,
} from './repository/index.js';
import { InventoryApplicationService } from './application/InventoryApplicationService.js';
import { createInventoryRouter } from './controller/index.js';
import { registerInventorySubscribers } from './subscribers/index.js';

const config = loadConfig();
const logger = createLogger('inventory-service');
const app = express();

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);
const eventBus = new InMemoryEventBus();

const inventoryRepository = new SupabaseInventoryRepository(supabase);
const movementRepository = new SupabaseMovementRepository(supabase);
const reservationRepository = new SupabaseReservationRepository(supabase);
const warehouseRepository = new SupabaseWarehouseRepository(supabase);

registerInventorySubscribers(eventBus);

const appService = new InventoryApplicationService({
  inventoryRepository,
  movementRepository,
  reservationRepository,
  eventBus,
});

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'inventory-service', timestamp: new Date().toISOString() });
});

app.use('/api/inventory', createInventoryRouter({ appService }));
app.use(errorHandler);

const PORT = process.env.INVENTORY_SERVICE_PORT || 3005;
app.listen(PORT, () => {
  logger.info(`Inventory Service running on port ${PORT}`);
});

export default app;


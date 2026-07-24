// ============================================================
// Sale Service — Server Entry Point (Hexagonal)
// Merged: Sales + Cart + Checkout
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import { createLogger, errorHandler } from '@erp/common';
import { createSupabaseClient } from '@erp/shared-kernel';
import { InMemoryEventBus } from '@erp/event-bus';
import { RabbitMQEventBus } from '@erp/event-bus';
import { SupabaseSaleRepository, SupabaseCartRepository } from './repository/index.js';
import { SalesApplicationService } from './application/index.js';
import { createSalesRouter } from './controller.js';
import { registerSalesSubscribers } from './subscribers/index.js';

const logger = createLogger('SaleService');
const app = express();
const PORT = process.env.SALE_SERVICE_PORT || 3007;

async function main() {
  // Middleware
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'sale-service', timestamp: new Date().toISOString() });
  });

  // Supabase client
  const supabase = createSupabaseClient();

  // Repositories
  const saleRepository = new SupabaseSaleRepository(supabase);
  const cartRepository = new SupabaseCartRepository(supabase);

  // Event Bus
  const eventBus = process.env.RABBITMQ_URL
    ? new RabbitMQEventBus(process.env.RABBITMQ_URL, 'sale-service')
    : new InMemoryEventBus();

  await eventBus.connect();

  // Subscribers
  registerSalesSubscribers(eventBus, { supabase });

  // Application Service
  const appService = new SalesApplicationService({ saleRepository, cartRepository, eventBus, supabase });

  // Routes
  app.use('/api/sales', createSalesRouter(appService));

  // Error handler
  app.use(errorHandler);

  app.listen(PORT, () => {
    logger.info(`🧾 Sale Service running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

export default app;

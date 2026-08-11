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
import { createSupabaseClient, tenantContext, createRequestScopedSupabase } from '@erp/shared-kernel';
import { InMemoryEventBus, RabbitMQEventBus, OutboxRelay } from '@erp/event-bus';
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
  app.use(tenantContext);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'sale-service', timestamp: new Date().toISOString() });
  });

  // Supabase client — request-scoped: dentro de cada request delega al
  // client tenant-aware (filtra company_id); fuera (relay/subscribers)
  // usa el client base.
  const baseClient = createSupabaseClient();
  const supabase = createRequestScopedSupabase(baseClient);

  // Repositories
  const saleRepository = new SupabaseSaleRepository(supabase);
  const cartRepository = new SupabaseCartRepository(supabase);

  // Event Bus — exchange común `erp.events` (topic) con routing keys = eventType
  const eventBus = process.env.RABBITMQ_URL
    ? new RabbitMQEventBus({ url: process.env.RABBITMQ_URL, exchange: 'erp.events' })
    : new InMemoryEventBus();

  await eventBus.connect();

  // Outbox Relay — publica eventos escritos en la misma transacción que la
  // venta (migración 049). Usa el client BASE (no tenant) para leer TODAS
  // las compañías del outbox.
  const outboxRelay = process.env.OUTBOX_RELAY === 'true'
    ? new OutboxRelay({ supabase: baseClient, eventBus, logger })
    : null;
  outboxRelay?.start();

  // Subscribers
  registerSalesSubscribers(eventBus, { supabase });

  // Application Service
  const appService = new SalesApplicationService({ saleRepository, cartRepository, eventBus, supabase });

  // Routes
  app.use('/api/sales', createSalesRouter(appService, supabase));

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

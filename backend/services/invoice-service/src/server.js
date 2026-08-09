// ============================================================
// Billing Service — Server Entry Point (Hexagonal)
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import { createLogger, errorHandler } from '@erp/common';
import { createSupabaseClient, tenantContext } from '@erp/shared-kernel';
import { InMemoryEventBus } from '@erp/event-bus';
import { RabbitMQEventBus } from '@erp/event-bus';
import { SupabaseInvoiceRepository, SupabaseNcfRepository } from './repository/index.js';
import { InvoicePdfService } from './services/pdf.service.js';
import { BillingApplicationService } from './application/index.js';
import { createBillingRouter } from './controller.js';
import { registerBillingSubscribers } from './subscribers/index.js';

const logger = createLogger('BillingService');
const app = express();
const PORT = process.env.INVOICE_SERVICE_PORT || 3009;

async function main() {
  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(tenantContext);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'invoice-service', timestamp: new Date().toISOString() });
  });

  // Supabase client
  const supabase = createSupabaseClient();

  // Repositories
  const invoiceRepository = new SupabaseInvoiceRepository(supabase);
  const ncfRepository = new SupabaseNcfRepository(supabase);

  // Services
  const pdfService = new InvoicePdfService();

  // Event Bus — exchange común `erp.events` (topic) con routing keys = eventType
  const eventBus = process.env.RABBITMQ_URL
    ? new RabbitMQEventBus({ url: process.env.RABBITMQ_URL, exchange: 'erp.events' })
    : new InMemoryEventBus();

  await eventBus.connect();

  // Subscribers
  registerBillingSubscribers(eventBus);

  // Application Service
  const appService = new BillingApplicationService({ invoiceRepository, ncfRepository, pdfService, eventBus });

  // Routes
  app.use('/api/invoices', createBillingRouter(appService));

  // Error handler
  app.use(errorHandler);

  app.listen(PORT, () => {
    logger.info(`📄 Billing Service running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

export default app;

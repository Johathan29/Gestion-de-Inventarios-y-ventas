// ============================================================
// Payments Service — Server Entry Point
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
import { SupabasePaymentMethodRepository, SupabaseCashRegisterRepository, SupabasePaymentTransactionRepository } from './repository/index.js';
import { PaymentsApplicationService } from './application/index.js';
import { createPaymentsRouter } from './controller.js';
import { registerPaymentsSubscribers } from './subscribers/index.js';

const logger = createLogger('PaymentsService');
const app = express();
const PORT = process.env.PAYMENT_SERVICE_PORT || 3019;

async function main() {
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'payment-service', timestamp: new Date().toISOString() });
  });

  const supabase = createSupabaseClient();
  const paymentMethodRepo = new SupabasePaymentMethodRepository(supabase);
  const cashRegisterRepo = new SupabaseCashRegisterRepository(supabase);
  const transactionRepo = new SupabasePaymentTransactionRepository(supabase);

  const eventBus = process.env.RABBITMQ_URL
    ? new RabbitMQEventBus(process.env.RABBITMQ_URL, 'payment-service')
    : new InMemoryEventBus();

  await eventBus.connect();
  registerPaymentsSubscribers(eventBus);

  const appService = new PaymentsApplicationService({ paymentMethodRepo, cashRegisterRepo, transactionRepo, eventBus });

  app.use('/api/payments', createPaymentsRouter(appService, supabase));
  app.use(errorHandler);

  app.listen(PORT, () => {
    logger.info(`💳 Payments Service running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

export default app;

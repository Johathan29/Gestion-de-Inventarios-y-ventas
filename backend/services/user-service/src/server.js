// ============================================================
// CRM Service — Server Entry Point (hexagonal ESM)
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import { createLogger, errorHandler } from '@erp/common';
import { createSupabaseClient } from '@erp/shared-kernel';
import { InMemoryEventBus, RabbitMQEventBus } from '@erp/event-bus';
import { SupabaseClientRepository, SupabaseCreditAccountRepository, SupabaseNotificationPreferenceRepository } from './repository/index.js';
import { CRMApplicationService } from './application/index.js';
import { createCRMRouter } from './controller.js';
import { registerCRMSubscribers } from './subscribers/index.js';

const logger = createLogger('CRMService');
const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3002;

async function main() {
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'user-service (CRM)' });
  });

  const supabase = createSupabaseClient();
  const clientRepo = new SupabaseClientRepository(supabase);
  const creditAccountRepo = new SupabaseCreditAccountRepository(supabase);
  const notifRepo = new SupabaseNotificationPreferenceRepository(supabase);

  const eventBus = process.env.RABBITMQ_URL
    ? new RabbitMQEventBus(process.env.RABBITMQ_URL, 'user-service')
    : new InMemoryEventBus();

  await eventBus.connect();
  registerCRMSubscribers(eventBus);

  const appService = new CRMApplicationService({ clientRepo, creditAccountRepo, notifRepo, eventBus });

  app.use('/api/users', createCRMRouter(appService));
  app.use(errorHandler);

  app.listen(PORT, () => {
    logger.info(`👤 CRM Service running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

export default app;

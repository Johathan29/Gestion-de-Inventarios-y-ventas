// ============================================================
// Notification Service — Server Entry Point (hexagonal ESM)
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import { createLogger, errorHandler } from '@erp/common';
import { createSupabaseClient, tenantContext } from '@erp/shared-kernel';
import { InMemoryEventBus, RabbitMQEventBus } from '@erp/event-bus';
import { SupabaseNotificationRepository, EmailChannelService, WhatsAppChannelService } from './repository/index.js';
import { NotificationApplicationService } from './application/index.js';
import { createNotificationRouter } from './controller.js';
import { registerNotificationSubscribers } from './subscribers/index.js';

const logger = createLogger('NotificationService');
const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3016;

async function main() {
  app.use(express.json({ limit: '10mb' }));

  app.use(tenantContext);

  const supabase = createSupabaseClient();
  const notifRepo = new SupabaseNotificationRepository(supabase);
  const emailService = new EmailChannelService();
  const whatsAppService = new WhatsAppChannelService();

  const eventBus = process.env.RABBITMQ_URL
    ? new RabbitMQEventBus({ url: process.env.RABBITMQ_URL, exchange: 'erp.events' })
    : new InMemoryEventBus();

  await eventBus.connect();
  registerNotificationSubscribers(eventBus, { supabase });

  const appService = new NotificationApplicationService({ notifRepo, emailService, whatsAppService, eventBus });

  app.use('/api/notifications', createNotificationRouter(appService));
  app.use(errorHandler);

  app.listen(PORT, () => {
    logger.info(`🔔 Notification Service running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

export default app;

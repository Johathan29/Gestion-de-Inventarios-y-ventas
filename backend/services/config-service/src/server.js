// ============================================================
// Configuration Service — Server Entry Point (hexagonal ESM)
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
import {
  SupabaseSystemConfigRepository, SupabaseEcommerceRepository, SupabaseTaxRateRepository,
  SupabaseHeroSlideRepository, SupabaseFloatingBannerRepository, SupabaseWhatsAppConfigRepository,
} from './repository/index.js';
import { ConfigApplicationService } from './application/index.js';
import { createConfigRouter } from './controller.js';
import { registerConfigSubscribers } from './subscribers/index.js';

const logger = createLogger('ConfigService');
const app = express();
const PORT = process.env.CONFIG_SERVICE_PORT || 3018;

async function main() {
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'config-service' });
  });

  const supabase = createSupabaseClient();

  const eventBus = process.env.NODE_ENV === 'production'
    ? new RabbitMQEventBus(process.env.RABBITMQ_URL || 'amqp://localhost')
    : new InMemoryEventBus();
  await eventBus.connect();

  const configRepo = new SupabaseSystemConfigRepository(supabase);
  const ecommerceRepo = new SupabaseEcommerceRepository(supabase);
  const taxRateRepo = new SupabaseTaxRateRepository(supabase);
  const heroSlideRepo = new SupabaseHeroSlideRepository(supabase);
  const bannerRepo = new SupabaseFloatingBannerRepository(supabase);
  const whatsappRepo = new SupabaseWhatsAppConfigRepository(supabase);

  const appService = new ConfigApplicationService({
    configRepo, ecommerceRepo, taxRateRepo, heroSlideRepo, bannerRepo, whatsappRepo, eventBus,
  });

  registerConfigSubscribers(eventBus);

  app.use('/api/config', createConfigRouter(appService));
  app.use(errorHandler);

  app.listen(PORT, () => {
    logger.info(`⚙️ Configuration Service running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

export default app;

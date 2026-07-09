// ============================================================
// Identity Service — Entry Point
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { loadConfig, createLogger, errorHandler } from '@erp/common';
import { InMemoryEventBus } from '@erp/event-bus';
import { SupabaseUserRepository } from './repository/SupabaseUserRepository.js';
import { IdentityApplicationService } from './application/IdentityApplicationService.js';
import { createIdentityRouter } from './controller/index.js';
import { CreateClientOnUserRegistered, AuditLoginOnUserLoggedIn } from './subscribers/index.js';

const config = loadConfig();
const logger = createLogger('identity-service');
const app = express();

// ------------------------------------------------------------------
// Infrastructure initialization
// ------------------------------------------------------------------

// Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

// Event bus (use RabbitMQ in production, in-memory for dev)
const eventBus = new InMemoryEventBus();

// Repository
const userRepository = new SupabaseUserRepository(supabase);

// JWT config
const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshSecret: config.JWT_REFRESH_SECRET,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
};

// Application service
const applicationService = new IdentityApplicationService({
  userRepository,
  eventBus,
  jwtConfig,
});

// ------------------------------------------------------------------
// Register subscribers
// ------------------------------------------------------------------

async function registerSubscribers() {
  try {
    await eventBus.subscribe('identity.user.registered', new CreateClientOnUserRegistered(supabase));
    await eventBus.subscribe('identity.user.logged_in', new AuditLoginOnUserLoggedIn(supabase));
    logger.info('Event subscribers registered');
  } catch (err) {
    logger.error('Failed to register subscribers:', err);
  }
}

// ------------------------------------------------------------------
// Express setup
// ------------------------------------------------------------------

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'identity-service', timestamp: new Date().toISOString() });
});

// Routes
const router = createIdentityRouter({ applicationService });
app.use('/api', router);

// Error handler
app.use(errorHandler);

// ------------------------------------------------------------------
// Start server
// ------------------------------------------------------------------

const PORT = process.env.IDENTITY_SERVICE_PORT || 3001;

async function start() {
  await registerSubscribers();

  app.listen(PORT, () => {
    logger.info(`Identity Service running on port ${PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
  });
}

start().catch(err => {
  logger.error('Failed to start service:', err);
  process.exit(1);
});

export default app;

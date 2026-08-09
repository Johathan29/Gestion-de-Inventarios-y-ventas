// ============================================================
// Platform Admin Service — Entry Point
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
import { loadConfig, createLogger } from '@erp/common';
import { tenantContext } from '@erp/shared-kernel';
import { createPlatformAdminRouter } from './router.js';

const config = loadConfig();
const logger = createLogger('platform-admin-service');
const app = express();

// ------------------------------------------------------------------
// Infrastructure
// ------------------------------------------------------------------
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(tenantContext);

// ------------------------------------------------------------------
// Health
// ------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'platform-admin-service', timestamp: new Date().toISOString() });
});

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------
app.use('/api/platform', createPlatformAdminRouter(supabase, logger));

// ------------------------------------------------------------------
// Start
// ------------------------------------------------------------------
const PORT = process.env.PLATFORM_ADMIN_PORT || 3020;
app.listen(PORT, () => {
  logger.info(`Platform Admin Service running on port ${PORT}`);
});

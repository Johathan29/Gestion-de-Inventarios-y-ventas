import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { integrationRouter } from './router.js';
import { startWebhookWorker } from './webhooks/worker.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const app = express();
const PORT = process.env.INTEGRATION_SERVICE_PORT || 3024;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'integration-service', port: PORT, timestamp: new Date().toISOString() }));

app.use('/api/integrations', integrationRouter(supabase));

app.use((_req, res) => res.status(404).json({ success: false, error: 'Endpoint not found' }));
app.use((err, _req, res, _next) => {
  console.error('[INTEGRATION] Error:', err.message);
  res.status(err.status || 500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

app.listen(PORT, () => console.log(`[INTEGRATION] Running on port ${PORT}`));

// ── Worker de webhooks (Fase 8): procesa webhook_logs pendientes con
//    SSRF guard, firma HMAC y retries con backoff exponencial. ──────────
const workerInterval = Number(process.env.WEBHOOK_WORKER_INTERVAL_MS) || 4000;
const workerBatch = Number(process.env.WEBHOOK_WORKER_BATCH) || 20;
startWebhookWorker(supabase, { intervalMs: workerInterval, batch: workerBatch });

export default app;

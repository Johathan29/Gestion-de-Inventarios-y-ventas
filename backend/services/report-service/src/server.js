// ============================================================
// Reporting Service — Server Entry Point (hexagonal ESM)
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import { createLogger, errorHandler } from '@erp/common';
import { createSupabaseClient, tenantContext } from '@erp/shared-kernel';
import { SupabaseReportRepository } from './repository/index.js';
import { ReportApplicationService } from './application/index.js';
import { createReportRouter } from './controller.js';

const logger = createLogger('ReportService');
const app = express();
const PORT = process.env.REPORT_SERVICE_PORT || 3008;

async function main() {
  app.use(express.json({ limit: '10mb' }));

  app.use(tenantContext);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'report-service', timestamp: new Date().toISOString() });
  });

  const supabase = createSupabaseClient();
  const reportRepo = new SupabaseReportRepository(supabase);
  const appService = new ReportApplicationService({ reportRepo });

  app.use('/api/reports', createReportRouter(appService));
  app.use(errorHandler);

  app.listen(PORT, () => {
    logger.info(`📊 Reporting Service running on port ${PORT}`);
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

export default app;

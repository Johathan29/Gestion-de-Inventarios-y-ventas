// ============================================================
// Reporting Subscribers — Event Loggers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('Report-Subscribers');

export function registerReportSubscribers(eventBus) {
  eventBus.subscribe('reports.query.executed', async (event) => {
    logger.debug(`Report query executed: ${event.payload.report}`);
  });
}


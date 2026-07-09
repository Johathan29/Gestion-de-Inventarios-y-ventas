// ============================================================
// Configuration Subscribers — Event Loggers
// ============================================================

import { createLogger } from '@erp/common';

const logger = createLogger('Config-Subscribers');

export function registerConfigSubscribers(eventBus) {
  const events = [
    'config.tax-rate.created', 'config.tax-rate.updated', 'config.tax-rate.deleted',
    'config.hero-slide.created', 'config.hero-slide.updated', 'config.hero-slide.reordered', 'config.hero-slide.deleted',
    'config.floating-banner.created', 'config.floating-banner.updated', 'config.floating-banner.deleted',
    'config.whatsapp.updated',
  ];

  events.forEach(event => {
    eventBus.subscribe(event, async (evt) => {
      logger.debug(`Event: ${event}`, evt.data);
    });
  });
}


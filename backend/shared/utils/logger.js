const winston = require('winston');
const path = require('path');
const { config } = require('./config');

const logDir = path.dirname(config.logging.file);

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'inventory-system' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
        })
      )
    }),
    new winston.transports.File({ 
      filename: config.logging.file,
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

/**
 * Crea un logger con un contexto de servicio específico
 */
const createServiceLogger = (serviceName) => {
  return logger.child({ service: serviceName });
};

module.exports = { logger, createServiceLogger };

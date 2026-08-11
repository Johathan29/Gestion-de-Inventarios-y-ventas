// ============================================================
// Shared Utilities — Config, Logger, Helpers
// ============================================================

import winston from 'winston';
import fs from 'fs';
import path from 'path';

// ============================================================
// Configuration
// ============================================================

/**
 * Load environment configuration with defaults
 */
export function loadConfig() {
  return {
    // Server
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    
    // Database
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    
    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    
    // Event Bus
    EVENT_BUS_TYPE: process.env.EVENT_BUS_TYPE || 'in-memory', // 'rabbitmq' | 'in-memory'
    RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    
    // Redis
    REDIS_URL: process.env.REDIS_URL || '',
    REDIS_ENABLED: process.env.REDIS_ENABLED === 'true',
    
    // Security
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 min
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_DIR: process.env.LOG_DIR || './logs',
    
    // API
    API_PREFIX: process.env.API_PREFIX || '/api/v1',
    SERVICE_NAME: process.env.SERVICE_NAME || 'unknown',
  };
}

// ============================================================
// Logger (Winston) con redacción de secretos (Fase 9)
// ============================================================

// Valores de secretos que NUNCA deben aparecer en logs
const SECRET_ENV_KEYS = [
  'JWT_SECRET', 'JWT_REFRESH_SECRET', 'SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'ENCRYPTION_KEY', 'SMTP_PASS', 'WHATSAPP_API_TOKEN', 'MAILTRAP_TOKEN', 'SUPABASE_DB_PASSWORD',
];
const REDACTED = '[REDACTED]';
const secretValues = SECRET_ENV_KEYS
  .map((k) => process.env[k])
  .filter((v) => v && v.length >= 8);

function redact(text) {
  if (!text) return text;
  let out = String(text);
  for (const v of secretValues) {
    if (out.includes(v)) out = out.split(v).join(REDACTED);
  }
  return out;
}

function sanitizeValue(val, depth = 0) {
  if (depth > 6) return val;
  if (typeof val === 'string') return redact(val);
  if (Array.isArray(val)) return val.map((v) => sanitizeValue(v, depth + 1));
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = sanitizeValue(v, depth + 1);
    return out;
  }
  return val;
}

// Formato winston: redacta secretos en message y meta (se aplica a TODOS los transports)
const sanitizeFormat = winston.format((info) => {
  info.message = typeof info.message === 'string' ? redact(info.message) : info.message;
  for (const key of Object.keys(info)) {
    if (['message', 'level', 'timestamp', 'service'].includes(key)) continue;
    info[key] = sanitizeValue(info[key]);
  }
  return info;
});

/**
 * Create a configured Winston logger
 */
export function createLogger(serviceName = 'erp') {
  const config = loadConfig();
  const logDir = config.LOG_DIR;
  
  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 
            ? JSON.stringify(sanitizeValue(meta), null, 2) 
            : '';
          return `${timestamp} [${level}] ${serviceName}: ${redact(message)} ${metaStr}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, `${serviceName}-error.log`),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        sanitizeFormat(),
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, `${serviceName}-combined.log`),
      maxsize: 5242880,
      maxFiles: 5,
      format: winston.format.combine(
        sanitizeFormat(),
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ];

  return winston.createLogger({
    level: config.LOG_LEVEL,
    defaultMeta: { service: serviceName },
    transports,
  });
}

// ============================================================
// Helpers
// ============================================================

/**
 * Standard API response builder
 */
export function apiResponse({ success = true, message = '', data = null, pagination = null, errors = null } = {}) {
  const response = { success, message };
  if (data !== null) response.data = data;
  if (pagination) response.pagination = pagination;
  if (errors) response.errors = errors;
  return response;
}

/**
 * Pagination helper
 */
export function paginate({ page = 1, limit = 20, total = 0 } = {}) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Generate a secure random token
 */
export function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues?.(array) || array;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(array[i] % chars.length);
  }
  return result;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(str, fallback = {}) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Format a date to ISO string or custom format
 */
export function formatDate(date, format = 'iso') {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  if (format === 'iso') return d.toISOString();
  return d.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Sleep / delay utility
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Async handler wrapper to avoid try/catch in controllers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  loadConfig, createLogger, apiResponse, paginate,
  generateToken, safeJsonParse, formatDate, sleep, asyncHandler,
};

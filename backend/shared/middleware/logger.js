/**
 * Structured Logging Middleware
 * Proporciona logging uniforme y estructurado para todos los microservicios
 */

/**
 * Logger estructurado con niveles y formato JSON
 */
class StructuredLogger {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.level = options.level || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
    this.prettyPrint = options.prettyPrint || process.env.NODE_ENV !== 'production';
  }

  _log(level, message, meta = {}) {
    if (!this._shouldLog(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...meta
    };

    if (this.prettyPrint) {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.serviceName}]`;
      console.log(`${prefix}: ${message}`, Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '');
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  _shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return (levels[level] || 0) <= (levels[this.level] || 2);
  }

  error(message, meta = {}) { this._log('error', message, meta); }
  warn(message, meta = {}) { this._log('warn', message, meta); }
  info(message, meta = {}) { this._log('info', message, meta); }
  debug(message, meta = {}) { this._log('debug', message, meta); }

  /**
   * Log de una petición HTTP
   */
  logRequest(req, res, durationMs) {
    this.info(`${req.method} ${req.originalUrl || req.url}`, {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${durationMs}ms`,
      correlationId: req.correlationId || null,
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      ip: req.ip || req.connection?.remoteAddress
    });
  }

  /**
   * Log de un error
   */
  logError(error, req = null) {
    this.error(error.message || 'Error desconocido', {
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      code: error.code || error.statusCode,
      correlationId: req?.correlationId || null,
      path: req?.originalUrl || req?.url || null,
      method: req?.method || null
    });
  }
}

// Cache de loggers por servicio
const loggers = new Map();

/**
 * Obtiene o crea un logger para un servicio
 */
function getLogger(serviceName, options = {}) {
  if (!loggers.has(serviceName)) {
    loggers.set(serviceName, new StructuredLogger(serviceName, options));
  }
  return loggers.get(serviceName);
}

/**
 * Middleware de logging Express
 */
function requestLoggerMiddleware(req, res, next) {
  const startTime = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const logger = getLogger('http');

    logger._log(level, `${req.method} ${req.originalUrl || req.url}`, {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId: req.correlationId || null,
      contentLength: res.getHeader('content-length') || 0
    });

    originalEnd.apply(this, args);
  };

  next();
}

module.exports = {
  StructuredLogger,
  getLogger,
  requestLoggerMiddleware
};

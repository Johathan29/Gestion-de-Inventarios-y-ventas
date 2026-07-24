/**
 * Correlation ID Middleware
 * Genera y propaga un Correlation ID único a través de todas las peticiones
 * para trazabilidad distribuida entre microservicios.
 */

const { v4: uuidv4 } = require('uuid');

const CORRELATION_HEADER = 'x-correlation-id';
const CORRELATION_ID_KEY = 'correlationId';

/**
 * Middleware para generar/propagar Correlation ID
 * - Si el cliente envía uno, lo reutiliza
 * - Si no, genera uno nuevo
 * - Lo inyecta en req y en headers para propagación
 */
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers[CORRELATION_HEADER] || uuidv4();

  // Almacenar en request para uso en servicios
  req[CORRELATION_ID_KEY] = correlationId;

  // Configurar header de respuesta para trazabilidad
  res.setHeader(CORRELATION_HEADER, correlationId);

  // Configurar para propagación downstream
  req.headers[CORRELATION_HEADER] = correlationId;

  // Log con correlation ID
  const startTime = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const logData = {
      correlationId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
    console.log(`[${correlationId}] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms`);
    originalEnd.apply(this, args);
  };

  next();
}

/**
 * Helper para crear headers de propagación
 */
function getCorrelationHeaders(req) {
  return {
    [CORRELATION_HEADER]: req[CORRELATION_ID_KEY] || req.headers[CORRELATION_HEADER]
  };
}

module.exports = {
  correlationIdMiddleware,
  getCorrelationHeaders,
  CORRELATION_HEADER,
  CORRELATION_ID_KEY
};

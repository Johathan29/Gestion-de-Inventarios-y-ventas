/**
 * Request ID + Trace ID Middleware (Fase 9 — Observabilidad)
 *
 * Estandariza la trazabilidad distribuida:
 *  - x-request-id: identifica UNA petición HTTP (uuid).
 *  - x-trace-id:   identifica una OPERACIÓN distribuida completa
 *                  (se reutiliza en llamadas internas entre servicios).
 *  - x-correlation-id: alias mantenido por compatibilidad con el
 *                  middleware legacy (correlationId.js).
 *
 * Si el cliente envía los headers, se reutilizan (para poder
 * correlacionar logs de frontend ↔ gateway ↔ servicios).
 */

const { v4: uuidv4 } = require('uuid');

const REQUEST_ID_HEADER = 'x-request-id';
const TRACE_ID_HEADER = 'x-trace-id';
const CORRELATION_HEADER = 'x-correlation-id';
const REQUEST_ID_KEY = 'requestId';
const TRACE_ID_KEY = 'traceId';

/**
 * Middleware: genera/preserva request_id + trace_id por petición
 */
function requestIdMiddleware(req, res, next) {
  const requestId = req.headers[REQUEST_ID_HEADER] || uuidv4();
  const traceId = req.headers[TRACE_ID_HEADER] || uuidv4();

  // Exponer en el request (consumido por loggers, errorHandler, apiResponse)
  req[REQUEST_ID_KEY] = requestId;
  req[TRACE_ID_KEY] = traceId;

  // Alias de compatibilidad: correlationId = requestId
  req.correlationId = requestId;

  // Headers de respuesta (trazabilidad al cliente)
  res.setHeader(REQUEST_ID_HEADER, requestId);
  res.setHeader(TRACE_ID_HEADER, traceId);
  res.setHeader(CORRELATION_HEADER, requestId);

  // Propagación downstream (sobrescribir para que los proxys lo reenvíen)
  req.headers[REQUEST_ID_HEADER] = requestId;
  req.headers[TRACE_ID_HEADER] = traceId;
  req.headers[CORRELATION_HEADER] = requestId;

  next();
}

/**
 * Headers de propagación para llamadas internas entre servicios
 */
function getTraceHeaders(req) {
  return {
    [REQUEST_ID_HEADER]: req[REQUEST_ID_KEY] || req.headers[REQUEST_ID_HEADER],
    [TRACE_ID_HEADER]: req[TRACE_ID_KEY] || req.headers[TRACE_ID_HEADER],
    [CORRELATION_HEADER]: req[REQUEST_ID_KEY] || req.headers[REQUEST_ID_HEADER],
  };
}

/**
 * Lee request_id desde un request (o headers) con fallback
 */
function getRequestId(req) {
  return req?.[REQUEST_ID_KEY] || req?.headers?.[REQUEST_ID_HEADER] || req?.headers?.[CORRELATION_HEADER] || null;
}

/**
 * Lee trace_id desde un request (o headers) con fallback
 */
function getTraceId(req) {
  return req?.[TRACE_ID_KEY] || req?.headers?.[TRACE_ID_HEADER] || null;
}

module.exports = {
  requestIdMiddleware,
  getTraceHeaders,
  getRequestId,
  getTraceId,
  REQUEST_ID_HEADER,
  TRACE_ID_HEADER,
  CORRELATION_HEADER,
  REQUEST_ID_KEY,
  TRACE_ID_KEY,
};

/**
 * Estandarización de respuestas API
 * Proporciona un formato uniforme para todas las respuestas del backend
 */

/**
 * Respuesta exitosa estándar
 */
function successResponse(res, data = null, message = 'Operación exitosa', statusCode = 200) {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  // Incluir correlation ID si existe
  if (res.req && res.req.correlationId) {
    response.correlationId = res.req.correlationId;
  }

  // Fase 9: request_id / trace_id estandarizados (trazabilidad distribuida)
  if (res.req && res.req.requestId) {
    response.request_id = res.req.requestId;
  }
  if (res.req && res.req.traceId) {
    response.trace_id = res.req.traceId;
  }

  // Incluir paginación si está disponible
  if (data && data.pagination) {
    response.pagination = data.pagination;
    response.data = data.items || data.data;
  }

  return res.status(statusCode).json(response);
}

/**
 * Respuesta con paginación
 */
function paginatedResponse(res, items, total, page, limit, message = 'Operación exitosa') {
  return successResponse(res, {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  }, message);
}

/**
 * Respuesta de error estándar
 */
function errorResponse(res, message = 'Error interno del servidor', statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
  const response = {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  };

  if (res.req && res.req.correlationId) {
    response.error.correlationId = res.req.correlationId;
  }

  // Fase 9: request_id / trace_id estandarizados
  if (res.req && res.req.requestId) {
    response.error.request_id = res.req.requestId;
  }
  if (res.req && res.req.traceId) {
    response.error.trace_id = res.req.traceId;
  }

  if (details && process.env.NODE_ENV !== 'production') {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Errores comunes predefinidos
 */
const ErrorCodes = {
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400, message: 'Error de validación' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401, message: 'No autorizado' },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: 'Acceso denegado' },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404, message: 'Recurso no encontrado' },
  CONFLICT: { code: 'CONFLICT', status: 409, message: 'Conflicto' },
  RATE_LIMITED: { code: 'RATE_LIMITED', status: 429, message: 'Límite de solicitudes excedido' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500, message: 'Error interno del servidor' },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503, message: 'Servicio no disponible' },
  GATEWAY_TIMEOUT: { code: 'GATEWAY_TIMEOUT', status: 504, message: 'Tiempo de espera agotado' }
};

/**
 * Helper para crear errores con formato estándar
 */
function createAppError(errorDef, details = null, overrideMessage = null) {
  const err = new Error(overrideMessage || errorDef.message);
  err.statusCode = errorDef.status;
  err.code = errorDef.code;
  err.details = details;
  return err;
}

module.exports = {
  successResponse,
  paginatedResponse,
  errorResponse,
  ErrorCodes,
  createAppError
};

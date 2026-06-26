/**
 * Clase base para errores personalizados del sistema
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error 400 - Bad Request
 */
class BadRequestError extends AppError {
  constructor(message = 'Solicitud inválida', details = null) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

/**
 * Error 401 - Unauthorized
 */
class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error 403 - Forbidden
 */
class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Error 404 - Not Found
 */
class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Error 409 - Conflict
 */
class ConflictError extends AppError {
  constructor(message = 'Conflicto', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Error 422 - Unprocessable Entity
 */
class ValidationError extends AppError {
  constructor(message = 'Error de validación', details = null) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

/**
 * Error 429 - Too Many Requests
 */
class TooManyRequestsError extends AppError {
  constructor(message = 'Demasiadas solicitudes') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

/**
 * Error 500 - Internal Server Error
 */
class InternalServerError extends AppError {
  constructor(message = 'Error interno del servidor') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError
};

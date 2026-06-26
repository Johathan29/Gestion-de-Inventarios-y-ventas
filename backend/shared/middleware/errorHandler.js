const { ValidationError } = require('../errors/AppError');
const { logger } = require('../utils/logger');

/**
 * Middleware centralizado de manejo de errores
 */
const errorHandler = (err, req, res, next) => {
  const error = {
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_ERROR',
      message: err.isOperational ? err.message : 'Error interno del servidor',
      ...(err.details && { details: err.details }),
      timestamp: err.timestamp || new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  };

  // Log del error
  const logContext = {
    errorCode: error.error.code,
    statusCode: err.statusCode || 500,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  };

  if (err.statusCode >= 500) {
    logger.error(err.message, { ...logContext, stack: err.stack });
  } else {
    logger.warn(err.message, logContext);
  }

  res.status(err.statusCode || 500).json(error);
};

/**
 * Middleware para manejar rutas no encontradas
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Ruta ${req.originalUrl} no encontrada`,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  });
};

/**
 * Middleware para validar schemas con Zod
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      req.validatedBody = parsed.body;
      req.validatedQuery = parsed.query;
      req.validatedParams = parsed.params;
      
      next();
    } catch (error) {
      if (error.errors) {
        const details = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        }));
        return next(new ValidationError('Error de validación', details));
      }
      next(error);
    }
  };
};

module.exports = { errorHandler, notFoundHandler, validate };

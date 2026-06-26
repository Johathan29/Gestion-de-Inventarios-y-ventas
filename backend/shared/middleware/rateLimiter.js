const { rateLimit } = require('express-rate-limit');
const { config } = require('../utils/config');

/**
 * Rate limiting global
 */
const globalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Has superado el límite de solicitudes. Intenta de nuevo más tarde.'
    }
  }
});

/**
 * Rate limiting más estricto para rutas de autenticación
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.'
    }
  }
});

/**
 * Rate limiting para registro de usuarios
 */
const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.'
    }
  }
});

module.exports = { globalRateLimit, authRateLimit, registerRateLimit };

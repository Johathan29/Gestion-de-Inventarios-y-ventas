const { rateLimit } = require('express-rate-limit');
const { config } = require('../utils/config');

/**
 * Crea un store de Redis si está habilitado, con fallback a memoria.
 * @returns {Promise<import('express-rate-limit').Store|null>}
 */
const createStore = async () => {
  if (!config.rateLimit.redis.enabled) return null;

  try {
    const { RedisStore } = require('rate-limit-redis');
    const { createClient } = require('redis');

    const redisClient = createClient({
      url: config.rateLimit.redis.url,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
      }
    });

    await redisClient.connect();

    redisClient.on('error', (err) => {
      console.warn('[RateLimiter] Redis error, usando fallback en memoria:', err.message);
    });

    return new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: 'ratelimit:'
    });
  } catch (err) {
    console.warn('[RateLimiter] No se pudo conectar a Redis, usando fallback en memoria:', err.message);
    return null;
  }
};

// Store compartido (se inicializa en setup)
let store = null;

/**
 * Inicializa el store de rate limiting (Redis si está disponible)
 */
const setupRateLimiter = async () => {
  store = await createStore();
};

/**
 * Rate limiting global
 */
const createGlobalRateLimit = () => rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  store: store || undefined,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Has superado el límite de solicitudes. Intenta de nuevo más tarde.'
    }
  }
});

const globalRateLimit = createGlobalRateLimit();

/**
 * Rate limiting más estricto para rutas de autenticación
 */
const createAuthRateLimit = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: store || undefined,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.'
    }
  }
});

const authRateLimit = createAuthRateLimit();

/**
 * Rate limiting para registro de usuarios
 */
const createRegisterRateLimit = () => rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: store || undefined,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.'
    }
  }
});

const registerRateLimit = createRegisterRateLimit();

module.exports = { globalRateLimit, authRateLimit, registerRateLimit, setupRateLimiter };

// ============================================================
// Middleware — Auth, Error Handler, Rate Limiter, Security
// ============================================================

import jwt from 'jsonwebtoken';
import { AppError, UnauthorizedError, ForbiddenError, ValidationError } from '../errors/index.js';
import { zodValidate } from '../validation/index.js';

// ============================================================
// Authentication Middleware
// ============================================================

/**
 * Authenticate JWT token from Authorization header
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');

    // El JWT puede usar 'sub' (auth-service legacy) o 'id' (nuevo formato)
    req.user = {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      companyId: decoded.companyId || decoded.company_id || null,
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(err);
    }
  }
}

/**
 * Authorize by role
 * @param  {...string} roles - Allowed roles
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role '${req.user.role}' not authorized`));
    }
    next();
  };
}

/**
 * Authorize by permission
 * @param {string} permission - Permission string (e.g., 'sale:create')
 */
export function hasPermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const permissions = flattenPermissions(req.user.permissions);
    if (!permissions.includes(permission) && !permissions.includes('*')) {
      return next(new ForbiddenError(`Missing permission: ${permission}`));
    }
    next();
  };
}

/**
 * Flatten role permissions object to permission string array
 */
function flattenPermissions(perms) {
  if (Array.isArray(perms)) return perms;
  if (typeof perms === 'object' && perms !== null) {
    const result = [];
    const moduleMap = PERMISSION_MODULE_MAP;
    for (const [module, actions] of Object.entries(perms)) {
      const prefix = moduleMap[module] || module;
      if (Array.isArray(actions)) {
        actions.forEach(action => result.push(`${prefix}:${action}`));
      }
    }
    return result;
  }
  return [];
}

const PERMISSION_MODULE_MAP = {
  sales: 'sale',
  purchases: 'purchase',
  products: 'product',
  inventory: 'inventory',
  users: 'user',
  clients: 'client',
  suppliers: 'supplier',
  invoices: 'invoice',
  reports: 'report',
  categories: 'category',
  ecommerce: 'ecommerce',
  notifications: 'notification',
  audit: 'audit',
  config: 'config',
  accounting: 'accounting',
};

// ============================================================
// Error Handler Middleware
// ============================================================

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, _next) {
  // Compatibilidad con errores legacy: muchos servicios lanzan `new Error('NOT_FOUND')`
  // sin AppError. Normalizarlos aquí evita 500s en lecturas/escrituras cross-tenant.
  if (!err.statusCode && err.message === 'NOT_FOUND') {
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    err.isOperational = true;
    err.message = 'Resource not found';
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  // Log server errors
  if (!err.isOperational || statusCode >= 500) {
    console.error(`[ERROR] ${err.message}`, err.stack);
  }

  // Fase 9: trazabilidad estándar (request_id / trace_id)
  const requestId = req?.requestId || req?.headers?.['x-request-id'] || req?.headers?.['x-correlation-id'] || null;
  const traceId = req?.traceId || req?.headers?.['x-trace-id'] || null;

  const response = {
    success: false,
    message,
    code: err.code || 'INTERNAL_ERROR',
    ...(requestId && { request_id: requestId }),
    ...(traceId && { trace_id: traceId }),
    ...(Object.keys(err.details || {}).length > 0 && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
}

// ============================================================
// Rate Limiter Middleware
// ============================================================

/**
 * Simple in-memory rate limiter with Redis fallback
 */
export function rateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message } = {}) {
  const clients = new Map();

  // Cleanup old entries periodically
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of clients.entries()) {
      if (now - data.resetTime > windowMs) {
        clients.delete(key);
      }
    }
  }, windowMs);

  // Allow cleanup to not block process exit
  cleanup.unref?.();

  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    let clientData = clients.get(key);
    if (!clientData || now > clientData.resetTime) {
      clientData = { count: 0, resetTime: now + windowMs };
      clients.set(key, clientData);
    }

    clientData.count++;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - clientData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));

    if (clientData.count > max) {
      const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        message: message || `Too many requests. Try again in ${retryAfter} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    next();
  };
}

// ============================================================
// Validation Middleware (Zod)
// ============================================================

/**
 * Validate request body against a Zod schema
 * @param {import('zod').ZodSchema} schema
 * @param {string} source - 'body' | 'query' | 'params'
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const result = zodValidate(schema, req[source]);
      req[source] = result; // Replace with validated/transformed data
      // Also set validatedBody/validatedQuery/validatedParams for compatibility
      const key = 'validated' + source.charAt(0).toUpperCase() + source.slice(1);
      req[key] = result;
      next();
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          message: err.message,
          code: 'VALIDATION_ERROR',
          details: err.details,
        });
      }
      next(err);
    }
  };
}

// ============================================================
// Idempotency Middleware (Idempotency-Key)
// ============================================================

import { createHash } from 'crypto';

/**
 * Idempotency middleware — replay seguro de peticiones POST/PUT.
 *
 * Lee el header `Idempotency-Key`. Si la clave ya fue usada con el MISMO
 * body, replays la respuesta cacheada (misma clave + mismo body = una sola
 * operación). Si la clave se reusa con OTRO body → 422. Si la primera
 * petición sigue en curso → 409.
 *
 * Semántica de fallos:
 *  - 2xx/4xx → se cachea la respuesta y se replays.
 *  - 5xx → se libera la clave (delete) para permitir reintento limpio.
 *
 * Fallo de infraestructura DB → fail-open (next()) para no romper requests.
 *
 * @param {object} opts
 * @param {() => import('@supabase/supabase-js').SupabaseClient} opts.getClient - devuelve el client supabase request-scoped (tenant-aware)
 * @param {(req) => string} [opts.getCompanyId] - resuelve company_id (default: req.user.companyId)
 * @param {number} [opts.ttlHours=24] - TTL de la clave idempotente
 */
export function idempotent({ getClient, getCompanyId, ttlHours = 24 } = {}) {
  return async (req, res, next) => {
    try {
      // Solo efectos (POST/PUT) y solo si el cliente envía Idempotency-Key
      if (!['POST', 'PUT'].includes(req.method)) return next();
      const key = req.headers['idempotency-key'];
      if (!key || typeof key !== 'string' || key.length > 128) return next();
      if (!getClient) return next();

      const client = getClient();
      if (!client) return next();

      const companyId = getCompanyId ? getCompanyId(req) : req.user?.companyId;
      if (!companyId) return next();

      const body = req.body === undefined ? {} : req.body;
      const requestHash = createHash('sha256')
        .update(`${req.method}:${req.originalUrl || req.path}:${JSON.stringify(body)}`)
        .digest('hex');

      const { data, error } = await client.rpc('fn_idempotency_claim', {
        p_key: key,
        p_company_id: companyId,
        p_user_id: req.user?.id || null,
        p_method: req.method,
        p_path: req.originalUrl || req.path,
        p_request_hash: requestHash,
        p_ttl_hours: ttlHours,
      });

      if (error) return next(); // fail-open: sin DB no bloqueamos la operación
      if (!data?.id) return next();

      if (!data.is_new) {
        // Clave ya usada
        if (data.request_hash !== requestHash) {
          return res.status(422).json({
            success: false,
            error: {
              code: 'IDEMPOTENCY_KEY_REUSE',
              message: 'Idempotency-Key already used with a different request',
            },
          });
        }

        if (!data.response_status) {
          // Primera petición en curso → conflicto temporal
          return res.status(409).json({
            success: false,
            error: {
              code: 'IDEMPOTENCY_IN_PROGRESS',
              message: 'A request with this Idempotency-Key is already being processed',
            },
          });
        }

        if (data.response_status >= 500) {
          // Fallo 5xx previo: liberar la clave y re-ejecutar limpio
          await client.rpc('fn_idempotency_release', { p_id: data.id }).catch(() => {});
          req._idempotency = { id: data.id, client };
        } else {
          // Replay de la respuesta cacheada (2xx/4xx determinista)
          const body = data.response_body;
          return res.status(data.response_status).json(body ?? { success: true });
        }
      } else {
        req._idempotency = { id: data.id, client };
      }

      // Capturar el body JSON de la respuesta y completar la clave ANTES de
      // enviar: cuando el cliente recibe la respuesta, la clave ya está
      // cacheada → un duplicado inmediato replays (nunca ve 'in progress').
      // 2xx/4xx → complete; 5xx → release (reintento limpio con la misma clave).
      const originalJson = res.json.bind(res);
      res.json = async (payload) => {
        res.locals._idempotencyBody = payload;
        const claim = req._idempotency;
        if (claim) {
          try {
            if (res.statusCode >= 500) {
              await claim.client.rpc('fn_idempotency_release', { p_id: claim.id });
            } else {
              await claim.client.rpc('fn_idempotency_complete', {
                p_id: claim.id,
                p_status: res.statusCode,
                p_body: payload ?? null,
              });
            }
          } catch (e) {
            // best effort: nunca debe romper la respuesta
          }
        }
        return originalJson(payload);
      };

      next();
    } catch (err) {
      next(); // fail-open
    }
  };
}

export default { authenticate, authorize, hasPermission, errorHandler, rateLimiter, validate, idempotent };

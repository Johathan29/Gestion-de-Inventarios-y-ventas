const jwt = require('jsonwebtoken');
const { config } = require('../utils/config');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');

/**
 * Mapa de nombres de módulo en BD → prefijo usado en constantes PERMISSIONS
 */
const PERMISSION_MODULE_MAP = {
  sales: 'sale',
  products: 'product',
  users: 'user',
  categories: 'category',
  inventory: 'inventory',
  purchases: 'purchase',
  invoices: 'invoice',
  reports: 'report',
  clients: 'client',
  config: 'config',
  ecommerce: 'ecommerce',
  audit: 'audit',
  admin: 'admin',
  notifications: 'notification',
  email: 'email',
  whatsapp: 'whatsapp',
  cart: 'cart',
  checkout: 'checkout',
  catalog: 'catalog'
};

/**
 * Convierte el objeto de permisos del JWT {sales: ["create","read"]}
 * en un array plano ["sale:create", "sale:read"]
 */
const flattenPermissions = (perms) => {
  if (Array.isArray(perms)) return perms;
  if (typeof perms !== 'object' || !perms) return [];
  const result = [];
  for (const [module, actions] of Object.entries(perms)) {
    const prefix = PERMISSION_MODULE_MAP[module] || module;
    if (Array.isArray(actions)) {
      for (const action of actions) {
        result.push(`${prefix}:${action}`);
      }
    }
  }
  return result;
};

/**
 * Verifica el token JWT y extrae la información del usuario
 */
const authenticate = (required = true) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        if (!required) return next();
        throw new UnauthorizedError('Token de autenticación requerido');
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new UnauthorizedError('Formato de token inválido');
      }

      const token = parts[1];
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer
      });

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: flattenPermissions(decoded.permissions)
      };

      next();
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        return next(error);
      }
      
      if (error.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token expirado'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new UnauthorizedError('Token inválido'));
      }
      
      next(new UnauthorizedError('Error de autenticación'));
    }
  };
};

/**
 * Verifica que el usuario tenga uno de los roles requeridos
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Usuario no autenticado'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('No tienes permisos para acceder a este recurso'));
    }

    next();
  };
};

/**
 * Verifica que el usuario tenga un permiso específico
 */
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Usuario no autenticado'));
    }

    if (!req.user.permissions.includes(permission)) {
      return next(new ForbiddenError(`Permiso requerido: ${permission}`));
    }

    next();
  };
};

module.exports = { authenticate, authorize, hasPermission };

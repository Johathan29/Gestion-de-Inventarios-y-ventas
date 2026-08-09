/**
 * ============================================================================
 * RBAC PERMISSIONS MIDDLEWARE
 * ============================================================================
 * Middleware Express para verificar permisos granulares.
 * 
 * Uso:
 *   const { requirePermission, requireAnyPermission } = require('../middleware/permissions');
 * 
 *   // Un solo permiso:
 *   router.post('/sales', requirePermission('sales.create'), controller.create);
 * 
 *   // Cualquiera de varios permisos:
 *   router.get('/reports', requireAnyPermission(['reports.sales', 'reports.finance']), controller.get);
 * 
 *   // En un controller, verificar manualmente:
 *   const { checkPermission } = require('../middleware/permissions');
 *   if (await checkPermission(req.user.id, 'products.delete')) { ... }
 * ============================================================================
 */

const { getSupabaseClient } = require('../database/supabase');

/**
 * Cache en memoria para permisos (TTL: 5 minutos)
 * Evita queries a DB en cada request
 */
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId, permission) {
  return `${userId}:${permission}`;
}

function getCachedPermission(userId, permission) {
  const key = getCacheKey(userId, permission);
  const cached = permissionCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  permissionCache.delete(key);
  return undefined;
}

function setCachedPermission(userId, permission, value) {
  const key = getCacheKey(userId, permission);
  permissionCache.set(key, { value, timestamp: Date.now() });
  // Cleanup old entries periodically
  if (permissionCache.size > 10000) {
    const now = Date.now();
    for (const [k, v] of permissionCache) {
      if (now - v.timestamp > CACHE_TTL) permissionCache.delete(k);
    }
  }
}

function invalidateUserCache(userId) {
  const prefix = `${userId}:`;
  for (const key of permissionCache.keys()) {
    if (key.startsWith(prefix)) permissionCache.delete(key);
  }
}

/**
 * Verifica si un usuario tiene un permiso específico.
 * Usa la función SQL check_user_permission para lógica centralizada.
 *
 * @param {string} userId - UUID del usuario
 * @param {string} permissionCode - Código del permiso (e.g. 'sales.create')
 * @returns {boolean}
 */
async function checkPermission(userId, permissionCode) {
  // Check cache first
  const cached = getCachedPermission(userId, permissionCode);
  if (cached !== undefined) return cached;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .rpc('check_user_permission', {
        p_user_id: userId,
        p_permission_code: permissionCode
      });

    if (error) {
      console.error('[Permissions] Error checking permission:', error.message);
      return false;
    }

    const result = data === true;
    setCachedPermission(userId, permissionCode, result);
    return result;
  } catch (err) {
    console.error('[Permissions] Exception:', err.message);
    return false;
  }
}

/**
 * Verifica si un usuario tiene AL MENOS UNO de los permisos listados.
 *
 * @param {string} userId
 * @param {string[]} permissionCodes
 * @returns {boolean}
 */
async function checkAnyPermission(userId, permissionCodes) {
  for (const code of permissionCodes) {
    if (await checkPermission(userId, code)) return true;
  }
  return false;
}

/**
 * Verifica si un usuario tiene TODOS los permisos listados.
 *
 * @param {string} userId
 * @param {string[]} permissionCodes
 * @returns {boolean}
 */
async function checkAllPermissions(userId, permissionCodes) {
  for (const code of permissionCodes) {
    if (!(await checkPermission(userId, code))) return false;
  }
  return true;
}

/**
 * Express middleware: requiere un permiso específico.
 * Responde 403 si el usuario no tiene el permiso.
 */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autenticación requerida'
        }
      });
    }

    const hasPermission = await checkPermission(req.user.id, permissionCode);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `No tiene permiso: ${permissionCode}`,
          required_permission: permissionCode
        }
      });
    }

    // Attach permissions to request for downstream use
    if (!req.permissions) req.permissions = {};
    req.permissions[permissionCode] = true;

    next();
  };
}

/**
 * Express middleware: requiere AL MENOS UNO de los permisos.
 */
function requireAnyPermission(permissionCodes) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' }
      });
    }

    const hasAny = await checkAnyPermission(req.user.id, permissionCodes);
    if (!hasAny) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Se requiere al menos uno de: ${permissionCodes.join(', ')}`,
          required_permissions: permissionCodes
        }
      });
    }

    next();
  };
}

/**
 * Express middleware: requiere TODOS los permisos.
 */
function requireAllPermissions(permissionCodes) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' }
      });
    }

    const hasAll = await checkAllPermissions(req.user.id, permissionCodes);
    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Se requieren todos los permisos: ${permissionCodes.join(', ')}`,
          required_permissions: permissionCodes
        }
      });
    }

    next();
  };
}

/**
 * Express middleware: carga permisos del usuario en req.userPermissions
 * No bloquea — solo precarga para uso downstream.
 */
function loadPermissions() {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) return next();

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .rpc('get_user_permissions', { p_user_id: req.user.id });

      if (!error && data) {
        req.userPermissions = data.map(p => p.permission_code);
        req.userPermissionSet = new Set(data.map(p => p.permission_code));
      } else {
        req.userPermissions = [];
        req.userPermissionSet = new Set();
      }
    } catch (err) {
      console.error('[Permissions] Error loading permissions:', err.message);
      req.userPermissions = [];
      req.userPermissionSet = new Set();
    }

    next();
  };
}

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  loadPermissions,
  invalidateUserCache
};

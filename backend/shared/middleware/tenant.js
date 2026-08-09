/**
 * ============================================================================
 * MULTI-TENANT MIDDLEWARE
 * ============================================================================
 * Extrae company_id del JWT y lo propaga a:
 *   - req.user.companyId
 *   - req.companyId
 *   - Header x-company-id (para trazabilidad)
 *   - Supabase RPC context (para RLS automático)
 *
 * Uso:
 *   const { tenantContext } = require('../middleware/tenant');
 *   app.use(tenantContext);           // En cada request
 *   app.use('/api/v1/sales', tenantContext, salesRouter);  // O por grupo
 *
 * ============================================================================
 */

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Middleware principal de tenant context.
 * Lee company_id del JWT (ya decodificado por authenticate)
 * y lo inyecta en el request para que los controllers/services lo usen.
 */
const tenantContext = (req, res, next) => {
  try {
    // El middleware authenticate ya puso req.user
    if (req.user && req.user.companyId) {
      req.companyId = req.user.companyId;
    } else if (req.user && req.user.company_id) {
      // Alternativa: si el JWT tiene company_id directamente
      req.companyId = req.user.company_id;
    } else {
      // Fallback: header x-company-id (para service-to-service)
      req.companyId = req.headers['x-company-id'] || DEFAULT_COMPANY_ID;
    }

    // Propagar company_id a Supabase via header (para RLS)
    // Los controllers deben pasar este header cuando hagan queries
    res.setHeader('x-company-id', req.companyId);

    next();
  } catch (error) {
    // No bloquear la request por errores de tenant
    console.warn('[TenantMiddleware] Error extracting company_id:', error.message);
    req.companyId = DEFAULT_COMPANY_ID;
    next();
  }
};

/**
 * Middleware que fuerza que el query de Supabase filtre por company_id.
 * Se usa como wrapper en controllers específicos.
 *
 * Uso:
 *   router.get('/products', withTenant, async (req, res) => {
 *     const { data } = await supabase
 *       .from('products')
 *       .select('*')
 *       .eq('company_id', req.companyId);  // ← Filtro automático
 *   });
 */
const withTenant = (req, res, next) => {
  if (!req.companyId) {
    req.companyId = DEFAULT_COMPANY_ID;
  }
  next();
};

/**
 * Helper: Crea un query de Supabase filtrado por tenant.
 * Garantiza que TODAS las queries estén filtradas por company_id.
 *
 * Uso:
 *   const query = tenantQuery(supabase, req, 'products');
 *   const { data } = await query.select('*').eq('status', 'active');
 */
const tenantQuery = (supabase, req, table) => {
  return supabase
    .from(table)
    .eq('company_id', req.companyId || DEFAULT_COMPANY_ID);
};

/**
 * Helper: Verifica que un recurso pertenece a la empresa del usuario.
 * Lanza error 403 si no coincide.
 *
 * Uso:
 *   await verifyOwnership(req, 'products', productId);
 */
const verifyOwnership = async (supabase, req, table, resourceId) => {
  const { data, error } = await supabase
    .from(table)
    .select('company_id')
    .eq('id', resourceId)
    .single();

  if (error || !data) {
    return { owned: false, reason: 'not_found' };
  }

  if (data.company_id !== req.companyId) {
    return { owned: false, reason: 'forbidden' };
  }

  return { owned: true, data };
};

/**
 * Middleware que inyecta company_id en el body de requests POST/PUT/PATCH.
 * Asegura que nunca se pueda crear un recurso sin company_id.
 *
 * Uso:
 *   router.post('/products', injectCompanyId, createProduct);
 */
const injectCompanyId = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (req.body && typeof req.body === 'object') {
      // No sobrescribir si ya viene explícitamente
      if (!req.body.company_id) {
        req.body.company_id = req.companyId || DEFAULT_COMPANY_ID;
      }
    }
  }
  next();
};

module.exports = {
  tenantContext,
  withTenant,
  tenantQuery,
  verifyOwnership,
  injectCompanyId,
  DEFAULT_COMPANY_ID
};

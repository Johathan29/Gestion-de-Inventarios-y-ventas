/**
 * ============================================================================
 * TENANT-AWARE SUPABASE CLIENT v2
 * ============================================================================
 * Proxy que inyecta `company_id` automáticamente en cada query.
 *
 * Uso:
 *   const { createTenantClient } = require('@inventory/shared');
 *
 *   // ANTES (sin multi-tenant):
 *   const { data } = await supabase.from('products').select('*');
 *
 *   // DESPUÉS (con multi-tenant):
 *   const tenantDb = createTenantClient(req);
 *   const { data } = await tenantDb.from('products').select('*');
 *   // Filtra automáticamente por company_id del JWT
 *
 * Para queries cross-tenant (admin/super-admin):
 *   const { getSupabaseClient } = require('@inventory/shared');
 *   const { data } = await getSupabaseClient().from('companies').select('*');
 * ============================================================================
 */

const { getSupabaseClient } = require('../database/supabase');
const { DEFAULT_COMPANY_ID } = require('./tenant');
const fs = require('fs');
const path = require('path');

/**
 * Tablas que NO tienen company_id — se acceden sin filtro de tenant.
 */
const EXEMPT_TABLES = new Set([
  'companies', 'roles', 'permissions', 'user_roles',
  'system_configurations', 'audit_logs'
]);

/**
 * Tablas que SÍ tienen company_id (registro generado por
 * scripts/test-database/schema-contract.mjs). Solo estas reciben
 * la inyección automática de company_id — las tablas sin la columna
 * NO deben filtrarse (causaría error 42703).
 */
let TENANT_TABLES = new Set();
try {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'tenant-tables.json'), 'utf-8');
  TENANT_TABLES = new Set((JSON.parse(raw).tables) || []);
} catch {
  console.warn('[shared] ⚠️ tenant-tables.json no encontrado — proxy SIN filtrado company_id (fail-safe, igual que antes)');
}

/**
 * Crea un Supabase client proxy que inyecta company_id automáticamente.
 *
 * @param {Object} req - Express request (req.companyId desde JWT)
 * @returns {Object} Supabase-like client filtrado por tenant
 */
function createTenantClient(req) {
  const supabase = getSupabaseClient();
  const companyId = (req && req.companyId) || DEFAULT_COMPANY_ID;

  return new Proxy(supabase, {
    get(target, prop, receiver) {
      // Symbols pass through
      if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver);

      // Non-table access passes through directly
      if (prop === 'auth' || prop === 'storage' || prop === 'rest') {
        return Reflect.get(target, prop, receiver);
      }

      // rpc() passes through (RLS handles filtering for RPCs)
      if (prop === 'rpc') {
        const rpcFn = target.rpc.bind(target);
        return rpcFn;
      }

      // Intercept .from(table) to wrap the query builder
      if (prop === 'from') {
        return function tenantFrom(table) {
          const builder = target.from(table);
          // Tablas sin company_id (globales o sin migrar) NO se filtran
          if (EXEMPT_TABLES.has(table) || !TENANT_TABLES.has(table)) return builder;
          return _wrapBuilder(builder, companyId);
        };
      }

      // Everything else on the client itself
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

/**
 * Wraps a Supabase query builder with company_id injection.
 *
 * Strategy:
 * - .select()  → chains .eq('company_id', companyId) after
 * - .insert()  → injects company_id into data
 * - .upsert()  → injects company_id into data
 * - .update()  → chains .eq('company_id', companyId) before
 * - .delete()  → chains .eq('company_id', companyId) before
 * - Everything else → passes through, wraps result if it's a builder
 */
function _wrapBuilder(builder, companyId) {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      // BUG FIX (2026-08-09): `prop` es el NOMBRE de la propiedad (string),
      // no el valor. El check correcto es `typeof target[prop]`.
      // El bug previo (`typeof prop !== 'function'`, siempre true) hacía que
      // el Proxy NUNCA envolviera el builder → company_id NUNCA se inyectaba.
      if (typeof prop === 'symbol' || typeof target[prop] !== 'function') {
        return Reflect.get(target, prop, receiver);
      }

      return function (...args) {
        // ── SELECT: inject company_id filter ──
        if (prop === 'select') {
          const result = target.select(...args);
          const filtered = result.eq('company_id', companyId);
          return _wrapBuilder(filtered, companyId);
        }

        // ── INSERT / UPSERT: inject company_id into data ──
        if (prop === 'insert' || prop === 'upsert') {
          const [data, options] = args;
          if (data && typeof data === 'object') {
            const injectCompanyId = (item) => ({ company_id: companyId, ...item });
            args[0] = Array.isArray(data) ? data.map(injectCompanyId) : injectCompanyId(data);
          }
          const result = target[prop](...args);
          // Wrap result so .select() after insert works
          return _wrapBuilder(result, companyId);
        }

        // ── UPDATE: ensure company_id filter is applied after update() ──
        // (eq() solo existe en PostgrestFilterBuilder, NO en PostgrestQueryBuilder)
        if (prop === 'update') {
          const result = target.update(...args).eq('company_id', companyId);
          return _wrapBuilder(result, companyId);
        }

        // ── DELETE: ensure company_id filter is applied after delete() ──
        if (prop === 'delete') {
          const result = target.delete().eq('company_id', companyId);
          return _wrapBuilder(result, companyId);
        }

        // ── Everything else: pass through ──
        const result = target[prop](...args);

        // If result is a thenable query builder, wrap it
        if (result && typeof result === 'object' &&
            typeof result.then === 'function' &&
            typeof result.eq === 'function') {
          return _wrapBuilder(result, companyId);
        }

        return result;
      };
    }
  });
}

module.exports = { createTenantClient, EXEMPT_TABLES, DEFAULT_COMPANY_ID };

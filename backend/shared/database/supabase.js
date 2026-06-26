const { createClient } = require('@supabase/supabase-js');
const { getConfig } = require('../utils/config');

let supabaseClient = null;

/**
 * Inicializa y retorna una instancia única de Supabase client
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
const getSupabaseClient = () => {
  if (supabaseClient) return supabaseClient;

  const config = getConfig();
  
  supabaseClient = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    }
  );

  return supabaseClient;
};

/**
 * Ejecuta una consulta SELECT con paginación y filtros
 */
const queryBuilder = (table, options = {}) => {
  const client = getSupabaseClient();
  let query = client.from(table).select(options.select || '*', { count: 'exact' });

  if (options.filters) {
    options.filters.forEach(filter => {
      if (filter.method === 'eq') query = query.eq(filter.column, filter.value);
      else if (filter.method === 'neq') query = query.neq(filter.column, filter.value);
      else if (filter.method === 'gt') query = query.gt(filter.column, filter.value);
      else if (filter.method === 'gte') query = query.gte(filter.column, filter.value);
      else if (filter.method === 'lt') query = query.lt(filter.column, filter.value);
      else if (filter.method === 'lte') query = query.lte(filter.column, filter.value);
      else if (filter.method === 'like') query = query.like(filter.column, filter.value);
      else if (filter.method === 'ilike') query = query.ilike(filter.column, filter.value);
      else if (filter.method === 'is') query = query.is(filter.column, filter.value);
      else if (filter.method === 'in') query = query.in(filter.column, filter.value);
      else if (filter.method === 'contains') query = query.contains(filter.column, filter.value);
      else if (filter.method === 'textSearch') query = query.textSearch(filter.column, filter.value);
    });
  }

  if (options.order) {
    query = query.order(options.order.column, { 
      ascending: options.order.ascending !== false 
    });
  }

  if (options.range) {
    query = query.range(options.range.from || 0, options.range.to || 9);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query;
};

/**
 * Ejecuta una consulta SELECT directa
 */
const select = async (table, options = {}) => {
  const query = queryBuilder(table, options);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
};

/**
 * Ejecuta una inserción en la base de datos
 */
const insert = async (table, data, options = {}) => {
  const client = getSupabaseClient();
  const query = client.from(table).insert(data).select();

  if (options.returnSingle) {
    const { data: result, error } = await query.single();
    if (error) throw error;
    return result;
  }

  const { data: result, error } = await query;
  if (error) throw error;
  return result;
};

/**
 * Ejecuta una actualización en la base de datos
 */
const update = async (table, data, matchColumn, matchValue) => {
  const client = getSupabaseClient();
  const { data: result, error } = await client
    .from(table)
    .update(data)
    .eq(matchColumn, matchValue)
    .select();

  if (error) throw error;
  return result;
};

/**
 * Ejecuta una eliminación en la base de datos
 */
const remove = async (table, matchColumn, matchValue) => {
  const client = getSupabaseClient();
  const { data: result, error } = await client
    .from(table)
    .delete()
    .eq(matchColumn, matchValue)
    .select();

  if (error) throw error;
  return result;
};

/**
 * Ejecuta una función RPC en Supabase
 */
const rpc = async (functionName, params = {}) => {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc(functionName, params);
  if (error) throw error;
  return data;
};

module.exports = {
  getSupabaseClient,
  queryBuilder,
  select,
  insert,
  update,
  remove,
  rpc
};

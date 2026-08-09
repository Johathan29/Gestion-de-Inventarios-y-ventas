const { createTenantClient } = require('@inventory/shared');

/**
 * Obtener logs de auditoría
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { page = 1, limit = 50, user_id, entity, action, start_date, end_date } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('audit_logs')
      .select('*, users!audit_logs_user_id_fkey(email, name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (user_id) query = query.eq('user_id', user_id);
    if (entity) query = query.eq('entity', entity);
    if (action) query = query.eq('action', action);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    query = query.range(from, to);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Registrar evento de auditoría (uso interno)
 */
const logAuditEvent = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent } = req.body;

    if (!user_id || !action || !entity) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'user_id, action y entity requeridos' }
      });
    }

    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id,
        action,
        entity,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener actividad reciente
 */
const getRecentActivity = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { limit = 20 } = req.query;

    const { data: activities, error } = await supabase
      .from('audit_logs')
      .select('*, users!audit_logs_user_id_fkey(email, name)')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;
    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estadísticas de auditoría
 */
const getAuditStats = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [{ count: totalLogs }, { count: todayLogs }, { count: monthLogs }, { data: actionCounts }] = await Promise.all([
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      supabase.from('audit_logs').select('action').gte('created_at', startOfMonth)
    ]);

    // Contar acciones
    const actionMap = {};
    actionCounts?.data?.forEach(log => {
      actionMap[log.action] = (actionMap[log.action] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalLogs: totalLogs || 0,
        todayLogs: todayLogs || 0,
        monthLogs: monthLogs || 0,
        topActions: Object.entries(actionMap)
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs, logAuditEvent, getRecentActivity, getAuditStats };

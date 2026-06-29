const { getSupabaseClient } = require('@inventory/shared');

const supabase = getSupabaseClient();

/**
 * Obtener notificaciones del usuario
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, unread } = req.query;
    const userId = req.user.id;

    let query = supabase
      .from('user_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (unread === 'true') query = query.eq('read', false);

    const { data: notifications, count, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: notifications,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marcar notificación como leída
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    next(error);
  }
};

/**
 * Marcar todas como leídas
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar notificación
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Notificación eliminada' });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear notificación (uso interno entre servicios)
 */
const createNotification = async (req, res, next) => {
  try {
    const { user_id, type, title, message, data, channels } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Usuario, título y mensaje requeridos' }
      });
    }

    const { data: notification, error } = await supabase
      .from('user_notifications')
      .insert({ user_id, type, title, message, data })
      .select()
      .single();

    if (error) throw error;

    // Si hay canales adicionales
    if (channels) {
      await supabase.from('notification_channels').insert(
        channels.map(channel => ({
          notification_id: notification.id,
          channel,
          status: 'pending'
        }))
      );
    }

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUserNotifications, markAsRead, markAllAsRead, deleteNotification, createNotification };

import { ref, onMounted, onUnmounted } from 'vue';
import { notificationsAPI } from '../api';

export function useNotifications() {
  const notifications = ref([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  let pollInterval = null;

  const hasToken = () => !!sessionStorage.getItem('accessToken');

  const fetchNotifications = async () => {
    // Solo fetch si hay token (usuario autenticado)
    if (!hasToken()) return;
    try {
      loading.value = true;
      const res = await notificationsAPI.getAll({ limit: 10, unread: true });
      notifications.value = res.data;
      unreadCount.value = res.pagination?.total || 0;
    } catch (err) {
      // Silent fail – evita ruido en consola cuando expira el token
    } finally {
      loading.value = false;
    }
  };

  const markAsRead = async (id) => {
    if (!hasToken()) return;
    try {
      await notificationsAPI.markAsRead(id);
      notifications.value = notifications.value.filter(n => n.id !== id);
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!hasToken()) return;
    try {
      await notificationsAPI.markAllAsRead();
      notifications.value = [];
      unreadCount.value = 0;
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const startPolling = () => {
    fetchNotifications();
    // El intervalo se inicia siempre; fetchNotifications internamente
    // verifica si hay token, así que cuando el usuario inicie sesión
    // en menos de 30s empezará a recibir notificaciones.
    pollInterval = setInterval(fetchNotifications, 30000);
  };

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  onMounted(() => { startPolling(); });
  onUnmounted(() => { stopPolling(); });

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling
  };
}

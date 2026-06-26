<template>
  <div class="space-y-6">
    <!-- Header with stats -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Notificaciones del Sistema</h1>
        <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">Actividades del sistema: inicios de sesión, ventas, inventario y más</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="filter = filter === 'unread' ? '' : 'unread'"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200"
          :class="filter === 'unread'
            ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/20 dark:border-primary-600 dark:text-primary-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
        >
          <span class="material-symbols-outlined text-sm">mark_email_unread</span>
          No leídas
          <span v-if="unreadCount > 0" class="ml-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>
        <button
          @click="handleMarkAllRead"
          v-if="unreadCount > 0"
          class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
        >
          <span class="material-symbols-outlined text-sm">done_all</span>
          Marcar todas leídas
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">notifications</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.unread }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">No leídas</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">login</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.logins }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Inicios sesión</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">point_of_sale</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.sales }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Ventas hoy</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">inventory_2</span>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.lowStock }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Stock bajo</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications Feed -->
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="p-4 sm:p-6">
        <NotificationsFeed
          ref="feedRef"
          :limit="30"
          :allow-delete="true"
          :show-unread-dot="true"
          :filter="filter"
          @update:unreadCount="unreadCount = $event"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { notificationsAPI, auditAPI } from '../../api';
import NotificationsFeed from '../../components/notifications/NotificationsFeed.vue';

const feedRef = ref(null);
const unreadCount = ref(0);
const filter = ref('');

const stats = reactive({
  unread: 0,
  logins: 0,
  sales: 0,
  lowStock: 0,
});

const handleMarkAllRead = async () => {
  if (feedRef.value) {
    await feedRef.value.markAllAsRead();
    unreadCount.value = 0;
    stats.unread = 0;
  }
};

const fetchStats = async () => {
  try {
    const { data } = await notificationsAPI.getAll({ limit: 1, unread: true });
    stats.unread = data?.total || 0;
  } catch (e) { /* silent */ }

  try {
    const { data } = await auditAPI.getStats();
    if (data) {
      stats.logins = data.logins || 0;
      stats.sales = data.sales || 0;
      stats.lowStock = data.lowStock || 0;
    }
  } catch (e) { /* silent */ }
};

onMounted(() => {
  fetchStats();
});
</script>

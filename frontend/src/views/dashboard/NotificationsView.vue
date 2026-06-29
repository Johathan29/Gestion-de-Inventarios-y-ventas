<template>
  <div class="space-y-6">
    <!-- Header with stats -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="dt-headline" style="margin-bottom: 0;">Notificaciones del Sistema</h1>
        <p class="dt-body-sm" style="color: #4f4539;">Actividades del sistema: inicios de sesión, ventas, inventario y más</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="filter = filter === 'unread' ? '' : 'unread'"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200"
          :class="filter === 'unread'
            ? 'bg-[rgba(98,66,0,0.08)] border-[#624200] text-[#624200]'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'"
        >
          <span class="material-symbols-outlined text-sm">mark_email_unread</span>
          No leídas
          <span v-if="unreadCount > 0" class="ml-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>
        <button
          @click="handleMarkAllRead"
          v-if="unreadCount > 0"
          class="dt-btn-primary"
        >
          <span class="material-symbols-outlined text-sm">done_all</span>
          Marcar todas leídas
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="dt-card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg" style="background: rgba(239,68,68,0.1); display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="color: #ef4444; font-size: 1.25rem;">notifications</span>
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: #0b1c30;">{{ stats.unread }}</p>
            <p class="dt-caption">No leídas</p>
          </div>
        </div>
      </div>
      <div class="dt-card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg" style="background: rgba(59,130,246,0.1); display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="color: #3b82f6; font-size: 1.25rem;">login</span>
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: #0b1c30;">{{ stats.logins }}</p>
            <p class="dt-caption">Inicios sesión</p>
          </div>
        </div>
      </div>
      <div class="dt-card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg" style="background: rgba(34,197,94,0.1); display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="color: #16a34a; font-size: 1.25rem;">point_of_sale</span>
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: #0b1c30;">{{ stats.sales }}</p>
            <p class="dt-label-caps">Ventas hoy</p>
          </div>
        </div>
      </div>
      <div class="dt-card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg" style="background: rgba(245,158,11,0.1); display: flex; align-items: center; justify-content: center;">
            <span class="material-symbols-outlined" style="color: #d97706; font-size: 1.25rem;">inventory_2</span>
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: #0b1c30;">{{ stats.lowStock }}</p>
            <p class="dt-label-caps">Stock bajo</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications Feed -->
    <div class="dt-card overflow-hidden">
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

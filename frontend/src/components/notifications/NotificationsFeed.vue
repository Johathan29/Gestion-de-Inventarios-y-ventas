<template>
  <div>
    <!-- Loading -->
    <div v-if="loading && items.length === 0" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <span class="material-symbols-outlined text-5xl text-red-400 mb-3">error</span>
      <p class="text-red-500">{{ error }}</p>
      <button @click="fetchAll" class="mt-4 text-primary hover:underline text-sm">Reintentar</button>
    </div>

    <!-- Empty -->
    <div v-else-if="items.length === 0 && !loading" class="text-center py-16">
      <span class="material-symbols-outlined text-5xl text-gray-300 mb-3">notifications_off</span>
      <p class="text-gray-500 text-sm">No hay notificaciones</p>
    </div>

    <!-- List -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
      <div
        v-for="notif in items"
        :key="notif.id"
        class="group relative flex items-start gap-4 p-4 transition-colors"
        :class="[
          notif.read_at
            ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
            : 'bg-primary-50/30 dark:bg-primary-900/10 hover:bg-primary-50/60 dark:hover:bg-primary-900/20',
          compact ? '!p-3' : '',
        ]"
      >
        <!-- Unread indicator -->
        <div v-if="!notif.read_at && showUnreadDot" class="absolute left-2 top-6 w-2 h-2 rounded-full bg-primary-500"></div>

        <!-- Icon -->
        <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" :class="iconBg(notif.type || 'info')">
          <span class="material-symbols-outlined text-lg" :class="iconColor(notif.type || 'info')">{{ iconName(notif.type || 'info') }}</span>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-medium" :class="notif.read_at ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'">
              {{ notif.title }}
            </p>
            <span class="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">{{ formatRelativeTime(notif.created_at) }}</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{{ notif.message }}</p>

          <!-- Actions -->
          <div class="flex items-center gap-3 mt-2">
            <button
              v-if="!notif.read_at"
              @click="handleMarkRead(notif.id)"
              class="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline"
            >
              Marcar leída
            </button>
            <button
              v-if="allowDelete"
              @click="handleDelete(notif.id)"
              class="text-xs text-red-500 hover:text-red-600 font-medium hover:underline"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
      <p class="text-xs text-gray-500">
        Mostrando {{ items.length }} de {{ total }} notificaciones
      </p>
      <div class="flex items-center gap-2">
        <button
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
          class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span class="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        <span class="text-xs text-gray-500">{{ page }} / {{ totalPages }}</span>
        <button
          :disabled="page >= totalPages"
          @click="goToPage(page + 1)"
          class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span class="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { notificationsAPI } from '../../api';
import { formatRelativeTime } from '../../utils';

const props = defineProps({
  compact: { type: Boolean, default: false },
  showUnreadDot: { type: Boolean, default: true },
  allowDelete: { type: Boolean, default: false },
  limit: { type: Number, default: 20 },
  autoFetch: { type: Boolean, default: true },
  /** Filtro adicional: 'unread' para solo no leídas */
  filter: { type: String, default: '' },
});

const emit = defineEmits(['update:unreadCount', 'read', 'deleted']);

const items = ref([]);
const loading = ref(false);
const error = ref(null);
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);

const fetchAll = async () => {
  loading.value = true;
  error.value = null;
  try {
    const params = { limit: props.limit, page: page.value };
    if (props.filter === 'unread') {
      params.unread = true;
    }
    const res = await notificationsAPI.getAll(params);
    items.value = res.data || [];
    total.value = res.pagination?.total || items.value.length;
    totalPages.value = res.pagination?.totalPages || Math.ceil(total.value / props.limit) || 1;
    emit('update:unreadCount', res.pagination?.total || 0);
  } catch (e) {
    error.value = 'Error al cargar notificaciones';
  } finally {
    loading.value = false;
  }
};

const goToPage = (p) => {
  page.value = p;
  fetchAll();
};

const handleMarkRead = async (id) => {
  try {
    await notificationsAPI.markAsRead(id);
    const idx = items.value.findIndex(n => n.id === id);
    if (idx !== -1) {
      items.value[idx].read_at = new Date().toISOString();
    }
    emit('read', id);
  } catch (e) {
    console.error('Error marking as read:', e);
  }
};

const handleDelete = async (id) => {
  try {
    await notificationsAPI.delete(id);
    items.value = items.value.filter(n => n.id !== id);
    total.value = Math.max(0, total.value - 1);
    emit('deleted', id);
  } catch (e) {
    console.error('Error deleting notification:', e);
  }
};

const markAllAsRead = async () => {
  try {
    await notificationsAPI.markAllAsRead();
    items.value.forEach(n => { n.read_at = n.read_at || new Date().toISOString(); });
  } catch (e) {
    console.error('Error marking all as read:', e);
  }
};

// Icon helpers based on notification type
const iconBg = (type) => ({
  'login': 'bg-blue-100 dark:bg-blue-900/30',
  'purchase': 'bg-green-100 dark:bg-green-900/30',
  'sale': 'bg-emerald-100 dark:bg-emerald-900/30',
  'stock': 'bg-amber-100 dark:bg-amber-900/30',
  'inventory': 'bg-purple-100 dark:bg-purple-900/30',
  'warning': 'bg-red-100 dark:bg-red-900/30',
  'info': 'bg-gray-100 dark:bg-gray-700',
}[type] || 'bg-gray-100 dark:bg-gray-700');

const iconColor = (type) => ({
  'login': 'text-blue-600 dark:text-blue-400',
  'purchase': 'text-green-600 dark:text-green-400',
  'sale': 'text-emerald-600 dark:text-emerald-400',
  'stock': 'text-amber-600 dark:text-amber-400',
  'inventory': 'text-purple-600 dark:text-purple-400',
  'warning': 'text-red-600 dark:text-red-400',
  'info': 'text-gray-600 dark:text-gray-400',
}[type] || 'text-gray-600 dark:text-gray-400');

const iconName = (type) => ({
  'login': 'login',
  'purchase': 'shopping_cart',
  'sale': 'point_of_sale',
  'stock': 'inventory_2',
  'inventory': 'add_box',
  'warning': 'warning',
  'info': 'notifications',
}[type] || 'notifications');

// Expose for parent
defineExpose({ fetchAll, markAllAsRead });

onMounted(() => {
  if (props.autoFetch) fetchAll();
});
</script>

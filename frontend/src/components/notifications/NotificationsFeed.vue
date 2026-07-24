<template>
  <div>
    <!-- Loading -->
    <div v-if="loading && items.length === 0" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>

    <!-- Error -->
    <!-- Filters / Tabs + Notifications List -->
<div v-else>
  <!-- Action Bar & Tabs -->
  <div class="flex flex-col gap-6 mb-8">
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4"
    >
      <!-- Tabs -->
      <div class="flex gap-8">
        <button
          class="relative py-2 px-1 group"
        >
          <span
            class="font-label-md text-label-md text-primary font-bold"
          >
            Recientes
          </span>

          <div
            class="absolute -bottom-4 left-0 w-full h-1 aurora-gradient rounded-t-full"
          ></div>

          <span
            class="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full"
            style="
              box-shadow:
                inset 4px 4px 8px #d1c9d4,
                inset -4px -4px 8px #ffffff;
            "
          >
            {{ total }}
          </span>
        </button>

        <button
          class="relative py-2 px-1 text-secondary hover:text-on-surface-variant transition-colors"
        >
          <span class="font-label-md text-label-md">
            No Leídas
          </span>

          <span
            class="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full"
            style="
              box-shadow:
                inset 4px 4px 8px #d1c9d4,
                inset -4px -4px 8px #ffffff;
            "
          >
            {{ unreadCount }}
          </span>
        </button>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-4">
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-secondary hover:text-primary transition-all active:scale-95"
          style="
            box-shadow:
              4px 4px 8px #d1c9d4,
              -4px -4px 8px #ffffff;
          "
        >
          <span class="material-symbols-outlined text-[20px]">
            filter_list
          </span>

          <span class="font-label-md text-label-md">
            Filtrar
          </span>
        </button>

        <button
          @click="fetchAll"
          class="p-2 rounded-xl text-secondary hover:text-primary transition-all active:rotate-180 duration-500"
          style="
            box-shadow:
              4px 4px 8px #d1c9d4,
              -4px -4px 8px #ffffff;
          "
          title="Actualizar"
        >
          <span class="material-symbols-outlined">
            refresh
          </span>
        </button>
      </div>
    </div>
  </div>

  <!-- Notifications List -->
  <div class="space-y-6">
    <div
      v-for="notif in items"
      :key="notif.id"
      class="group relative bg-surface rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-all duration-300 hover:-translate-y-1"
      :class="[
        notif.type === 'warning' || notif.type === 'error'
          ? 'border-l-4 border-error/50'
          : '',
      ]"
      style="
        box-shadow:
          8px 8px 16px #d1c9d4,
          -8px -8px 16px #ffffff;
      "
      @click="handleEntityClick(notif)"
    >
      <!-- Notification Content -->
      <div class="flex items-start gap-6 flex-1 min-w-0">
        <!-- Icon -->
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
          :class="[
            'shadow-[4px_4px_8px_#d1c9d4,-4px_-4px_8px_#ffffff]',
            iconBg(notif.type || 'info'),
          ]"
        >
          <span
            class="material-symbols-outlined text-[28px]"
            :class="iconColor(notif.type || 'info')"
          >
            {{ iconName(notif.type || 'info') }}
          </span>
        </div>

        <!-- Content -->
        <div class="space-y-1 min-w-0 flex-1">
          <!-- Title + Type + Time -->
          <div class="flex items-center gap-3 flex-wrap">
            <h3
              class="font-semibold text-[18px] text-on-surface truncate"
              :class="{ 'font-bold': !notif.read }"
            >
              {{ notif.title }}
            </h3>

            <!-- Critical Badge -->
            <span
              v-if="notif.type === 'warning' || notif.type === 'error'"
              class="text-xs bg-error-container px-2 py-1 rounded text-error font-bold uppercase"
            >
              {{ badgeLabel(notif.type) }}
            </span>

            <!-- Other Types -->
            <span
              v-else-if="notif.type && notif.type !== 'info'"
              class="text-xs bg-surface-container-high px-2 py-1 rounded text-secondary font-medium"
            >
              {{ badgeLabel(notif.type) }}
            </span>

            <!-- Time -->
            <span
              class="text-xs bg-surface-container-high px-2 py-1 rounded text-secondary font-medium whitespace-nowrap"
            >
              {{ formatRelativeTime(notif.createdAt) }}
            </span>
          </div>

          <!-- Message -->
          <p
            class="text-body-md text-on-surface-variant max-w-2xl line-clamp-2"
          >
            {{ notif.message }}
          </p>

          <!-- Entity Link -->
          <div
            v-if="getEntityLink(notif)"
            class="mt-3"
          >
            <span
              @click.stop="handleEntityClick(notif)"
              class="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline cursor-pointer"
            >
              <span class="material-symbols-outlined text-[18px]">
                {{ getEntityLink(notif).icon || 'open_in_new' }}
              </span>

              {{ getEntityLink(notif).label }}
            </span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div
        class="flex items-center gap-4 self-end lg:self-center shrink-0"
      >
        <!-- View Detail -->
        <button
          @click.stop="handleEntityClick(notif)"
          class="text-primary font-bold text-label-md hover:underline px-4 transition-colors"
        >
          Ver Detalle
        </button>

        <!-- Action Buttons -->
        <div
          class="flex gap-2 border-l border-outline-variant/30 pl-4"
        >
          <!-- Mark as Read -->
          <button
            v-if="!notif.read"
            @click.stop="handleMarkRead(notif.id)"
            class="p-2 rounded-lg text-secondary transition-all duration-200 hover:text-primary"
            style="
              box-shadow:
                4px 4px 8px #d1c9d4,
                -4px -4px 8px #ffffff;
            "
            title="Marcar como leída"
          >
            <span class="material-symbols-outlined">
              check_circle
            </span>
          </button>

          <!-- View -->
          <button
            @click.stop="handleEntityClick(notif)"
            class="p-2 rounded-lg text-secondary transition-all duration-200 hover:text-primary-container"
            style="
              box-shadow:
                4px 4px 8px #d1c9d4,
                -4px -4px 8px #ffffff;
            "
            title="Ver detalle"
          >
            <span class="material-symbols-outlined">
              visibility
            </span>
          </button>

          <!-- Delete -->
          <button
            v-if="allowDelete"
            @click.stop="handleDelete(notif.id)"
            class="p-2 rounded-lg text-secondary transition-all duration-200 hover:text-error"
            style="
              box-shadow:
                4px 4px 8px #d1c9d4,
                -4px -4px 8px #ffffff;
            "
            title="Eliminar"
          >
            <span class="material-symbols-outlined">
              delete
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between px-8 py-5 border-t border-[rgba(226,232,240,0.4)] dark:border-[rgba(74,68,85,0.2)]">
      <p class="text-xs text-gray-400 dark:text-[#958da1]">
        Mostrando {{ items.length }} de {{ total }} notificaciones
      </p>
      <div class="flex items-center gap-2">
        <button
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
          class="notif-page-btn"
          :class="page <= 1 ? 'opacity-30 cursor-not-allowed' : ''"
        >
          <span class="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        <template v-for="p in visiblePages" :key="p">
          <button
            v-if="p === '...'"
            class="notif-page-btn cursor-default"
          >...</button>
          <button
            v-else
            @click="goToPage(p)"
            class="notif-page-btn"
            :class="p === page ? 'active' : ''"
          >{{ p }}</button>
        </template>
        <button
          :disabled="page >= totalPages"
          @click="goToPage(page + 1)"
          class="notif-page-btn"
          :class="page >= totalPages ? 'opacity-30 cursor-not-allowed' : ''"
        >
          <span class="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
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
  /** Búsqueda por texto (título / mensaje) */
  searchQuery: { type: String, default: '' },
  /** Fecha desde (ISO string o YYYY-MM-DD) */
  dateFrom: { type: String, default: '' },
  /** Fecha hasta (ISO string o YYYY-MM-DD) */
  dateTo: { type: String, default: '' },
  /** Orden: recent | oldest | unread_first */
  sortBy: { type: String, default: 'recent' },
});

const emit = defineEmits(['update:unreadCount', 'update:total', 'read', 'deleted']);

const router = useRouter();
const items = ref([]);
const loading = ref(false);
const error = ref(null);
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const unreadCount = ref(0);

const fetchAll = async () => {
  loading.value = true;
  error.value = null;
  try {
    const params = { limit: props.limit, page: page.value, sort: props.sortBy };

    // Unread filter (from tab or explicit prop)
    if (props.filter === 'unread') {
      params.unread = 'true';
    }

    // Text search
    if (props.searchQuery && props.searchQuery.trim()) {
      params.search = props.searchQuery.trim();
    }

    // Date range
    if (props.dateFrom) params.from_date = props.dateFrom;
    if (props.dateTo) params.to_date = props.dateTo;

    const res = await notificationsAPI.getAll(params);
    items.value = res.data || [];
    total.value = res.pagination?.total || items.value.length;
    totalPages.value = res.pagination?.totalPages || Math.ceil(total.value / props.limit) || 1;
    emit('update:total', total.value);

    // Always fetch the true unread count from the database (read = false)
    try {
      const unreadRes = await notificationsAPI.getAll({ limit: 1, unread: true });
      unreadCount.value = unreadRes.pagination?.total || 0;
    } catch (_) {
      unreadCount.value = 0;
    }
    emit('update:unreadCount', unreadCount.value);
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
      items.value[idx].read = true;
      items.value[idx].readAt = new Date().toISOString();
    }
    unreadCount.value = Math.max(0, unreadCount.value - 1);
    emit('update:unreadCount', unreadCount.value);
    emit('read', id);
  } catch (e) {
    console.error('Error marking as read:', e);
  }
};

// Click en entity link: marca como leída + navega
const handleEntityClick = async (notif) => {
  if (!notif.read) {
    try {
      await notificationsAPI.markAsRead(notif.id);
      const idx = items.value.findIndex(n => n.id === notif.id);
      if (idx !== -1) {
        items.value[idx].read = true;
        items.value[idx].readAt = new Date().toISOString();
      }
      unreadCount.value = Math.max(0, unreadCount.value - 1);
      emit('update:unreadCount', unreadCount.value);
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  }
  const link = getEntityLink(notif);
  if (link) {
    if (link.isUrl) {
      window.open(link.path, '_blank');
    } else {
      router.push(link.path);
    }
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
    items.value.forEach(n => { if (!n.read) { n.read = true; n.readAt = n.readAt || new Date().toISOString(); } });
    unreadCount.value = 0;
    emit('update:unreadCount', 0);
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

const badgeClass = (type) => ({
  'login': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'purchase': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'sale': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'stock': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'inventory': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'warning': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'info': 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300',
}[type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300');

const badgeLabel = (type) => ({
  'login': 'SESIÓN',
  'purchase': 'COMPRA',
  'sale': 'VENTA',
  'stock': 'STOCK',
  'inventory': 'INVENTARIO',
  'warning': 'ALERTA',
  'info': 'INFO',
}[type] || 'INFO');

// Pagination: show pages with ellipsis
const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = page.value;
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }
  return pages;
});

// Entity link: extrae a qué entidad apunta la notificación desde notification.data
const getEntityLink = (notif) => {
  if (!notif?.data) return null;
  const data = notif.data;

  // Si tiene URL directa, usarla
  if (data.url && typeof data.url === 'string') {
    const isExternal = data.url.startsWith('http://') || data.url.startsWith('https://');
    return { path: data.url, label: 'Ver detalle', icon: 'open_in_new', isUrl: isExternal };
  }

  if (data.sale_id || data.saleId) {
    const id = data.sale_id || data.saleId;
    return { path: `/app/sales/${id}`, label: 'Ver venta', icon: 'point_of_sale' };
  }
  if (data.purchase_id || data.purchaseId) {
    const id = data.purchase_id || data.purchaseId;
    return { path: `/app/purchases/${id}`, label: 'Ver compra', icon: 'shopping_cart' };
  }
  if (data.invoice_id || data.invoiceId) {
    const id = data.invoice_id || data.invoiceId;
    return { path: `/app/invoices/${id}`, label: 'Ver factura', icon: 'receipt' };
  }
  if (data.product_id || data.productId) {
    const id = data.product_id || data.productId;
    return { path: `/app/products/${id}`, label: 'Ver producto', icon: 'inventory' };
  }
  if (data.category_id || data.categoryId) {
    const id = data.category_id || data.categoryId;
    return { path: `/app/categories/${id}`, label: 'Ver categoría', icon: 'category' };
  }
  if (data.supplier_id || data.supplierId) {
    const id = data.supplier_id || data.supplierId;
    return { path: `/app/suppliers/${id}`, label: 'Ver proveedor', icon: 'business' };
  }
  if (data.client_id || data.clientId) {
    const id = data.client_id || data.clientId;
    return { path: `/app/clients/${id}`, label: 'Ver cliente', icon: 'people' };
  }
  if (data.user_id || data.userId) {
    return { path: '/app/profile', label: 'Ver perfil', icon: 'person' };
  }
  if (data.order_id || data.orderId || data.order_number || data.orderNumber) {
    return { path: '/app/sales', label: 'Ver pedidos', icon: 'orders' };
  }
  if (data.offer_id || data.offerId) {
    const id = data.offer_id || data.offerId;
    return { path: '/app/ecommerce/offers', label: 'Ver ofertas', icon: 'local_offer' };
  }
  if (data.banner_id || data.bannerId) {
    return { path: '/app/ecommerce/banners', label: 'Ver banners', icon: 'slideshow' };
  }
  if (data.hero_slide_id || data.heroSlideId) {
    return { path: '/app/ecommerce/hero-slides', label: 'Ver slides', icon: 'photo_library' };
  }
  if (data.settings_id || data.settingsId) {
    return { path: '/app/admin/config', label: 'Ver configuración', icon: 'settings' };
  }
  return null;
};

// Re-fetch when any filter prop changes
watch(
  () => [props.filter, props.searchQuery, props.dateFrom, props.dateTo, props.sortBy],
  () => {
    page.value = 1;
    fetchAll();
  }
);

// Expose for parent
defineExpose({ fetchAll, markAllAsRead, total });

onMounted(() => {
  if (props.autoFetch) fetchAll();
});
</script>

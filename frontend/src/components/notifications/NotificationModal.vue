<template>
  <div v-if="show" class="absolute right-0 top-full mt-2 w-96 z-50">
    <div
      class="bg-white rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
      style="border-color: rgba(210,196,180,0.3); max-height: 480px;"
      @click.stop
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style="border-color: rgba(210,196,180,0.2);"
      >
        <h3 class="text-sm font-semibold" style="color: #452d00;">Notificaciones</h3>
        <button
          v-if="unreadCount > 0"
          @click.stop="handleMarkAllRead"
          class="text-xs font-medium hover:underline"
          style="color: #624200;"
        >
          Marcar leídas
        </button>
      </div>

      <!-- Content area scrollable -->
      <div class="overflow-y-auto" style="max-height: 360px;">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-10">
          <div class="animate-spin rounded-full h-7 w-7 border-3 border-[#624200] border-t-transparent"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-10">
          <span class="material-symbols-outlined text-3xl text-red-400 mb-2">error</span>
          <p class="text-red-500 text-xs">{{ error }}</p>
          <button @click="fetchNotifications" class="mt-2 text-xs font-medium hover:underline" style="color: #624200;">Reintentar</button>
        </div>

        <!-- Empty -->
        <div v-else-if="items.length === 0" class="text-center py-10">
          <span class="material-symbols-outlined text-4xl mb-2" style="color: #d2c4b4;">notifications_off</span>
          <p class="text-sm font-medium" style="color: #4f4539;">No hay notificaciones</p>
          <p class="text-xs mt-1" style="color: #817567;">Las notificaciones del sistema aparecerán aquí</p>
        </div>

        <!-- Notification List -->
        <div v-else class="divide-y" style="border-color: rgba(210, 196, 180, 0.15);">
          <div
            v-for="notif in items"
            :key="notif.id"
            class="group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all duration-200"
            :class="!notif.read ? 'bg-[rgba(98,66,0,0.03)]' : ''"
            @click="handleNotificationClick(notif)"
            @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.06)'"
            @mouseleave="e => { if (!notif.read) e.currentTarget.style.background = 'rgba(98,66,0,0.03)'; else e.currentTarget.style.background = 'transparent'; }"
          >
            <!-- Unread dot -->
            <div v-if="!notif.read" class="absolute left-1.5 top-5 w-2 h-2 rounded-full" style="background: #624200;"></div>

            <!-- Icon -->
            <div class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center" :class="iconBg(notif.type || 'info')">
              <span class="material-symbols-outlined text-base" :class="iconColor(notif.type || 'info')">{{ iconName(notif.type || 'info') }}</span>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-semibold truncate" :class="notif.read ? 'text-gray-500' : 'text-gray-900'">
                  {{ notif.title || 'Notificación' }}
                </p>
                <span class="text-xs whitespace-nowrap flex-shrink-0 mt-0.5" style="color: #817567;">{{ formatRelativeTime(notif.createdAt) }}</span>
              </div>
              <p class="text-xs mt-0.5 line-clamp-2" style="color: #4f4539;">{{ notif.message }}</p>

              <!-- Entity link hint -->
              <div v-if="getEntityLink(notif)" class="flex items-center gap-1 mt-1.5">
                <span class="material-symbols-outlined text-xs" style="color: #624200;">{{ getEntityLink(notif).icon }}</span>
                <span class="text-xs font-medium" style="color: #624200;">{{ getEntityLink(notif).label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer: Ver todas con color sólido -->
      <router-link
        to="/app/notifications"
        @click="$emit('close')"
        class="flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200 flex-shrink-0"
        style="background: #624200; color: white; text-decoration: none;"
        @mouseenter="e => e.currentTarget.style.background = '#795900'"
        @mouseleave="e => e.currentTarget.style.background = '#624200'"
      >
        Ver todas las notificaciones
        <span class="material-symbols-outlined text-sm">arrow_forward</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { notificationsAPI } from '../../api';
import { formatRelativeTime } from '../../utils';

const props = defineProps({
  show: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'update:unreadCount']);

const router = useRouter();
const items = ref([]);
const loading = ref(false);
const error = ref(null);
const unreadCount = ref(0);

const fetchNotifications = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await notificationsAPI.getAll({ limit: 5, unread: true });
    items.value = res.data || [];
    unreadCount.value = res.pagination?.total || 0;
    emit('update:unreadCount', unreadCount.value);
  } catch (e) {
    error.value = 'Error al cargar notificaciones';
  } finally {
    loading.value = false;
  }
};

const handleMarkRead = async (id) => {
  try {
    await notificationsAPI.markAsRead(id);
    const idx = items.value.findIndex(n => n.id === id);
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], read: true, readAt: new Date().toISOString() };
    }
    unreadCount.value = Math.max(0, unreadCount.value - 1);
    emit('update:unreadCount', unreadCount.value);
  } catch (e) {
    console.error('Error marking as read:', e);
  }
};

const handleMarkAllRead = async () => {
  try {
    await notificationsAPI.markAllAsRead();
    items.value.forEach(n => { if (!n.read) { n.read = true; n.readAt = n.readAt || new Date().toISOString(); } });
    unreadCount.value = 0;
    emit('update:unreadCount', 0);
  } catch (e) {
    console.error('Error marking all as read:', e);
  }
};

// Entity link: extrae a qué entidad apunta la notificación
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
    return { path: `/app/sales/${id}`, label: 'Ir a la venta', icon: 'point_of_sale' };
  }
  if (data.purchase_id || data.purchaseId) {
    const id = data.purchase_id || data.purchaseId;
    return { path: `/app/purchases/${id}`, label: 'Ir a la compra', icon: 'shopping_cart' };
  }
  if (data.invoice_id || data.invoiceId) {
    const id = data.invoice_id || data.invoiceId;
    return { path: `/app/invoices/${id}`, label: 'Ir a la factura', icon: 'receipt' };
  }
  if (data.product_id || data.productId) {
    const id = data.product_id || data.productId;
    return { path: `/app/products/${id}`, label: 'Ir al producto', icon: 'inventory' };
  }
  if (data.category_id || data.categoryId) {
    const id = data.category_id || data.categoryId;
    return { path: `/app/categories/${id}`, label: 'Ir a categoría', icon: 'category' };
  }
  if (data.supplier_id || data.supplierId) {
    const id = data.supplier_id || data.supplierId;
    return { path: `/app/suppliers/${id}`, label: 'Ir a proveedor', icon: 'business' };
  }
  if (data.client_id || data.clientId) {
    const id = data.client_id || data.clientId;
    return { path: `/app/clients/${id}`, label: 'Ir al cliente', icon: 'people' };
  }
  if (data.user_id || data.userId) {
    return { path: '/app/profile', label: 'Ver perfil', icon: 'person' };
  }
  if (data.order_id || data.orderId || data.order_number || data.orderNumber) {
    return { path: '/app/sales', label: 'Ver pedidos', icon: 'orders' };
  }
  if (data.offer_id || data.offerId) {
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

// Click en notificación: marca como leída + navega a entidad
const handleNotificationClick = async (notif) => {
  // Marcar como leída si no lo está
  if (!notif.read) {
    await handleMarkRead(notif.id);
  }
  // Navegar al link de la entidad o al detalle
  const link = getEntityLink(notif);
  if (link) {
    if (link.isUrl) {
      window.open(link.path, '_blank');
    } else {
      router.push(link.path);
    }
  } else {
    router.push(`/app/notifications/${notif.id}`);
  }
  emit('close');
};

// Icon helpers
const iconBg = (type) => ({
  'login': 'bg-blue-100',
  'purchase': 'bg-green-100',
  'sale': 'bg-emerald-100',
  'stock': 'bg-amber-100',
  'inventory': 'bg-purple-100',
  'warning': 'bg-red-100',
  'info': 'bg-gray-100',
}[type] || 'bg-gray-100');

const iconColor = (type) => ({
  'login': 'text-blue-600',
  'purchase': 'text-green-600',
  'sale': 'text-emerald-600',
  'stock': 'text-amber-600',
  'inventory': 'text-purple-600',
  'warning': 'text-red-600',
  'info': 'text-gray-600',
}[type] || 'text-gray-600');

const iconName = (type) => ({
  'login': 'login',
  'purchase': 'shopping_cart',
  'sale': 'point_of_sale',
  'stock': 'inventory_2',
  'inventory': 'add_box',
  'warning': 'warning',
  'info': 'notifications',
}[type] || 'notifications');

watch(() => props.show, (val) => {
  if (val) fetchNotifications();
});

onMounted(() => {
  if (props.show) fetchNotifications();
});
</script>

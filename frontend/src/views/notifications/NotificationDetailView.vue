<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Back button -->
    <div>
      <button @click="goBack"
        class="flex items-center gap-1.5 text-sm font-medium transition-colors hover:underline"
        style="color: #624200;">
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        Volver a notificaciones
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-4 border-[#624200] border-t-transparent"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20">
      <span class="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
      <p class="text-red-500 font-medium">{{ error }}</p>
      <button @click="fetchNotification" class="mt-4 text-sm font-medium hover:underline" style="color: #624200;">Reintentar</button>
    </div>

    <!-- Notification Detail -->
    <template v-else-if="notification">
      <!-- Header Card -->
      <div class="dt-card overflow-hidden">
        <div class="p-6">
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <div class="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center" :class="iconBg(notification.type || 'info')">
              <span class="material-symbols-outlined text-2xl" :class="iconColor(notification.type || 'info')">{{ iconName(notification.type || 'info') }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h1 class="text-xl font-bold" style="color: #0b1c30;">{{ notification.title }}</h1>
                  <span class="dt-badge mt-2 inline-block" :class="typeBadgeClass(notification.type)">
                    {{ typeLabel(notification.type) }}
                  </span>
                </div>
                <!-- Read status -->
                <div v-if="notification.readAt" class="flex items-center gap-1 text-xs" style="color: #059669;">
                  <span class="material-symbols-outlined text-sm">done_all</span>
                  Leída
                </div>
                <button v-else @click="handleMarkRead"
                  class="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                  style="color: #624200; background: rgba(98,66,0,0.06);"
                  @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.1)'"
                  @mouseleave="e => e.currentTarget.style.background = 'rgba(98,66,0,0.06)'">
                  Marcar como leída
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Card -->
      <div class="dt-card p-6">
        <h3 class="text-sm font-semibold mb-3" style="color: #452d00;">Mensaje</h3>
        <p class="text-sm leading-relaxed" style="color: #0b1c30;">{{ notification.message }}</p>
      </div>

      <!-- Event Data Card -->
      <div v-if="notification.data && Object.keys(notification.data).length > 0" class="dt-card p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold" style="color: #452d00;">Datos del Evento</h3>
          <button @click="showRawData = !showRawData"
            class="text-xs font-medium hover:underline" style="color: #624200;">
            {{ showRawData ? 'Vista简约' : 'Ver datos completos' }}
          </button>
        </div>

        <!-- Formatted view -->
        <div v-if="!showRawData" class="space-y-3">
          <div v-for="(value, key) in notification.data" :key="key"
            class="flex items-start gap-3 py-2 border-b"
            style="border-color: rgba(210, 196, 180, 0.15);">
            <span class="text-xs font-medium uppercase tracking-wider flex-shrink-0 min-w-[120px]" style="color: #624200;">{{ formatKey(key) }}</span>
            <span class="text-sm" style="color: #0b1c30;">
              <template v-if="typeof value === 'object' && value !== null">
                {{ JSON.stringify(value) }}
              </template>
              <template v-else>{{ value }}</template>
            </span>
          </div>
        </div>

        <!-- Raw JSON -->
        <pre v-else class="text-xs p-4 rounded-lg overflow-x-auto" style="background: #f8f6f3; color: #0b1c30; font-family: 'JetBrains Mono', monospace;">{{ JSON.stringify(notification.data, null, 2) }}</pre>
      </div>

      <!-- Related Links Card -->
      <div class="dt-card p-6">
        <h3 class="text-sm font-semibold mb-3" style="color: #452d00;">Enlaces Relacionados</h3>
        <div class="space-y-2">
          <!-- Entity link based on notification data (external URL) -->
          <a
            v-if="entityLink?.isUrl"
            :href="entityLink.path"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2.5 p-3 rounded-lg transition-all text-sm"
            style="color: #624200; text-decoration: none; background: rgba(98,66,0,0.04);"
            @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.08)'"
            @mouseleave="e => e.currentTarget.style.background = 'rgba(98,66,0,0.04)'">
            <span class="material-symbols-outlined text-lg">open_in_new</span>
            <span>{{ entityLink.label }}</span>
            <span class="material-symbols-outlined text-sm ml-auto">chevron_right</span>
          </a>
          <!-- Entity link based on notification data (internal route) -->
          <router-link
            v-else-if="entityLink"
            :to="entityLink.path"
            class="flex items-center gap-2.5 p-3 rounded-lg transition-all text-sm"
            style="color: #624200; text-decoration: none; background: rgba(98,66,0,0.04);"
            @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.08)'"
            @mouseleave="e => e.currentTarget.style.background = 'rgba(98,66,0,0.04)'">
            <span class="material-symbols-outlined text-lg">{{ entityLink.icon }}</span>
            <span>{{ entityLink.label }}</span>
            <span class="material-symbols-outlined text-sm ml-auto">chevron_right</span>
          </router-link>

          <!-- Link to audit / system changes -->
          <button
            @click="showAuditInfo = !showAuditInfo"
            class="w-full flex items-center gap-2.5 p-3 rounded-lg transition-all text-sm"
            style="color: #624200; background: rgba(98,66,0,0.04); border: none; cursor: pointer; text-align: left;"
            @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.08)'"
            @mouseleave="e => e.currentTarget.style.background = 'rgba(98,66,0,0.04)'">
            <span class="material-symbols-outlined text-lg">history</span>
            <span>Ver cambios en el sistema</span>
            <span class="material-symbols-outlined text-sm ml-auto" :class="{ 'rotate-180': showAuditInfo }">expand_more</span>
          </button>

          <!-- Audit info panel -->
          <div v-if="showAuditInfo" class="p-4 rounded-lg text-xs leading-relaxed" style="background: #f8f6f3; color: #4f4539;">
            <p class="mb-2">Los cambios en el sistema son registrados por el servicio de auditoría. Puedes revisar el historial completo de cambios desde:</p>
            <router-link to="/app/notifications"
              class="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              style="color: #624200;">
              <span class="material-symbols-outlined text-sm">notifications</span>
              Centro de notificaciones
            </router-link>
            <span class="mx-2" style="color: #d2c4b4;">·</span>
            <router-link to="/app/reports"
              class="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              style="color: #624200;">
              <span class="material-symbols-outlined text-sm">assessment</span>
              Reportes del sistema
            </router-link>
          </div>

          <!-- No links fallback -->
          <p v-if="!entityLink && !showAuditInfo" class="text-xs" style="color: #817567;">
            No hay enlaces disponibles para esta notificación.
          </p>
        </div>
      </div>

      <!-- Metadata Card -->
      <div class="dt-card p-6">
        <h3 class="text-sm font-semibold mb-3" style="color: #452d00;">Metadatos</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-xs font-medium uppercase tracking-wider mb-1" style="color: #817567;">Creada</p>
            <p style="color: #0b1c30;">{{ formatDateTime(notification.createdAt) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider mb-1" style="color: #817567;">Última actualización</p>
            <p style="color: #0b1c30;">{{ formatDateTime(notification.updatedAt) }}</p>
          </div>
          <div v-if="notification.readAt">
            <p class="text-xs font-medium uppercase tracking-wider mb-1" style="color: #817567;">Leída</p>
            <p style="color: #059669;">{{ formatDateTime(notification.readAt) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider mb-1" style="color: #817567;">ID</p>
            <p class="dt-mono text-xs" style="color: #4f4539;">{{ notification.id }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <div v-else class="text-center py-20">
      <span class="material-symbols-outlined text-5xl mb-4" style="color: #d2c4b4;">notifications_off</span>
      <p class="font-medium" style="color: #4f4539;">Notificación no encontrada</p>
      <router-link to="/app/notifications"
        class="inline-flex items-center gap-1.5 mt-4 text-sm font-medium hover:underline"
        style="color: #624200;">
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        Volver a notificaciones
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { notificationsAPI } from '../../api';

const route = useRoute();
const router = useRouter();
const notification = ref(null);
const loading = ref(true);
const error = ref(null);
const showRawData = ref(false);
const showAuditInfo = ref(false);

const fetchNotification = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await notificationsAPI.getById(route.params.id);
    notification.value = res.data;
  } catch (e) {
    if (e.response?.status === 404) {
      notification.value = null;
    } else {
      error.value = 'Error al cargar la notificación';
    }
  } finally {
    loading.value = false;
  }
};

const handleMarkRead = async () => {
  if (!notification.value) return;
  try {
    await notificationsAPI.markAsRead(notification.value.id);
    notification.value = { ...notification.value, read: true, readAt: new Date().toISOString() };
  } catch (e) {
    console.error('Error marking as read:', e);
  }
};

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/app/notifications');
  }
};

// Entity link based on notification data
const entityLink = computed(() => {
  if (!notification.value?.data) return null;
  const data = notification.value.data;

  // Si tiene URL directa, usarla
  if (data.url && typeof data.url === 'string') {
    const isExternal = data.url.startsWith('http://') || data.url.startsWith('https://');
    return { path: data.url, label: 'Abrir enlace', icon: 'open_in_new', isUrl: isExternal };
  }

  if (data.sale_id || data.saleId) {
    const id = data.sale_id || data.saleId;
    return { path: `/app/sales/${id}`, label: 'Ver venta relacionada', icon: 'point_of_sale' };
  }
  if (data.purchase_id || data.purchaseId) {
    const id = data.purchase_id || data.purchaseId;
    return { path: `/app/purchases/${id}`, label: 'Ver compra relacionada', icon: 'shopping_cart' };
  }
  if (data.invoice_id || data.invoiceId) {
    const id = data.invoice_id || data.invoiceId;
    return { path: `/app/invoices/${id}`, label: 'Ver factura relacionada', icon: 'receipt' };
  }
  if (data.product_id || data.productId) {
    const id = data.product_id || data.productId;
    return { path: `/app/products/${id}`, label: 'Ver producto relacionado', icon: 'inventory' };
  }
  if (data.category_id || data.categoryId) {
    const id = data.category_id || data.categoryId;
    return { path: `/app/categories/${id}`, label: 'Ver categoría relacionada', icon: 'category' };
  }
  if (data.supplier_id || data.supplierId) {
    const id = data.supplier_id || data.supplierId;
    return { path: `/app/suppliers/${id}`, label: 'Ver proveedor relacionado', icon: 'business' };
  }
  if (data.client_id || data.clientId) {
    const id = data.client_id || data.clientId;
    return { path: `/app/clients/${id}`, label: 'Ver cliente relacionado', icon: 'people' };
  }
  if (data.user_id || data.userId) {
    return { path: '/app/profile', label: 'Ver perfil de usuario', icon: 'person' };
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
});

// Helpers
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

const typeBadgeClass = (type) => ({
  'login': 'dt-badge-info',
  'purchase': 'dt-badge-success',
  'sale': 'dt-badge-success',
  'stock': 'dt-badge-warning',
  'inventory': 'dt-badge-info',
  'warning': 'dt-badge-danger',
  'info': 'dt-badge-info',
}[type] || 'dt-badge-info');

const typeLabel = (type) => ({
  'login': 'Inicio de Sesión',
  'purchase': 'Compra',
  'sale': 'Venta',
  'stock': 'Inventario',
  'inventory': 'Inventario',
  'warning': 'Advertencia',
  'info': 'Información',
}[type] || type);

const formatKey = (key) => {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

onMounted(fetchNotification);
</script>

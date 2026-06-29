<template>
  <!-- Mobile overlay -->
  <div v-if="appStore.sidebarMobileOpen" class="fixed inset-0 bg-black/50 z-30 lg:hidden" @click="appStore.closeSidebarMobile"></div>

  <!-- Sidebar -->
  <aside class="dt-sidebar fixed left-0 top-0 h-full z-40 transition-all duration-300"
         :class="[
           appStore.sidebarOpen ? 'w-[280px]' : 'w-[88px]',
           appStore.sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full',
           'lg:translate-x-0'
         ]">
    <!-- Logo -->
    <div class="flex items-center h-20 px-5 border-b border-[rgba(210,196,180,0.3)]">
      <div class="flex items-center gap-3" v-if="appStore.sidebarOpen">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style="background: #624200;">
          <span class="material-symbols-outlined text-white" style="font-variation-settings: 'FILL' 1;">pets</span>
        </div>
        <div>
          <span class="font-bold" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; color: #452d00;">Animal Store</span>
          <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #4f4539; margin-top: -2px;">Admin Pro</p>
        </div>
      </div>
      <div v-else class="mx-auto">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style="background: #624200;">
          <span class="material-symbols-outlined text-white" style="font-variation-settings: 'FILL' 1;">pets</span>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="mt-4 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-18rem)]">
      <div v-if="!authStore.user" class="flex items-center justify-center py-8">
        <div class="w-5 h-5 border-2 rounded-full animate-spin" style="border-color: #624200; border-top-color: transparent;"></div>
      </div>
      <SidebarItem v-for="item in menuItems" :key="item.path" :item="item" :collapsed="!appStore.sidebarOpen" />
    </nav>

    <!-- Bottom Actions -->
    <div class="absolute bottom-16 left-0 right-0 px-3 space-y-1">
      <router-link to="/app/profile"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
        :class="appStore.sidebarOpen ? '' : 'justify-center'"
        style="color: #4f4539; text-decoration: none;"
        @mouseenter="hoverProfile = true" @mouseleave="hoverProfile = false"
        :style="hoverProfile ? { background: 'rgba(98,66,0,0.05)', color: '#624200' } : {}">
        <span class="material-icons-outlined text-xl flex-shrink-0">person</span>
        <span v-if="appStore.sidebarOpen" class="text-sm font-medium truncate" style="font-family: 'Inter', sans-serif;">Mi Perfil</span>
      </router-link>
      <button @click="handleLogout"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
        :class="appStore.sidebarOpen ? '' : 'justify-center'"
        style="color: #dc2626; background: transparent; border: none; cursor: pointer; font-family: 'Inter', sans-serif;"
        @mouseenter="hoverLogout = true" @mouseleave="hoverLogout = false"
        :style="hoverLogout ? { background: 'rgba(220,38,38,0.05)' } : {}">
        <span class="material-icons-outlined text-xl flex-shrink-0">logout</span>
        <span v-if="appStore.sidebarOpen" class="text-sm font-medium truncate">Salir del Sistema</span>
      </button>
    </div>

    <!-- Toggle -->
    <div class="absolute bottom-4 left-0 right-0 px-3">
      <button @click="appStore.toggleSidebar"
              class="w-full flex items-center justify-center p-2 rounded-xl transition-all duration-200"
              style="color: #817567; background: transparent; border: none; cursor: pointer;"
              @mouseenter="hoverToggle = true" @mouseleave="hoverToggle = false"
              :style="hoverToggle ? { background: 'rgba(98,66,0,0.05)', color: '#624200' } : {}">
        <span class="material-icons-outlined text-xl">
          {{ appStore.sidebarOpen ? 'chevron_left' : 'chevron_right' }}
        </span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../../stores/app';
import { useAuthStore } from '../../stores/auth';
import { useAuth } from '../../composables/useAuth';
import SidebarItem from './SidebarItem.vue';

const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();
const { can } = useAuth();

const hoverProfile = ref(false);
const hoverLogout = ref(false);
const hoverToggle = ref(false);

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};

const menuItems = computed(() => [
  { path: '/app/dashboard', label: 'Dashboard', icon: 'dashboard', show: true },
  { path: '/app/products', label: 'Productos', icon: 'inventory_2', show: can('products', 'read') },
  { path: '/app/categories', label: 'Categorías', icon: 'category', show: can('products', 'read') },
  { path: '/app/inventory', label: 'Inventario', icon: 'warehouse', show: can('inventory', 'read') },
  { path: '/app/pos', label: 'Punto de Venta', icon: 'point_of_sale', show: can('sales', 'create') },
  { path: '/app/sales', label: 'Ventas', icon: 'receipt_long', show: can('sales', 'read') },
  { path: '/app/purchases', label: 'Compras', icon: 'shopping_cart', show: can('purchases', 'read') },
  { path: '/app/suppliers', label: 'Proveedores', icon: 'local_shipping', show: can('purchases', 'read') },
  { path: '/app/clients', label: 'Clientes', icon: 'people', show: can('clients', 'read') },
  { path: '/app/invoices', label: 'Facturas', icon: 'receipt', show: can('sales', 'read') },
  { path: '/app/reports', label: 'Reportes', icon: 'bar_chart', show: can('reports', 'view') },
  { path: '/app/ecommerce', label: 'Ecommerce', icon: 'store', show: can('ecommerce', 'manage') },
  { path: '/app/admin', label: 'Admin', icon: 'admin_panel_settings', show: can('admin', 'access') }
].filter(item => item.show));
</script>

<template>
  <!-- Mobile overlay -->
  <div v-if="appStore.sidebarMobileOpen" class="fixed inset-0 bg-black/50 z-30 lg:hidden" @click="appStore.closeSidebarMobile"></div>

  <!-- Sidebar -->
  <aside class="fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 transition-all duration-300 shadow-sm"
         :class="[
           appStore.sidebarOpen ? 'w-64' : 'w-20',
           appStore.sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full',
           'lg:translate-x-0'
         ]">
    <!-- Logo -->
    <div class="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-3" v-if="appStore.sidebarOpen">
        <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">AS</span>
        </div>
        <span class="font-semibold text-gray-900 dark:text-white text-lg">Animal Store</span>
      </div>
      <div v-else class="mx-auto">
        <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">AS</span>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="mt-4 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-16rem)]">
      <div v-if="!authStore.user" class="flex items-center justify-center py-8">
        <div class="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <SidebarItem v-for="item in menuItems" :key="item.path" :item="item" :collapsed="!appStore.sidebarOpen" />
    </nav>

    <!-- Bottom Actions -->
    <div class="absolute bottom-12 left-0 right-0 px-3 space-y-1">
      <router-link to="/app/profile"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        :class="{ 'justify-center': !appStore.sidebarOpen }">
        <span class="material-icons-outlined text-xl flex-shrink-0 text-purple-500">person</span>
        <span v-if="appStore.sidebarOpen" class="text-sm font-medium truncate">Mi Perfil</span>
      </router-link>
      <button @click="handleLogout"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        :class="{ 'justify-center': !appStore.sidebarOpen }">
        <span class="material-icons-outlined text-xl flex-shrink-0">logout</span>
        <span v-if="appStore.sidebarOpen" class="text-sm font-medium truncate">Salir del Sistema</span>
      </button>
    </div>

    <!-- Toggle -->
    <div class="absolute bottom-4 left-0 right-0 px-3">
      <button @click="appStore.toggleSidebar"
              class="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <span class="material-icons-outlined text-xl">
          {{ appStore.sidebarOpen ? 'chevron_left' : 'chevron_right' }}
        </span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../../stores/app';
import { useAuthStore } from '../../stores/auth';
import { useAuth } from '../../composables/useAuth';
import SidebarItem from './SidebarItem.vue';

const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();
const { can } = useAuth();

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

<template>
  <!-- Mobile overlay -->
  <div
    v-if="appStore.sidebarMobileOpen"
    class="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
    @click="appStore.closeSidebarMobile"
  ></div>

  <!-- Sidebar - Aurora Neumorphism -->
  <aside
    class="aurora-sidebar fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-out flex flex-col shadow-xl"
    :class="[
      appStore.sidebarOpen ? 'w-[280px]' : 'w-[88px]',
      appStore.sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full',
      'lg:translate-x-0'
    ]"
  >
    <!-- Logo / Brand — Aurora ERP style -->
    <div class="flex items-center h-[72px] px-5 flex-shrink-0">
      <div class="flex items-center gap-3" v-if="appStore.sidebarOpen">
        <div
          class="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
          style="background: var(--aurora-gradient)"
        >
          <img v-if="storeLogo" :src="storeLogo" class="w-full h-full object-cover" alt="Logo" />
          <span
            v-else
            class="material-symbols-outlined text-white text-2xl"
            style="font-variation-settings: 'FILL' 1"
            >diamond</span
          >
        </div>
        <div>
          <span class="font-headline-lg font-black text-primary" style="font-size: 20px">{{
            storeName || 'Aurora ERP'
          }}</span>
          <p
            class="text-label-md text-on-surface-variant opacity-70"
            style="font-size: 12px; margin-top: -2px"
          >
            Enterprise Suite
          </p>
        </div>
      </div>
      <div v-else class="mx-auto">
        <div
          class="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
          style="background: var(--aurora-gradient)"
        >
          <img v-if="storeLogo" :src="storeLogo" class="w-full h-full object-cover" alt="Logo" />
          <span
            v-else
            class="material-symbols-outlined text-white text-2xl"
            style="font-variation-settings: 'FILL' 1"
            >diamond</span
          >
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="mt-2 px-3 space-y-0.5 overflow-y-auto flex-1 aurora-scroll">
      <div v-if="!authStore.user" class="flex items-center justify-center py-8">
        <div
          class="w-5 h-5 border-2 rounded-full animate-spin"
          style="border-color: var(--aurora-primary); border-top-color: transparent"
        ></div>
      </div>
      <div v-for="item in menuItems" :key="item.path">
        <router-link
          v-if="!item.children"
          :to="item.path"
          class="aurora-sidebar-item"
          :class="{ active: isActive(item.path), 'justify-center': !appStore.sidebarOpen }"
          :title="item.label"
        >
          <span class="material-symbols-outlined text-xl">{{ item.icon }}</span>
          <span v-if="appStore.sidebarOpen" class="font-label-md whitespace-nowrap">{{
            item.label
          }}</span>
          <span
            v-if="appStore.sidebarOpen && item.badge"
            class="ml-auto text-xs px-2 py-0.5 rounded-full"
            style="
              background: var(--aurora-primary-fixed);
              color: var(--aurora-on-primary-fixed-variant);
            "
            >{{ item.badge }}</span
          >
        </router-link>
        <!-- Items with sub-items -->
        <div v-else>
          <div
            @click="toggleSubmenu(item)"
            class="aurora-sidebar-item"
            :class="{ active: isActive(item.path), 'justify-center': !appStore.sidebarOpen }"
            :title="item.label"
          >
            <span class="material-symbols-outlined text-xl">{{ item.icon }}</span>
            <span v-if="appStore.sidebarOpen" class="font-label-md flex-1 whitespace-nowrap">{{
              item.label
            }}</span>
            <span
              v-if="appStore.sidebarOpen"
              class="material-symbols-outlined text-lg transition-transform duration-200"
              :class="{ 'rotate-180': item._open }"
              >expand_more</span
            >
          </div>
          <div v-if="item._open && appStore.sidebarOpen" class="ml-4 space-y-0.5">
            <router-link
              v-for="child in item.children"
              :key="child.path"
              :to="child.path"
              class="aurora-sidebar-item text-sm"
              :class="{ active: isActive(child.path) }"
            >
              <span class="material-symbols-outlined text-lg">{{ child.icon || 'circle' }}</span>
              <span class="font-label-md">{{ child.label }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Bottom Section -->
    <div class="flex-shrink-0 px-3 pb-3 space-y-1 border-t border-outline-variant/30 pt-3">
      <!-- Profile -->
      <router-link
        to="/app/profile"
        class="aurora-sidebar-item"
        :class="{ 'justify-center': !appStore.sidebarOpen }"
      >
        <span class="material-symbols-outlined text-xl">person</span>
        <span v-if="appStore.sidebarOpen" class="font-label-md whitespace-nowrap">Mi Perfil</span>
      </router-link>

      <!-- Logout -->
      <button
        @click="handleLogout"
        class="aurora-sidebar-item w-full"
        :class="{ 'justify-center': !appStore.sidebarOpen }"
        style="color: var(--aurora-error)"
      >
        <span class="material-symbols-outlined text-xl">logout</span>
        <span v-if="appStore.sidebarOpen" class="font-label-md whitespace-nowrap"
          >Cerrar Sesión</span
        >
      </button>
    </div>

    <!-- Toggle Button -->
    <div class="flex-shrink-0 px-3 pb-4">
      <button
        @click="appStore.toggleSidebar"
        class="w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 text-on-surface-variant hover:bg-surface-container-highest"
      >
        <span
          class="material-symbols-outlined text-lg transition-transform duration-200"
          :class="{ 'rotate-180': !appStore.sidebarOpen }"
        >
          chevron_left
        </span>
      </button>
    </div>
  </aside>
</template>

<script setup>
  import { computed, ref, onMounted } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import { useAppStore } from '../../stores/app';
  import { useAuthStore } from '../../stores/auth';
  import { useAuth } from '../../composables/useAuth';
  import { ecommerceAPI } from '../../api';

  const router = useRouter();
  const route = useRoute();
  const appStore = useAppStore();
  const authStore = useAuthStore();
  const { can } = useAuth();

  const storeName = ref('');
  const storeLogo = ref('');

  onMounted(async () => {
    try {
      const res = await ecommerceAPI.getSettings();
      if (res.data) {
        storeName.value = res.data.store_name || '';
        storeLogo.value = res.data.logo_url || '';
      }
    } catch (e) {
      /* fallback to defaults */
    }
  });

  const handleLogout = async () => {
    await authStore.logout();
    router.push('/login');
  };

  function isActive(path) {
    if (path === '/app/dashboard') return route.path === '/app/dashboard';
    return route.path.startsWith(path);
  }

  function toggleSubmenu(item) {
    item._open = !item._open;
  }

  const menuItems = computed(() =>
    [
      { path: '/app/dashboard', label: 'Dashboard', icon: 'dashboard', show: true },
      {
        path: '/app/products',
        label: 'Productos',
        icon: 'inventory_2',
        show: can('products', 'read')
      },
      {
        path: '/app/categories',
        label: 'Categorías',
        icon: 'category',
        show: can('products', 'read')
      },
      {
        path: '/app/inventory',
        label: 'Inventario',
        icon: 'swap_horiz',
        show: can('inventory', 'read')
      },
      { path: '/app/sales', label: 'Ventas', icon: 'payments', show: can('sales', 'read') },
      {
        path: '/app/purchases',
        label: 'Compras',
        icon: 'shopping_cart',
        show: can('purchases', 'read')
      },
      {
        path: '/app/suppliers',
        label: 'Proveedores',
        icon: 'local_shipping',
        show: can('purchases', 'read')
      },
      { path: '/app/clients', label: 'Clientes', icon: 'group', show: can('clients', 'read') },
      { path: '/app/invoices', label: 'Facturas', icon: 'description', show: can('sales', 'read') },
      { path: '/app/reports', label: 'Reportes', icon: 'analytics', show: can('reports', 'view') },
      { path: '/app/ecommerce', label: 'Ecommerce', icon: 'web', show: can('ecommerce', 'manage') },
      {
        path: '/app/cash-register',
        label: 'Punto de Venta',
        icon: 'point_of_sale',
        show: can('sales', 'create')
      }
    ].filter((item) => item.show)
  );
</script>

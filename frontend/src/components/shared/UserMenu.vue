<template>
  <div class="relative user-menu-wrapper">
    <!-- Trigger Button -->
    <slot name="trigger" :toggle="toggleMenu" :isOpen="isOpen">
      <button @click="toggleMenu"
        class="flex items-center gap-3 p-1.5 pr-4 rounded-xl transition-all duration-200 btn-secondary navbar-btn-hover"
        :class="{ 'ring-2 ring-primary/20': isOpen }"
        style="cursor: pointer;">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-sm transition-transform duration-200 navbar-avatar"
          style="background: linear-gradient(135deg, #7c3aed, #a78bfa);">
          {{ userInitials }}
        </div>
        <div class="text-left hidden sm:block">
          <p class="text-sm font-semibold navbar-user-name" style="font-family: 'Inter', sans-serif;">{{ userName }}</p>
          <p class="text-xs flex items-center gap-1.5 navbar-user-role">
            <span class="w-1.5 h-1.5 rounded-full inline-block" style="background: #22c55e;"></span>
            {{ userRoleLabel }}
          </p>
        </div>
        <span class="material-icons-outlined text-lg transition-transform duration-200 navbar-expand-icon"
          :class="{ 'rotate-180': isOpen }">expand_more</span>
      </button>
    </slot>

    <!-- Dropdown Menu -->
    <transition name="fade-scale">
      <div v-if="isOpen"
        class="absolute right-0 mt-2 w-64 rounded-xl z-50 overflow-hidden border shadow-lg navbar-dropdown"
        :class="{ 'origin-top-right': alignRight, 'origin-top-left': !alignRight }">
        <!-- User Info Header -->
        <div class="p-4 border-b navbar-dropdown-header">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-md navbar-avatar"
              style="background: linear-gradient(135deg, #7c3aed, #a78bfa);">
              {{ userInitials }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate navbar-user-name">{{ userName }}</p>
              <p class="text-xs truncate navbar-user-role">{{ userEmail }}</p>
            </div>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="py-1.5">
          <template v-for="item in filteredMenuItems" :key="item.to || item.action">
            <!-- Divider -->
            <hr v-if="item.divider" class="my-1.5 mx-3 navbar-dropdown-divider">

            <!-- Router Link -->
            <router-link v-else-if="item.to"
              :to="item.to"
              @click="closeMenu"
              class="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors navbar-dropdown-item"
              style="text-decoration: none;">
              <span class="material-icons-outlined text-lg navbar-dropdown-icon" :style="{ color: item.iconColor || '#64748b' }">{{ item.icon }}</span>
              {{ item.label }}
              <span v-if="item.badge != null" class="ml-auto text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style="background: #ef4444;">
                {{ item.badge > 9 ? '9+' : item.badge }}
              </span>
            </router-link>

            <!-- Action Button -->
            <button v-else
              @click="handleItemClick(item)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors navbar-dropdown-item"
              :class="item.danger ? 'navbar-logout-btn' : ''"
              :style="{ background: 'transparent', border: 'none', cursor: 'pointer' }">
              <span class="material-icons-outlined text-lg" :class="item.danger ? '' : 'navbar-dropdown-icon'" :style="{ color: item.iconColor || (item.danger ? '#ef4444' : '#64748b') }">{{ item.icon }}</span>
              {{ item.label }}
            </button>
          </template>
        </div>

        <!-- Extra slot for custom content -->
        <slot name="extra" />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const props = defineProps({
  /** 'dashboard' | 'landing' - affects menu items shown */
  context: { type: String, default: 'dashboard' },
  /** Align dropdown to the right (default true) */
  alignRight: { type: Boolean, default: true },
  /** Custom menu items override - if not provided, computed from role */
  menuItems: { type: Array, default: null },
  /** Unread notifications count */
  unreadCount: { type: Number, default: 0 },
  /** Custom logout handler */
  onLogout: { type: Function, default: null }
});

const emit = defineEmits(['close']);

const router = useRouter();
const authStore = useAuthStore();
const isOpen = ref(false);

const user = computed(() => authStore.user);
const userName = computed(() => authStore.user?.name || 'Usuario');
const userEmail = computed(() => authStore.user?.email || '');
const userRole = computed(() => authStore.user?.role || authStore.user?.role_name || '');

const userRoleLabel = computed(() => {
  const roleMap = {
    admin: 'Administrador',
    vendedor: 'Vendedor',
    almacen: 'Almacén',
    cliente: 'Cliente',
    cashier: 'Cajero'
  };
  return roleMap[userRole.value.toLowerCase()] || userRole.value || 'Usuario';
});

const userInitials = computed(() => {
  if (!authStore.user?.name) return '??';
  return authStore.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

// Define menu items based on context and role
const defaultMenuItems = computed(() => {
  const items = [];

  if (props.context === 'dashboard') {
    // Dashboard context - for admin, almacen, vendedor, cashier
    items.push(
      { to: '/app/profile', label: 'Mi Perfil', icon: 'person', iconColor: '#7c3aed' },
      { to: '/app/notifications', label: 'Notificaciones', icon: 'notifications', iconColor: '#f59e0b', badge: props.unreadCount },
    );
    // Config only for admin
    if (['admin'].includes(userRole.value.toLowerCase())) {
      items.push(
        { to: '/app/admin/config', label: 'Configuración', icon: 'settings', iconColor: '#64748b' }
      );
    }
    items.push({ divider: true });
    items.push({ action: 'logout', label: 'Cerrar Sesión', icon: 'logout', danger: true });
  } else {
    // Landing page context
    items.push(
      { to: '/account/profile', label: 'Ver Perfil', icon: 'person', iconColor: '#7c3aed' }
    );
    // Cliente sees purchases
    if (userRole.value.toLowerCase() === 'cliente') {
      items.push(
        { to: '/account/purchases', label: 'Mis Compras', icon: 'receipt_long', iconColor: '#f59e0b' }
      );
    }
    items.push(
      { to: '/account/notifications', label: 'Notificaciones', icon: 'notifications', iconColor: '#3b82f6', badge: props.unreadCount },
      { to: '/account/profile', label: 'Configuración', icon: 'settings', iconColor: '#64748b' }
    );
    items.push({ divider: true });
    items.push({ action: 'logout', label: 'Cerrar Sesión', icon: 'logout', danger: true });
  }
  return items;
});

const filteredMenuItems = computed(() => {
  return props.menuItems || defaultMenuItems.value;
});

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

const closeMenu = () => {
  isOpen.value = false;
  emit('close');
};

const handleItemClick = async (item) => {
  isOpen.value = false;
  if (item.action === 'logout') {
    if (props.onLogout) {
      await props.onLogout();
    } else {
      await authStore.logout();
      if (props.context === 'dashboard') {
        router.push('/login');
      } else {
        router.push('/');
      }
    }
  }
  emit('close');
};

// Close on outside click
const handleOutsideClick = (e) => {
  if (!e.target.closest) return;
  if (isOpen.value && !e.target.closest('.user-menu-wrapper')) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener('click', handleOutsideClick));
onUnmounted(() => document.removeEventListener('click', handleOutsideClick));
</script>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.15s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

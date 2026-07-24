<template>
  <header class="aurora-glass-header h-16 flex items-center justify-between px-gutter sticky top-0 z-30 shadow-sm">
    <!-- Left side -->
    <div class="flex items-center gap-md">
      <button @click="appStore.toggleSidebarMobile"
              class="lg:hidden aurora-btn-icon">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <button @click="appStore.toggleSidebar"
              class="hidden lg:inline-flex aurora-btn-icon">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <!-- Search Bar -->
      <div class="relative hidden sm:block" v-if="showSearch">
        <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input type="text" placeholder="Buscar en el sistema..."
               class="aurora-search w-72 pl-10 pr-10"
               style="font-family: 'Inter', sans-serif;" />
        <kbd class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-medium px-1.5 py-0.5 rounded hidden lg:inline"
             style="font-family: 'Inter', sans-serif; background: var(--aurora-surface-container-low); color: var(--aurora-outline);">⌘K</kbd>
      </div>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-2">
      <!-- Theme toggle -->
      <button @click="appStore.toggleDarkMode"
              class="aurora-btn-icon"
              :title="appStore.darkMode ? 'Modo claro' : 'Modo oscuro'">
        <span class="material-symbols-outlined">{{ appStore.darkMode ? 'light_mode' : 'dark_mode' }}</span>
      </button>

      <!-- Notifications -->
      <div class="relative" ref="notificationContainer">
        <button @click="toggleNotificationModal"
                class="aurora-btn-icon">
          <span class="material-symbols-outlined">notifications</span>
          <span v-if="unreadCount > 0"
                class="absolute -top-0.5 -right-0.5 w-5 h-5 text-[10px] text-white font-bold rounded-full flex items-center justify-center"
                style="background: var(--aurora-error);">
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </button>

        <!-- Notifications Dropdown -->
        <NotificationModal
          :show="showNotificationModal"
          @close="showNotificationModal = false"
          @update:unreadCount="unreadCount = $event"
        />
      </div>

      <!-- User Menu -->
      <UserMenu
        context="dashboard"
        :unreadCount="unreadCount"
      >
        <template #trigger="{ toggle }">
          <button @click="toggle"
                  class="flex items-center gap-3 p-1.5 pr-4 rounded-xl transition-all duration-200 aurora-raised"
                  style="cursor: pointer;">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold"
                 style="background: var(--aurora-gradient);">
              {{ userInitials }}
            </div>
            <div class="text-left hidden sm:block">
              <p class="text-sm font-semibold text-on-surface" style="font-family: 'Inter', sans-serif;">{{ user?.name }}</p>
              <p class="text-xs flex items-center gap-1.5 text-on-surface-variant">
                <span class="w-1.5 h-1.5 rounded-full inline-block" style="background: #22c55e;"></span>
                {{ userRole }}
              </p>
            </div>
            <span class="material-symbols-outlined text-lg text-on-surface-variant">expand_more</span>
          </button>
        </template>
      </UserMenu>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../../stores/app';
import { useAuthStore } from '../../stores/auth';
import { useNotifications } from '../../composables/useNotifications';
import { formatRelativeTime } from '../../utils';
import NotificationModal from '../notifications/NotificationModal.vue';
import UserMenu from '../shared/UserMenu.vue';

const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();
const { unreadCount } = useNotifications();

const notificationContainer = ref(null);
const showNotificationModal = ref(false);
const showSearch = ref(false);
const user = computed(() => authStore.user);
const userRole = computed(() => authStore.user?.role_name || 'Usuario');

const userInitials = computed(() => {
  if (!authStore.user?.name) return '??';
  return authStore.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

const toggleNotificationModal = () => {
  showNotificationModal.value = !showNotificationModal.value;
};

// Close notification modal on outside click
const closeMenus = (e) => {
  if (!e.target.closest) return;
  if (showNotificationModal.value && notificationContainer.value && !notificationContainer.value.contains(e.target)) {
    showNotificationModal.value = false;
  }
};

onMounted(() => document.addEventListener('click', closeMenus));
onUnmounted(() => document.removeEventListener('click', closeMenus));
</script>

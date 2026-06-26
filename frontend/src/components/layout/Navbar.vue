<template>
  <header class="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 sticky top-0 z-20">
    <!-- Left side -->
    <div class="flex items-center gap-4">
      <button @click="appStore.toggleSidebarMobile" class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
        <span class="material-icons-outlined">menu</span>
      </button>
      <button @click="appStore.toggleSidebar" class="hidden lg:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
        <span class="material-icons-outlined">menu</span>
      </button>
      <div class="relative" v-if="false">
        <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
        <input type="text" placeholder="Buscar..."
               class="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64" />
      </div>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-3">
      <!-- Notifications -->
      <div class="relative">
        <button @click="showNotifications = !showNotifications"
                class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 relative">
          <span class="material-icons-outlined">notifications</span>
          <span v-if="unreadCount > 0"
                class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </button>

        <!-- Notifications dropdown -->
        <div v-if="showNotifications"
             class="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 class="font-semibold text-sm text-gray-900 dark:text-white">Notificaciones</h3>
            <button v-if="unreadCount > 0" @click="markAllAsRead" class="text-xs text-primary-600 hover:underline">
              Marcar todas leídas
            </button>
          </div>
          <div class="max-h-72 overflow-y-auto">
            <div v-if="notifications.length === 0" class="p-4 text-center text-gray-500 text-sm">
              No hay notificaciones
            </div>
            <div v-for="notif in notifications" :key="notif.id"
                 class="p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                 @click="markAsRead(notif.id)">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ notif.title }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ notif.message }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ formatRelativeTime(notif.created_at) }}</p>
            </div>
          </div>
          <div class="p-2 border-t border-gray-100 dark:border-gray-700">
            <router-link to="/app/notifications" @click="showNotifications = false"
              class="block text-center text-xs text-primary-600 hover:text-primary-700 font-medium py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
              Ver todas las notificaciones
            </router-link>
          </div>
        </div>
      </div>

      <!-- User Menu -->
      <div class="relative">
        <button @click="showUserMenu = !showUserMenu"
                class="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-primary-600 flex items-center justify-center text-white text-sm font-medium shadow-md shadow-purple-600/20 transition-transform duration-200 hover:scale-105">
            {{ userInitials }}
          </div>
          <div class="text-left hidden sm:block">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ user?.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              {{ userRole }}
            </p>
          </div>
          <span class="material-icons-outlined text-gray-400 text-lg transition-transform duration-200" :class="{ 'rotate-180': showUserMenu }">expand_more</span>
        </button>

        <div v-if="showUserMenu"
             class="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div class="p-4 bg-gradient-to-r from-purple-600/10 to-primary-600/10 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-primary-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                {{ userInitials }}
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ user?.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ user?.email }}</p>
              </div>
            </div>
          </div>
          <div class="py-2">
            <router-link to="/app/profile" @click="showUserMenu = false"
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span class="material-icons-outlined text-lg text-primary-500">person</span>
              Mi Perfil
            </router-link>
            <router-link to="/app/notifications" @click="showUserMenu = false"
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span class="material-icons-outlined text-lg text-amber-500">notifications</span>
              Notificaciones
              <span v-if="unreadCount > 0" class="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
            </router-link>
            <router-link to="/app/admin/config" @click="showUserMenu = false"
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <span class="material-icons-outlined text-lg text-gray-400">settings</span>
              Configuración
            </router-link>
            <hr class="my-1 border-gray-200 dark:border-gray-700 mx-3">
            <button @click="handleLogout"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <span class="material-icons-outlined text-lg">logout</span>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
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

const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();
const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

const showNotifications = ref(false);
const showUserMenu = ref(false);
const user = computed(() => authStore.user);
const userRole = computed(() => authStore.user?.role_name || 'Usuario');

const userInitials = computed(() => {
  if (!authStore.user?.name) return '??';
  return authStore.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};

// Close menus on outside click
const closeMenus = (e) => {
  if (!e.target.closest) return;
  showNotifications.value = false;
  showUserMenu.value = false;
};

onMounted(() => document.addEventListener('click', closeMenus));
onUnmounted(() => document.removeEventListener('click', closeMenus));
</script>

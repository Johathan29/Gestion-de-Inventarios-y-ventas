<template>
  <header class="dt-navbar h-20 flex items-center justify-between px-6 sticky top-0 z-20">
    <!-- Left side -->
    <div class="flex items-center gap-4">
      <button @click="appStore.toggleSidebarMobile" class="dt-mobile-menu-btn lg:hidden">
        <span class="material-icons-outlined">menu</span>
      </button>
      <button @click="appStore.toggleSidebar" class="hidden lg:flex dt-mobile-menu-btn">
        <span class="material-icons-outlined">menu</span>
      </button>
      <!-- Search (hidden by default) -->
      <div class="relative hidden sm:block" v-if="showSearch">
        <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2" style="color: #817567;">search</span>
        <input type="text" placeholder="Buscar..."
               class="pl-10 pr-4 py-2 rounded-full border outline-none transition-all"
               style="border-color: rgba(210,196,180,0.5); background: rgba(255,255,255,0.5); font-family: 'Inter', sans-serif; font-size: 14px; width: 16rem;"
               @focus="e => e.target.style.borderColor = '#a17808'"
               @blur="e => e.target.style.borderColor = 'rgba(210,196,180,0.5)'" />
      </div>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-3">
      <!-- Notifications -->
      <div class="relative">
        <button @click="showNotifications = !showNotifications"
                class="p-2 rounded-xl transition-all duration-200"
                style="color: #4f4539; background: transparent; border: none; cursor: pointer;"
                @mouseenter="e => e.target.style.background = 'rgba(98,66,0,0.05)'"
                @mouseleave="e => e.target.style.background = 'transparent'">
          <span class="material-icons-outlined">notifications</span>
          <span v-if="unreadCount > 0"
                class="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center"
                style="background: #dc2626;">
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </button>

        <!-- Notifications dropdown -->
        <div v-if="showNotifications"
             class="absolute right-0 mt-2 w-80 dt-card z-50 overflow-hidden">
          <div class="p-3 border-b flex justify-between items-center" style="border-color: rgba(210,196,180,0.3);">
            <h3 class="font-semibold text-sm" style="font-family: 'Plus Jakarta Sans', sans-serif; color: #452d00;">Notificaciones</h3>
            <button v-if="unreadCount > 0" @click="markAllAsRead" class="text-xs" style="color: #624200;">
              Marcar todas leídas
            </button>
          </div>
          <div class="max-h-72 overflow-y-auto">
            <div v-if="notifications.length === 0" class="p-4 text-center text-sm" style="color: #4f4539;">
              No hay notificaciones
            </div>
            <div v-for="notif in notifications" :key="notif.id"
                 class="p-3 border-b cursor-pointer transition-colors"
                 style="border-color: rgba(210,196,180,0.15);"
                 @click="markAsRead(notif.id)"
                 @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.03)'"
                 @mouseleave="e => e.currentTarget.style.background = 'transparent'">
              <p class="text-sm font-medium" style="color: #0b1c30; font-family: 'Inter', sans-serif;">{{ notif.title }}</p>
              <p class="text-xs mt-1" style="color: #4f4539;">{{ notif.message }}</p>
              <p class="text-xs mt-1" style="color: #817567;">{{ formatRelativeTime(notif.created_at) }}</p>
            </div>
          </div>
          <div class="p-2 border-t" style="border-color: rgba(210,196,180,0.3);">
            <router-link to="/app/notifications" @click="showNotifications = false"
              class="block text-center text-xs font-medium py-1.5 rounded-lg transition-colors"
              style="color: #624200; text-decoration: none;"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.05)'"
              @mouseleave="e => e.currentTarget.style.background = 'transparent'">
              Ver todas las notificaciones
            </router-link>
          </div>
        </div>
      </div>

      <!-- User Menu -->
      <div class="relative">
        <button @click="showUserMenu = !showUserMenu"
                class="flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-all duration-200 border"
                style="background: transparent; border-color: transparent; cursor: pointer;"
                @mouseenter="e => { e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(210,196,180,0.3)'; }"
                @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-medium shadow-sm transition-transform duration-200"
               style="background: #624200;"
               @mouseenter="e => e.currentTarget.style.transform = 'scale(1.05)'"
               @mouseleave="e => e.currentTarget.style.transform = 'scale(1)'">
            {{ userInitials }}
          </div>
          <div class="text-left hidden sm:block">
            <p class="text-sm font-semibold" style="color: #0b1c30; font-family: 'Inter', sans-serif;">{{ user?.name }}</p>
            <p class="text-xs flex items-center gap-1" style="color: #4f4539;">
              <span class="w-1.5 h-1.5 rounded-full inline-block" style="background: #059669;"></span>
              {{ userRole }}
            </p>
          </div>
          <span class="material-icons-outlined text-lg transition-transform duration-200" style="color: #817567;" :class="{ 'rotate-180': showUserMenu }">expand_more</span>
        </button>

        <div v-if="showUserMenu"
             class="absolute right-0 mt-2 w-64 dt-card z-50 overflow-hidden" style="border-radius: 16px;">
          <div class="p-4 border-b" style="background: rgba(98,66,0,0.03); border-color: rgba(210,196,180,0.3);">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md" style="background: #624200;">
                {{ userInitials }}
              </div>
              <div>
                <p class="text-sm font-semibold" style="color: #0b1c30;">{{ user?.name }}</p>
                <p class="text-xs" style="color: #4f4539;">{{ user?.email }}</p>
              </div>
            </div>
          </div>
          <div class="py-2">
            <router-link to="/app/profile" @click="showUserMenu = false"
              class="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style="color: #4f4539; text-decoration: none;"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.05)'"
              @mouseleave="e => e.currentTarget.style.background = 'transparent'">
              <span class="material-icons-outlined text-lg" style="color: #624200;">person</span>
              Mi Perfil
            </router-link>
            <router-link to="/app/notifications" @click="showUserMenu = false"
              class="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style="color: #4f4539; text-decoration: none;"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.05)'"
              @mouseleave="e => e.currentTarget.style.background = 'transparent'">
              <span class="material-icons-outlined text-lg" style="color: #d97706;">notifications</span>
              Notificaciones
              <span v-if="unreadCount > 0" class="ml-auto text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" style="background: #dc2626;">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
            </router-link>
            <router-link to="/app/admin/config" @click="showUserMenu = false"
              class="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style="color: #4f4539; text-decoration: none;"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.05)'"
              @mouseleave="e => e.currentTarget.style.background = 'transparent'">
              <span class="material-icons-outlined text-lg" style="color: #817567;">settings</span>
              Configuración
            </router-link>
            <hr class="my-1 mx-3" style="border-color: rgba(210,196,180,0.3);">
            <button @click="handleLogout"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style="color: #dc2626; background: transparent; border: none; cursor: pointer;"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(220,38,38,0.05)'"
              @mouseleave="e => e.currentTarget.style.background = 'transparent'">
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
const showSearch = ref(false);
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

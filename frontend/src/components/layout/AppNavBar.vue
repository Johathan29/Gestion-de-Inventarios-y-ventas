<template>
  <nav class="fixed top-0 w-full z-50 bg-white/5 backdrop-blur-xl border-b border-white/20 flex justify-between items-center !px-4 !py-5">
    <div class="max-w-7xl mx-auto flex items-center justify-between w-full">
      <router-link to="/" class="font-headline-md text-headline-md font-bold text-primary">Animal Store</router-link>
      <div class="hidden md:flex gap-4 items-center">
        <a
          v-for="link in anchorLinks"
          :key="link.id"
          :href="`/#${link.id}`"
          :class="navLinkClass(link.id)"
        >{{ link.label }}</a>
        <router-link
          :to="{ name: 'ProductsCatalog' }"
          :class="navLinkClass('products')"
        >Productos</router-link>
      </div>

      <div class="flex items-center gap-6">
        <!-- Notificaciones (solo clientes autenticados) -->
        <div v-if="isClient" class="relative">
          <button
            @click.stop="toggleNotifications"
            class="text-secondary hover:text-primary transition-all duration-300 relative"
            :class="{ 'text-primary': showNotifications }"
          >
            <span class="material-symbols-outlined">notifications</span>
            <span
              v-if="notifUnread > 0"
              class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] min-w-4 h-4 rounded-full flex items-center justify-center font-bold px-1"
            >{{ notifUnread > 9 ? '9+' : notifUnread }}</span>
          </button>

          <transition name="fade">
            <div
              v-if="showNotifications"
              class="absolute right-0 top-full mt-2 w-80 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/30 py-2 overflow-hidden"
            >
              <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-900">Notificaciones</h3>
                <button v-if="notifUnread > 0" @click.stop="markAllRead" class="text-xs text-primary hover:underline">Marcar leídas</button>
              </div>
              <div class="max-h-72 overflow-y-auto">
                <div v-if="notifList.length === 0" class="p-6 text-center text-gray-400 text-sm">
                  <span class="material-symbols-outlined text-3xl mb-2 block">notifications_off</span>
                  No hay notificaciones
                </div>
                <div v-for="n in notifList" :key="n.id"
                  class="px-4 py-3 border-b border-gray-50 hover:bg-primary/5 cursor-pointer transition-colors"
                  @click.stop="markRead(n.id)">
                  <p class="text-sm font-medium text-gray-900">{{ n.title }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">{{ n.message }}</p>
                  <p class="text-xs text-gray-400 mt-1">{{ formatRelativeTime(n.created_at) }}</p>
                </div>
              </div>
              <router-link to="/account/notifications" @click="showNotifications = false"
                class="block text-center text-xs text-primary hover:text-primary-dark font-medium py-2.5 border-t border-gray-100 hover:bg-primary/5 transition-colors">
                Ver todas las notificaciones
              </router-link>
            </div>
          </transition>
        </div>

        <!-- Menú de usuario -->
        <div v-if="isClient" class="relative">
          <button
            @click="toggleUserMenu"
            class="flex items-center gap-2 text-secondary hover:text-primary transition-all duration-300"
            :class="{ 'text-primary': showUserMenu }"
          >
            <span class="material-symbols-outlined">account_circle</span>
            <span class="text-sm font-medium hidden sm:inline">{{ userName }}</span>
            <span class="material-symbols-outlined text-sm">{{ showUserMenu ? 'expand_less' : 'expand_more' }}</span>
          </button>

          <!-- Dropdown -->
          <transition name="fade">
            <div
              v-if="showUserMenu"
              class="absolute right-0 top-full mt-2 w-56 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/30 py-2 overflow-hidden"
            >
              <div class="px-4 py-3 border-b border-gray-100">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ userName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ userEmail }}</p>
              </div>

              <router-link
                v-for="item in menuItems"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
                @click="showUserMenu = false"
              >
                <span class="material-symbols-outlined text-lg">{{ item.icon }}</span>
                {{ item.label }}
              </router-link>

              <div class="border-t border-gray-100 mt-1 pt-1">
                <button
                  @click="handleLogout"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <span class="material-symbols-outlined text-lg">logout</span>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </transition>
        </div>

        <!-- Icono de login para usuarios no autenticados -->
        <router-link v-else to="/login" class="text-secondary hover:scale-105 transition-all duration-300">
          <span class="material-symbols-outlined" data-icon="person">person</span>
        </router-link>

        <!-- Carrito -->
        <router-link to="/cart" class="text-secondary hover:scale-105 transition-all duration-300 relative">
          <span class="material-symbols-outlined" data-icon="shopping_cart">shopping_cart</span>
          <span
            v-if="cartCount > 0"
            class="absolute -top-2 -right-2 bg-primary text-on-primary text-[10px] min-w-4 h-4 rounded-full flex items-center justify-center font-bold px-1"
          >{{ cartCount }}</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { cartAPI, notificationsAPI } from '../../api';
import { formatRelativeTime } from '../../utils';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const showUserMenu = ref(false);
const showNotifications = ref(false);
const cartCount = ref(0);
const notifList = ref([]);
const notifUnread = ref(0);

let notifInterval = null;

const anchorLinks = [
  { id: 'hero', label: 'Inicio' },
  { id: 'products', label: 'Productos' },
  { id: 'reviews', label: 'Reseñas' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'contact', label: 'Contacto' },
];

const activeSection = ref('hero');
let observer = null;

// Menú items para clientes autenticados
const menuItems = [
  { to: '/account/profile', label: 'Ver Perfil', icon: 'person' },
  { to: '/account/purchases', label: 'Mis Compras', icon: 'receipt_long' },
  { to: '/account/credit', label: 'Cuenta de Crédito', icon: 'credit_card' },
  { to: '/account/notifications', label: 'Notificaciones', icon: 'notifications' },
];

// Detectar si el usuario es cliente autenticado
const isClient = computed(() => {
  return authStore.isAuthenticated && authStore.user?.role === 'cliente';
});

const userName = computed(() => authStore.user?.name || 'Usuario');
const userEmail = computed(() => authStore.user?.email || '');

const isProductRoute = computed(() =>
  ['ProductsCatalog', 'ProductPublicDetail'].includes(route.name)
);

function navLinkClass(sectionId) {
  const isActive = sectionId === 'products' && isProductRoute.value
    ? true
    : activeSection.value === sectionId;

  return [
    'font-body-md text-body-md transition-all duration-300',
    isActive
      ? 'text-primary font-bold border-b-2 border-primary pb-1'
      : 'text-on-surface-variant hover:text-primary'
  ];
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

async function handleLogout() {
  showUserMenu.value = false;
  await authStore.logout();
  router.push('/');
}

async function fetchCartCount() {
  try {
    const { data } = await cartAPI.getCart();
    cartCount.value = data?.item_count || 0;
  } catch (e) {
    cartCount.value = 0;
  }
}

// === Notificaciones ===
function toggleNotifications() {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value) fetchNotifications();
}

async function fetchNotifications() {
  try {
    const { data } = await notificationsAPI.getAll({ limit: 10, unread: true });
    notifList.value = data?.notifications || data || [];
  } catch (e) {
    // silent
  }
}

async function fetchUnreadCount() {
  try {
    const { data } = await notificationsAPI.getAll({ limit: 1, unread: true });
    notifUnread.value = data?.total || data?.length || 0;
  } catch (e) {
    // silent
  }
}

async function markRead(id) {
  try {
    await notificationsAPI.markAsRead(id);
    notifList.value = notifList.value.filter(n => n.id !== id);
    if (notifUnread.value > 0) notifUnread.value--;
  } catch (e) { /* silent */ }
}

async function markAllRead() {
  try {
    await notificationsAPI.markAllAsRead();
    notifList.value = [];
    notifUnread.value = 0;
  } catch (e) { /* silent */ }
}

// Cerrar menú al hacer clic fuera
function handleClickOutside(event) {
  if (showUserMenu.value) {
    showUserMenu.value = false;
  }
  // Notifications dropdown closes when clicking outside
  if (showNotifications.value && !event.target.closest) {
    showNotifications.value = false;
  }
}

onBeforeMount(() => {
  if (authStore.isAuthenticated) {
    fetchCartCount();
  }
});

onMounted(() => {
  const allIds = [...anchorLinks.map(l => l.id), 'products'];

  observer = new IntersectionObserver((entries) => {
    let current = activeSection.value;

    for (const entry of entries) {
      if (entry.isIntersecting) {
        current = entry.target.id;
      }
    }

    if (window.scrollY < 100) {
      current = 'hero';
    }

    activeSection.value = current;
  }, {
    rootMargin: '-40% 0px -50% 0px',
    threshold: 0,
  });

  for (const id of allIds) {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  }

  document.addEventListener('click', handleClickOutside);

  // Polling de notificaciones para clientes
  if (authStore.isAuthenticated && authStore.user?.role === 'cliente') {
    fetchUnreadCount();
    notifInterval = setInterval(fetchUnreadCount, 30000);
  }
});

onUnmounted(() => {
  if (observer) observer.disconnect();
  document.removeEventListener('click', handleClickOutside);
  if (notifInterval) clearInterval(notifInterval);
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

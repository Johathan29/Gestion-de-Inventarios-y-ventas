<template>
  <nav class="fixed w-full z-50 flex justify-center items-start pt-3 !px-4"
    :style="{ top: 'var(--banner-height, 0px)' }">
    <div class="max-w-7xl mx-auto w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 flex items-center justify-between transition-all duration-500"
      :class="{ 'bg-black/60 shadow-2xl shadow-primary/5': scrolled }">
      <router-link to="/" class="font-headline-md text-headline-md font-bold text-white flex items-center gap-2 hover:text-primary transition-colors">
        <img v-if="settings?.logo_url" :src="settings.logo_url" :alt="storeName" class="h-8 w-auto object-contain brightness-0 invert" />
        <span class="hidden sm:inline">{{ storeName }}</span>
      </router-link>
      <div class="hidden md:flex gap-1 items-center">
        <a
          v-for="link in anchorLinks"
          :key="link.id"
          :class="navLinkClass(link.id)"
          :href="isOnHome ? '#' : `/#${link.id}`"
          @click.prevent="scrollToSection(link.id)"
        >
          <span class="material-symbols-outlined !text-[1.4rem] align-middle">{{ link.icon }}</span>
          {{ link.label }}
        </a>
      </div>

      <div class="flex items-center gap-3">
        <!-- Notificaciones (solo clientes autenticados) -->
        <div v-if="isClient" class="relative">
          <button
            @click.stop="toggleNotifications"
            class="text-white/70 hover:text-primary transition-all duration-300 relative p-2"
            :class="{ 'text-primary': showNotifications }"
          >
            <span class="material-symbols-outlined text-xl">notifications</span>
            <span
              v-if="notifUnread > 0"
              class="absolute top-0 right-0 bg-red-500 text-white text-[10px] min-w-4 h-4 rounded-full flex items-center justify-center font-bold px-1"
            >{{ notifUnread > 9 ? '9+' : notifUnread }}</span>
          </button>

          <transition name="fade">
            <div
              v-if="showNotifications"
              class="absolute right-0 top-full mt-2 w-80 bg-[#1a1a1e] backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 py-2 overflow-hidden"
            >
              <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-white">Notificaciones</h3>
                <button v-if="notifUnread > 0" @click.stop="markAllRead" class="text-xs text-primary hover:underline">Marcar leídas</button>
              </div>
              <div class="max-h-72 overflow-y-auto">
                <div v-if="notifList.length === 0" class="p-6 text-center text-white/40 text-sm">
                  <span class="material-symbols-outlined text-3xl mb-2 block">notifications_off</span>
                  No hay notificaciones
                </div>
                <div v-for="n in notifList" :key="n.id"
                  class="px-4 py-3 border-b border-white/5 hover:bg-primary/10 cursor-pointer transition-colors"
                  @click.stop="markRead(n.id)">
                  <p class="text-sm font-medium text-white">{{ n.title }}</p>
                  <p class="text-xs text-white/50 mt-0.5">{{ n.message }}</p>
                  <p class="text-xs text-white/30 mt-1">{{ formatRelativeTime(n.created_at) }}</p>
                </div>
              </div>
              <router-link to="/account/notifications" @click="showNotifications = false"
                class="block text-center text-xs text-primary hover:text-primary-light font-medium py-2.5 border-t border-white/10 hover:bg-primary/10 transition-colors">
                Ver todas las notificaciones
              </router-link>
            </div>
          </transition>
        </div>

        <!-- Menú de usuario (shared component) -->
        <div v-if="isClient">
          <UserMenu
            context="landing"
          >
            <template #trigger="{ toggle }">
              <button
                @click="toggle"
                class="flex items-center gap-2 text-white/70 hover:text-primary transition-all duration-300 p-2"
              >
                <span class="material-symbols-outlined text-xl">account_circle</span>
                <span class="text-sm font-medium hidden sm:inline">{{ userName }}</span>
                <span class="material-symbols-outlined text-sm">expand_more</span>
              </button>
            </template>
            <template #extra>
              <router-link
                to="/account/credit"
                class="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-primary/20 hover:text-primary transition-colors"
                style="text-decoration: none;"
              >
                <span class="material-symbols-outlined text-lg">credit_card</span>
                Cuenta de Crédito
              </router-link>
            </template>
          </UserMenu>
        </div>

        <!-- Icono de login para usuarios no autenticados -->
        <router-link v-else to="/login" class="text-white/70 hover:text-primary hover:scale-105 transition-all duration-300 p-2">
          <span class="material-symbols-outlined text-xl">person</span>
        </router-link>

        <!-- Carrito -->
        <router-link to="/cart" class="text-white/70 hover:text-primary hover:scale-105 transition-all duration-300 relative p-2">
          <span class="material-symbols-outlined text-xl">shopping_cart</span>
          <span
            v-if="cartCount > 0"
            class="absolute top-0 right-0 bg-primary text-white text-[10px] min-w-4 h-4 rounded-full flex items-center justify-center font-bold px-1"
          >{{ cartCount }}</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onBeforeMount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useAppStore } from '../../stores/app';
import { cartAPI, notificationsAPI, ecommerceAPI } from '../../api';
import { formatRelativeTime } from '../../utils';
import { useEcommerceSettings } from '../../composables/useEcommerceSettings';
import UserMenu from '../shared/UserMenu.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();
const { settings, fetchSettings } = useEcommerceSettings();

const storeName = computed(() => settings.value?.store_name || 'Animal Store');

const showNotifications = ref(false);
const cartCount = ref(0);
const notifList = ref([]);
const notifUnread = ref(0);

let notifInterval = null;

async function checkActiveOffers() {
  try {
    const { data } = await ecommerceAPI.getOffers({ limit: 1, status: 'active' });
    const offers = data?.data || data || [];
    hasActiveOffers.value = Array.isArray(offers) ? offers.length > 0 : true;
  } catch (e) {
    hasActiveOffers.value = false;
  }
}

const hasActiveOffers = ref(true);
const anchorLinks = computed(() => {
  const links = [
    { id: 'hero', label: 'Inicio', icon: 'home' },
    { id: 'products', label: 'Productos', icon: 'inventory_2' },
    { id: 'reviews', label: 'Reseñas', icon: 'rate_review' },
    { id: 'contact', label: 'Contacto', icon: 'contact_mail' },
  ];
  // Insertar Ofertas solo si hay ofertas activas
  if (hasActiveOffers.value) {
    links.splice(3, 0, { id: 'offers', label: 'Ofertas', icon: 'local_offer' });
  }
  return links;
});

const activeSection = ref('hero');
const scrolled = ref(false);
let observer = null;

// Detectar si el usuario es cliente autenticado
const isClient = computed(() => {
  return authStore.isAuthenticated && authStore.user?.role === 'cliente';
});

const userName = computed(() => authStore.user?.name || 'Usuario');

const isProductRoute = computed(() =>
  ['ProductsCatalog', 'ProductPublicDetail'].includes(route.name)
);

const isOffersRoute = computed(() =>
  ['OffersProducts'].includes(route.name)
);

const isOnHome = computed(() => route.name === 'Home');

function scrollToSection(sectionId) {
  if (isOnHome.value) {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } else if (sectionId === 'offers') {
    router.push({ name: 'OffersProducts' });
  } else {
    router.push({ path: '/', hash: `#${sectionId}` });
  }
}

function navLinkClass(sectionId) {
  // Only highlight anchor sections when on the LandingView (Home)
  const isActive = sectionId === 'products' && isProductRoute.value
    ? true
    : sectionId === 'offers' && isOffersRoute.value
    ? true
    : isOnHome.value && activeSection.value === sectionId;

  return [
    'font-body-md text-body-md transition-all duration-300 px-4 py-2 rounded-full flex items-center gap-[0.4rem] justify-between',
    isActive
      ? 'text-primary font-bold bg-primary/10 border border-primary/30'
      : 'text-white/70 hover:text-primary hover:bg-white/5'
  ];
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

// Cerrar notificaciones al hacer clic fuera
function handleClickOutside(event) {
  if (showNotifications.value && !event.target.closest) {
    showNotifications.value = false;
  }
}

onBeforeMount(async () => {
  // Restore session on page reload
  const token = sessionStorage.getItem('accessToken');
  if (token && !authStore.user) {
    try {
      await authStore.fetchProfile();
    } catch (e) {
      // Token invalid
    }
  }
  if (authStore.isAuthenticated) {
    fetchCartCount();
  }
});

function handleScroll() {
  scrolled.value = window.scrollY > 60;
}

onMounted(() => {
  fetchSettings();
  checkActiveOffers();
  window.addEventListener('scroll', handleScroll, { passive: true });
  const allIds = [...anchorLinks.value.map(l => l.id), 'products'];

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
  window.removeEventListener('scroll', handleScroll);
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

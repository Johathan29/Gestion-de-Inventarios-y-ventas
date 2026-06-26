<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-white">
    <!-- Navbar -->
    <nav class="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <router-link to="/" class="font-headline-md text-headline-md font-bold text-primary">
          Animal Store
        </router-link>
        <div class="flex items-center gap-4">
          <router-link to="/cart" class="text-gray-600 hover:text-primary transition-all duration-300 relative">
            <span class="material-symbols-outlined">shopping_cart</span>
            <span
              v-if="cartCount > 0"
              class="absolute -top-2 -right-2 bg-primary text-white text-[10px] min-w-4 h-4 rounded-full flex items-center justify-center font-bold px-1"
            >{{ cartCount }}</span>
          </router-link>
          <button @click="handleLogout" class="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition-colors">
            <span class="material-symbols-outlined text-lg">logout</span>
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Contenido principal -->
    <div class="max-w-7xl mx-auto px-4 pt-20 pb-10">
      <div class="flex flex-col md:flex-row gap-6 mt-6">
        <!-- Sidebar -->
        <aside class="md:w-64 shrink-0">
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-4 sticky top-24">
            <!-- Info del usuario -->
            <div class="text-center mb-4 pb-4 border-b border-gray-100">
              <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span class="material-symbols-outlined text-3xl text-primary">account_circle</span>
              </div>
              <h3 class="font-semibold text-gray-900 truncate">{{ authStore.user?.name || 'Usuario' }}</h3>
              <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
            </div>

            <nav class="space-y-1">
              <router-link
                v-for="item in sidebarLinks"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                :class="isActive(item.to) ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-primary/5 hover:text-primary'"
              >
                <span class="material-symbols-outlined text-lg">{{ item.icon }}</span>
                {{ item.label }}
              </router-link>
            </nav>
          </div>
        </aside>

        <!-- Contenido -->
        <main class="flex-1 min-w-0">
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeMount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { cartAPI } from '../../api';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const cartCount = ref(0);

const sidebarLinks = [
  { to: '/account/profile', label: 'Mi Perfil', icon: 'person' },
  { to: '/account/purchases', label: 'Mis Compras', icon: 'receipt_long' },
  { to: '/account/credit', label: 'Cuenta de Crédito', icon: 'credit_card' },
  { to: '/account/notifications', label: 'Notificaciones', icon: 'notifications' },
];

function isActive(path) {
  return route.path === path;
}

async function handleLogout() {
  await authStore.logout();
  router.push('/');
}

onBeforeMount(async () => {
  try {
    const { data } = await cartAPI.getCart();
    cartCount.value = data?.item_count || 0;
  } catch (e) {
    cartCount.value = 0;
  }
});
</script>

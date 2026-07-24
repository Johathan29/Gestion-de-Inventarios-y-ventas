<template>
  <div class="min-h-screen bg-[#151215] text-[#e8e0e4] selection:bg-primary selection:text-on-primary overflow-x-hidden">
    <!-- Background shader -->
    <div class="fixed inset-0 w-full h-full -z-10 opacity-20 pointer-events-none">
      <canvas id="account-shader-canvas" style="display:block;width:100%;height:100%"></canvas>
    </div>

    <!-- Navbar -->
    <nav class="fixed top-0 w-full z-50 bg-[#151215]/80 backdrop-blur-xl border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <router-link to="/" class="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">pets</span>
          Animal Store
        </router-link>
        <div class="flex items-center gap-4">
          <router-link to="/cart" class="text-on-surface-variant hover:text-primary transition-all duration-300 relative">
            <span class="material-symbols-outlined">shopping_cart</span>
            <span
              v-if="cartCount > 0"
              class="absolute -top-2 -right-2 bg-primary text-on-primary text-[10px] min-w-4 h-4 rounded-full flex items-center justify-center font-bold px-1"
            >{{ cartCount }}</span>
          </router-link>
          <button @click="handleLogout" class="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors">
            <span class="material-symbols-outlined text-lg">logout</span>
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Contenido principal -->
    <div class="max-w-7xl mx-auto px-4 pt-24 pb-10">
      <div class="flex flex-col md:flex-row gap-6 mt-6">
        <!-- Sidebar -->
        <aside class="md:w-64 shrink-0">
          <div class="glass-card rounded-[24px] p-4 sticky top-24">
            <!-- Info del usuario -->
            <div class="text-center mb-4 pb-4 border-b border-white/10">
              <div class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                <span class="material-symbols-outlined text-3xl text-primary">account_circle</span>
              </div>
              <h3 class="font-label-md text-label-md text-on-surface truncate">{{ authStore.user?.name || 'Usuario' }}</h3>
              <p class="text-xs text-on-surface-variant/60 truncate">{{ authStore.user?.email }}</p>
            </div>

            <nav class="space-y-1">
              <router-link
                v-for="item in sidebarLinks"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                :class="isActive(item.to) ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-white/5 hover:text-primary'"
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
import { ref, onMounted, onBeforeUnmount } from 'vue';
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

// ── Background shader ──
let shaderAnimId = null;

function initShader() {
  const canvas = document.getElementById('account-shader-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, t = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    t += 0.004;
    const imageData = ctx.createImageData(w, h);
    const d = imageData.data;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        const n1 = Math.sin(x * 0.003 + t) * Math.cos(y * 0.003 + t * 0.7);
        const n2 = Math.sin(x * 0.005 - t * 0.5) * Math.cos(y * 0.005 + t * 0.9);
        const v = (n1 + n2) * 0.5 + 0.5;
        const base = 0.05;
        const intensity = base + v * 0.08;
        d[i] = 200 + v * 55;
        d[i + 1] = 160 + v * 60;
        d[i + 2] = 210 + v * 45;
        d[i + 3] = intensity * 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    shaderAnimId = requestAnimationFrame(draw);
  }
  draw();
}

onMounted(() => {
  cartAPI.getCart()
    .then(({ data }) => { cartCount.value = data?.item_count || 0; })
    .catch(() => { cartCount.value = 0; });
  initShader();
});

onBeforeUnmount(() => {
  if (shaderAnimId) cancelAnimationFrame(shaderAnimId);
});
</script>

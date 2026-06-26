<template>
  <div v-if="activeBanner" class="fixed left-0 right-0 z-[9998] transition-all duration-500"
    :class="activeBanner.position === 'top' ? 'top-0' : 'bottom-0'"
    :style="{ backgroundColor: activeBanner.background_color || '#1a1a2e', color: activeBanner.text_color || '#ffffff' }"
  >
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <img v-if="activeBanner.image_url" :src="activeBanner.image_url" class="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
        <div class="min-w-0">
          <p class="text-sm font-medium truncate">{{ activeBanner.title }}</p>
          <p v-if="activeBanner.subtitle" class="text-xs opacity-80 truncate">{{ activeBanner.subtitle }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <a v-if="activeBanner.link_url" :href="activeBanner.link_url"
          class="text-xs font-medium px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all whitespace-nowrap"
          target="_blank" rel="noopener noreferrer"
        >
          Ver más
        </a>
        <button @click="dismissBanner" class="p-1 hover:opacity-70 transition-opacity cursor-pointer" aria-label="Cerrar banner">
          <span class="material-symbols-outlined text-lg" data-icon="close">close</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';

const banners = ref([]);
const dismissedIds = ref(new Set());
const currentIndex = ref(0);

const activeBanner = ref(null);

onMounted(async () => {
  try {
    const res = await ecommerceAPI.getFloatingBanners();
    if (Array.isArray(res.data)) {
      banners.value = res.data.filter(b => !dismissedIds.value.has(b.id));
      showNextBanner();
    }
  } catch {
    // No hay banners
  }

  // Rotar banners cada 8 segundos
  setInterval(() => {
    const visible = banners.value.filter(b => !dismissedIds.value.has(b.id));
    if (visible.length > 1) {
      currentIndex.value = (currentIndex.value + 1) % visible.length;
      activeBanner.value = visible[currentIndex.value];
    }
  }, 8000);
});

function showNextBanner() {
  const visible = banners.value.filter(b => !dismissedIds.value.has(b.id));
  if (visible.length > 0) {
    activeBanner.value = visible[0];
  }
}

function dismissBanner() {
  if (activeBanner.value) {
    dismissedIds.value.add(activeBanner.value.id);
    showNextBanner();
  }
}
</script>

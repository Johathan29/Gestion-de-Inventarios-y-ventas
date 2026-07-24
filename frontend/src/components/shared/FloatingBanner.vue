<template>
  <div
    v-if="banner && isVisible"
    class="fixed w-full z-40 transition-all duration-500"
    :class="banner.position === 'bottom' ? 'bottom-0' : 'top-0'"
    :style="{ height: 'var(--banner-height, 48px)' }"
  >
    <div
      class="w-full h-full flex items-center justify-center px-4 py-2 text-sm cursor-pointer hover:brightness-110 transition-all"
      :style="{ background: banner.background_color || 'linear-gradient(135deg, #37094A, #7B4F7D)' }"
      @click="handleClick"
    >
      <div class="flex items-center gap-3 flex-wrap justify-center">
        <span v-if="banner.icon" class="material-symbols-outlined text-lg">{{ banner.icon }}</span>
        <span class="font-medium">{{ banner.title }}</span>
        <span v-if="banner.subtitle" class="text-white/70 hidden sm:inline">{{ banner.subtitle }}</span>
        <span v-if="banner.cta_text" class="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
          {{ banner.cta_text }}
          <span class="material-symbols-outlined text-xs">arrow_forward</span>
        </span>
      </div>
      <button
        @click.stop="dismiss"
        class="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
      >
        <span class="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';

const banner = ref(null);
const dismissed = ref(false);

const isVisible = computed(() => {
  if (dismissed.value) return false;
  if (!banner.value) return false;
  const now = new Date();
  if (banner.value.starts_at && new Date(banner.value.starts_at) > now) return false;
  if (banner.value.ends_at && new Date(banner.value.ends_at) < now) return false;
  return true;
});

function handleClick() {
  if (banner.value?.link) {
    window.open(banner.value.link, '_blank', 'noopener');
  }
}

function dismiss() {
  dismissed.value = true;
  document.documentElement.style.setProperty('--banner-height', '0px');
}

async function fetchBanner() {
  try {
    const { data } = await ecommerceAPI.getFloatingBanners();
    const banners = data?.data || data || [];
    // Show the first active banner
    const active = banners.find(b => {
      if (b.status === 'inactive') return false;
      const now = new Date();
      if (b.starts_at && new Date(b.starts_at) > now) return false;
      if (b.ends_at && new Date(b.ends_at) < now) return false;
      return true;
    });
    if (active) {
      banner.value = active;
      document.documentElement.style.setProperty('--banner-height', '48px');
    }
  } catch (err) {
    // Silently fail - banner is non-critical
    console.warn('Floating banner unavailable:', err.message);
  }
}

onMounted(() => {
  fetchBanner();
});
</script>

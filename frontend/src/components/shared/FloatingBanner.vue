<template>
  <!-- Loading skeleton -->
  <Transition appear>
    <div
      v-if="loading"
      ref="bannerRef"
      class="promo-banner fixed left-0 right-0 top-0 z-[9999] animate-pulse"
      :class="bannerVisible ? 'banner-visible' : 'banner-hidden'"
    >
      <div
        class="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4"
      >
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="w-6 h-6 rounded-full bg-white/10 flex-shrink-0"></div>
          <div class="h-4 bg-white/10 rounded w-64"></div>
        </div>

        <div class="flex items-center gap-3 flex-shrink-0">
          <div class="h-6 w-20 rounded bg-white/10"></div>
          <div class="w-6 h-6 rounded-full bg-white/10"></div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Banner -->
  <Transition
    appear
    mode="out-in"
    enter-active-class="bg-white transition duration-100 ease-[cubic-bezier(0.22,1,0.36,1)]"
    leave-active-class="transition duration-100 ease-[cubic-bezier(0.22,1,0.36,1)]"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="!loading && activeBanner"
      ref="bannerRef"
      key="banner"
      class="promo-banner !bg-white fixed left-0 right-0 top-0 z-[9999] transition duration-100 ease-in-out overflow-hidden"
      :class="bannerVisible ? 'banner-visible h-12' : 'banner-hidden h-0'"
    >
      <div
        class="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 h-full"
      >
        <div
          class="flex-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
        >
          <p
            class="text-sm text-center !text-gray-500 font-medium"
            :class="activeBanner.text_color ? '' : '!text-gray-900 '"
            :style="activeBanner.text_color ? { color: activeBanner.text_color } : {}"
          >
            {{ activeBanner.title }}

            <a
              v-if="activeBanner.link_url"
              :href="activeBanner.link_url"
              class="underline hover:text-purple-700 !text-purple-400 transition-colors ml-1 font-bold"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ activeBanner.link_text || 'Learn More' }}
            </a>
          </p>
        </div>

        <button
          @click="dismissBanner"
          class="!bg-red-300 hover:!bg-red-500 !text-white border-red-500 flex items-center border rounded-full h-4 w-4 transition-colors !p-[2px] flex-shrink-0 cursor-pointer"
          aria-label="Cerrar banner"
        >
          <span class="material-symbols-outlined text-[11px] font-bold">
            close
          </span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { ecommerceAPI } from '../../api';

const loading = ref(true);
const banners = ref([]);
const currentIndex = ref(0);
const activeBanner = ref(null);
const isPastThreshold = ref(false);
const isManuallyHidden = ref(false);
const bannerRef = ref(null);
let resizeObserver = null;
let heightTimeout = null;
let rotationInterval = null;
let rafId = null;

const bannerVisible = ref(false);

function updateBannerVisibility() {
  const visible = !isPastThreshold.value && !isManuallyHidden.value;
  if (visible !== bannerVisible.value) {
    bannerVisible.value = visible;
  }
}

function syncBannerHeight(forceZero = false) {
  clearTimeout(heightTimeout);
  if (forceZero || !bannerRef.value || !bannerVisible.value) {
    // Delay zeroing to match the CSS exit transition
    heightTimeout = setTimeout(() => {
      document.documentElement.style.setProperty('--banner-height', '0px');
    }, 650);
  } else if (!bannerRef.value.classList.contains('animate-pulse')) {
    document.documentElement.style.setProperty(
      '--banner-height',
      bannerRef.value.offsetHeight + 'px'
    );
  }
}

function onScroll() {
  if (rafId) return; // Coalesce multiple scroll events into one frame
  rafId = requestAnimationFrame(() => {
    rafId = null;
    const nowPast = window.scrollY > 50;
    if (nowPast !== isPastThreshold.value) {
      isPastThreshold.value = nowPast;
      // When crossing past threshold, cancel manual hide so banner can reappear later
      if (nowPast && isManuallyHidden.value) {
        isManuallyHidden.value = false;
      }
      updateBannerVisibility();
    }
  });
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true });

  try {
    const res = await ecommerceAPI.getFloatingBanners();
    if (Array.isArray(res.data)) {
      banners.value = res.data;
      showNextBanner();
    }
  } catch {
    // No hay banners
  } finally {
    loading.value = false;
    await nextTick();
    updateBannerVisibility();
    syncBannerHeight();
  }

  if (bannerRef.value) {
    resizeObserver = new ResizeObserver(() => syncBannerHeight());
    resizeObserver.observe(bannerRef.value);
  }

  // Rotar banners cada 8 segundos
 rotationInterval = setInterval(async () => {
  if (banners.value.length <= 1) return;

  // Oculta suavemente
  bannerVisible.value = false;

  await new Promise(resolve => setTimeout(resolve, 350));

  currentIndex.value = (currentIndex.value + 1) % banners.value.length;
  activeBanner.value = banners.value[currentIndex.value];

  await nextTick();

  requestAnimationFrame(() => {
    bannerVisible.value = !isPastThreshold.value;
    syncBannerHeight();
  });

}, 80);
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  if (rafId) cancelAnimationFrame(rafId);
  if (resizeObserver) resizeObserver.disconnect();
  if (rotationInterval) clearInterval(rotationInterval);
  clearTimeout(heightTimeout);
  document.documentElement.style.removeProperty('--banner-height');
});

function showNextBanner() {
  if (banners.value.length > 0) {
    activeBanner.value = banners.value[0];
  }
}
async function dismissBanner() {
  bannerVisible.value = false;

  await new Promise(resolve => setTimeout(resolve, 10));

  isManuallyHidden.value = true;
  syncBannerHeight(true);
}
</script>

<style scoped>
.promo-banner {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 30px rgba(233, 179, 252, 0.1);
  will-change: transform, opacity;
  transform: translateY(0);
  opacity: 1;
  
}

.promo-banner.banner-hidden {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
}
</style>

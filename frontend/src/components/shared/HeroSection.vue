<template>
  <section
    id="hero"
    class="min-h-screen flex flex-col justify-center px-4 pt-32 pb-20 relative overflow-hidden bg-[#151215]"
  >
    <!-- Barista-style dark overlay diagonal accent -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[400px] bg-primary/10 rounded-3xl pointer-events-none z-[2]" style="transform: translate(-55%, -50%) rotate(45deg);"></div>
    <!-- ============================================ -->
    <!-- SKELETON LOADING STATE                       -->
    <!-- ============================================ -->
    <template v-if="loading">
      <!-- Background skeleton -->
      <div class="absolute inset-0 bg-white/5 animate-pulse" />

      <div class="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center relative z-10 flex-1">
        <!-- Text skeleton -->
        <div class="lg:col-span-7 space-y-6">
          <div class="h-4 w-32 bg-white/10 rounded animate-pulse mb-6"></div>
          <div class="h-16 w-3/4 bg-white/10 rounded animate-pulse mb-4"></div>
          <div class="h-16 w-2/3 bg-white/10 rounded animate-pulse mb-8"></div>
          <div class="h-6 w-full max-w-xl bg-white/10 rounded animate-pulse mb-3"></div>
          <div class="h-6 w-3/4 max-w-xl bg-white/10 rounded animate-pulse mb-12"></div>
          <div class="flex md:flex-row flex-col gap-6">
            <div class="h-14 w-48 bg-white/10 rounded-full animate-pulse"></div>
            <div class="h-14 w-36 bg-white/10 rounded-full animate-pulse"></div>
          </div>
        </div>

        <!-- Image skeleton -->
        <div class="lg:col-span-5 relative mt-20 lg:mt-0">
          <div class="relative h-[600px] w-full flex items-center justify-center">
            <div class="relative w-full h-[500px] rounded-3xl overflow-hidden glass-card p-1 z-10">
              <div class="w-full h-full rounded-2xl bg-white/10 animate-pulse"></div>
            </div>
          </div>
          <!-- Thumbnails skeleton -->
          <div class="flex items-center justify-center gap-3 mt-6">
            <div v-for="n in 3" :key="'sk-thumb-' + n" class="w-[80px] h-[56px] rounded-xl bg-white/10 animate-pulse"></div>
          </div>
        </div>
      </div>

      <!-- Bottom nav skeleton -->
      <div class="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-white/10 animate-pulse"></div>
        <div class="flex items-center gap-2">
          <div v-for="n in 3" :key="'sk-dot-' + n" class="w-[10px] h-[10px] rounded-full bg-white/10 animate-pulse"></div>
        </div>
        <div class="w-10 h-10 rounded-full bg-white/10 animate-pulse"></div>
      </div>
    </template>

    <!-- ============================================ -->
    <!-- BACKGROUND – crossfade entre capas           -->
    <!-- ============================================ -->
    <template v-else>
    <div
      v-for="(slide, index) in slides"
      :key="'bg-' + (slide.id || index)"
      class="absolute inset-0 will-change-transform"
      :class="bgClass(index)"
    >
      <div
        v-if="slide.image_url"
        class="absolute inset-0 bg-cover bg-center"
        :style="{
          backgroundImage: `url(${slide.image_url})`,
          filter: 'brightness(0.3)',
        }"
      />
    </div>

    <!-- ============================================ -->
    <!-- MAIN GRID                                    -->
    <!-- ============================================ -->
    <div
      class="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center relative z-10 flex-1"
    >
      <!-- ========================================== -->
      <!-- TEXT – staggered con retardo               -->
      <!-- ========================================== -->
      <div class="lg:col-span-7 relative">
        <Transition name="text-stagger" mode="out-in">
          <div :key="'text-' + textDisplayIndex" data-gsap="hero-content">
            <em
              v-if="textSlide.badge"
              class="font-label-sm text-label-sm not-italic tracking-[0.15em] text-secondary mb-5 block hero-badge"
            >
              {{ textSlide.badge }}
            </em>
            <h1 class="font-display-xl text-6xl md:text-7xl leading-tight mb-6 text-white hero-title">
              {{ textSlide.title_line1 }} <br />
              <span
                :class="[
                  'text-secondary',
                  textSlide.title_line2_style === 'italic' ? 'italic' : '',
                ]"
              >
                {{ textSlide.title_line2 }}
              </span>
            </h1>
            <p class="font-body-lg text-body-lg text-white/70 max-w-xl mb-10 hero-description">
              {{ textSlide.description }}
            </p>
            <div class="flex md:flex-row flex-col gap-4 hero-cta">
              <a
                v-if="textSlide.button1_text"
                :href="textSlide.button1_url || '#'"
                class="px-8 py-4 bg-primary text-white rounded-full font-headline-md text-headline-md font-bold flex items-center gap-2 inline-flex hover:brightness-110 transition-all"
                style="text-decoration: none"
              >
                {{ textSlide.button1_text }}
                <span class="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
              </a>
              <a
                v-if="textSlide.button2_text"
                :href="textSlide.button2_url || '#'"
                class="px-8 py-4 border-2 border-white/50 text-white rounded-full font-headline-md text-headline-md font-bold hover:bg-white hover:text-primary transition-all inline-flex"
                style="text-decoration: none"
              >
                {{ textSlide.button2_text }}
              </a>
            </div>
          </div>
        </Transition>
      </div>

      <!-- ========================================== -->
      <!-- IMAGE COLUMN                               -->
      <!-- ========================================== -->
      <div class="lg:col-span-5 relative mt-20 lg:mt-0">
        <div class="relative h-[600px] w-full flex items-center justify-center">
          <!-- MAIN IMAGE WRAP -->
          <div
            ref="mainImageWrapRef"
            class="relative w-full h-[500px] rounded-3xl overflow-hidden glass-card p-1 z-10"
          >
            <!-- IDLE: imagen única -->
            <template v-if="phase === 'idle'">
              <img
                v-if="currentSlide.image_url"
                :src="currentSlide.image_url"
                class="w-full h-full object-cover rounded-2xl transition-all duration-700 ease-out brightness-100"
                alt="Hero"
                @error="handleImageError"
              />
            </template>

            <!-- TRANSITION: crossfade entre dos imágenes -->
            <template v-else>
              <!-- Outgoing: se desvanece con brightness -->
              <div
                v-if="prevImageUrl"
                class="absolute inset-0 rounded-2xl overflow-hidden"
                :style="{
                  opacity: 1 - incomingImgOpacity,
                  transition: `opacity ${D.imgDuration}ms ease-out`,
                  transitionDelay: '0ms',
                }"
              >
                <img
                  :src="prevImageUrl"
                  class="w-full h-full object-cover brightness-[0.92]"
                  alt=""
                />
              </div>
              <!-- Incoming: aparece con brightness pleno -->
              <div
                v-if="nextImageUrl"
                class="absolute inset-0 rounded-2xl overflow-hidden"
                :style="{
                  opacity: incomingImgOpacity,
                  transition: `opacity ${D.imgDuration}ms ease-out`,
                  transitionDelay: '0ms',
                }"
              >
                <img
                  :src="nextImageUrl"
                  class="w-full h-full object-cover brightness-100"
                  alt=""
                />
              </div>
            </template>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- THUMBNAILS – FLIP manual                  -->
        <!-- ========================================== -->
        <div
          v-if="otherSlides.length > 0"
          ref="thumbStripRef"
          class="flex items-center justify-center gap-3 mt-6 relative"
          style="perspective: 1200px"
        >
          <button
            v-for="item in otherSlides"
            :key="'thumb-' + (item.slide.id || item.originalIndex)"
            :ref="(el) => setThumbRef(item.originalIndex, el)"
            @click="goToSlide(item.originalIndex)"
            class="thumb-btn relative rounded-xl overflow-hidden cursor-pointer border-2 border-transparent flex-shrink-0 group will-change-transform"
            :class="[
              'scale-[0.95] hover:scale-100 hover:border-white/30',
              animatingIndex === item.originalIndex ? 'pointer-events-none' : '',
            ]"
            :style="{ width: '80px', height: '56px' }"
          >
            <div class="w-full h-full relative overflow-hidden rounded-xl shadow-lg">
              <img
                v-if="item.slide.image_url"
                :src="item.slide.image_url"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                :alt="'Slide ' + (item.originalIndex + 1)"
              />
              <div
                v-else
                class="w-full h-full bg-white/10 flex items-center justify-center"
              >
                <span class="text-xs text-gray-400">{{ item.originalIndex + 1 }}</span>
              </div>
              <div
                class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium"
              >
                {{ item.originalIndex + 1 }}
              </div>
            </div>
            <div class="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-xl" />
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- SHARED ELEMENT FLY                           -->
    <!-- ============================================ -->
    <div
      v-if="showFly && flyImageUrl"
      ref="flyElRef"
      class="fixed pointer-events-none z-50 will-change-transform"
      :style="flyPosStyle"
    >
      <div
        class="w-full h-full overflow-hidden transition-all ease-out"
        :style="{
          borderRadius: flyBorderRadiusVal,
          opacity: flyOpacity,
          boxShadow: flyShadow,
          transitionDuration: flyFadeDuration + 'ms',
          transitionProperty: 'opacity, box-shadow',
        }"
      >
        <img :src="flyImageUrl" class="w-full h-full object-cover" />
      </div>
    </div>

    <!-- ============================================ -->
    <!-- BOTTOM NAV – dots + prev / next              -->
    <!-- ============================================ -->
    <div
      v-if="slides.length > 1"
      class="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4"
    >
      <button
        @click="prevSlide"
        class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/10"
        aria-label="Anterior slide"
      >
        <span class="material-symbols-outlined text-base text-white" data-icon="chevron_left">chevron_left</span>
      </button>
      <div class="flex items-center gap-2">
        <button
          v-for="(slide, index) in slides"
          :key="'dot-' + index"
          @click="goToSlide(index)"
          class="rounded-full transition-all duration-300 ease-out cursor-pointer"
          :class="
            index === currentIndex
              ? 'bg-primary'
              : 'bg-white/30 hover:bg-white/50'
          "
          :style="{
            width: index === currentIndex ? '28px' : '8px',
            height: index === currentIndex ? '8px' : '8px',
            transitionDelay:
              phase !== 'idle' && index === currentIndex ? D.total + 'ms' : '0ms',
          }"
          :aria-label="'Ir al slide ' + (index + 1)"
        />
      </div>
      <button
        @click="nextSlide"
        class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/10"
        aria-label="Siguiente slide"
      >
        <span class="material-symbols-outlined text-base text-white" data-icon="chevron_right">chevron_right</span>
      </button>
    </div>
    </template> <!-- end v-else -->
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, reactive } from "vue";
import { ecommerceAPI } from "../../api";

// ───────────────────────────────────────────────
// TIMING – cascada única
// ───────────────────────────────────────────────
const D = {
  total: 700,         // duración total de la animación (ms)
  bgDelay: 120,       // fondo empieza a los 120ms
  bgDuration: 580,    // duración del crossfade del fondo
  imgDelay: 250,      // imagen principal empieza a los 250ms
  imgDuration: 450,   // duración del crossfade de la imagen
  textDelay: 430,     // texto empieza a los 430ms
  textDuration: 350,  // duración de la transición del texto
  thumbDelay: 600,    // miniaturas se reordenan a los 600ms
  thumbDuration: 500, // duración del FLIP de miniaturas
  flyFadeStart: 600,  // fly empieza a desvanecerse a los 600ms
  flyFadeDuration: 150,// duración del fade del fly
};

// ───────────────────────────────────────────────
// STATE
// ───────────────────────────────────────────────
const loading = ref(true);
const slides = ref([]);
const currentIndex = ref(0);   // slide activo (cambia AL FINAL)
const nextIndex = ref(null);   // slide destino (durante transición)
const phase = ref("idle");     // idle | flying

// Índices de visualización (cambian en distintos momentos)
const textDisplayIndex = ref(0);
const thumbDisplayIndex = ref(0);

// Control de capas de fondo
const bgState = reactive({});

// Crossfade de imagen principal
const prevImageUrl = ref("");
const nextImageUrl = ref("");
const incomingImgOpacity = ref(0);

// Fly overlay
const showFly = ref(false);
const flyImageUrl = ref("");
const flyOpacity = ref(1);
const flyFadeDuration = ref(0);
const flyShadow = ref("none");
const flyPosStyle = ref({ left: "0px", top: "0px", width: "0px", height: "0px" });
const flyBorderRadiusVal = ref("12px");

// Thumb refs (para FLIP manual)
const thumbRefs = reactive({});
const thumbStripRef = ref(null);
const mainImageWrapRef = ref(null);
const flyElRef = ref(null);

const animatingIndex = ref(null);

let animationGuard = false;
let autoPlayTimer = null;
let timeouts = [];

// ───────────────────────────────────────────────
// COMPUTED
// ───────────────────────────────────────────────
const currentSlide = computed(() => {
  const s = slides.value[currentIndex.value];
  if (s) return s;
  return {
    badge: "Bienvenido a Animal Store",
    title_line1: "The Best for",
    title_line2: "Your Pet.",
    title_line2_style: "italic",
    description: "Descubre nuestra colección premium de productos para mascotas, cuidadosamente seleccionados para su bienestar y felicidad.",
    button1_text: "Explorar",
    button1_url: "#products",
    button2_text: "Our Story",
    button2_url: "#story",
    image_url: "",
  };
});

const textSlide = computed(() => {
  const s = slides.value[textDisplayIndex.value];
  if (s) return s;
  return currentSlide.value;
});

/** Miniaturas: basadas en thumbDisplayIndex (no cambia hasta el FLIP) */
const otherSlides = computed(() => {
  const total = slides.value.length;
  if (total <= 1) return [];
  const active = thumbDisplayIndex.value;
  const result = [];
  for (let i = 1; i < total; i++) {
    const idx = (active + i) % total;
    result.push({ originalIndex: idx, slide: slides.value[idx] });
  }
  return result;
});



// ───────────────────────────────────────────────
// BG CLASS – crossfade sin escala
// ───────────────────────────────────────────────
function bgClass(index) {
  const state = bgState[index] || "hidden";
  switch (state) {
    case "visible":
      return "opacity-100 z-10";
    case "exiting":
      return "opacity-0 z-10 bg-transition";
    case "entering":
      return "opacity-100 z-10 bg-transition";
    default:
      return "opacity-0 z-0";
  }
}

// ───────────────────────────────────────────────
// THUMB REFS
// ───────────────────────────────────────────────
function setThumbRef(idx, el) {
  if (el) thumbRefs[idx] = el;
}

// ───────────────────────────────────────────────
// FLIP MANUAL – miniaturas
// ───────────────────────────────────────────────
function captureThumbPositions() {
  const data = [];
  const container = thumbStripRef.value;
  if (!container) return data;
  const buttons = container.querySelectorAll(".thumb-btn");
  buttons.forEach((btn) => {
    const rect = btn.getBoundingClientRect();
    data.push({ el: btn, left: rect.left, top: rect.top });
  });
  return data;
}

function applyFlipTransforms(data) {
  if (!data.length) return;
  data.forEach(({ el, left, top }) => {
    const newRect = el.getBoundingClientRect();
    const dx = left - newRect.left;
    const dy = top - newRect.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    // INVERT: colocar donde estaba
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.95)`;
    el.style.transition = "none";
    // PLAY: animar a posición final
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `transform ${D.thumbDuration}ms cubic-bezier(.22,.61,.36,1)`;
        el.style.transform = "translate3d(0, 0, 0) scale(0.95)";
        // Limpiar inline styles tras la animación
        setTimeout(() => {
          el.style.transform = "";
          el.style.transition = "";
        }, D.thumbDuration + 50);
      });
    });
  });
}

// ───────────────────────────────────────────────
// LIMPIAR TIMEOUTS
// ───────────────────────────────────────────────
function clearAnimationTimeouts() {
  timeouts.forEach((t) => clearTimeout(t));
  timeouts = [];
}

function addTimeout(fn, delay) {
  const id = setTimeout(fn, delay);
  timeouts.push(id);
}

// ───────────────────────────────────────────────
// TRANSICIÓN PRINCIPAL – Shared Element + Cascada
// ───────────────────────────────────────────────
function goToSlide(index, event) {
  if (animationGuard || index === currentIndex.value) return;
  const targetSlide = slides.value[index];
  if (!targetSlide) return;

  // ── Medir posiciones ──
  const mainWrap = mainImageWrapRef.value;
  if (!mainWrap) {
    currentIndex.value = index;
    return;
  }
  const mainRect = mainWrap.getBoundingClientRect();

  const thumbEl = thumbRefs[index];
  let startRect;
  if (thumbEl) {
    startRect = thumbEl.getBoundingClientRect();
  } else {
    startRect = {
      left: mainRect.left + mainRect.width / 2 - 40,
      top: mainRect.top - 80,
      width: 80,
      height: 56,
    };
  }

  // ── Almacenar imágenes para crossfade ──
  const prevIdx = currentIndex.value;
  const nextIdx = index;
  prevImageUrl.value = slides.value[prevIdx]?.image_url || "";
  nextImageUrl.value = targetSlide.image_url || "";

  // ── Guard ──
  animationGuard = true;
  animatingIndex.value = index;
  nextIndex.value = index;
  phase.value = "flying";
  clearAnimationTimeouts();

  // ════════════════════════════════════════════
  // 0 ms – FLY: aparece en posición de miniatura
  // ════════════════════════════════════════════
  flyImageUrl.value = targetSlide.image_url || "";
  flyOpacity.value = 1;
  flyFadeDuration.value = 0;
  flyShadow.value = "0 0 0 rgba(0,0,0,0)";
  showFly.value = true;
  flyBorderRadiusVal.value = "12px";
  flyPosStyle.value = {
    left: startRect.left + "px",
    top: startRect.top + "px",
    width: startRect.width + "px",
    height: startRect.height + "px",
    transition: "none",
    transform: "scale(1)",
  };

  // BG: old visible, new hidden
  bgState[prevIdx] = "visible";
  bgState[nextIdx] = "hidden";

  // Fly: next frame, animar a posición de imagen principal
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flyPosStyle.value = {
        left: mainRect.left + "px",
        top: mainRect.top + "px",
        width: mainRect.width + "px",
        height: mainRect.height + "px",
        transition: `all ${D.total}ms cubic-bezier(.22,.61,.36,1)`,
        transform: "scale(1)",
      };
      flyBorderRadiusVal.value = "16px";
      // Sombra creciente
      addTimeout(() => {
        flyShadow.value = "0 32px 64px rgba(0,0,0,0.5)";
        flyFadeDuration.value = 400;
      }, 50);
    });
  });

  // ════════════════════════════════════════════
  // 120 ms – FONDO: crossfade
  // ════════════════════════════════════════════
  addTimeout(() => {
    bgState[prevIdx] = "exiting";
    bgState[nextIdx] = "entering";
  }, D.bgDelay);

  // ════════════════════════════════════════════
  // 250 ms – IMAGEN PRINCIPAL: crossfade
  // ════════════════════════════════════════════
  addTimeout(() => {
    incomingImgOpacity.value = 1;
  }, D.imgDelay);

  // ════════════════════════════════════════════
  // 430 ms – TEXTO: cambia
  // ════════════════════════════════════════════
  addTimeout(() => {
    textDisplayIndex.value = nextIdx;
  }, D.textDelay);

  // ════════════════════════════════════════════
  // 600 ms – FLIP de miniaturas
  // ════════════════════════════════════════════
  addTimeout(() => {
    const flipData = captureThumbPositions();
    thumbDisplayIndex.value = nextIdx;
    nextTick(() => {
      applyFlipTransforms(flipData);
    });
  }, D.thumbDelay);

  // ════════════════════════════════════════════
  // 600 ms – FLY empieza a desvanecerse
  // ════════════════════════════════════════════
  addTimeout(() => {
    flyFadeDuration.value = D.flyFadeDuration;
    flyOpacity.value = 0;
    flyShadow.value = "0 0 0 rgba(0,0,0,0)";
  }, D.flyFadeStart);

  // ════════════════════════════════════════════
  // 680 ms – Inercia: overshoot sutil del fly
  // ════════════════════════════════════════════
  addTimeout(() => {
    flyPosStyle.value = {
      ...flyPosStyle.value,
      transition: "all 80ms ease-out",
      transform: "scale(1.015)",
    };
    addTimeout(() => {
      if (!flyPosStyle.value) return;
      flyPosStyle.value = {
        ...flyPosStyle.value,
        transition: "all 80ms ease-out",
        transform: "scale(1)",
      };
    }, 80);
  }, D.flyFadeStart - 20);

  // ════════════════════════════════════════════
  // 700 ms – FIN: resolver estado
  // ════════════════════════════════════════════
  addTimeout(() => {
    currentIndex.value = nextIdx;
    nextIndex.value = null;
    phase.value = "idle";
    showFly.value = false;
    prevImageUrl.value = "";
    nextImageUrl.value = "";
    incomingImgOpacity.value = 0;
    animatingIndex.value = null;
    animationGuard = false;

    // Reset bg states
    bgState[prevIdx] = "hidden";
    bgState[nextIdx] = "visible";
  }, D.total);

  resetAutoPlay();
}

// ───────────────────────────────────────────────
// NAVEGACIÓN
// ───────────────────────────────────────────────
function nextSlide() {
  if (slides.value.length <= 1 || animationGuard) return;
  goToSlide((currentIndex.value + 1) % slides.value.length);
}

function prevSlide() {
  if (slides.value.length <= 1 || animationGuard) return;
  const total = slides.value.length;
  goToSlide((currentIndex.value - 1 + total) % total);
}

// ───────────────────────────────────────────────
// AUTOPLAY
// ───────────────────────────────────────────────
function startAutoPlay() {
  stopAutoPlay();
  autoPlayTimer = setInterval(nextSlide, 6000);
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
}

function resetAutoPlay() {
  stopAutoPlay();
  startAutoPlay();
}

function handleImageError(e) {
  e.target.style.display = "none";
}

// ───────────────────────────────────────────────
// LIFECYCLE
// ───────────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await ecommerceAPI.getHeroSlides();
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      slides.value = res.data.slice(0, 4);
    } else {
      await loadLegacyHero();
    }
  } catch {
    await loadLegacyHero();
  }

  if (slides.value.length > 0) {
    // Inicializar bgState
    slides.value.forEach((_, i) => {
      bgState[i] = i === currentIndex.value ? "visible" : "hidden";
    });
  }

  if (slides.value.length > 1) {
    startAutoPlay();
  }

  loading.value = false;
});

onUnmounted(() => {
  stopAutoPlay();
  clearAnimationTimeouts();
});

async function loadLegacyHero() {
  try {
    const res = await ecommerceAPI.getHero();
    if (res.data && typeof res.data === "object") {
      slides.value = [
        {
          ...res.data,
          image_url: res.data.image_main_url || res.data.image_url || "",
        },
      ];
    }
  } catch {
    slides.value = [{}];
  }
}
</script>

<style scoped>
/* ────────────────────────────────────────────────
   BG TRANSITION – sin escala, solo opacidad + blur
   ──────────────────────────────────────────────── */
.bg-transition {
  transition: opacity 580ms ease-out 120ms;
}

/* ────────────────────────────────────────────────
   TEXT STAGGER
   ──────────────────────────────────────────────── */
.text-stagger-enter-active {
  transition: all 350ms cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: 50ms;
}
.text-stagger-leave-active {
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.text-stagger-enter-from {
  opacity: 0;
  transform: translateY(28px);
}
.text-stagger-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* ────────────────────────────────────────────────
   THUMBNAIL BASE
   ──────────────────────────────────────────────── */
.thumb-btn {
  transition: transform 300ms ease-out, border-color 300ms ease-out, opacity 300ms ease-out;
}
</style>
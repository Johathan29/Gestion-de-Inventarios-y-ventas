<template>
  <div
    ref="cardRef"
    class="relative overflow-hidden transition-all duration-500 group stat-card"
    :class="[
      isDashboard ? 'rounded-[28px] p-8 border' : 'rounded-2xl p-5 border',
      { 'stat-card-visible': isVisible }
    ]"
    :style="{
      background: computedBg,
      borderColor: computedBorderColor,
      transitionDelay: `${staggerDelay}ms`,
      boxShadow: isDashboard ? (hover ? computedHoverShadow : '0 10px 40px -10px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)') : undefined
    }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- Dashboard hover glow overlay -->
    <div v-if="isDashboard"
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[28px]"
      :style="{ background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${computedGlowColor}, transparent 60%)` }"
    ></div>
    <!-- Default hover glow effect -->
    <div v-else
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
      :style="{
        background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${iconBg || 'rgba(124,58,237,0.06)'}, transparent 60%)`
      }"
    ></div>

    <!-- Dashboard variant layout -->
    <template v-if="isDashboard">
      <!-- Top row: label + right icon, value below label -->
      <div class="flex justify-between items-start mb-6">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold uppercase tracking-wider mb-3" :style="{ color: iconColor || '#7c3aed' }">{{ label }}</p>
          <h3 class="text-[32px] font-bold leading-none truncate" style="color: #1e293b; font-family: 'Outfit', sans-serif; max-width: 180px;">{{ displayValue }}</h3>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-2xl" :style="{ color: iconColor || '#7c3aed', fontVariationSettings: `'FILL' 1` }">{{ icon }}</span>
        </div>
      </div>
      <!-- Trend indicator row -->
      <div v-if="trend != null || subtext" class="flex items-center gap-2">
        <div v-if="trend != null" class="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md"
          :style="{
            background: trend >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
            color: trend >= 0 ? '#16a34a' : '#ef4444'
          }">
          <span class="material-icons-outlined text-sm" style="font-size: 14px;">{{ trend >= 0 ? 'arrow_upward' : 'arrow_downward' }}</span>
          {{ trend >= 0 ? '+' : '' }}{{ trend }}%
        </div>
        <span v-if="subtext" class="text-xs" style="color: #94a3b8;">{{ subtext }}</span>
      </div>
    </template>

    <!-- Default variant layout -->
    <template v-else>
      <!-- Top row: icon + value -->
      <div class="flex items-start justify-between mb-3 relative z-10">
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
          :style="{ background: iconBg || 'rgba(124,58,237,0.12)' }"
        >
          <span class="material-symbols-outlined text-2xl" :style="{ color: iconColor || '#7c3aed', fontVariationSettings: `'FILL' 1` }">{{ icon }}</span>
        </div>
        <div class="text-right">
          <span class="text-3xl font-bold tabular-nums" style="color: #1e293b; font-family: 'Outfit', sans-serif;">{{ displayValue }}</span>
        </div>
      </div>
      <!-- Label -->
      <p class="text-sm font-medium mb-2 relative z-10" style="color: #64748b; font-family: 'Inter', sans-serif;">{{ label }}</p>
      <!-- Trend indicator row -->
      <div v-if="trend != null || subtext" class="flex items-center gap-2 relative z-10">
        <div v-if="trend != null" class="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md"
          :style="{
            background: trend >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
            color: trend >= 0 ? '#16a34a' : '#ef4444'
          }">
          <span class="material-icons-outlined text-sm" style="font-size: 14px;">{{ trend >= 0 ? 'arrow_upward' : 'arrow_downward' }}</span>
          {{ trend >= 0 ? '+' : '' }}{{ trend }}%
        </div>
        <span v-if="subtext" class="text-xs relative z-10" style="color: #94a3b8;">{{ subtext }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  type: { type: String, default: null },
  icon: { type: String, default: 'analytics' },
  cardBg: { type: String, default: '#ffffff' },
  iconBg: { type: String, default: 'rgba(124,58,237,0.12)' },
  iconColor: { type: String, default: '#7c3aed' },
  borderColor: { type: String, default: '#e2e8f0' },
  subtext: { type: String, default: null },
  trend: { type: Number, default: null },
  /** Card variant: 'default' or 'dashboard' */
  variant: { type: String, default: 'default' },
  /** Enable animated counter + entrance effect */
  animate: { type: Boolean, default: true },
  /** Animation duration in ms */
  animationDuration: { type: Number, default: 2000 },
  /** Stagger delay in ms for entrance */
  staggerDelay: { type: Number, default: 0 }
});

const hover = ref(false);
const cardRef = ref(null);
const isVisible = ref(false);
const animatedValue = ref(0);
const hasAnimated = ref(false);
const initialValue = ref(Number(props.value));

let observer = null;
let animationId = null;
let startTime = null;

// ─── Dashboard variant helpers ────────────────────────────────────────────
const isDashboard = computed(() => props.variant === 'dashboard');

function hexToRgb(hex) {
  const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const full = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
  const h = shorthand.test(hex) ? hex.replace(shorthand, (m, r, g, b) => r + r + g + g + b + b) : hex;
  const result = full.exec(h);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function parseRgbValues(color) {
  if (!color) return null;
  // Try hex first
  const hex = hexToRgb(color);
  if (hex) return hex;
  // Try rgba format
  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgba) return { r: parseInt(rgba[1]), g: parseInt(rgba[2]), b: parseInt(rgba[3]) };
  return null;
}

const computedBg = computed(() => {
  if (!isDashboard.value) return props.cardBg || '#ffffff';
  const rgb = parseRgbValues(props.iconColor || '#7c3aed');
  if (rgb) {
    return `linear-gradient(135deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.06), rgba(${rgb.r},${rgb.g},${rgb.b},0.02))`;
  }
  return 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02))';
});

const computedBorderColor = computed(() => {
  if (!isDashboard.value) return props.borderColor || '#e2e8f0';
  const rgb = parseRgbValues(props.iconColor || '#7c3aed');
  if (rgb) {
    return `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`;
  }
  return 'rgba(124,58,237,0.12)';
});

const computedHoverShadow = computed(() => {
  const rgb = parseRgbValues(props.iconColor || '#7c3aed');
  if (rgb) {
    return `0 20px 40px -10px rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`;
  }
  return '0 20px 40px -10px rgba(124,58,237,0.12)';
});

const computedGlowColor = computed(() => {
  const rgb = parseRgbValues(props.iconColor || '#7c3aed');
  if (rgb) {
    return `rgba(${rgb.r},${rgb.g},${rgb.b},0.04)`;
  }
  return 'rgba(124,58,237,0.04)';
});

function onMouseEnter(e) {
  hover.value = true;
  if (isDashboard.value) {
    e.currentTarget.style.boxShadow = computedHoverShadow.value;
  }
}

function onMouseLeave(e) {
  hover.value = false;
  if (isDashboard.value) {
    e.currentTarget.style.boxShadow = '0 10px 40px -10px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)';
  }
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function animateNumber(timestamp) {
  if (!startTime) startTime = timestamp;
  const elapsed = timestamp - startTime;
  const progress = Math.min(elapsed / props.animationDuration, 1);
  const easedProgress = easeOutQuart(progress);

  const target = Number(props.value);
  animatedValue.value = Math.round(easedProgress * target);

  if (progress < 1) {
    animationId = requestAnimationFrame(animateNumber);
  } else {
    animatedValue.value = target;
    hasAnimated.value = true;
  }
}

function startAnimation() {
  if (hasAnimated.value) return;
  const target = Number(props.value);
  if (target === 0) {
    animatedValue.value = 0;
    hasAnimated.value = true;
    return;
  }
  startTime = null;
  animatedValue.value = 0;
  animationId = requestAnimationFrame(animateNumber);
}

function resetAnimation() {
  if (animationId) cancelAnimationFrame(animationId);
  animatedValue.value = 0;
  hasAnimated.value = false;
  startTime = null;
}

// The value to display — animated counter value while animating, then real value
const displayValue = computed(() => {
  if (!props.animate || typeof props.value !== 'number') {
    return formatValue(props.value);
  }
  // If already animated or not animating, use animatedValue (which reaches target)
  return formatValue(animatedValue.value);
});

function formatValue(val) {
  const num = Number(val);
  if (isNaN(num)) return val;
  
  // Format currency type with compact millions for large numbers (> 6 digits / >= 1,000,000)
  if (props.type === 'currency') {
    if (Math.abs(num) >= 1000000) {
      return '$' + (num / 1000000).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
    }
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }
  return new Intl.NumberFormat('es-MX').format(num);
}

// Watch for value changes — if data loads after mount, animate
watch(() => props.value, (newVal, oldVal) => {
  const num = Number(newVal);
  if (num > 0 && !hasAnimated.value && isVisible.value) {
    // Value changed to non-zero and we haven't animated yet — start animation
    startAnimation();
  } else if (num > 0 && oldVal !== undefined && Number(oldVal) !== num) {
    // Value changed dynamically — animate up to new value (only if visible)
    if (isVisible.value) {
      resetAnimation();
      nextTick(() => startAnimation());
    }
  }
});

onMounted(() => {
  if (!props.animate) {
    isVisible.value = true;
    return;
  }

  // Entrance animation via IntersectionObserver
  if (cardRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true;
            // Start counter animation after a small delay for entrance
            setTimeout(() => {
              startAnimation();
            }, 100);
            observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(cardRef.value);
  } else {
    isVisible.value = true;
  }
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.stat-card {
  opacity: 0;
  transform: translateY(24px) scale(0.98);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out, box-shadow 0.3s ease, border-color 0.3s ease;
}

.stat-card-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>

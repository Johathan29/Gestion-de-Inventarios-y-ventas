<template>
  <section id="offers" class="py-8 px-4 overflow-hidden">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex md:flex-row flex-col justify-between items-end mb-12" data-gsap="section-title">
        <div>
          <p class="text-primary font-label-sm text-label-sm uppercase tracking-[0.2em] mb-3">Hot Deals</p>
          <h2 class="font-bold text-[1.7rem] text-on-surface mb-4">{{ title }}</h2>
          <p class="font-body-md text-body-md text-on-surface-variant max-w-md">{{ subtitle }}</p>
        </div>
        <RouterLink to="/offers"
          v-if="showViewAll && products.length > 0"
         
          class="text-primary !cursor-pointer font-headline-md text-headline-md flex items-center gap-2 group"
        >
          View All
          <span class="material-symbols-outlined group-hover:translate-x-2 transition-transform" data-icon="chevron_right">chevron_right</span>
        </RouterLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="n in 3" :key="'skeleton-' + n" class="glass-card rounded-[32px] p-6 h-full animate-pulse">
          <div class="aspect-square mb-8 overflow-hidden rounded-2xl bg-white/5"></div>
          <div class="h-6 bg-white/5 rounded w-3/4 mb-4"></div>
          <div class="h-4 bg-white/5 rounded w-1/4 mb-4"></div>
          <div class="h-4 bg-white/5 rounded w-full mb-2"></div>
          <div class="h-4 bg-white/5 rounded w-2/3 mb-8"></div>
          <div class="h-12 bg-white/5 rounded-xl w-full"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <span class="material-symbols-outlined text-5xl text-on-surface-variant mb-4" data-icon="error_outline">error_outline</span>
        <p class="text-on-surface-variant font-body-lg text-body-lg">{{ error }}</p>
        <button
          @click="fetchOffers"
          class="mt-6 px-6 py-3 bg-primary text-on-primary rounded-full font-label-sm text-label-sm !cursor-pointer"
        >
          Try Again
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="products.length === 0" class="text-center py-12">
        <span class="material-symbols-outlined text-5xl text-on-surface-variant mb-4" data-icon="local_offer">local_offer</span>
        <p class="text-on-surface-variant font-body-lg text-body-lg">No special offers at the moment. Check back soon!</p>
      </div>

      <!-- Offer Product Grid -->
      <div v-else data-gsap="stagger" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="product in products"
          :key="product.id"
          class="perspective"
          data-gsap="item"
        >
          <div
            class="glass-card rounded-[32px] p-6 h-full flex flex-col group cursor-pointer overflow-hidden product-card offer-card"
            @click="$router.push(`/products/${product.id}`)"
            @mousemove="handleMouseMove"
            @mouseleave="resetCard"
          >
            <!-- Image with discount badge -->
            <div class="relative aspect-square mb-8 overflow-hidden rounded-2xl">
              <img
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                :src="productImage(product)"
                :alt="product.name"
                loading="lazy"
              />
              <!-- Discount Badge - Impact effect -->
              <div
                v-if="product.discountPercent > 0"
                class="absolute top-4 left-4 bg-secondary text-on-secondary px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-secondary/30 animate-pulse-discount"
              >
                - {{product.discountPercent}}% OFF
              </div>
              <!-- Featured Badge -->
              <div
                v-else-if="product.featured"
                class="absolute top-4 right-4 glass-card px-4 py-2 rounded-full font-label-sm text-label-sm text-on-surface"
              >
                Featured
              </div>
              <!-- Expiration countdown -->
              <div
                v-if="product.offer_end_date"
                class="absolute bottom-4 right-4 glass-card px-3 py-1.5 rounded-full font-label-sm text-xs text-on-surface-variant"
              >
                <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs" data-icon="schedule">schedule</span>
                  {{ getRemainingDays(product.offer_end_date) }}
                </span>
              </div>
            </div>

            <!-- Product Info -->
            <div class="flex justify-between items-start mb-4">
              <div class="flex-1 min-w-0 mr-2">
                <h3 class="font-headline-md text-headline-md text-on-surface truncate">{{ product.name }}</h3>
                <p v-if="product.brand" class="font-body-sm text-body-sm text-primary/70 mt-1">{{ product.brand }}</p>
              </div>
              <div class="text-right shrink-0">
                <span class="font-headline-md text-headline-md text-secondary">${{ formatPrice(product.price) }}</span>
                <p v-if="product.compare_price && product.compare_price > product.price" class="font-body-sm text-body-sm text-on-surface-variant/50 line-through">
                  ${{ formatPrice(product.compare_price) }}
                </p>
              </div>
            </div>
            <p class="font-body-md text-body-md text-on-surface-variant mb-8 line-clamp-2">{{ product.description || '' }}</p>

            <!-- CTA Button -->
            <button
              @click.stop="goToDetail(product)"
              class="mt-auto w-full py-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary hover:text-on-primary transition-all duration-300 font-label-sm text-label-sm flex items-center justify-center gap-2 group/btn"
            >
              <span>View Offer</span>
              <span class="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ecommerceAPI, productsAPI } from '../../api/index.js';

const props = defineProps({
  title: {
    type: String,
    default: 'Ofertas Especiales'
  },
  subtitle: {
    type: String,
    default: 'Aprovecha descuentos exclusivos por tiempo limitado en productos seleccionados.'
  },
  limit: {
    type: Number,
    default: 6
  },
  showViewAll: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['view-all', 'error']);

const router = useRouter();
const products = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(() => {
  fetchOffers();
});

async function fetchOffers() {
  loading.value = true;
  error.value = null;
  try {
    // Try to get offers from ecommerce API which includes product data
    const { data } = await ecommerceAPI.getOffers();
    
    const offers = Array.isArray(data) ? data : (data?.data || []);

    // Map offers to products with discount info
    products.value = offers
      .filter(o => o.products && o.active !== false)
      .slice(0, props.limit)
      .map(o => ({
         id: o.product_id,
        ...o.products,
        discountPercent: o.discount_percent
          ? Number(o.discount_percent)
          : (o.products?.compare_price && o.products?.price
            ? Math.round((1 - o.products.price / o.products.compare_price) * 100)
            : 0),
        compare_price: o.products?.compare_price || null,
        offer_end_date: o.end_date,
        offer_id: o.id
      }));
      console.log('[OfferShowcase] Fetched offers:', products.value);
  } catch (err) {
    // Fallback: get featured products with discount
    console.warn('[OfferShowcase] Error fetching offers, trying featured products:', err);
    try {
      const res = await productsAPI.getAll({ status: 'active', featured: true, limit: props.limit });
      const data = res.data;
      const items = Array.isArray(data) ? data : (data?.data || []);
      products.value = items.map(p => ({
        ...p,
        discountPercent: p.compare_price && p.compare_price > p.price
          ? Math.round((1 - p.price / p.compare_price) * 100)
          : 0
      }));
    } catch (fallbackErr) {
      const message = fallbackErr.response?.data?.error?.message || 'Failed to load offers';
      error.value = message;
      emit('error', message);
    }
  } finally {
    loading.value = false;
  }
}

function productImage(product) {
  if (product.images && product.images.length > 0) {
    return product.images[0];
  }
  return 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqsIAgceOaO08ENtrM24X2WAH1vTBguxql1jhwjvsnLPSfvgDTCvn7b2qEg0ecl7A2zOYVP1nFstz3rT-NDX_DwQ_CNApXVb8SpSA9dQ0X-jMW4e-n9MxU8zmHyJOzH9lSAKQeOsrq0hVyK5rol_6kVmiDJOgMRalTBhU8w3cLIWgqD3l2GCdFZLNCeucqMoLXY2kfH9fSEU-wJSOgK13-b0AHxjeMzqnD2N-PndYlQM-3f_eE1Y80lcFlBzDW4IzNjYB0rHGJK2w';
}

function formatPrice(price) {
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getRemainingDays(dateStr) {
  if (!dateStr) return '';
  const end = new Date(dateStr);
  const now = new Date();
  const diff = end - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Ending soon';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function goToDetail(product) {
  router.push({ name: 'ProductPublicDetail', params: { id: product.id } });
}

// 3D Tilt hover effect (same as ProductShowcase)
function handleMouseMove(e) {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((centerY - y) / centerY) * 10;
  const rotateY = ((x - centerX) / centerX) * 10;
  card.style.transform = `
    perspective(1200px)
    rotateX(${rotateX}deg)
    rotateY(${rotateY}deg)
    translateY(-8px)
    scale(1.03)
  `;
}

function resetCard(e) {
  e.currentTarget.style.transform = `
    perspective(1200px)
    rotateX(0deg)
    rotateY(0deg)
    translateY(0px)
    scale(1)
  `;
}

defineExpose({ fetchOffers });
</script>

<style scoped>
.perspective {
  perspective: 1400px;
}

.product-card {
  transform-style: preserve-3d;
  transition: transform .18s ease-out, box-shadow .35s ease;
  will-change: transform;
}

.product-card:hover {
  box-shadow:
    0 25px 60px rgba(0,0,0,.35),
    0 10px 30px rgba(138,92,246,.20);
}

/* Offer card extra glow */
.offer-card {
  position: relative;
}

.offer-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 33px;
  background: linear-gradient(135deg, rgba(233,179,252,0.3), rgba(138,92,246,0.1), rgba(233,179,252,0.2));
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.offer-card:hover::before {
  opacity: 1;
}

/* Discount pulse animation */
@keyframes pulse-discount {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(138,92,246,0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 20px 5px rgba(138,92,246,0.2);
  }
}

.animate-pulse-discount {
  animation: pulse-discount 2s ease-in-out infinite;
}

/* Entrance animation */
.entrance-reveal {
  opacity: 0;
  transform: translateY(30px);
  filter: blur(10px);
  transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.entrance-reveal.visible {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}
</style>

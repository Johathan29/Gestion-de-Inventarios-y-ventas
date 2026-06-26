<template>
  <section class="py-8 px-4 bg-surface-container-lowest/30">
    <div class="max-w-7xl mx-auto">
      <div class="flex md:flex-row flex-col justify-between items-end mb-20 entrance-reveal">
        <div>
          <h2 class="font-bold text-[1.7rem] text-on-surface mb-4">{{ title }}</h2>
          <p class="font-body-md text-body-md text-on-surface-variant max-w-md">{{ subtitle }}</p>
        </div>
        <button
          v-if="showViewAll"
          @click="$emit('view-all')"
          class="text-primary !cursor-pointer font-headline-md text-headline-md flex items-center gap-2 group"
        >
          View All
          <span class="material-symbols-outlined group-hover:translate-x-2 transition-transform" data-icon="chevron_right">chevron_right</span>
        </button>
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
          @click="fetchProducts"
          class="mt-6 px-6 py-3 bg-primary text-on-primary rounded-full font-label-sm text-label-sm !cursor-pointer"
        >
          Try Again
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="products.length === 0" class="text-center py-12">
        <span class="material-symbols-outlined text-5xl text-on-surface-variant mb-4" data-icon="inventory_2">inventory_2</span>
        <p class="text-on-surface-variant font-body-lg text-body-lg">No products available at the moment.</p>
      </div>

      <!-- Product Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
  v-for="product in products"
  :key="product.id"
  class="perspective"
>
    <div
      class="glass-card rounded-[32px] p-6 h-full flex flex-col group cursor-pointer overflow-hidden product-card"
      @mousemove="handleMouseMove"
      @mouseleave="resetCard"
    >
            <div class="relative aspect-square mb-8 overflow-hidden rounded-2xl">
              <img
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                :src="productImage(product)"
                :alt="product.name"
                loading="lazy"
              />
              <div
                v-if="productBadge(product)"
                class="absolute top-4 right-4 glass-card px-4 py-2 rounded-full font-label-sm text-label-sm text-on-surface"
              >
                {{ productBadge(product) }}
              </div>
            </div>
            <div class="flex justify-between items-start mb-4">
              <h3 class="font-headline-md text-headline-md text-on-surface">{{ product.name }}</h3>
              <span class="font-headline-md text-headline-md text-secondary">${{ formatPrice(product.price) }}</span>
            </div>
            <p class="font-body-md text-body-md text-on-surface-variant mb-8">{{ product.description || '' }}</p>
            <button
              @click="addToCart(product)"
              :disabled="addingToCart === product.id"
              class="mt-auto w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-primary hover:text-on-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 font-label-sm text-label-sm flex items-center justify-center gap-2"
            >
              <template v-if="addingToCart === product.id">
                <span class="material-symbols-outlined animate-spin" data-icon="progress_activity">progress_activity</span>
                Adding...
              </template>
              <template v-else>
                <span class="material-symbols-outlined" data-icon="shopping_bag">shopping_bag</span>
                Add to Collection
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { productsAPI, cartAPI } from '../../api/index.js';
import { useRouter } from 'vue-router';

const props = defineProps({
  title: {
    type: String,
    default: 'Curated Essentials'
  },
  subtitle: {
    type: String,
    default: 'Precision-engineered care products designed for the modern sanctuary.'
  },
  limit: {
    type: Number,
    default: 6
  },
  featured: {
    type: Boolean,
    default: true
  },
  showViewAll: {
    type: Boolean,
    default: true
  },
  categoryId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['view-all', 'added-to-cart', 'error']);

const router = useRouter();
const products = ref([]);
const loading = ref(true);
const error = ref(null);
const addingToCart = ref(null);

onMounted(() => {
  fetchProducts();
});

async function fetchProducts() {
  loading.value = true;
  error.value = null;
  try {
    const params = {
      status: 'active',
      limit: props.limit
    };

    if (props.featured) {
      params.featured = true;
    }

    if (props.categoryId) {
      params.category_id = props.categoryId;
    }

    const { data } = await productsAPI.getAll(params);
    products.value = data.data || data || [];
  } catch (err) {
    const message = err.response?.data?.error?.message || 'Failed to load products';
    error.value = message;
    emit('error', message);
  } finally {
    loading.value = false;
  }
}

function productImage(product) {
  if (product.images && product.images.length > 0) {
    return product.images[0];
  }
  // Fallback image
  return 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqsIAgceOaO08ENtrM24X2WAH1vTBguxql1jhwjvsnLPSfvgDTCvn7b2qEg0ecl7A2zOYVP1nFstz3rT-NDX_DwQ_CNApXVb8SpSA9dQ0X-jMW4e-n9MxU8zmHyJOzH9lSAKQeOsrq0hVyK5rol_6kVmiDJOgMRalTBhU8w3cLIWgqD3l2GCdFZLNCeucqMoLXY2kfH9fSEU-wJSOgK13-b0AHxjeMzqnD2N-PndYlQM-3f_eE1Y80lcFlBzDW4IzNjYB0rHGJK2w';
}

function productBadge(product) {
  if (product.featured) return 'Featured';
  if (product.compare_price && product.compare_price > product.price) return 'Sale';
  return null;
}

function discountPercent(product) {
  if (!product.compare_price || product.compare_price <= product.price) return 0;
  return Math.round((1 - product.price / product.compare_price) * 100);
}

function formatPrice(price) {
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

async function addToCart(product) {
  const token = sessionStorage.getItem('accessToken');

  if (!token) {
    // Not logged in — redirect to login
    router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  addingToCart.value = product.id;
  try {
    await cartAPI.addItem({ product_id: product.id, quantity: 1 });
    emit('added-to-cart', product);
    // Visual feedback is managed by the button state reset below
  } catch (err) {
    const message = err.response?.data?.error?.message || 'Could not add to cart';
    emit('error', message);
  } finally {
    addingToCart.value = null;
  }
}
function handleMouseMove(e) {

  const card = e.currentTarget;

  const rect = card.getBoundingClientRect();

  const x = e.clientX - rect.left;

  const y = e.clientY - rect.top;

  const centerX = rect.width / 2;

  const centerY = rect.height / 2;

  const rotateX = ((centerY - y) / centerY) * 10;

  const rotateY = ((x - centerX) / centerX) * 10;

  card.style.transform =
    `
    perspective(1200px)
    rotateX(${rotateX}deg)
    rotateY(${rotateY}deg)
    translateY(-8px)
    scale(1.03)
    `;

}

function resetCard(e){

    e.currentTarget.style.transform =
    `
    perspective(1200px)
    rotateX(0deg)
    rotateY(0deg)
    translateY(0px)
    scale(1)
    `;

}
// Expose for parent to trigger refresh
defineExpose({ fetchProducts });
</script>
<style scoped>
.perspective{

    perspective:1400px;

}

.product-card{

    transform-style:preserve-3d;

    transition:
    transform .18s ease-out,
    box-shadow .35s ease;

    will-change:transform;

}

.product-card:hover{

    box-shadow:
    0 25px 60px rgba(0,0,0,.35),
    0 10px 30px rgba(138,92,246,.20);

}
</style>
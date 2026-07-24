<template>
  <section class="py-16 px-4 relative overflow-hidden">
    <!-- Aurora subtle bg -->
    <div class="absolute inset-0 -z-10 opacity-10">
      <div class="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-pulse" />
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-[100px] animate-pulse" style="animation-delay: 2s" />
    </div>

    <div class="max-w-7xl mx-auto">
      <div class="flex md:flex-row flex-col justify-between items-end mb-14" data-gsap="section-title">
        <div class="entrance-reveal">
          <span class="inline-block px-4 py-1.5 text-sm font-semibold bg-primary/20 text-primary rounded-full border border-primary/30 mb-4">Nuestros Productos</span>
          <h2 class="text-3xl md:text-4xl font-bold text-white mb-3">{{ title }}</h2>
          <p class="text-white/60 max-w-md">{{ subtitle }}</p>
        </div>
        <button
          v-if="showViewAll"
          @click="$emit('view-all')"
          class="text-primary !cursor-pointer font-headline-md text-headline-md flex items-center gap-2 group mt-4 md:mt-0"
        >
          Ver Todo
          <span class="material-symbols-outlined group-hover:translate-x-2 transition-transform" data-icon="chevron_right">chevron_right</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="n in 3" :key="'skeleton-' + n" class="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[24px] p-6 h-full animate-pulse">
          <div class="aspect-square mb-6 overflow-hidden rounded-2xl bg-white/5"></div>
          <div class="h-5 bg-white/5 rounded w-3/4 mb-3"></div>
          <div class="h-4 bg-white/5 rounded w-1/4 mb-3"></div>
          <div class="h-3 bg-white/5 rounded w-full mb-2"></div>
          <div class="h-3 bg-white/5 rounded w-2/3 mb-6"></div>
          <div class="h-11 bg-white/5 rounded-xl w-full"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-16">
        <span class="material-symbols-outlined text-5xl text-white/40 mb-4" data-icon="error_outline">error_outline</span>
        <p class="text-white/60 font-body-lg text-body-lg mb-6">{{ error }}</p>
        <button
          @click="fetchProducts"
          class="px-6 py-3 bg-primary text-white rounded-full font-label-sm text-label-sm !cursor-pointer hover:brightness-110 transition-all"
        >
          Intentar de nuevo
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="products.length === 0" class="text-center py-16">
        <span class="material-symbols-outlined text-5xl text-white/40 mb-4" data-icon="inventory_2">inventory_2</span>
        <p class="text-white/60 font-body-lg text-body-lg">No hay productos disponibles en este momento.</p>
      </div>

      <!-- Product Grid -->
      <div data-gsap="stagger" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="product in products"
          :key="product.id"
          class="perspective"
          data-gsap="item"
        >
          <div
            class="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[24px] p-6 h-full flex flex-col group cursor-pointer overflow-hidden product-card hover:border-primary/30"
            @mousemove="handleMouseMove"
            @mouseleave="resetCard"
          >
            <div class="relative aspect-square mb-5 overflow-hidden rounded-2xl bg-white/5">
              <img
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                :src="productImage(product)"
                :alt="product.name"
                loading="lazy"
              />
              <div
                v-if="productBadge(product)"
                class="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full"
              >
                {{ productBadge(product) }}
              </div>
              <div
                v-if="discountPercent(product) > 0"
                class="absolute top-3 right-3 bg-secondary text-white text-xs font-bold px-3 py-1.5 rounded-full"
              >
                -{{ discountPercent(product) }}%
              </div>
            </div>
            <div class="flex justify-between items-start mb-3 gap-3">
              <h3 class="font-headline-md text-headline-md text-white line-clamp-1">{{ product.name }}</h3>
              <span class="font-headline-md text-headline-md text-secondary shrink-0">${{ formatPrice(product.price) }}</span>
            </div>
            <p class="font-body-md text-body-md text-white/50 mb-5 line-clamp-2 text-sm">{{ product.description || '' }}</p>
            <div class="mt-auto border-t border-white/10 pt-4">
              <button
                @click="addToCart(product)"
                :disabled="addingToCart === product.id"
                class="w-full py-3.5 rounded-full bg-primary text-white font-bold text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
              >
                <template v-if="addingToCart === product.id">
                  <span class="material-symbols-outlined animate-spin text-base" data-icon="progress_activity">progress_activity</span>
                  Agregando...
                </template>
                <template v-else>
                  <span class="material-symbols-outlined text-base" data-icon="shopping_bag">shopping_bag</span>
                  Agregar al carrito
                </template>
              </button>
            </div>
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
    default: 'Productos Destacados'
  },
  subtitle: {
    type: String,
    default: 'Descubre nuestra selección de productos premium para el cuidado y bienestar de tus mascotas.'
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
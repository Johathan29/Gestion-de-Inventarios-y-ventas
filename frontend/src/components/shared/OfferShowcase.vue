<template>
  <section id="offers" class="w-full py-20 px-4 md:px-8 relative overflow-hidden" :class="offers.length>0 ? 'block' : 'hidden'">
    <!-- Background pattern -->
    <div class="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.03] via-transparent to-primary/[0.03]" />

    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 entrance-reveal">
        <span class="inline-block px-4 py-1.5 text-sm font-semibold bg-red-500/20 text-red-400 rounded-full border border-red-500/30 mb-4 pulse-discount">
          Ofertas Especiales
        </span>
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">{{ title }}</h2>
        <p v-if="subtitle" class="text-white/60 max-w-xl mx-auto">{{ subtitle }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid md:grid-cols-3 gap-8">
        <div v-for="n in 3" :key="n" class="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden animate-pulse">
          <div class="h-56 bg-white/5" />
          <div class="p-6 space-y-3">
            <div class="h-4 w-3/4 bg-white/5 rounded" />
            <div class="h-6 w-1/2 bg-white/5 rounded" />
            <div class="h-3 w-1/3 bg-white/5 rounded" />
            <div class="h-11 w-full bg-white/5 rounded-full" />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-16">
        <span class="material-symbols-outlined text-5xl text-red-400 mb-4">local_offer</span>
        <p class="text-white/60 mb-6">{{ error }}</p>
        <button @click="fetchOffers" class="px-6 py-2.5 bg-primary text-white rounded-full font-semibold hover:brightness-110 transition-all">
          Reintentar
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="offers.length === 0 && fallbackProducts.length === 0" class="text-center py-16">
        <span class="material-symbols-outlined text-5xl text-white/20 mb-4">confirmation_number</span>
        <h3 class="text-xl font-semibold text-white mb-2">No hay ofertas disponibles</h3>
        <p class="text-white/60 mb-6">Pronto tendremos descuentos especiales para ti.</p>
        <button @click="$emit('view-all')" class="px-6 py-2.5 border border-white/20 text-white/80 rounded-full font-semibold hover:bg-white/5 transition-all">
          Ver catálogo
        </button>
      </div>

      <!-- Success State -->
      <div v-else class="grid md:grid-cols-3 gap-8">
        <div
          v-for="offer in displayItems"
          :key="offer.id"
          class="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/40 transition-all duration-500 cursor-pointer hover:shadow-xl hover:shadow-red-500/5"
          @click="goToProduct(offer)"
        >
          <!-- Product Image -->
          <div class="relative h-56 overflow-hidden bg-white/5">
            <img v-if="offer.image_url"
              :src="offer.image_url"
              :alt="offer.name"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              @error="onImgError" />
            <div v-else class="w-full h-full flex items-center justify-center">
              <span class="material-symbols-outlined text-5xl text-white/20">inventory_2</span>
            </div>
            <!-- Discount Badge (barista arrow-tail style) -->
            <span v-if="offer.discount_percentage"
              class="offer-badge absolute top-4 left-4 px-4 py-2 text-sm font-extrabold bg-red-500 text-white rounded-full pulse-discount shadow-lg shadow-red-500/30">
              -{{ offer.discount_percentage }}%
            </span>
          </div>

          <!-- Product Info -->
          <div class="p-6">
            <span v-if="offer.category_name" class="text-xs text-primary/60 uppercase tracking-wider font-semibold">{{ offer.category_name }}</span>
            <h3 class="text-lg font-bold text-white mt-1 mb-3">{{ offer.name }}</h3>
            <div class="flex items-baseline gap-3 mb-3">
              <span class="text-2xl font-bold text-secondary">{{ formatPrice(offer.price) }}</span>
              <span v-if="offer.original_price" class="text-sm text-white/40 line-through">{{ formatPrice(offer.original_price) }}</span>
            </div>
            <!-- Countdown -->
            <div v-if="offer.ends_at" class="flex items-center gap-2 text-sm text-white/50 mb-5">
              <span class="material-symbols-outlined text-base">schedule</span>
              <span>{{ getRemainingDays(offer.ends_at) }}</span>
            </div>
            <div class="border-t border-white/10 pt-4">
              <button
                @click.stop="addToCart(offer)"
                :disabled="addingId === offer.id"
                class="w-full py-3.5 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2"
                :class="addedId === offer.id
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-primary text-white hover:brightness-110'"
              >
                <span v-if="addingId === offer.id" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span v-else-if="addedId === offer.id" class="material-symbols-outlined text-lg">check</span>
                <span v-else class="material-symbols-outlined text-lg">shopping_cart</span>
                {{ addedId === offer.id ? 'Agregado' : 'Agregar al carrito' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- View All Button -->
      <div v-if="!loading && !error" class="text-center mt-14 entrance-reveal">
        <router-link to="/offers" class="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-white/30 text-white rounded-full font-bold hover:bg-white hover:text-primary transition-all no-underline text-sm">
          Ver todas las ofertas
          <span class="material-symbols-outlined text-lg">arrow_forward</span>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ecommerceAPI } from '../../api';
import { useToast } from '../../composables/useToast';

const props = defineProps({
  title: { type: String, default: 'Ofertas Especiales' },
  subtitle: { type: String, default: '' },
  limit: { type: Number, default: 3 }
});

const emit = defineEmits(['view-all', 'error']);

const router = useRouter();
const toast = useToast();
const offers = ref([]);
const fallbackProducts = ref([]);
const loading = ref(true);
const error = ref(null);
const addingId = ref(null);
const addedId = ref(null);

const displayItems = computed(() => {
  if (offers.value.length > 0) {
    return offers.value.slice(0, props.limit).map(o => ({
      id: o.product_id || o.id,
      name: o.products?.name || o.name || 'Producto',
      price: o.offer_price || (o.discount_percent && o.products?.price
        ? Number(o.products.price) * (1 - Number(o.discount_percent) / 100)
        : o.products?.price || o.price || 0),
      original_price: o.products?.compare_price || o.products?.price || o.original_price || 0,
      discount_percentage: o.discount_percent || o.discount_percentage || 0,
      image_url: o.products?.images?.[0] || o.image_url || '',
      category_name: o.products?.category_name || o.category_name || '',
      ends_at: o.end_date || o.ends_at || '',
      slug: o.products?.slug || o.slug || '',
      stock: o.products?.stock || o.stock || 0,
      // Datos adicionales para addToCart
      _offer_id: o.id
    }));
  }
  return fallbackProducts.value.slice(0, props.limit);
});

function formatPrice(price) {
  const num = Number(price);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(num);
}

function getRemainingDays(dateStr) {
  const now = new Date();
  const end = new Date(dateStr);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Finalizado';
  if (diff === 1) return '1 día restante';
  return `${diff} días restantes`;
}

function onImgError(e) {
  e.target.style.display = 'none';
}

function goToProduct(product) {
  if (product.slug) {
    router.push(`/products/${product.slug}`);
  }
}

async function addToCart(product) {
  if (addingId.value) return;
  addingId.value = product.id;
  try {
    const { cartAPI } = await import('../../api');
    await cartAPI.addItem({ productId: product.id, quantity: 1 });
    addedId.value = product.id;
    toast.success(`${product.name} agregado al carrito`);
    emit('view-all', product);
    setTimeout(() => { addedId.value = null; }, 2000);
  } catch (err) {
    emit('error', err.message || 'Error al agregar al carrito');
    toast.error(err.message || 'Error al agregar al carrito');
  } finally {
    addingId.value = null;
  }
}

async function fetchOffers() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await ecommerceAPI.getOffers({ limit: props.limit, status: 'active' });
    offers.value = data?.data || data || [];
    console.log('Fetched offers:', offers.value);
    // Fallback: if no offers, load featured products
    if (offers.value.length === 0) {
      const { productsAPI } = await import('../../api');
      const { data: fpData } = await productsAPI.getAll({ featured: true, limit: props.limit, status: 'active' });
      fallbackProducts.value = fpData?.data || fpData || [];
    }
  } catch (err) {
    error.value = err.message || 'Error al cargar ofertas';
    emit('error', error.value);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchOffers();
});
</script>

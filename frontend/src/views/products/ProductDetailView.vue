<template>
  <Loading v-if="loading" />
  <div v-else class="max-w-6xl mx-auto">
    <!-- Action Header -->
    <div class="flex flex-wrap gap-4 items-center justify-between mb-6">
      <button @click="$router.push('/app/products')"
        class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all active:scale-95 hover:bg-[#eff4ff]"
        style="color: #624200; font-family: 'Inter', sans-serif; font-size: 1rem;">
        <span class="material-icons-outlined">arrow_back</span>
        Volver
      </button>
      <button @click="$router.push(`/app/products/${product.id}/edit`)"
        class="flex items-center gap-2 font-semibold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-[0px_4px_20px_rgba(98,66,0,0.05)] hover:opacity-90"
        style="background: #624200; color: white; border-color: rgba(139,94,0,0.2); font-family: 'Inter', sans-serif; font-size: 0.875rem;">
        <span class="material-icons-outlined" style="font-size: 1.25rem;">edit</span>
        Editar Producto
      </button>
    </div>

    <!-- 2-Column Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Column: Gallery (5/12) -->
      <div class="lg:col-span-5 flex flex-col gap-4">
        <!-- Main Image -->
        <div class="bg-white rounded-xl shadow-[0px_4px_20px_rgba(98,66,0,0.05)] aspect-square p-4 flex items-center justify-center overflow-hidden border border-[#d2c4b4]/30">
          <img v-if="product.images && product.images.length > 0"
            :src="currentImage" :alt="product.name"
            class="w-full h-full object-contain transition-opacity duration-300"
            @error="currentImage && (imageErrors[currentImage] = true)" />
          <div v-else class="text-center p-8">
            <span class="material-icons-outlined" style="font-size: 4rem; color: #d2c4b4; display: block; margin-bottom: 0.5rem;">inventory_2</span>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #4f4539;">Sin imagen</p>
          </div>
        </div>
        <!-- Thumbnails -->
        <div v-if="product.images && product.images.length > 1"
          class="flex gap-4 overflow-x-auto pb-2">
          <div v-for="(img, idx) in product.images" :key="idx"
            @click="currentImageIndex = idx"
            class="w-20 h-20 shrink-0 bg-white rounded-lg shadow-[0px_4px_20px_rgba(98,66,0,0.05)] overflow-hidden cursor-pointer transition-all"
            :class="idx === currentImageIndex
              ? 'border-2 border-[#624200]'
              : 'border border-[#d2c4b4]/30 opacity-70 hover:opacity-100'">
            <img :src="img" class="w-full h-full object-cover" @error="imageErrors[img] = true" />
          </div>
        </div>
      </div>

      <!-- Right Column: Details (7/12) -->
      <div class="lg:col-span-7 flex flex-col gap-6">
        <!-- Title & Badges -->
        <div class="flex flex-col gap-2">
          <div class="flex items-start justify-between gap-4">
            <h2 style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">{{ product.name }}</h2>
          </div>
          <div class="flex flex-wrap gap-2 items-center mt-2">
            <span v-if="product.status === 'active' || product.is_active" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border" style="background: #dcfce7; color: #166534; border-color: #bbf7d0; font-family: 'Inter', sans-serif; letter-spacing: 0.05em; text-transform: uppercase;">
              <span class="w-2 h-2 rounded-full" style="background: #16a34a;"></span> Activo
            </span>
            <span v-else class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border" style="background: #f3f4f6; color: #4b5563; border-color: #e5e7eb; font-family: 'Inter', sans-serif; letter-spacing: 0.05em; text-transform: uppercase;">
              <span class="w-2 h-2 rounded-full" style="background: #9ca3af;"></span> Inactivo
            </span>
            <span v-if="product.featured" class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold" style="background: rgba(253,202,92,0.3); color: #735500; border: 1px solid rgba(121,89,0,0.1); font-family: 'Inter', sans-serif; letter-spacing: 0.05em; text-transform: uppercase;">
              <span class="material-icons-outlined" style="font-size: 14px;">star</span> Destacado
            </span>
          </div>
          <div class="flex flex-wrap gap-4 mt-4">
            <div class="flex items-center gap-2">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539;">SKU:</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; line-height: 1.4; font-weight: 500; color: #4f4539; background: #eff4ff; padding: 0.25rem 0.5rem; border-radius: 0.375rem; border: 1px solid rgba(210,196,180,0.2);">{{ product.sku }}</span>
            </div>
            <div v-if="product.barcode" class="flex items-center gap-2">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539;">BARCODE:</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; line-height: 1.4; font-weight: 500; color: #4f4539; background: #eff4ff; padding: 0.25rem 0.5rem; border-radius: 0.375rem; border: 1px solid rgba(210,196,180,0.2);">{{ product.barcode }}</span>
            </div>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white rounded-xl p-4 shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/20">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539; margin-bottom: 0.25rem;">Precio de Venta</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem; line-height: 1.3; font-weight: 700; color: #624200;">{{ formatCurrency(product.price) }}</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539; margin-top: 0.25rem;">COP</p>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/20">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539; margin-bottom: 0.25rem;">Costo</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; line-height: 1.4; font-weight: 600; color: #0b1c30;">{{ formatCurrency(product.cost_price || 0) }}</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539; margin-top: 0.25rem;">COP</p>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/20" :style="{ borderLeft: `4px solid ${stockColorHex(product.stock ?? 0, product.min_stock ?? 5)}` }">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539; margin-bottom: 0.25rem;">Stock Actual</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem; line-height: 1.3; font-weight: 700; color: #0b1c30;">{{ product.stock ?? 0 }}</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; margin-top: 0.25rem;" :style="{ color: stockColorHex(product.stock ?? 0, product.min_stock ?? 5) }">
              {{ stockLabel(product.stock ?? 0, product.min_stock ?? 5) }}
            </p>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/20">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539; margin-bottom: 0.25rem;">Margen</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; line-height: 1.4; font-weight: 600; color: #0b1c30;">{{ marginPercent }}%</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; margin-top: 0.25rem;" :style="{ color: marginPercent >= 30 ? '#166534' : '#4f4539' }">{{ marginPercent >= 30 ? 'Rentable' : '-' }}</p>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="bg-white rounded-xl p-6 shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/20">
          <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; line-height: 1.4; font-weight: 600; color: #0b1c30; margin-bottom: 1rem;">Detalles Generales</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid #d3e4fe;">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539;">Categoría</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: #0b1c30;">{{ product.categories?.name || product.category_name || 'Sin categoría' }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid #d3e4fe;">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539;">Marca</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: #0b1c30;">{{ product.brand || '-' }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid #d3e4fe;">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539;">Stock Mínimo</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: #0b1c30;">{{ product.min_stock ?? 0 }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid #d3e4fe;">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539;">Unidad</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: #0b1c30;">{{ product.unit || 'unidad' }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid #d3e4fe;">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539;">Creado</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: #0b1c30;">{{ formatDate(product.created_at) }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid #d3e4fe;">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539;">Última Act.</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: #0b1c30;">{{ formatDate(product.updated_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div v-if="product.description" class="bg-white rounded-xl p-6 shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/20">
          <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; line-height: 1.4; font-weight: 600; color: #0b1c30; margin-bottom: 0.5rem;">Descripción</h3>
          <p style="font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.6; color: #4f4539;">{{ product.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { productsAPI } from '../../api';
import Loading from '../../components/shared/Loading.vue';
import { formatCurrency, formatDate } from '../../utils';

const route = useRoute();
const product = ref({});
const loading = ref(true);
const currentImageIndex = ref(0);
const imageErrors = reactive({});

const currentImage = computed(() => {
  const images = product.value.images;
  if (!images || !Array.isArray(images) || images.length === 0) return null;
  const url = images[currentImageIndex.value] || images[0];
  if (imageErrors[url]) return null;
  return url;
});

const profit = computed(() => {
  return (product.value.price || 0) - (product.value.cost_price || 0);
});

const stockColor = computed(() => {
  const stock = product.value.stock ?? 0;
  const min = product.value.min_stock ?? 5;
  if (stock <= 0) return 'text-red-600';
  if (stock <= min) return 'text-yellow-600';
  return 'text-green-600';
});

const stockColorHex = (stock, min) => {
  if (stock <= 0) return '#991b1b';
  if (stock <= min) return '#b45309';
  return '#16a34a';
};

const stockLabel = (stock, min) => {
  if (stock <= 0) return 'Sin stock';
  if (stock <= min) return 'Bajo';
  return 'Suficiente';
};

const marginPercent = computed(() => {
  const price = product.value.price || 0;
  if (price === 0) return 0;
  return Math.round(((price - (product.value.cost_price || 0)) / price) * 100);
});

onMounted(async () => {
  try {
    const res = await productsAPI.getById(route.params.id);
    product.value = res.data || {};
  } catch (e) {
    console.error('Error fetching product:', e);
  } finally {
    loading.value = false;
  }
});
</script>

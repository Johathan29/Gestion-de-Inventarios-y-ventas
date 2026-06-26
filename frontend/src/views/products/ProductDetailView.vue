<template>
  <Loading v-if="loading" />
  <div v-else class="max-w-5xl mx-auto">
    <!-- Back button -->
    <button @click="$router.push('/app/products')"
      class="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors">
      <span class="material-icons-outlined text-lg">arrow_back</span>
      Volver a productos
    </button>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Image Gallery -->
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <!-- Main Image -->
          <div class="aspect-square bg-gray-50 dark:bg-gray-700 flex items-center justify-center relative">
            <img v-if="product.images && product.images.length > 0"
              :src="currentImage" :alt="product.name"
              class="w-full h-full object-contain p-4 transition-opacity duration-300"
              @error="currentImage && (imageErrors[currentImage] = true)" />
            <div v-else class="text-center p-8">
              <span class="material-icons-outlined text-6xl text-gray-300 dark:text-gray-600 block mb-2">inventory_2</span>
              <p class="text-sm text-gray-400">Sin imagen</p>
            </div>
          </div>
          <!-- Thumbnails -->
          <div v-if="product.images && product.images.length > 1"
            class="flex gap-2 p-3 border-t border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div v-for="(img, idx) in product.images" :key="idx"
              @click="currentImageIndex = idx"
              class="w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all"
              :class="idx === currentImageIndex
                ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'">
              <img :src="img" class="w-full h-full object-cover" @error="imageErrors[img] = true" />
            </div>
          </div>
        </div>
      </div>

      <!-- Product Info -->
      <div class="lg:col-span-3">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ product.name }}</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                SKU: <span class="font-mono font-medium">{{ product.sku }}</span>
                <span v-if="product.barcode"> | Código: {{ product.barcode }}</span>
              </p>
            </div>
            <span class="inline-flex px-3 py-1 text-xs font-medium rounded-full shrink-0"
              :class="(product.status === 'active' || product.is_active)
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
              {{ (product.status === 'active' || product.is_active) ? 'Activo' : 'Inactivo' }}
            </span>
          </div>

          <!-- Price & Stock Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Precio Venta</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(product.price) }}</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ formatCurrency(product.cost_price || 0) }}</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</p>
              <p class="text-xl font-bold mt-1" :class="stockColor">
                {{ product.stock ?? 0 }}
              </p>
            </div>
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ganancia</p>
              <p class="text-xl font-bold mt-1"
                :class="profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ formatCurrency(profit) }}
              </p>
            </div>
          </div>

          <!-- Details Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoría</p>
              <p class="font-medium text-gray-900 dark:text-white mt-0.5">
                {{ product.categories?.name || product.category_name || 'Sin categoría' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Marca</p>
              <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ product.brand || '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock Mínimo</p>
              <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ product.min_stock ?? 0 }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unidad</p>
              <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ product.unit || 'unidad' }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Creado</p>
              <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ formatDate(product.created_at) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actualizado</p>
              <p class="font-medium text-gray-900 dark:text-white mt-0.5">{{ formatDate(product.updated_at) }}</p>
            </div>
          </div>

          <!-- Description -->
          <div v-if="product.description" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Descripción</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{{ product.description }}</p>
          </div>

          <!-- Featured Badge -->
          <div v-if="product.featured" class="mt-4 flex items-center gap-2">
            <span class="material-icons-outlined text-yellow-500 text-lg">star</span>
            <span class="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Producto Destacado</span>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button @click="$router.push(`/app/products/${product.id}/edit`)"
              class="btn-primary px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-primary-600 text-white font-medium text-sm hover:from-purple-700 hover:to-primary-700 transition-all duration-300 shadow-lg shadow-purple-600/20 flex items-center gap-2">
              <span class="material-icons-outlined text-lg">edit</span>
              Editar Producto
            </button>
            <button @click="$router.push('/app/products')"
              class="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              Volver
            </button>
          </div>
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
  if (stock <= 0) return 'text-red-600 dark:text-red-400';
  if (stock <= min) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
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

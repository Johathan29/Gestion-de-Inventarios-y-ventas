<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Mi Lista de Deseos</h2>
      <span v-if="items.length" class="text-sm text-gray-500 dark:text-gray-400">
        {{ items.length }} {{ items.length === 1 ? 'producto' : 'productos' }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!items.length" class="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <svg class="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">Tu lista está vacía</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Explora nuestros productos y agrega tus favoritos aquí.
      </p>
      <router-link
        to="/products"
        class="mt-6 inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
      >
        Ver Catálogo
      </router-link>
    </div>

    <!-- Wishlist Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div
        v-for="item in items"
        :key="item.productId || item.product_id"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
      >
        <!-- Product Image -->
        <router-link
          :to="`/products/${item.productId || item.product_id}`"
          class="block aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden"
        >
          <img
            v-if="item.image || item.image_url"
            :src="item.image || item.image_url"
            :alt="item.name || item.product_name"
            class="w-full h-full object-cover"
          />
          <div v-else class="flex items-center justify-center h-full">
            <svg class="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <!-- Price badge -->
          <div class="absolute top-2 left-2 bg-violet-600 text-white text-xs font-bold px-2 py-1 rounded">
            ${{ formatPrice(item.price || item.unit_price) }}
          </div>
        </router-link>

        <!-- Product Info -->
        <div class="p-4">
          <router-link
            :to="`/products/${item.productId || item.product_id}`"
            class="text-sm font-medium text-gray-900 dark:text-white hover:text-violet-600 line-clamp-2"
          >
            {{ item.name || item.product_name }}
          </router-link>
          <p v-if="item.brand" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ item.brand }}
          </p>

          <!-- Actions -->
          <div class="mt-3 flex items-center justify-between">
            <button
              @click="removeItem(item.productId || item.product_id)"
              class="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              Quitar
            </button>
            <router-link
              :to="`/products/${item.productId || item.product_id}`"
              class="text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              Ver detalle
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useWishlistStore } from '../../stores/wishlist';
import { useCurrencyStore } from '../../stores/currency';

const wishlistStore = useWishlistStore();
const currencyStore = useCurrencyStore();

const items = wishlistStore.items;
const loading = wishlistStore.loading;

const formatPrice = (value) => currencyStore.format(value);

const removeItem = async (productId) => {
  try {
    await wishlistStore.removeItem(productId);
  } catch (err) {
    console.error('Error removing item:', err);
  }
};

onMounted(() => {
  wishlistStore.fetchWishlist();
});
</script>

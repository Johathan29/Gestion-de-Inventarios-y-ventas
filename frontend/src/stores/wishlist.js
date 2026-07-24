import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { wishlistAPI } from '../api';

export const useWishlistStore = defineStore('wishlist', () => {
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const itemIds = computed(() => new Set(items.value.map(i => i.productId || i.product_id)));

  const fetchWishlist = async () => {
    try {
      loading.value = true;
      const res = await wishlistAPI.getAll();
      items.value = res.data || [];
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      items.value = [];
    } finally {
      loading.value = false;
    }
  };

  const addItem = async (productId, variantId = null) => {
    try {
      loading.value = true;
      await wishlistAPI.addItem({ productId, variantId });
      await fetchWishlist();
      return true;
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al agregar a lista de deseos';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removeItem = async (productId) => {
    try {
      await wishlistAPI.removeItem(productId);
      items.value = items.value.filter(i => (i.productId || i.product_id) !== productId);
    } catch (err) {
      error.value = 'Error al eliminar de lista de deseos';
      throw err;
    }
  };

  const isInWishlist = (productId) => {
    return itemIds.value.has(productId);
  };

  const toggleItem = async (productId, variantId = null) => {
    if (isInWishlist(productId)) {
      await removeItem(productId);
      return false;
    } else {
      await addItem(productId, variantId);
      return true;
    }
  };

  const clearError = () => { error.value = null; };

  return {
    items, loading, error, itemIds,
    fetchWishlist, addItem, removeItem, isInWishlist, toggleItem, clearError
  };
});

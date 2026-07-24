import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { cartAPI } from '../api';

export const useCartStore = defineStore('cart', () => {
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + (Number(item.unitPrice) * item.quantity), 0));
  const tax = computed(() => subtotal.value * 0.19);
  const total = computed(() => subtotal.value + tax.value);

  const fetchCart = async () => {
    try {
      loading.value = true;
      const res = await cartAPI.getCart();
      items.value = res.data?.items || [];
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      loading.value = false;
    }
  };

  const addItem = async (product) => {
    try {
      loading.value = true;
      await cartAPI.addItem({
        productId: product.id,
        quantity: product.quantity || 1,
        variantId: product.variantId || undefined
      });
      await fetchCart();
    } catch (err) {
      error.value = err.response?.data?.error?.message || 'Error al agregar al carrito';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateItem = async (id, quantity) => {
    try {
      await cartAPI.updateItem(id, { quantity });
      const item = items.value.find(i => i.id === id);
      if (item) item.quantity = quantity;
    } catch (err) {
      error.value = 'Error al actualizar carrito';
      throw err;
    }
  };

  const removeItem = async (id) => {
    try {
      await cartAPI.removeItem(id);
      items.value = items.value.filter(i => i.id !== id);
    } catch (err) {
      error.value = 'Error al eliminar del carrito';
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clearCart();
      items.value = [];
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  };

  return {
    items, loading, error, totalItems, subtotal, tax, total,
    fetchCart, addItem, updateItem, removeItem, clearCart
  };
});

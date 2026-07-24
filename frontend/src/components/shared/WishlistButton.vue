<template>
  <button
    @click="toggle"
    :disabled="loading"
    class="inline-flex items-center justify-center p-2 rounded-full transition-all duration-200 focus:outline-none"
    :class="[
      isActive
        ? 'text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100'
        : 'text-gray-400 hover:text-red-400 bg-gray-50 hover:bg-gray-100',
      size === 'sm' ? 'w-8 h-8' : 'w-10 h-10',
      variant === 'outlined' ? 'border border-gray-200' : ''
    ]"
    :title="isActive ? 'Quitar de favoritos' : 'Agregar a favoritos'"
  >
    <svg
      class="transition-transform duration-200"
      :class="[size === 'sm' ? 'w-4 h-4' : 'w-5 h-5', isActive ? 'scale-110' : 'scale-100']"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        v-if="isActive"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
      <path
        v-else
        d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"
      />
    </svg>
    <span v-if="label" class="ml-2 text-sm" :class="isActive ? 'text-red-500' : 'text-gray-500'">
      {{ label }}
    </span>
  </button>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useWishlistStore } from '../../stores/wishlist';

const props = defineProps({
  productId: { type: [String, Number], required: true },
  variantId: { type: [String, Number], default: null },
  size: { type: String, default: 'md' },
  variant: { type: String, default: 'ghost' },
  label: { type: String, default: '' },
  modelValue: { type: Boolean, default: null }
});

const emit = defineEmits(['toggle', 'update:modelValue']);

const wishlistStore = useWishlistStore();
const loading = ref(false);

const isActive = computed(() => {
  if (props.modelValue !== null) return props.modelValue;
  return wishlistStore.isInWishlist(props.productId);
});

const toggle = async () => {
  loading.value = true;
  try {
    const newState = await wishlistStore.toggleItem(props.productId, props.variantId);
    emit('toggle', newState);
    emit('update:modelValue', newState);
  } catch (err) {
    console.error('Error toggling wishlist:', err);
  } finally {
    loading.value = false;
  }
};
</script>

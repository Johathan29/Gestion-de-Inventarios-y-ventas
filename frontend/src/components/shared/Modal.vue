<template>
  <Transition name="modal">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <!-- Modal Card -->
      <div
        class="relative bg-surface-container-lowest border border-white/10 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto animate-in"
        :class="sizeClass"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h3 class="text-lg font-semibold text-on-surface">{{ title }}</h3>
          <button
            @click="$emit('close')"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-on-surface-variant"
          >
            <span class="material-icons-outlined">close</span>
          </button>
        </div>

        <!-- Body (default slot) -->
        <div class="px-6 py-5">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }
});

defineEmits(['close']);

const sizeClass = computed(() => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]'
  };
  return sizes[props.size] || sizes.md;
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active .animate-in,
.modal-leave-active .animate-in {
  transition: transform 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .animate-in {
  transform: scale(0.95) translateY(10px);
}
.modal-leave-to .animate-in {
  transform: scale(0.95) translateY(10px);
}
</style>

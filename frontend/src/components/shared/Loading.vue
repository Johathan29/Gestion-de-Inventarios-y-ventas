<template>
  <div class="flex flex-col items-center justify-center py-12" :class="{ 'h-64': fullPage }">
    <div class="relative">
      <div class="w-10 h-10 border-4 border-primary-200 dark:border-primary-900 rounded-full"></div>
      <div class="absolute top-0 left-0 w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
    <p v-if="text" class="mt-3 text-sm text-gray-500 dark:text-gray-400">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  text: { type: String, default: 'Cargando...' },
  fullPage: { type: Boolean, default: false }
});
</script>

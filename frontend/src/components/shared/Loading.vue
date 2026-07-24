<template>
  <div class="w-full flex flex-col items-center justify-center py-16">
    <div class="relative w-12 h-12">
      <div class="absolute inset-0 border-4 border-white/10 rounded-full" />
      <div class="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
    </div>
    <span class="mt-4 text-sm text-on-surface-variant">Cargando...</span>
  </div>
</template>

<script setup>
// Simple loading spinner — used as <Loading v-if="loading" />
</script>

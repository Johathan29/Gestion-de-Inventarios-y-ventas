<template>
  <div class="flex flex-col gap-1">
    <component
      :is="tagTag"
      class="font-bold tracking-tight header-title"
      style="color: white; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;"
    >
      {{ title }}
    </component>
    <p
      v-if="description"
      class="font-medium header-description"
      
    >
      {{ description }}
    </p>
  </div>
  
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: null },
  tag: { type: String, default: 'h2' }
});

const tagTag = computed(() => {
  const valid = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p'];
  return valid.includes(props.tag) ? props.tag : 'h2';
});
</script>

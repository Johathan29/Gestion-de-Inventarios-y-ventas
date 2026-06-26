<template>
  <Transition name="alert">
    <div v-if="show" :class="alertClass" class="flex items-start gap-3 p-4 rounded-lg border">
      <span class="material-icons-outlined mt-0.5">{{ icon }}</span>
      <div class="flex-1">
        <p v-if="title" class="font-medium text-sm mb-1">{{ title }}</p>
        <p class="text-sm">{{ message || $slots.default?.() }}</p>
      </div>
      <button v-if="dismissible" @click="$emit('close')" class="p-1 rounded hover:bg-black/10">
        <span class="material-icons-outlined text-lg">close</span>
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  show: { type: Boolean, default: true },
  type: { type: String, default: 'info' },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  dismissible: { type: Boolean, default: false }
});

defineEmits(['close']);

const config = {
  success: { bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300', icon: 'check_circle' },
  error: { bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300', icon: 'error' },
  warning: { bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300', icon: 'warning' },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300', icon: 'info' }
};

const alertClass = computed(() => config[props.type]?.bg || config.info.bg);
const icon = computed(() => config[props.type]?.icon || 'info');
</script>

<style scoped>
.alert-enter-active, .alert-leave-active { transition: all 0.3s ease; }
.alert-enter-from, .alert-leave-to { opacity: 0; transform: translateY(-10px); }
</style>

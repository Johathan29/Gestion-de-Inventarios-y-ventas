<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ label }}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formattedValue }}</p>
        <p v-if="subtext" class="text-xs text-gray-500 mt-1">{{ subtext }}</p>
      </div>
      <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="iconBg">
        <span class="material-icons-outlined text-2xl" :class="iconColor">{{ icon }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  type: { type: String, default: 'number' }, // number, currency
  icon: { type: String, default: 'analytics' },
  iconBg: { type: String, default: 'bg-primary-100 dark:bg-primary-900/30' },
  iconColor: { type: String, default: 'text-primary-600 dark:text-primary-400' },
  subtext: { type: String, default: '' }
});

const formattedValue = computed(() => {
  if (props.type === 'currency') return formatCurrency(props.value);
  return `${props.prefix}${props.value?.toLocaleString('es-CO') || 0}${props.suffix}`;
});

import { formatCurrency } from '../../utils';
</script>

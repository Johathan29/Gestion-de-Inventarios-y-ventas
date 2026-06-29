<template>
  <div class="dt-card p-5" style="transition: box-shadow 0.2s ease, transform 0.2s ease; cursor: default;"
    @mouseenter="e => { e.currentTarget.style.boxShadow = '0px 8px 30px rgba(98,66,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }"
    @mouseleave="e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }">
    <div class="flex items-start justify-between">
      <div style="flex: 1; min-width: 0;">
        <p class="dt-body-sm" style="color: #4f4539; margin-bottom: 0.25rem;">{{ label }}</p>
        <p class="dt-stat-value" style="margin-bottom: 0.125rem;">{{ formattedValue }}</p>
        <p v-if="subtext" class="dt-caption" style="color: #817567;">{{ subtext }}</p>
      </div>
      <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-3"
        :style="{ background: iconBg || '#f5f0eb' }">
        <span class="material-icons-outlined text-2xl" :style="{ color: iconColor || '#624200' }">{{ icon }}</span>
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
  iconBg: { type: String, default: '#f5f0eb' },
  iconColor: { type: String, default: '#624200' },
  subtext: { type: String, default: '' }
});

const formattedValue = computed(() => {
  if (props.type === 'currency') return formatCurrency(props.value);
  return `${props.prefix}${props.value?.toLocaleString('es-CO') || 0}${props.suffix}`;
});

import { formatCurrency } from '../../utils';
</script>

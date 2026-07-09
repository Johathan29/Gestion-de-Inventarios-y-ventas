<template>
  <router-link :to="item.path"
    class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
    :class="isActive ? 'dt-sidebar-item-active' : 'dt-sidebar-item'"
    :style="isActive ? { background: 'rgba(98,66,0,0.08)', color: '#624200', fontWeight: 600, borderRight: '3px solid #624200' } : {}">
    <span class="material-icons-outlined text-xl flex-shrink-0" :style="iconStyle">{{ item.icon }}</span>
    <span v-if="!collapsed" class="text-sm font-medium truncate" style="font-family: 'Inter', sans-serif;">{{ item.label }}</span>
    <!-- Tooltip when collapsed -->
    <span v-if="collapsed"
      class="absolute left-full ml-4 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-lg"
      style="background: #452d00; color: white; font-family: 'Inter', sans-serif; transform: translateX(-8px); group-hover:translate-x-0;">
      {{ item.label }}
    </span>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  item: { type: Object, required: true },
  collapsed: { type: Boolean, default: false }
});

const route = useRoute();

const isActive = computed(() => {
  if (props.item.exact) return route.path === props.item.path;
  return route.path.startsWith(props.item.path);
});

const iconStyle = computed(() => {
  if (!isActive.value) return {};
  return { fontVariationSettings: '"FILL" 1' };
});
</script>

<template>
  <router-link :to="item.path"
    class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
    :class="isActive ? 'dt-sidebar-item-active' : 'dt-sidebar-item'"
    :style="isActive ? { background: 'rgba(98,66,0,0.08)', color: '#624200', fontWeight: 600, borderRight: '3px solid #624200' } : {}">
    <span class="material-icons-outlined text-xl flex-shrink-0" :style="iconStyle">{{ item.icon }}</span>
    <span v-if="!collapsed" class="text-sm font-medium truncate" style="font-family: 'Inter', sans-serif;">{{ item.label }}</span>
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

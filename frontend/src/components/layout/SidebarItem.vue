<template>
  <router-link :to="item.path"
    class="flex items-center rounded-xl transition-all duration-200 group relative"
    :class="[
      collapsed ? 'justify-center px-0 py-3 mx-2' : 'gap-3 px-3 py-2.5',
      isActive ? 'nexus-sidebar-item-active' : 'nexus-sidebar-item'
    ]"
    :style="isActive ? {
      background: appStore.darkMode ? '#7c3aea' : '#7c3aed',
      color: '#ffffff',
      fontWeight: 500,
      boxShadow: appStore.darkMode ? '0 4px 14px rgba(109,40,217,0.25)' : '0 4px 14px rgba(124,58,237,0.35)'
    } : {}">
    <!-- Icon with white background on active, centered -->
    <div v-if="isActive"
      class="flex items-center justify-center flex-shrink-0"
      :style="{ width: collapsed ? '2.5rem' : '2.25rem', height: collapsed ? '2.5rem' : '2.25rem', borderRadius: '0.625rem', background: '#2c086959' }">
      <span class="material-icons-outlined" style="color: #ffffff; font-size: 1.25rem;" :style="iconStyle">{{ item.icon }}</span>
    </div>
    <!-- Icon with colored background when inactive -->
    <div v-else class="icon-wrapper-sm flex-shrink-0 icon-slate flex items-center justify-center" :style="{ width: collapsed ? '2.5rem' : '2.25rem', height: collapsed ? '2.5rem' : '2.25rem' }">
      <span class="material-icons-outlined" style="font-size: 1.125rem;">{{ item.icon }}</span>
    </div>
    <!-- Label -->
    <span v-if="!collapsed" class="text-sm font-medium truncate" :class="isActive ? 'text-white' : ''" style="font-family: 'Inter', sans-serif; letter-spacing: 0.01em;">{{ item.label }}</span>
    <!-- Active indicator dot -->
    <span v-if="isActive && !collapsed"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
      style="background: rgba(255,255,255,0.6);"></span>
    <!-- Tooltip when collapsed -->
    <span v-if="collapsed"
      class="absolute left-full ml-4 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-lg sidebar-tooltip"
      style="font-family: 'Inter', sans-serif;">
      {{ item.label }}
    </span>
  </router-link>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '../../stores/app';

const props = defineProps({
  item: { type: Object, required: true },
  collapsed: { type: Boolean, default: false }
});

const route = useRoute();
const appStore = useAppStore();

const isActive = computed(() => {
  if (props.item.exact) return route.path === props.item.path;
  return route.path.startsWith(props.item.path);
});

const iconStyle = computed(() => {
  if (!isActive.value) return {};
  return { fontVariationSettings: '"FILL" 1' };
});
</script>

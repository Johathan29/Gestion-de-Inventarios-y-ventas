<template>
  <router-link :to="item.path"
    class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group"
    :class="isActive
      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'">
    <span class="material-icons-outlined text-xl flex-shrink-0">{{ item.icon }}</span>
    <span v-if="!collapsed" class="text-sm font-medium truncate">{{ item.label }}</span>
    <div v-if="!collapsed && item.badge" class="ml-auto">
      <span class="badge badge-{{ item.badgeColor || 'primary' }}">{{ item.badge }}</span>
    </div>
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
</script>

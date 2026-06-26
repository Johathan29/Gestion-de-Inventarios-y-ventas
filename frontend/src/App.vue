<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAppStore } from './stores/app';

const appStore = useAppStore();

onMounted(() => {
  appStore.initTheme();
});
</script>

<template>
  <router-view />
  <ToastContainer />
</template>

<script setup>
import { watch } from 'vue';
import { onMounted } from 'vue';
import { useAppStore } from './stores/app';
import { useEcommerceSettings } from './composables/useEcommerceSettings';
import ToastContainer from './components/ui/ToastContainer.vue';

const appStore = useAppStore();
const { settings, fetchSettings } = useEcommerceSettings();

onMounted(() => {
  appStore.initTheme();
  fetchSettings();
});

watch(settings, (val) => {
  if (val?.store_name) {
    document.title = `${val.store_name} | eCommerce Premium`;
  }
  if (val?.favicon_url) {
    let link = document.querySelector('link[rel="icon"]');
    if (link) {
      link.href = val.favicon_url;
    }
  }
  if (val?.description) {
    let meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.content = val.description;
    }
  }
}, { immediate: false });
</script>

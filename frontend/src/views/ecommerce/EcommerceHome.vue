<template>
  <Loading v-if="loading" />
  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div class="card p-6">
      <p class="text-sm text-gray-500">Banners Activos</p>
      <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.active_banners }}</p>
    </div>
    <div class="card p-6">
      <p class="text-sm text-gray-500">Ofertas Vigentes</p>
      <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.active_offers }}</p>
    </div>
    <div class="card p-6">
      <p class="text-sm text-gray-500">Tienda Online</p>
      <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.store_active ? 'Activa' : 'Inactiva' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';
import Loading from '../../components/shared/Loading.vue';

const loading = ref(true);
const stats = ref({});

onMounted(async () => {
  try { const res = await ecommerceAPI.getHome(); stats.value = res.data || {}; }
  catch (e) { /* ignore */ }
  finally { loading.value = false; }
});
</script>

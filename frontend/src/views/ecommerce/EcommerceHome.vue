<template>
  <Loading v-if="loading" />
  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div class="dt-card p-6">
      <p class="dt-caption">Banners Activos</p>
      <p class="dt-stat-value" style="color: #0b1c30;">{{ stats.active_banners }}</p>
    </div>
    <div class="dt-card p-6">
      <p class="dt-caption">Ofertas Vigentes</p>
      <p class="dt-stat-value" style="color: #0b1c30;">{{ stats.active_offers }}</p>
    </div>
    <div class="dt-card p-6">
      <p class="dt-caption">Tienda Online</p>
      <p class="dt-stat-value" style="color: #0b1c30;">{{ stats.store_active ? 'Activa' : 'Inactiva' }}</p>
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

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Panel Ecommerce</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
          Resumen del estado de tu tienda online
        </p>
      </div>
    </div>
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

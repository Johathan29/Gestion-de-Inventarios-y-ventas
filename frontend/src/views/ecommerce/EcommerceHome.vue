<template>
  <div>
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> storefront </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Panel Ecommerce"
            description="Resumen del estado de tu tienda online"
            tag="h1"
          />
        </div>
        <div class="header-actions"></div>
      </div>
    </div>
    <CardGridSkeleton v-if="loading" />
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter aurora-entrance">
      <div class="aurora-stat-card">
        <div class="flex justify-between items-start mb-4">
          <p class="aurora-badge aurora-badge-primary" style="font-size: 11px;">Banners Activos</p>
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">flag</span>
        </div>
        <p class="text-3xl font-black text-on-surface" style="font-family: 'Inter', sans-serif;">{{ stats.active_banners }}</p>
      </div>
      <div class="aurora-stat-card">
        <div class="flex justify-between items-start mb-4">
          <p class="aurora-badge" style="background: #d4edda; color: #155724; font-size: 11px;">Ofertas Vigentes</p>
          <span class="material-symbols-outlined" style="color: #16a34a;">local_offer</span>
        </div>
        <p class="text-3xl font-black text-on-surface" style="font-family: 'Inter', sans-serif;">{{ stats.active_offers }}</p>
      </div>
      <div class="aurora-stat-card">
        <div class="flex justify-between items-start mb-4">
          <p class="aurora-badge aurora-badge-secondary" style="font-size: 11px;">Tienda Online</p>
          <span class="material-symbols-outlined" style="color: var(--aurora-secondary);">store</span>
        </div>
        <p class="text-3xl font-black" :style="{ color: stats.store_active ? '#16a34a' : 'var(--aurora-error)' }">
          {{ stats.store_active ? 'Activa' : 'Inactiva' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';
import PageHeader from '../../components/shared/PageHeader.vue';
import CardGridSkeleton from '../../components/skeletons/CardGridSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';

const loading = ref(true);
const stats = ref({});

onMounted(async () => {
  try { const res = await ecommerceAPI.getHome(); stats.value = res.data || {}; }
  catch (e) { /* ignore */ }
  finally { loading.value = false; }
});
</script>

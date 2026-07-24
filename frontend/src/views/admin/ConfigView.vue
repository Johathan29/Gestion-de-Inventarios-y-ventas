<template>
  <div>
    <!-- Page Header -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> settings </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Configuración del Sistema"
            description="Gestiona las variables de configuración del sistema"
            tag="h1"
          />
        </div>
        <div class="header-actions"></div>
      </div>
    </div>
    <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6 max-w-3xl mx-auto">
    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" class="mb-4" />

    <div v-for="(group, section) in groupedConfig" :key="section" class="mb-8">
      <div class="flex items-center gap-2 pb-2 mb-4" style="border-bottom: 1px solid #d2c4b4;">
        <span class="material-icons-outlined" style="color: #624200; font-size: 1.25rem;">tune</span>
        <h4 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: #0b1c30; text-transform: capitalize;">{{ section }}</h4>
      </div>
      <div class="space-y-4">
        <div v-for="item in group" :key="item.key" class="grid grid-cols-3 gap-4 items-center">
          <label style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 500;">{{ item.key }}</label>
          <input v-if="item.type === 'number' || item.type === 'integer'" v-model.number="item.value" type="number"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="grid-column: span 2; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @change="updateConfig(item.key, item.value)"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          <input v-else-if="item.type === 'boolean'" type="checkbox" v-model="item.value" class="w-4 h-4 rounded" style="accent-color: #624200;" @change="updateConfig(item.key, item.value)" />
          <input v-else v-model="item.value"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="grid-column: span 2; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @change="updateConfig(item.key, item.value)"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
      </div>
    </div>
    <p v-if="!Object.keys(groupedConfig).length" class="text-center py-8 text-gray-500">No hay configuración disponible</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { configAPI } from '../../api';
import PageHeader from '../../components/shared/PageHeader.vue';
import Alert from '../../components/shared/Alert.vue';

const config = ref({});
const successMsg = ref('');

const groupedConfig = computed(() => {
  const groups = {};
  Object.entries(config.value).forEach(([key, val]) => {
    const section = key.split('.').length > 1 ? key.split('.')[0] : 'general';
    if (!groups[section]) groups[section] = [];
    groups[section].push({ key, value: val, type: typeof val });
  });
  return groups;
});

const updateConfig = async (key, value) => {
  try { await configAPI.update({ key, value }); successMsg.value = 'Configuración actualizada'; setTimeout(() => successMsg.value = '', 2000); }
  catch (e) { /* ignore */ }
};

onMounted(async () => { try { const res = await configAPI.getAll(); config.value = res.data || {}; } catch (e) { /* ignore */ } });
</script>

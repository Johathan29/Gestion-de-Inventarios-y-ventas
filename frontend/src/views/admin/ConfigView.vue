<template>
  <div class="card p-6 max-w-3xl mx-auto">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Configuración del Sistema</h3>
    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />

    <div v-for="(group, section) in groupedConfig" :key="section" class="mb-8">
      <h4 class="font-medium text-gray-800 dark:text-gray-200 capitalize mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">{{ section }}</h4>
      <div class="space-y-4">
        <div v-for="item in group" :key="item.key" class="grid grid-cols-3 gap-4 items-center">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ item.key }}</label>
          <input v-if="item.type === 'number' || item.type === 'integer'" v-model.number="item.value" type="number" class="form-input col-span-2" @change="updateConfig(item.key, item.value)" />
          <input v-else-if="item.type === 'boolean'" type="checkbox" v-model="item.value" class="rounded" @change="updateConfig(item.key, item.value)" />
          <input v-else v-model="item.value" class="form-input col-span-2" @change="updateConfig(item.key, item.value)" />
        </div>
      </div>
    </div>
    <p v-if="!Object.keys(groupedConfig).length" class="text-center py-8 text-gray-500">No hay configuración disponible</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { configAPI } from '../../api';
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

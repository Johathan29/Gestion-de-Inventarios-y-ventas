<template>
  <div>
    <div class="flex items-center gap-4 mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Kardex</h3>
      <select v-model="productId" @change="fetchKardex" class="form-input flex-1">
        <option value="">Seleccionar producto...</option>
        <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
      </select>
    </div>
    <div class="card p-4">
      <table class="w-full text-sm" v-if="entries.length">
        <thead>
          <tr class="bg-gray-50 dark:bg-gray-700/50">
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">Fecha</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">Tipo</th>
            <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500">Entrada</th>
            <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500">Salida</th>
            <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500">Saldo</th>
            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">Referencia</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="e in entries" :key="e.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ formatDate(e.created_at) }}</td>
            <td class="px-3 py-2">
              <span class="badge" :class="e.type === 'entry' ? 'badge-green' : e.type === 'exit' ? 'badge-red' : 'badge-yellow'">{{ e.type }}</span>
            </td>
            <td class="px-3 py-2 text-right text-green-600 font-medium">{{ e.quantity > 0 ? e.quantity : '-' }}</td>
            <td class="px-3 py-2 text-right text-red-600 font-medium">{{ e.quantity < 0 ? Math.abs(e.quantity) : '-' }}</td>
            <td class="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">{{ e.running_balance || '-' }}</td>
            <td class="px-3 py-2 text-gray-500">{{ e.reference || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="text-center py-8 text-gray-500">Selecciona un producto para ver su kardex</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { inventoryAPI, productsAPI } from '../../api';
import { formatDate } from '../../utils';

const route = useRoute();
const entries = ref([]);
const products = ref([]);
const productId = ref(route.query.product_id || '');

const fetchKardex = async () => {
  if (!productId.value) { entries.value = []; return; }
  try {
    const res = await inventoryAPI.getKardex(productId.value);
    entries.value = res.data || [];
  } catch (e) { /* ignore */ }
};

onMounted(async () => {
  try {
    const res = await productsAPI.getAll();
    products.value = res.data || [];
  } catch (e) { /* ignore */ }
  if (productId.value) fetchKardex();
});
</script>

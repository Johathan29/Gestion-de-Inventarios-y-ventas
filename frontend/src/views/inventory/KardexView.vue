<template>
  <div>
    <InventoryTabs />
    <div class="flex items-center gap-4 mb-4">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Kardex</h3>
      <select v-model="productId" @change="fetchKardex" class="dt-input" style="flex: 1;">
        <option value="">Seleccionar producto...</option>
        <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
      </select>
    </div>
    <div class="dt-card p-4">
      <table class="w-full text-sm" v-if="entries.length">
        <thead>
          <tr class="dt-table-header-row">
            <th class="dt-table-th text-left">Fecha</th>
            <th class="dt-table-th text-left">Tipo</th>
            <th class="dt-table-th text-right">Entrada</th>
            <th class="dt-table-th text-right">Salida</th>
            <th class="dt-table-th text-right">Saldo</th>
            <th class="dt-table-th text-left">Referencia</th>
          </tr>
        </thead>
        <tbody class="dt-table-tbody">
          <tr v-for="e in entries" :key="e.id" class="hover:bg-gray-50">
            <td class="px-3 py-2" style="color: #4f4539;">{{ formatDate(e.created_at) }}</td>
            <td class="px-3 py-2">
              <span class="dt-badge" :class="e.type === 'entry' ? 'dt-badge-success' : e.type === 'exit' ? 'dt-badge-danger' : 'dt-badge-warning'">{{ e.type }}</span>
            </td>
            <td class="px-3 py-2 text-right text-green-600 font-medium">{{ e.quantity > 0 ? e.quantity : '-' }}</td>
            <td class="px-3 py-2 text-right text-red-600 font-medium">{{ e.quantity < 0 ? Math.abs(e.quantity) : '-' }}</td>
            <td class="px-3 py-2 text-right font-semibold" style="color: #0b1c30;">{{ e.running_balance || '-' }}</td>
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
import InventoryTabs from '../../components/inventory/InventoryTabs.vue';
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

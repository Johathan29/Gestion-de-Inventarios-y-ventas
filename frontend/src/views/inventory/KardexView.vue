<template>
  <div>
    <InventoryTabs />
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Kardex</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
          Historial de movimientos de inventario
        </p>
      </div>
      <div class="relative w-full sm:w-72">
        <select v-model="productId" @change="fetchKardex" class="w-full bg-white border border-[#d2c4b4] rounded-full px-4 py-2.5 text-sm outline-none transition-all appearance-none" style="font-family: 'Inter', sans-serif; color: #0b1c30;" @focus="e => e.currentTarget.style.borderColor = '#624200'" @blur="e => e.currentTarget.style.borderColor = '#d2c4b4'">
        <option value="">Seleccionar producto...</option>
        <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
        </select>
      </div>
    </div>
    <div class="dt-card overflow-hidden">
      <DataTable v-if="entries.length" :columns="kardexColumns" :data="entries" :per-page="15" empty-message="No hay movimientos para este producto">
        <template #cell-type="{ row }">
          <span class="dt-badge" :class="row.type === 'entry' ? 'dt-badge-success' : row.type === 'exit' ? 'dt-badge-danger' : 'dt-badge-warning'">
            {{ row.type === 'entry' ? 'Entrada' : row.type === 'exit' ? 'Salida' : 'Ajuste' }}
          </span>
        </template>
        <template #cell-entrada="{ row }">
          <span class="text-green-600 font-medium">{{ row.quantity > 0 ? row.quantity : '-' }}</span>
        </template>
        <template #cell-salida="{ row }">
          <span class="text-red-600 font-medium">{{ row.quantity < 0 ? Math.abs(row.quantity) : '-' }}</span>
        </template>
        <template #cell-running_balance="{ row }">
          <span class="font-semibold" style="color: #0b1c30;">{{ row.running_balance ?? '-' }}</span>
        </template>
        <template #cell-reference="{ row }">
          <span style="color: #4f4539;">{{ row.reference || '-' }}</span>
        </template>
      </DataTable>
      <div v-else class="text-center py-8" style="color: #4f4539; font-family: 'Inter', sans-serif;">
        <span class="material-icons-outlined" style="font-size: 2.5rem; color: #d2c4b4; display: block; margin-bottom: 0.5rem;">history</span>
        <p>Selecciona un producto para ver su kardex</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { inventoryAPI, productsAPI } from '../../api';
import InventoryTabs from '../../components/inventory/InventoryTabs.vue';
import DataTable from '../../components/shared/DataTable.vue';
import { formatDate } from '../../utils';

const route = useRoute();
const entries = ref([]);
const products = ref([]);
const productId = ref(route.query.product_id || '');

const kardexColumns = [
  { key: 'created_at', label: 'Fecha', type: 'date' },
  { key: 'type', label: 'Tipo' },
  { key: 'quantity', label: 'Entrada' },
  { key: 'quantity', label: 'Salida' },
  { key: 'running_balance', label: 'Saldo', type: 'number' },
  { key: 'reference', label: 'Referencia' }
];

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

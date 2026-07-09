<template>
  <DataTable :columns="columns" :data="items" title="Stock Actual" searchable @rowClick="goToKardex">
    <template #cell-status="{ row }">
      <span class="dt-badge" :class="row.stock <= 0 ? 'dt-badge-danger' : row.stock <= (row.min_stock || 0) ? 'dt-badge-warning' : 'dt-badge-success'">
        {{ row.stock <= 0 ? 'Sin stock' : row.stock <= (row.min_stock || 0) ? 'Bajo' : 'Disponible' }}
      </span>
    </template>
  </DataTable>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { inventoryAPI } from '../../api';
import { normalizeInventoryItems } from '../../utils';
import DataTable from '../../components/shared/DataTable.vue';

const router = useRouter();
const items = ref([]);

const columns = [
  { key: 'name', label: 'Producto', sortable: true },
  { key: 'sku', label: 'SKU' },
  { key: 'stock', label: 'Stock', type: 'number', sortable: true },
  { key: 'min_stock', label: 'Stock Mínimo', type: 'number' },
  { key: 'status', label: 'Estado', type: 'custom' }
];

const goToKardex = (row) => router.push(`/app/inventory/kardex?product_id=${row.product_id}`);

onMounted(async () => {
  try {
    const res = await inventoryAPI.getAll();
    items.value = normalizeInventoryItems(res.data || []);
  } catch (e) { /* ignore */ }
});
</script>

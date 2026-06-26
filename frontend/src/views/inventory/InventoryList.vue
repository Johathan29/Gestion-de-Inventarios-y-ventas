<template>
  <DataTable :columns="columns" :data="items" title="Stock Actual" searchable @rowClick="goToKardex">
    <template #cell-status="{ row }">
      <span class="badge" :class="row.stock <= 0 ? 'badge-red' : row.stock <= (row.min_stock || 0) ? 'badge-yellow' : 'badge-green'">
        {{ row.stock <= 0 ? 'Sin stock' : row.stock <= (row.min_stock || 0) ? 'Bajo' : 'Disponible' }}
      </span>
    </template>
  </DataTable>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { inventoryAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';

const router = useRouter();
const items = ref([]);

const columns = [
  { key: 'product_name', label: 'Producto', sortable: true },
  { key: 'sku', label: 'SKU' },
  { key: 'stock', label: 'Stock', type: 'number', sortable: true },
  { key: 'min_stock', label: 'Stock Mínimo', type: 'number' },
  { key: 'status', label: 'Estado', type: 'custom' }
];

const goToKardex = (row) => router.push(`/app/inventory/kardex?product_id=${row.product_id}`);

onMounted(async () => {
  try {
    const res = await inventoryAPI.getAll();
    items.value = res.data || [];
  } catch (e) { /* ignore */ }
});
</script>

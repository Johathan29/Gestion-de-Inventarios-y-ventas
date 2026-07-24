<template>
  <DataTable :columns="columns" :data="items" title="Stock Actual" :server-pagination="true" :total="total" :current-page-prop="page" :per-page="limit" @page-change="changePage" @rowClick="goToKardex">
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
const page = ref(1);
const limit = 15;
const total = ref(0);

const columns = [
  { key: 'name', label: 'Producto', sortable: true },
  { key: 'sku', label: 'SKU' },
  { key: 'stock', label: 'Stock', type: 'number', sortable: true },
  { key: 'min_stock', label: 'Stock Mínimo', type: 'number' },
  { key: 'status', label: 'Estado', type: 'custom' }
];

const goToKardex = (row) => router.push(`/app/inventory/kardex?product_id=${row.product_id}`);

const changePage = (p) => { page.value = p; fetchItems(); };

const fetchItems = async () => {
  try {
    const res = await inventoryAPI.getAll({ page: page.value, limit });
    items.value = normalizeInventoryItems(res.data || []);
    total.value = res.pagination?.total || 0;
  } catch (e) { /* ignore */ }
};

onMounted(fetchItems);
</script>

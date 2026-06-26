<template>
  <DataTable :columns="columns" :data="purchases" title="Compras" searchable @rowClick="goToDetail">
    <template #toolbar>
      <button v-if="can('purchases', 'create')" @click="$router.push('/app/purchases/create')" class="btn btn-primary btn-sm">
        <span class="material-icons-outlined text-lg">add</span>
        Nueva Compra
      </button>
    </template>
    <template #cell-status="{ row }">
      <span class="badge" :class="row.status === 'received' ? 'badge-green' : row.status === 'cancelled' ? 'badge-red' : 'badge-yellow'">
        {{ row.status === 'received' ? 'Recibida' : row.status === 'cancelled' ? 'Cancelada' : 'Pendiente' }}
      </span>
    </template>
  </DataTable>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { purchasesAPI } from '../../api';
import { useAuth } from '../../composables/useAuth';
import DataTable from '../../components/shared/DataTable.vue';

const router = useRouter();
const { can } = useAuth();
const purchases = ref([]);

const columns = [
  { key: 'order_number', label: 'Orden', sortable: true },
  { key: 'supplier_name', label: 'Proveedor' },
  { key: 'total', label: 'Total', type: 'currency', sortable: true },
  { key: 'status', label: 'Estado', type: 'custom' },
  { key: 'created_at', label: 'Fecha', type: 'datetime', sortable: true }
];

const goToDetail = (row) => router.push(`/app/purchases/${row.id}`);

onMounted(async () => {
  try {
    const res = await purchasesAPI.getAll();
    purchases.value = res.data || [];
  } catch (e) { /* ignore */ }
});
</script>

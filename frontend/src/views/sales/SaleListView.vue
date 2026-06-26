<template>
  <div>
    <DataTable :columns="columns" :data="sales" title="Ventas" searchable @rowClick="goToDetail">
      <template #toolbar>
        <button v-if="can('sales', 'create')" @click="$router.push('/app/sales/create')" class="btn btn-primary btn-sm">
          <span class="material-icons-outlined text-lg">add</span>
          Nueva Venta
        </button>
      </template>
      <template #cell-status="{ row }">
        <span class="badge" :class="row.status === 'completed' ? 'badge-green' : row.status === 'cancelled' ? 'badge-red' : 'badge-yellow'">
          {{ row.status === 'completed' ? 'Completada' : row.status === 'cancelled' ? 'Cancelada' : 'Pendiente' }}
        </span>
      </template>
      <template #actions="{ row }">
        <button @click.stop="$router.push(`/app/sales/${row.id}`)" class="btn btn-sm btn-secondary">Ver</button>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { salesAPI } from '../../api';
import { useAuth } from '../../composables/useAuth';
import DataTable from '../../components/shared/DataTable.vue';
import { normalizeSales } from '../../utils';

const router = useRouter();
const { can } = useAuth();
const sales = ref([]);

const columns = [
  { key: 'invoice_number', label: 'Factura', sortable: true },
  { key: 'client_name', label: 'Cliente' },
  { key: 'total', label: 'Total', type: 'currency', sortable: true },
  { key: 'status', label: 'Estado', type: 'custom' },
  { key: 'created_at', label: 'Fecha', type: 'datetime', sortable: true }
];

const goToDetail = (row) => router.push(`/app/sales/${row.id}`);

onMounted(async () => {
  try {
    const res = await salesAPI.getAll();
    sales.value = normalizeSales(res.data || []);
  } catch (e) { /* ignore */ }
});
</script>

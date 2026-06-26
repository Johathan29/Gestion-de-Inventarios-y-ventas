<template>
  <DataTable :columns="columns" :data="invoices" title="Facturas" searchable @rowClick="goToDetail" :per-page="15">
    <template #cell-status="{ row }">
      <span class="badge" :class="row.status === 'active' ? 'badge-green' : row.status === 'cancelled' ? 'badge-red' : 'badge-yellow'">
        {{ row.status === 'active' ? 'Vigente' : row.status === 'cancelled' ? 'Anulada' : 'Pendiente' }}
      </span>
    </template>
  </DataTable>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { invoicesAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';

const router = useRouter();
const invoices = ref([]);
const columns = [
  { key: 'invoice_number', label: 'N° Factura', sortable: true },
  { key: 'client_name', label: 'Cliente' },
  { key: 'total', label: 'Total', type: 'currency', sortable: true },
  { key: 'status', label: 'Estado', type: 'custom' },
  { key: 'created_at', label: 'Fecha', type: 'date', sortable: true }
];

const goToDetail = (row) => router.push(`/app/invoices/${row.id}`);

onMounted(async () => {
  try { const res = await invoicesAPI.getAll(); invoices.value = res.data || []; }
  catch (e) { /* ignore */ }
});
</script>

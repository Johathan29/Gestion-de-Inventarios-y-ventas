<template>
  <DataTable :columns="columns" :data="clients" title="Clientes" searchable @rowClick="goToDetail">
    <template #cell-status="{ row }">
      <span class="badge" :class="row.is_active !== false ? 'badge-green' : 'badge-gray'">
        {{ row.is_active !== false ? 'Activo' : 'Inactivo' }}
      </span>
    </template>
  </DataTable>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { clientsAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';

const router = useRouter();
const clients = ref([]);
const columns = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'document_id', label: 'Documento' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'status', label: 'Estado', type: 'custom' }
];

const goToDetail = (row) => router.push(`/app/clients/${row.id}`);

onMounted(async () => {
  try { const res = await clientsAPI.getAll(); clients.value = res.data || []; }
  catch (e) { /* ignore */ }
});
</script>

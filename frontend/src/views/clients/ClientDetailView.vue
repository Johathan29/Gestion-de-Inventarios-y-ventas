<template>
  <Loading v-if="loading" />
  <div v-else class="max-w-4xl mx-auto">
    <div class="card p-6 mb-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ client.name }}</h2>
          <p class="text-sm text-gray-500">{{ client.document_type || 'CC' }}: {{ client.document_id }}</p>
        </div>
        <span class="badge" :class="client.is_active !== false ? 'badge-green' : 'badge-gray'">
          {{ client.is_active !== false ? 'Activo' : 'Inactivo' }}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="font-medium text-gray-500">Email:</span> {{ client.email || '-' }}</div>
        <div><span class="font-medium text-gray-500">Teléfono:</span> {{ client.phone || '-' }}</div>
        <div><span class="font-medium text-gray-500">Dirección:</span> {{ client.address || '-' }}</div>
        <div><span class="font-medium text-gray-500">Miembro desde:</span> {{ formatDate(client.created_at) }}</div>
      </div>
    </div>

    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Historial de Compras</h3>
      <DataTable :columns="saleColumns" :data="client.sales || []" empty-message="No hay compras registradas" />
    </div>

    <router-link to="/app/clients" class="btn btn-secondary mt-4">Volver</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { clientsAPI } from '../../api';
import Loading from '../../components/shared/Loading.vue';
import DataTable from '../../components/shared/DataTable.vue';
import { formatDate } from '../../utils';

const route = useRoute();
const client = ref({});
const loading = ref(true);
const saleColumns = [
  { key: 'invoice_number', label: 'Factura' },
  { key: 'total', label: 'Total', type: 'currency' },
  { key: 'status', label: 'Estado' },
  { key: 'created_at', label: 'Fecha', type: 'date' }
];

onMounted(async () => {
  try { const res = await clientsAPI.getById(route.params.id); client.value = res.data || {}; }
  catch (e) { /* ignore */ }
  finally { loading.value = false; }
});
</script>

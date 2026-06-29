<template>
  <Loading v-if="loading" />
  <div v-else class="max-w-4xl mx-auto">
    <div class="dt-card p-6 mb-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="dt-headline" style="margin-bottom: 0;">{{ client.name }}</h2>
          <p class="dt-body-sm" style="color: #4f4539;">{{ client.document_type || 'CC' }}: {{ client.document_id }}</p>
        </div>
        <span class="dt-badge" :class="client.is_active !== false ? 'dt-badge-success' : 'dt-badge-disabled'">
          {{ client.is_active !== false ? 'Activo' : 'Inactivo' }}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span style="color: #817567; font-weight: 500;">Email:</span> <span style="color: #0b1c30;">{{ client.email || '-' }}</span></div>
        <div><span style="color: #817567; font-weight: 500;">Teléfono:</span> <span style="color: #0b1c30;">{{ client.phone || '-' }}</span></div>
        <div><span style="color: #817567; font-weight: 500;">Dirección:</span> <span style="color: #0b1c30;">{{ client.address || '-' }}</span></div>
        <div><span style="color: #817567; font-weight: 500;">Miembro desde:</span> <span style="color: #0b1c30;">{{ formatDate(client.created_at) }}</span></div>
      </div>
    </div>

    <div class="dt-card p-6">
      <h3 class="dt-headline-sm" style="margin-bottom: 1rem;">Historial de Compras</h3>
      <DataTable :columns="saleColumns" :data="client.sales || []" empty-message="No hay compras registradas" />
    </div>

    <router-link to="/app/clients" class="dt-btn-secondary mt-4" style="display: inline-flex; align-items: center; gap: 0.5rem;">Volver</router-link>
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

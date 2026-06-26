<template>
  <div>
    <div class="flex gap-4 mb-4">
      <select v-model="filters.entity" @change="fetchLogs" class="form-input w-48">
        <option value="">Todas las entidades</option>
        <option value="user">Usuario</option>
        <option value="product">Producto</option>
        <option value="sale">Venta</option>
        <option value="purchase">Compra</option>
        <option value="inventory">Inventario</option>
      </select>
      <select v-model="filters.action" @change="fetchLogs" class="form-input w-40">
        <option value="">Todas las acciones</option>
        <option value="create">Crear</option>
        <option value="update">Actualizar</option>
        <option value="delete">Eliminar</option>
      </select>
    </div>
    <DataTable :columns="columns" :data="logs" searchable :per-page="20">
      <template #cell-action="{ row }">
        <span class="badge" :class="row.action === 'create' ? 'badge-green' : row.action === 'update' ? 'badge-blue' : 'badge-red'">{{ row.action }}</span>
      </template>
      <template #cell-details="{ row }">
        <span class="text-xs text-gray-500 truncate max-w-xs inline-block">{{ JSON.stringify(row.details) }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { auditAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';

const logs = ref([]);
const filters = reactive({ entity: '', action: '' });

const columns = [
  { key: 'user_name', label: 'Usuario' },
  { key: 'entity', label: 'Entidad' },
  { key: 'entity_id', label: 'ID Entidad' },
  { key: 'action', label: 'Acción', type: 'custom' },
  { key: 'details', label: 'Detalles', type: 'custom' },
  { key: 'created_at', label: 'Fecha', type: 'datetime', sortable: true }
];

const fetchLogs = async () => {
  try { const res = await auditAPI.getAll(filters); logs.value = res.data || []; }
  catch (e) { /* ignore */ }
};

onMounted(fetchLogs);
</script>

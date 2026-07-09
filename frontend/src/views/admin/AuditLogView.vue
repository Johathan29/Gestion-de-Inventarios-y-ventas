<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Auditoría</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
          Registro de actividades del sistema
        </p>
      </div>
    </div>
    <!-- Filter/Sort Bar -->
    <div class="filter-bar-container p-4 border-b border-[#d2c4b4]/30 flex justify-between items-center mb-4" style="background: #ffffff; border-radius: 12px 12px 0 0;">
      <div class="flex gap-2">
        <button @click="showFilters = !showFilters"
          class="px-3 py-1.5 text-sm font-medium border border-[#d2c4b4] rounded-md flex items-center gap-1 hover:bg-[#eff4ff] transition-colors bg-white relative"
          :class="{ 'ring-2 ring-[rgba(98,66,0,0.2)] border-[#624200]': showFilters }"
          style="font-family: 'Inter', sans-serif; color: #4f4539;">
          <span class="material-icons-outlined" style="font-size: 1rem;">filter_list</span>
          Filtrar
        </button>
      </div>
    </div>

    <!-- Filter Panel -->
    <div v-if="showFilters" class="filter-panel-container px-4 py-4 border-b border-[#d2c4b4]/30" style="background: #faf9f6; border-radius: 0;">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Entidad</label>
          <select v-model="filters.entity" @change="fetchLogs" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all" style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;">
            <option value="">Todas las entidades</option>
            <option value="user">Usuario</option>
            <option value="product">Producto</option>
            <option value="sale">Venta</option>
            <option value="purchase">Compra</option>
            <option value="inventory">Inventario</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Acción</label>
          <select v-model="filters.action" @change="fetchLogs" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all" style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;">
            <option value="">Todas las acciones</option>
            <option value="create">Crear</option>
            <option value="update">Actualizar</option>
            <option value="delete">Eliminar</option>
          </select>
        </div>
      </div>
    </div>
    <DataTable :columns="columns" :data="logs" searchable :per-page="20">
      <template #cell-action="{ row }">
        <span class="dt-badge" :class="row.action === 'create' ? 'dt-badge-success' : row.action === 'update' ? 'dt-badge-info' : 'dt-badge-danger'">{{ row.action }}</span>
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
const showFilters = ref(false);

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

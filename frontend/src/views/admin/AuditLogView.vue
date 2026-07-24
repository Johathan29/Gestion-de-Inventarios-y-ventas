<template>
  <div>
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> fact_check </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Auditoría"
            description="Registro de actividades del sistema"
            tag="h1"
          />
        </div>
        <div class="header-actions"></div>
      </div>
    </div>
    <!-- Filter/Sort Bar -->
    <div class="filter-bar-container p-4 border-b border-[#d2c4b4]/30 flex justify-between items-center mb-4" style="background: #ffffff; border-radius: 12px 12px 0 0;">
      <div class="flex gap-2">
        <button @click="showFilters = !showFilters"
          class="aurora-btn-secondary"
          :class="{ 'aurora-pressed': showFilters }"
          style="padding: 8px 12px; font-size: 0.8rem;">
          <span class="material-symbols-outlined" style="font-size: 1rem;">filter_list</span>
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
    <DataTable :key="'audit-' + page" :columns="columns" :data="logs" :server-pagination="true" :total="total" :current-page-prop="page" :per-page="limit" @page-change="changePage" @row-click="goToDetail">
      <template #cell-action="{ row }">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap"
          :style="getActionStyle(row.action)">
          <span class="material-icons-outlined" style="font-size: 0.875rem;">{{ getActionIcon(row.action) }}</span>
          {{ getActionLabel(row.action) }}
        </span>
      </template>
      <template #cell-details="{ row }">
        <span class="text-xs font-mono truncate max-w-[300px] inline-block align-middle" style="color: #64748b;">
          {{ getDetailsPreview(row.details) }}
        </span>
      </template>
      <template #cell-status="{ row }">
        <span v-if="row.success || row.status === 'success'" class="inline-flex items-center gap-1 text-xs font-medium" style="color: #16a34a;">
          <span class="material-icons-outlined" style="font-size: 1rem;">check_circle</span> Éxito
        </span>
        <span v-else-if="row.status === 'error' || row.error" class="inline-flex items-center gap-1 text-xs font-medium" style="color: #dc2626;">
          <span class="material-icons-outlined" style="font-size: 1rem;">error</span> Error
        </span>
        <span v-else class="inline-flex items-center gap-1 text-xs font-medium" style="color: #d97706;">
          <span class="material-icons-outlined" style="font-size: 1rem;">pending</span> {{ row.status || '—' }}
        </span>
      </template>
    </DataTable>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-4 mt-4">
      <div v-for="logItem in logs" :key="logItem.id"
           class="dt-card-sm p-4 cursor-pointer" @click="goToDetail(logItem)">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase" style="background: rgba(98,66,0,0.06); color: #624200;">
              {{ (logItem.user_name || '?').charAt(0) }}
            </div>
            <div>
              <p class="text-sm font-medium" style="color: #0b1c30;">{{ logItem.user_name || '—' }}</p>
              <p class="text-xs" style="color: #4f4539;">{{ logItem.entity }} · {{ logItem.entity_id || '—' }}</p>
            </div>
          </div>
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap"
            :style="getActionStyle(logItem.action)">
            <span class="material-icons-outlined" style="font-size: 0.75rem;">{{ getActionIcon(logItem.action) }}</span>
            {{ getActionLabel(logItem.action) }}
          </span>
        </div>
        <div class="text-xs mb-2" style="color: #4f4539;">
          <span class="opacity-60">Detalles:</span>
          <span class="ml-1 truncate inline-block max-w-full">{{ getDetailsPreview(logItem.details) }}</span>
        </div>
        <div class="flex items-center justify-between pt-2" style="border-top: 1px solid rgba(210,196,180,0.2);">
          <span class="text-xs" style="color: #4f4539;">{{ formatDate(logItem.created_at) }}</span>
          <span v-if="logItem.success || logItem.status === 'success'" class="inline-flex items-center gap-1 text-xs font-medium" style="color: #16a34a;">
            <span class="material-icons-outlined" style="font-size: 0.875rem;">check_circle</span>
          </span>
          <span v-else-if="logItem.status === 'error' || logItem.error" class="inline-flex items-center gap-1 text-xs font-medium" style="color: #dc2626;">
            <span class="material-icons-outlined" style="font-size: 0.875rem;">error</span>
          </span>
        </div>
      </div>
      <div v-if="logs.length === 0" class="dt-empty-state py-8">
        <span class="dt-empty-icon material-icons-outlined">history</span>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif;">No hay registros de auditoría</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { auditAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';
import PageHeader from '../../components/shared/PageHeader.vue';
import { formatDate } from '../../utils';

const router = useRouter();
const logs = ref([]);
const page = ref(1);
const limit = 20;
const total = ref(0);
const filters = reactive({ entity: '', action: '' });
const showFilters = ref(false);

const columns = [
  { key: 'user_name', label: 'Usuario' },
  { key: 'entity', label: 'Entidad' },
  { key: 'entity_id', label: 'ID Entidad' },
  { key: 'action', label: 'Acción', type: 'custom' },
  { key: 'status', label: 'Resultado', type: 'custom' },
  { key: 'details', label: 'Detalles', type: 'custom' },
  { key: 'created_at', label: 'Fecha', type: 'datetime', sortable: true }
];

const changePage = (p) => { page.value = p; fetchLogs(); };

const fetchLogs = async () => {
  try {
    const cleanFilters = {};
    if (filters.entity) cleanFilters.entity = filters.entity;
    if (filters.action) cleanFilters.action = filters.action;
    const res = await auditAPI.getAll({ ...cleanFilters, page: page.value, limit });
    logs.value = res.data || [];
    total.value = res.pagination?.total || 0;
  }
  catch (e) {
    logs.value = [];
    total.value = 0;
  }
};

const getActionStyle = (action) => {
  const a = (action || '').toLowerCase();
  const styles = {
    create: { background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' },
    delete: { background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' },
  };
  // Default: yellow/amber for all other actions (update, login, etc.)
  const s = styles[a] || { background: '#fefce8', color: '#d97706', borderColor: '#fde68a' };
  return `background: ${s.background}; color: ${s.color}; border-color: ${s.borderColor};`;
};

const getActionIcon = (action) => {
  const icons = {
    create: 'add_circle',
    update: 'edit',
    delete: 'delete',
    login: 'login',
    logout: 'logout',
    sale: 'point_of_sale',
    purchase: 'shopping_cart',
    export: 'file_download',
    import: 'file_upload',
  };
  return icons[(action || '').toLowerCase()] || 'circle';
};

const getActionLabel = (action) => {
  const labels = {
    create: 'Crear',
    update: 'Actualizar',
    delete: 'Eliminar',
    login: 'Inicio Sesión',
    logout: 'Cierre Sesión',
    sale: 'Venta',
    purchase: 'Compra',
    export: 'Exportación',
    import: 'Importación',
  };
  return labels[(action || '').toLowerCase()] || action || '—';
};

const getDetailsPreview = (details) => {
  if (!details) return '—';
  try {
    const parsed = typeof details === 'string' ? JSON.parse(details) : details;
    const str = JSON.stringify(parsed);
    return str.length > 80 ? str.substring(0, 80) + '…' : str;
  } catch {
    return String(details).substring(0, 80);
  }
};

const goToDetail = (row) => {
  if (row?.id) {
    router.push(`/app/admin/audit/${row.id}`);
  }
};

onMounted(fetchLogs);
</script>

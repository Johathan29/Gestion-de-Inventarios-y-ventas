<template>
  <div class="max-w-4xl mx-auto">
    <!-- Back Button -->
    <button @click="goBack"
      class="flex items-center gap-2 text-sm font-medium mb-6 transition-colors"
      style="color: #624200; font-family: 'Inter', sans-serif;"
      @mouseenter="e => e.currentTarget.style.color = '#0b1c30'"
      @mouseleave="e => e.currentTarget.style.color = '#624200'">
      <span class="material-icons-outlined" style="font-size: 1.125rem;">arrow_back</span>
      Volver a auditoría
    </button>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-[#624200] border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <span class="material-icons-outlined text-5xl" style="color: #dc2626;">error_outline</span>
      <p class="mt-4 text-sm" style="color: #4f4539;">{{ error }}</p>
    </div>

    <!-- Detail Content -->
    <template v-else-if="log">
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 overflow-hidden">
        <!-- Header -->
        <div class="p-6 border-b border-[#d2c4b4]/20" style="background: linear-gradient(135deg, rgba(98,66,0,0.03), rgba(98,66,0,0.01));">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                :style="{ background: actionStyle.bg, color: actionStyle.color }">
                <span class="material-icons-outlined">{{ actionStyle.icon }}</span>
              </div>
              <div>
                <h2 class="text-xl font-bold" style="color: #0b1c30; font-family: 'Plus Jakarta Sans', sans-serif;">
                  {{ actionLabel }}
                </h2>
                <p class="text-sm mt-0.5" style="color: #4f4539;">{{ log.entity }} · {{ log.entity_id || '—' }}</p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold"
              :style="{ background: actionStyle.bg, color: actionStyle.color, border: `1px solid ${actionStyle.border}` }">
              {{ log.action }}
            </span>
          </div>
          <div class="flex items-center gap-4 text-xs" style="color: #4f4539;">
            <span class="flex items-center gap-1">
              <span class="material-icons-outlined" style="font-size: 0.875rem;">person</span>
              {{ log.user_name || log.users?.name || 'Sistema' }}
            </span>
            <span class="flex items-center gap-1">
              <span class="material-icons-outlined" style="font-size: 0.875rem;">schedule</span>
              {{ formatDate(log.created_at) }}
            </span>
            <span v-if="log.ip_address" class="flex items-center gap-1">
              <span class="material-icons-outlined" style="font-size: 0.875rem;">language</span>
              {{ log.ip_address }}
            </span>
          </div>
        </div>

        <!-- Details -->
        <div class="p-6 space-y-6">
          <!-- Description / Summary -->
          <div v-if="log.description" class="p-4 rounded-xl" style="background: rgba(98,66,0,0.03);">
            <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: #4f4539;">Descripción</p>
            <p class="text-sm" style="color: #0b1c30;">{{ log.description }}</p>
          </div>

          <!-- Server Response / Full Details JSON -->
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="color: #4f4539;">
              Respuesta del servidor / Detalles completos
            </p>
            <pre class="p-4 rounded-xl text-xs leading-relaxed overflow-x-auto" style="background: #1e293b; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; max-height: 400px; overflow-y: auto;">{{ formattedDetails }}</pre>
          </div>

          <!-- Metadata -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="p-3 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <p class="text-xs font-semibold uppercase tracking-wider" style="color: #4f4539;">Entidad</p>
              <p class="text-sm font-medium mt-1" style="color: #0b1c30; text-transform: capitalize;">{{ log.entity }}</p>
            </div>
            <div class="p-3 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <p class="text-xs font-semibold uppercase tracking-wider" style="color: #4f4539;">ID Entidad</p>
              <p class="text-sm font-medium mt-1" style="color: #0b1c30; font-family: 'JetBrains Mono', monospace;">{{ log.entity_id || '—' }}</p>
            </div>
            <div class="p-3 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <p class="text-xs font-semibold uppercase tracking-wider" style="color: #4f4539;">Resultado</p>
              <p class="text-sm font-medium mt-1 flex items-center gap-1">
                <span v-if="log.success || log.status === 'success'" style="color: #16a34a;" class="flex items-center gap-1">
                  <span class="material-icons-outlined" style="font-size: 1rem;">check_circle</span> Éxito
                </span>
                <span v-else-if="log.status === 'error' || log.error" style="color: #dc2626;" class="flex items-center gap-1">
                  <span class="material-icons-outlined" style="font-size: 1rem;">error</span> Error
                </span>
                <span v-else style="color: #d97706;" class="flex items-center gap-1">
                  <span class="material-icons-outlined" style="font-size: 1rem;">pending</span> {{ log.status || 'Desconocido' }}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auditAPI } from '../../api';
import { formatDate } from '../../utils';

const route = useRoute();
const router = useRouter();

const log = ref(null);
const loading = ref(true);
const error = ref(null);

const actionLabel = computed(() => {
  const a = log.value?.action?.toLowerCase() || '';
  const actionMap = {
    create: 'Creación',
    update: 'Actualización',
    delete: 'Eliminación',
    login: 'Inicio de Sesión',
    logout: 'Cierre de Sesión',
    sale: 'Venta',
    purchase: 'Compra',
    export: 'Exportación',
    import: 'Importación',
  };
  return actionMap[a] || log.value?.action || 'Acción';
});

const actionStyle = computed(() => {
  const a = log.value?.action?.toLowerCase() || '';
  const styles = {
    create: { icon: 'add_circle', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    update: { icon: 'edit', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    delete: { icon: 'delete', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    login: { icon: 'login', bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
    logout: { icon: 'logout', bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  };
  return styles[a] || { icon: 'circle', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
});

const formattedDetails = computed(() => {
  if (!log.value?.details) return '{}';
  try {
    const details = typeof log.value.details === 'string'
      ? JSON.parse(log.value.details)
      : log.value.details;
    return JSON.stringify(details, null, 2);
  } catch {
    return String(log.value.details);
  }
});

const goBack = () => {
  router.push('/app/admin/audit');
};

const fetchLogDetail = async () => {
  const id = route.params.id;
  if (!id) {
    error.value = 'ID de registro no proporcionado';
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const res = await auditAPI.getById(id);
    log.value = res.data || null;
    if (!log.value) throw new Error('Registro no encontrado');
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Error al cargar el detalle';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchLogDetail);
</script>
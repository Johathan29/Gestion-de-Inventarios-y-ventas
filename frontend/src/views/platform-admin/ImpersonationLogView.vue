<template>
  <div class="pa-impersonation">
    <div class="pa-header">
      <div class="pa-header-content">
        <div>
          <h1 class="pa-title">🔐 Sesiones de Soporte</h1>
          <p class="pa-subtitle">Registro de todas las sesiones de impersonación y soporte</p>
        </div>
        <div class="pa-header-actions">
          <div class="pa-active-sessions" v-if="activeSessions.length">
            <span class="pa-active-badge">{{ activeSessions.length }} sesión(es) activa(s)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Sessions -->
    <div v-if="activeSessions.length" class="pa-active-section">
      <h3 class="pa-section-title">⚡ Sesiones Activas</h3>
      <div class="pa-sessions-grid">
        <div v-for="session in activeSessions" :key="session.id" class="pa-session-card">
          <div class="pa-session-header">
            <span class="pa-session-admin">{{ session.users?.name || 'Admin' }}</span>
            <span class="pa-session-time">Desde {{ formatTimeAgo(session.started_at) }}</span>
          </div>
          <div class="pa-session-target">
            🏢 {{ session.companies?.name || 'Empresa' }}
          </div>
          <div class="pa-session-reason" v-if="session.reason">{{ session.reason }}</div>
          <button class="pa-btn pa-btn-danger pa-btn-sm" @click="endSession(session)">
            Finalizar Sesión
          </button>
        </div>
      </div>
    </div>

    <!-- Logs Table -->
    <div class="pa-table-card">
      <div class="pa-table-wrapper">
        <table class="pa-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Admin</th>
              <th>Empresa</th>
              <th>Acción</th>
              <th>Descripción</th>
              <th>Entidad</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td class="pa-date">{{ formatDateTime(log.created_at) }}</td>
              <td>
                <span class="pa-admin-name">{{ log.users?.name || 'Admin' }}</span>
                <span class="pa-admin-email">{{ log.users?.email || '' }}</span>
              </td>
              <td>{{ log.support_sessions?.target_company_id?.slice(0, 8) || '—' }}</td>
              <td>
                <span class="pa-badge" :class="getActionClass(log.action_type)">
                  {{ getActionLabel(log.action_type) }}
                </span>
              </td>
              <td class="pa-desc">{{ log.action_description }}</td>
              <td>
                <span v-if="log.entity_type" class="pa-entity">
                  {{ log.entity_type }}{{ log.entity_id ? `#${log.entity_id.slice(0, 8)}` : '' }}
                </span>
                <span v-else class="pa-empty-text">—</span>
              </td>
            </tr>
            <tr v-if="!logs.length && !loading">
              <td colspan="6" class="pa-empty">No hay registros de impersonación</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { platformAdminAPI } from '../../api';
import Swal from 'sweetalert2';

const logs = ref([]);
const activeSessions = ref([]);
const loading = ref(false);

const fetchAll = async () => {
  loading.value = true;
  try {
    const [logsRes, sessionsRes] = await Promise.all([
      platformAdminAPI.getImpersonationLogs({ limit: 100 }),
      platformAdminAPI.getActiveSessions(),
    ]);
    logs.value = logsRes.data || [];
    activeSessions.value = sessionsRes.data || [];
  } catch (e) {
    console.error('Failed to load impersonation data:', e);
  } finally {
    loading.value = false;
  }
};

const endSession = async (session) => {
  const r = await Swal.fire({
    title: '¿Finalizar sesión de soporte?',
    text: `${session.users?.name} → ${session.companies?.name}`,
    icon: 'warning',
    showCancelButton: true,
  });
  if (r.isConfirmed) {
    try {
      await platformAdminAPI.endImpersonation(session.id);
      await fetchAll();
    } catch (e) {
      Swal.fire('Error', 'No se pudo finalizar la sesión', 'error');
    }
  }
};

const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const formatTimeAgo = (d) => {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
};

const getActionClass = (type) => ({
  'pa-badge-success': type === 'session_start',
  'pa-badge-danger': type === 'session_end',
  'pa-badge-info': type === 'view',
  'pa-badge-warning': type === 'edit' || type === 'create',
  'pa-badge-purple': type === 'delete',
}[type] || 'pa-badge-muted');

const getActionLabel = (type) => ({
  session_start: '🟢 Inicio',
  session_end: '🔴 Fin',
  view: '👁 Ver',
  edit: '✏️ Editar',
  create: '➕ Crear',
  delete: '🗑 Eliminar',
}[type] || type);

onMounted(fetchAll);
</script>

<style scoped>
.pa-impersonation { padding: 24px; max-width: 1400px; margin: 0 auto; }
.pa-header { margin-bottom: 24px; }
.pa-header-content { display: flex; justify-content: space-between; align-items: center; }
.pa-title { font-family: 'Inter', sans-serif; font-size: 1.75rem; font-weight: 800; color: #1e293b; margin: 0; }
.pa-subtitle { font-size: 0.9rem; color: #94a3b8; margin: 4px 0 0; }
.pa-active-badge { background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.pa-active-section { margin-bottom: 24px; }
.pa-section-title { font-size: 1.1rem; font-weight: 700; margin: 0 0 14px; }
.pa-sessions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.pa-session-card { background: #fff; border: 2px solid #fecaca; border-radius: 14px; padding: 18px; }
.pa-session-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.pa-session-admin { font-weight: 700; font-size: 0.9rem; }
.pa-session-time { font-size: 0.78rem; color: #94a3b8; }
.pa-session-target { font-size: 0.88rem; color: #475569; margin-bottom: 6px; }
.pa-session-reason { font-size: 0.8rem; color: #64748b; margin-bottom: 12px; font-style: italic; }

.pa-table-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
.pa-table-wrapper { overflow-x: auto; }
.pa-table { width: 100%; border-collapse: collapse; }
.pa-table th { text-align: left; padding: 14px 16px; font-weight: 600; font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #f1f5f9; }
.pa-table td { padding: 14px 16px; font-size: 0.88rem; color: #1e293b; border-bottom: 1px solid #f8fafc; }
.pa-empty { text-align: center; color: #94a3b8; padding: 40px !important; }
.pa-date { font-size: 0.82rem; color: #64748b; white-space: nowrap; }
.pa-admin-name { display: block; font-weight: 600; font-size: 0.88rem; }
.pa-admin-email { font-size: 0.75rem; color: #94a3b8; }
.pa-desc { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pa-entity { font-family: monospace; font-size: 0.8rem; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; }
.pa-empty-text { color: #cbd5e1; }
.pa-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.pa-badge-success { background: #ecfdf5; color: #059669; }
.pa-badge-danger { background: #fef2f2; color: #dc2626; }
.pa-badge-info { background: #eff6ff; color: #2563eb; }
.pa-badge-warning { background: #fffbeb; color: #d97706; }
.pa-badge-purple { background: #f5f3ff; color: #7c3aed; }
.pa-badge-muted { background: #f1f5f9; color: #94a3b8; }
.pa-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.pa-btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.pa-btn-danger:hover { background: #dc2626; }
.pa-btn-sm { padding: 6px 14px; font-size: 0.8rem; }
</style>

<template>
  <div class="pa-companies">
    <div class="pa-header">
      <div class="pa-header-content">
        <div>
          <h1 class="pa-title">Empresas</h1>
          <p class="pa-subtitle">Explorar y gestionar todas las empresas de la plataforma</p>
        </div>
        <router-link to="/app/platform/companies/create" class="pa-btn-create">
          + Crear Empresa
        </router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="pa-filters">
      <div class="pa-search-box">
        <svg class="pa-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input v-model="search" @input="debouncedSearch" placeholder="Buscar empresa..." class="pa-search-input"/>
      </div>
      <select v-model="statusFilter" @change="fetchCompanies" class="pa-select">
        <option value="">Todos los estados</option>
        <option value="active">Activa</option>
        <option value="trial">Prueba</option>
        <option value="grace_period">Gracia</option>
        <option value="suspended">Suspendida</option>
        <option value="expired">Expirada</option>
        <option value="no_subscription">Sin Subscripción</option>
      </select>
    </div>

    <!-- Companies Table -->
    <div class="pa-table-card">
      <div class="pa-table-wrapper">
        <table class="pa-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Tipo</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Usuarios</th>
              <th>Clientes</th>
              <th>Productos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="company in companies" :key="company.id" @click="goToDetail(company.id)">
              <td>
                <div class="pa-company-cell">
                  <div class="pa-company-avatar" :style="{ background: getAvatarColor(company.name) }">
                    {{ getInitials(company.name) }}
                  </div>
                  <div>
                    <span class="pa-company-name">{{ company.name }}</span>
                    <span class="pa-company-slug" v-if="company.slug">/{{ company.slug }}</span>
                  </div>
                </div>
              </td>
              <td><span class="pa-badge pa-badge-info">{{ company.business_type_name || '—' }}</span></td>
              <td><span class="pa-badge pa-badge-purple">{{ company.plan_name || 'Sin plan' }}</span></td>
              <td>
                <span class="pa-badge" :class="getStatusClass(company.subscription_status)">
                  {{ getStatusLabel(company.subscription_status) }}
                </span>
              </td>
              <td class="pa-num">{{ company.user_count }}</td>
              <td class="pa-num">{{ company.client_count }}</td>
              <td class="pa-num">{{ company.product_count }}</td>
              <td>
                <div class="pa-actions" @click.stop>
                  <button class="pa-action-btn pa-action-view" @click="goToDetail(company.id)" title="Ver detalles">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button class="pa-action-btn pa-action-impersonate" @click="startImpersonation(company)" title="Acceder como soporte">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!companies.length && !loading">
              <td colspan="8" class="pa-empty">No se encontraron empresas</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pa-pagination" v-if="total > limit">
        <span class="pa-page-info">Mostrando {{ offset + 1 }}-{{ Math.min(offset + limit, total) }} de {{ total }}</span>
        <div class="pa-page-btns">
          <button class="pa-page-btn" :disabled="offset === 0" @click="prevPage">← Anterior</button>
          <button class="pa-page-btn" :disabled="offset + limit >= total" @click="nextPage">Siguiente →</button>
        </div>
      </div>
    </div>

    <!-- Impersonation Modal -->
    <Teleport to="body">
      <div v-if="showImpersonationModal" class="pa-modal-overlay" @click.self="showImpersonationModal = false">
        <div class="pa-modal">
          <h2 class="pa-modal-title">🔐 Acceder como Soporte</h2>
          <p class="pa-modal-desc">Vas a acceder a la empresa <strong>{{ impersonationTarget?.name }}</strong> como administrador de soporte.</p>
          <div class="pa-modal-field">
            <label>Razón del acceso</label>
            <input v-model="impersonationReason" placeholder="Ej: Soporte técnico, revisión de configuración..." class="pa-modal-input"/>
          </div>
          <div class="pa-modal-actions">
            <button class="pa-btn pa-btn-outline" @click="showImpersonationModal = false">Cancelar</button>
            <button class="pa-btn pa-btn-danger" @click="confirmImpersonation" :disabled="!impersonationReason">
              Acceder como Soporte
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { platformAdminAPI } from '../../api';
import Swal from 'sweetalert2';

const router = useRouter();
const companies = ref([]);
const total = ref(0);
const loading = ref(false);
const search = ref('');
const statusFilter = ref('');
const limit = 20;
const offset = ref(0);

// Impersonation modal
const showImpersonationModal = ref(false);
const impersonationTarget = ref(null);
const impersonationReason = ref('');

let searchTimeout = null;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { offset.value = 0; fetchCompanies(); }, 400);
};

const fetchCompanies = async () => {
  loading.value = true;
  try {
    const res = await platformAdminAPI.getCompanies({
      search: search.value || undefined,
      status: statusFilter.value || undefined,
      limit,
      offset: offset.value,
    });
    companies.value = res.data?.companies || [];
    total.value = res.data?.total || 0;
  } catch (e) {
    console.error('Failed to load companies:', e);
  } finally {
    loading.value = false;
  }
};

const goToDetail = (id) => router.push(`/app/platform/companies/${id}`);

const startImpersonation = (company) => {
  impersonationTarget.value = company;
  impersonationReason.value = '';
  showImpersonationModal.value = true;
};

const confirmImpersonation = async () => {
  try {
    const res = await platformAdminAPI.startImpersonation({
      company_id: impersonationTarget.value.id,
      reason: impersonationReason.value,
    });
    showImpersonationModal.value = false;

    // Store impersonation session
    sessionStorage.setItem('impersonation_session', JSON.stringify({
      sessionId: res.data.session_id,
      company_id: impersonationTarget.value.id,
      company_name: impersonationTarget.value.name,
      started_at: new Date().toISOString(),
    }));

    await Swal.fire({
      icon: 'success',
      title: 'Sesión de Soporte Iniciada',
      text: `Ahora estás viendo como: ${impersonationTarget.value.name}`,
      timer: 3000,
    });

    // Navigate to the company's dashboard
    router.push('/app/dashboard');
  } catch (e) {
    Swal.fire('Error', 'No se pudo iniciar la sesión de soporte', 'error');
  }
};

const nextPage = () => { offset.value += limit; fetchCompanies(); };
const prevPage = () => { offset.value = Math.max(0, offset.value - limit); fetchCompanies(); };

const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
const getAvatarColor = (name) => {
  if (!name) return '#6366f1';
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getStatusClass = (status) => ({
  'pa-badge-success': status === 'active',
  'pa-badge-warning': status === 'trial' || status === 'grace_period',
  'pa-badge-danger': status === 'suspended' || status === 'expired',
  'pa-badge-muted': status === 'no_subscription',
});

const getStatusLabel = (status) => ({
  active: 'Activa',
  trial: 'Prueba',
  grace_period: 'Gracia',
  suspended: 'Suspendida',
  expired: 'Expirada',
  no_subscription: 'Sin Sub.',
}[status] || status);

onMounted(fetchCompanies);
</script>

<style scoped>
.pa-companies { padding: 24px; max-width: 1400px; margin: 0 auto; }
.pa-header { margin-bottom: 24px; }
.pa-header-content { display: flex; justify-content: space-between; align-items: center; }
.pa-title { font-family: 'Inter', sans-serif; font-size: 1.75rem; font-weight: 800; color: #1e293b; margin: 0; }
.pa-subtitle { font-size: 0.9rem; color: #94a3b8; margin: 4px 0 0; }

/* Filters */
.pa-filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.pa-search-box { position: relative; flex: 1; min-width: 240px; }
.pa-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: #94a3b8; }
.pa-search-input { width: 100%; padding: 10px 14px 10px 42px; border: 2px solid #e2e8f0; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.9rem; outline: none; transition: border-color 0.2s; background: #fff; }
.pa-search-input:focus { border-color: #3b82f6; }
.pa-select { padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.9rem; background: #fff; outline: none; min-width: 180px; }

/* Table */
.pa-table-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
.pa-table-wrapper { overflow-x: auto; }
.pa-table { width: 100%; border-collapse: collapse; }
.pa-table th { text-align: left; padding: 14px 16px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #f1f5f9; }
.pa-table td { padding: 14px 16px; font-family: 'Inter', sans-serif; font-size: 0.9rem; color: #1e293b; border-bottom: 1px solid #f8fafc; }
.pa-table tbody tr { cursor: pointer; transition: background 0.15s; }
.pa-table tbody tr:hover { background: #f8fafc; }
.pa-empty { text-align: center; color: #94a3b8; padding: 40px !important; }
.pa-num { text-align: center; font-weight: 600; }

/* Company cell */
.pa-company-cell { display: flex; align-items: center; gap: 12px; }
.pa-company-avatar { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; color: #fff; flex-shrink: 0; }
.pa-company-name { display: block; font-weight: 600; }
.pa-company-slug { display: block; font-size: 0.75rem; color: #94a3b8; }

/* Badges */
.pa-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.pa-badge-success { background: #ecfdf5; color: #059669; }
.pa-badge-warning { background: #fffbeb; color: #d97706; }
.pa-badge-danger { background: #fef2f2; color: #dc2626; }
.pa-badge-muted { background: #f1f5f9; color: #94a3b8; }
.pa-badge-info { background: #eff6ff; color: #2563eb; }
.pa-badge-purple { background: #f5f3ff; color: #7c3aed; }

/* Actions */
.pa-actions { display: flex; gap: 6px; }
.pa-action-btn { width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: #f1f5f9; color: #64748b; }
.pa-action-btn:hover { transform: scale(1.1); }
.pa-action-btn svg { width: 16px; height: 16px; }
.pa-action-view:hover { background: #3b82f6; color: #fff; }
.pa-action-impersonate:hover { background: #f59e0b; color: #fff; }

/* Pagination */
.pa-pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid #f1f5f9; }
.pa-page-info { font-size: 0.85rem; color: #64748b; }
.pa-page-btns { display: flex; gap: 8px; }
.pa-page-btn { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; background: #fff; color: #475569; transition: all 0.2s; }
.pa-page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; }
.pa-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.pa-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.pa-modal { background: #fff; border-radius: 20px; padding: 32px; max-width: 480px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.pa-modal-title { font-family: 'Inter', sans-serif; font-size: 1.25rem; font-weight: 800; margin: 0 0 12px; }
.pa-modal-desc { font-size: 0.9rem; color: #64748b; margin: 0 0 20px; line-height: 1.5; }
.pa-modal-field { margin-bottom: 20px; }
.pa-modal-field label { display: block; font-weight: 600; font-size: 0.85rem; color: #475569; margin-bottom: 6px; }
.pa-modal-input { width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.9rem; outline: none; }
.pa-modal-input:focus { border-color: #3b82f6; }
.pa-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

/* Buttons */
.pa-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.pa-btn-outline { border-color: #d2c4b4; color: #624200; background: transparent; }
.pa-btn-outline:hover { border-color: #624200; }
.pa-btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.pa-btn-danger:hover { background: #dc2626; }
.pa-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Create Company Button */
.pa-btn-create { display: inline-flex; align-items: center; gap: 6px; padding: 10px 22px; border-radius: 12px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.88rem; cursor: pointer; background: #3b82f6; color: #fff; text-decoration: none; transition: all 0.2s; }
.pa-btn-create:hover { background: #2563eb; transform: translateY(-1px); }
</style>

<template>
  <div class="pa-company-detail">
    <!-- Back button -->
    <button class="pa-back-btn" @click="$router.push('/app/platform/companies')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
      Volver a Empresas
    </button>

    <!-- Loading -->
    <div v-if="loading" class="pa-loading">
      <div class="pa-spinner"></div>
      <span>Cargando empresa...</span>
    </div>

    <!-- Company Info -->
    <template v-if="company">
      <!-- Header Card -->
      <div class="pa-detail-header">
        <div class="pa-detail-avatar" :style="{ background: getAvatarColor(company.company?.name) }">
          {{ getInitials(company.company?.name) }}
        </div>
        <div class="pa-detail-info">
          <h1 class="pa-detail-name">{{ company.company?.name }}</h1>
          <div class="pa-detail-meta">
            <span class="pa-badge" :class="getStatusClass(company.company?.subscription_status)">
              {{ getStatusLabel(company.company?.subscription_status) }}
            </span>
            <span class="pa-badge pa-badge-info" v-if="company.business_type?.name">{{ company.business_type.name }}</span>
            <span class="pa-badge pa-badge-purple" v-if="company.plan?.name">Plan: {{ company.plan.name }}</span>
          </div>
        </div>
        <div class="pa-detail-actions">
          <button class="pa-btn pa-btn-warning" @click="impersonate">
            🔐 Acceder como Soporte
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="pa-detail-stats">
        <div class="pa-stat-mini">
          <span class="pa-stat-mini-value">{{ company.user_count }}</span>
          <span class="pa-stat-mini-label">Usuarios</span>
        </div>
        <div class="pa-stat-mini">
          <span class="pa-stat-mini-value">{{ company.client_count }}</span>
          <span class="pa-stat-mini-label">Clientes</span>
        </div>
        <div class="pa-stat-mini">
          <span class="pa-stat-mini-value">{{ company.product_count }}</span>
          <span class="pa-stat-mini-label">Productos</span>
        </div>
        <div class="pa-stat-mini">
          <span class="pa-stat-mini-value">${{ formatMoney(company.monthly_revenue) }}</span>
          <span class="pa-stat-mini-label">Ventas este mes</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="pa-tabs">
        <button class="pa-tab" :class="{ active: tab === 'overview' }" @click="tab = 'overview'">Resumen</button>
        <button class="pa-tab" :class="{ active: tab === 'widgets' }" @click="tab = 'widgets'">Dashboard Widgets</button>
        <button class="pa-tab" :class="{ active: tab === 'activity' }" @click="tab = 'activity'">Actividad</button>
        <button class="pa-tab" :class="{ active: tab === 'subscription' }" @click="tab = 'subscription'">Subscripción</button>
      </div>

      <!-- Tab: Overview -->
      <div v-if="tab === 'overview'" class="pa-tab-content">
        <div class="pa-info-grid">
          <div class="pa-info-card">
            <h3>📧 Contacto</h3>
            <div class="pa-info-row"><span>Email:</span><span>{{ company.company?.email || '—' }}</span></div>
            <div class="pa-info-row"><span>Teléfono:</span><span>{{ company.company?.phone || '—' }}</span></div>
            <div class="pa-info-row"><span>Dirección:</span><span>{{ company.company?.address || '—' }}</span></div>
          </div>
          <div class="pa-info-card">
            <h3>⚙️ Configuración</h3>
            <div class="pa-info-row"><span>Slug:</span><span>{{ company.company?.slug || '—' }}</span></div>
            <div class="pa-info-row"><span>Activa:</span><span>{{ company.company?.is_active ? '✅ Sí' : '❌ No' }}</span></div>
            <div class="pa-info-row"><span>Creada:</span><span>{{ formatDate(company.company?.created_at) }}</span></div>
          </div>
        </div>
      </div>

      <!-- Tab: Widgets -->
      <div v-if="tab === 'widgets'" class="pa-tab-content">
        <div class="pa-widgets-header">
          <h3>Widgets del Dashboard</h3>
          <button class="pa-btn pa-btn-primary" @click="showAddWidget = !showAddWidget">
            {{ showAddWidget ? 'Cancelar' : '+ Agregar Widget' }}
          </button>
        </div>

        <!-- Add Widget Form -->
        <div v-if="showAddWidget" class="pa-widget-form">
          <h4>Seleccionar Widget del Catálogo</h4>
          <div class="pa-catalog-grid">
            <div v-for="w in availableWidgets" :key="w.id" class="pa-catalog-item" @click="addWidget(w)">
              <span class="pa-catalog-icon">{{ w.icon || '📊' }}</span>
              <span class="pa-catalog-name">{{ w.name }}</span>
              <span class="pa-catalog-desc">{{ w.description }}</span>
            </div>
          </div>
        </div>

        <!-- Current Widgets -->
        <div class="pa-widget-list">
          <div v-for="cw in companyWidgets" :key="cw.id" class="pa-widget-item">
            <div class="pa-widget-drag">⋮⋮</div>
            <div class="pa-widget-info">
              <span class="pa-widget-name">{{ cw.dashboard_widgets?.name || 'Widget' }}</span>
              <span class="pa-widget-type">{{ cw.dashboard_widgets?.widget_type }}</span>
            </div>
            <div class="pa-widget-config">
              <label class="pa-toggle">
                <input type="checkbox" :checked="cw.is_visible" @change="toggleWidgetVisibility(cw)">
                <span class="pa-toggle-slider"></span>
              </label>
              <button class="pa-action-btn pa-action-delete" @click="removeWidget(cw)">✕</button>
            </div>
          </div>
          <div v-if="!companyWidgets.length" class="pa-empty-widgets">
            No hay widgets configurados. Agrega widgets del catálogo.
          </div>
        </div>
      </div>

      <!-- Tab: Activity -->
      <div v-if="tab === 'activity'" class="pa-tab-content">
        <div class="pa-activity-list">
          <div v-for="act in activityLog" :key="act.id" class="pa-activity-item">
            <div class="pa-activity-dot" :class="`pa-dot-${act.activity_type}`"></div>
            <div class="pa-activity-content">
              <span class="pa-activity-desc">{{ act.activity_description }}</span>
              <span class="pa-activity-meta">
                {{ act.users?.name || 'Sistema' }} · {{ formatDate(act.created_at) }}
              </span>
            </div>
          </div>
          <div v-if="!activityLog.length" class="pa-empty-widgets">Sin actividad registrada</div>
        </div>
      </div>

      <!-- Tab: Subscription -->
      <div v-if="tab === 'subscription'" class="pa-tab-content">
        <div v-if="subscription" class="pa-info-card">
          <div class="pa-info-row"><span>Plan:</span><span class="pa-text-bold">{{ subscription.saas_plans?.name }}</span></div>
          <div class="pa-info-row"><span>Nivel:</span><span>{{ subscription.saas_plans?.tier }}</span></div>
          <div class="pa-info-row"><span>Precio mensual:</span><span>${{ subscription.saas_plans?.monthly_price }}</span></div>
          <div class="pa-info-row"><span>Precio anual:</span><span>${{ subscription.saas_plans?.annual_price }}</span></div>
          <div class="pa-info-row"><span>Estado:</span><span class="pa-badge" :class="getStatusClass(subscription.status)">{{ subscription.status }}</span></div>
          <div class="pa-info-row"><span>Inicio:</span><span>{{ formatDate(subscription.start_date) }}</span></div>
          <div class="pa-info-row"><span>Fin:</span><span>{{ formatDate(subscription.end_date) }}</span></div>
        </div>
        <div v-else class="pa-empty-widgets">Sin subscripción activa</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { platformAdminAPI } from '../../api';
import Swal from 'sweetalert2';

const route = useRoute();
const router = useRouter();
const companyId = route.params.id;

const company = ref(null);
const companyWidgets = ref([]);
const availableWidgets = ref([]);
const activityLog = ref([]);
const subscription = ref(null);
const loading = ref(true);
const tab = ref('overview');
const showAddWidget = ref(false);

const formatMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
const getAvatarColor = (name) => {
  if (!name) return '#6366f1';
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
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
const getStatusLabel = (s) => ({ active: 'Activa', trial: 'Prueba', grace_period: 'Gracia', suspended: 'Suspendida', expired: 'Expirada', no_subscription: 'Sin Sub.' }[s] || s);

const fetchAll = async () => {
  loading.value = true;
  try {
    const [detailRes, widgetsRes, catalogRes, activityRes, subRes] = await Promise.all([
      platformAdminAPI.getCompanyDetail(companyId),
      platformAdminAPI.getCompanyWidgets(companyId),
      platformAdminAPI.getWidgets(),
      platformAdminAPI.getActivityLog(companyId, { limit: 30 }),
      platformAdminAPI.getCompanySubscription(companyId).catch(() => ({ data: null })),
    ]);
    company.value = detailRes.data;
    companyWidgets.value = widgetsRes.data || [];
    availableWidgets.value = catalogRes.data || [];
    activityLog.value = activityRes.data || [];
    subscription.value = subRes.data;
  } catch (e) {
    console.error('Failed to load company detail:', e);
  } finally {
    loading.value = false;
  }
};

const impersonate = async () => {
  const { value: reason } = await Swal.fire({
    title: '🔐 Acceder como Soporte',
    input: 'text',
    inputLabel: `Accediendo a: ${company.value?.company?.name}`,
    inputPlaceholder: 'Razón del acceso...',
    showCancelButton: true,
    confirmButtonText: 'Acceder',
    inputValidator: (v) => !v ? 'Ingresa una razón' : null,
  });
  if (!reason) return;
  try {
    const res = await platformAdminAPI.startImpersonation({ company_id: companyId, reason });
    sessionStorage.setItem('impersonation_session', JSON.stringify({
      sessionId: res.data.session_id,
      company_id: companyId,
      company_name: company.value?.company?.name,
    }));
    await Swal.fire({ icon: 'success', title: 'Sesión iniciada', timer: 2000 });
    router.push('/app/dashboard');
  } catch (e) {
    Swal.fire('Error', 'No se pudo iniciar sesión', 'error');
  }
};

const addWidget = async (widget) => {
  try {
    await platformAdminAPI.addCompanyWidget(companyId, {
      widget_id: widget.id,
      sort_order: companyWidgets.value.length,
      is_visible: true,
      config: {},
    });
    await fetchAll();
    showAddWidget.value = false;
    Swal.fire({ icon: 'success', title: 'Widget agregado', timer: 1500 });
  } catch (e) {
    Swal.fire('Error', 'No se pudo agregar el widget', 'error');
  }
};

const toggleWidgetVisibility = async (cw) => {
  try {
    await platformAdminAPI.updateCompanyWidget(companyId, cw.id, { is_visible: !cw.is_visible });
    cw.is_visible = !cw.is_visible;
  } catch (e) {
    Swal.fire('Error', 'No se pudo actualizar', 'error');
  }
};

const removeWidget = async (cw) => {
  const r = await Swal.fire({ title: '¿Eliminar widget?', icon: 'warning', showCancelButton: true });
  if (!r.isConfirmed) return;
  try {
    await platformAdminAPI.removeCompanyWidget(companyId, cw.id);
    companyWidgets.value = companyWidgets.value.filter(w => w.id !== cw.id);
  } catch (e) {
    Swal.fire('Error', 'No se pudo eliminar', 'error');
  }
};

onMounted(fetchAll);
</script>

<style scoped>
.pa-company-detail { padding: 24px; max-width: 1200px; margin: 0 auto; }
.pa-back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.9rem; color: #64748b; cursor: pointer; margin-bottom: 20px; }
.pa-back-btn:hover { color: #1e293b; }

.pa-loading { display: flex; align-items: center; gap: 12px; padding: 60px; justify-content: center; color: #94a3b8; }
.pa-spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Header */
.pa-detail-header { display: flex; align-items: center; gap: 20px; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 20px; }
.pa-detail-avatar { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.5rem; color: #fff; flex-shrink: 0; }
.pa-detail-info { flex: 1; }
.pa-detail-name { font-family: 'Inter', sans-serif; font-size: 1.5rem; font-weight: 800; margin: 0 0 8px; }
.pa-detail-meta { display: flex; gap: 8px; flex-wrap: wrap; }
.pa-detail-actions { flex-shrink: 0; }

/* Stats */
.pa-detail-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
@media (max-width: 768px) { .pa-detail-stats { grid-template-columns: repeat(2, 1fr); } .pa-detail-header { flex-direction: column; align-items: flex-start; } }
.pa-stat-mini { background: #fff; border-radius: 12px; padding: 18px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.pa-stat-mini-value { display: block; font-size: 1.3rem; font-weight: 800; color: #1e293b; }
.pa-stat-mini-label { font-size: 0.78rem; color: #94a3b8; margin-top: 2px; display: block; }

/* Tabs */
.pa-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; }
.pa-tab { padding: 10px 18px; border: none; background: none; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.9rem; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
.pa-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
.pa-tab:hover { color: #1e293b; }
.pa-tab-content { min-height: 200px; }

/* Info Grid */
.pa-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 768px) { .pa-info-grid { grid-template-columns: 1fr; } }
.pa-info-card { background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.pa-info-card h3 { font-size: 1rem; font-weight: 700; margin: 0 0 14px; }
.pa-info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8fafc; font-size: 0.88rem; }
.pa-info-row span:first-child { color: #64748b; }
.pa-info-row span:last-child { font-weight: 600; color: #1e293b; }
.pa-text-bold { font-weight: 700; }

/* Widgets */
.pa-widgets-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.pa-widgets-header h3 { margin: 0; font-size: 1.1rem; }
.pa-widget-form { background: #f8fafc; border-radius: 14px; padding: 20px; margin-bottom: 20px; }
.pa-widget-form h4 { margin: 0 0 14px; font-size: 0.95rem; }
.pa-catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.pa-catalog-item { background: #fff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 14px; cursor: pointer; text-align: center; transition: all 0.2s; }
.pa-catalog-item:hover { border-color: #3b82f6; background: #eff6ff; }
.pa-catalog-icon { display: block; font-size: 1.5rem; margin-bottom: 6px; }
.pa-catalog-name { display: block; font-weight: 700; font-size: 0.85rem; }
.pa-catalog-desc { display: block; font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
.pa-widget-list { display: flex; flex-direction: column; gap: 8px; }
.pa-widget-item { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 14px 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.pa-widget-drag { color: #cbd5e1; cursor: grab; font-size: 1.2rem; letter-spacing: 2px; }
.pa-widget-info { flex: 1; }
.pa-widget-name { display: block; font-weight: 600; }
.pa-widget-type { font-size: 0.78rem; color: #94a3b8; }
.pa-widget-config { display: flex; align-items: center; gap: 10px; }
.pa-empty-widgets { text-align: center; color: #94a3b8; padding: 40px; font-size: 0.9rem; }

/* Toggle */
.pa-toggle { position: relative; width: 42px; height: 24px; display: inline-block; }
.pa-toggle input { opacity: 0; width: 0; height: 0; }
.pa-toggle-slider { position: absolute; inset: 0; background: #cbd5e1; border-radius: 12px; cursor: pointer; transition: background 0.2s; }
.pa-toggle-slider::before { content: ''; position: absolute; left: 3px; top: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
.pa-toggle input:checked + .pa-toggle-slider { background: #10b981; }
.pa-toggle input:checked + .pa-toggle-slider::before { transform: translateX(18px); }

/* Activity */
.pa-activity-list { display: flex; flex-direction: column; gap: 12px; }
.pa-activity-item { display: flex; align-items: flex-start; gap: 12px; }
.pa-activity-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; background: #3b82f6; }
.pa-dot-login { background: #10b981; }
.pa-dot-sale { background: #f59e0b; }
.pa-dot-create { background: #3b82f6; }
.pa-dot-delete { background: #ef4444; }
.pa-activity-content { flex: 1; }
.pa-activity-desc { display: block; font-size: 0.9rem; color: #1e293b; }
.pa-activity-meta { font-size: 0.78rem; color: #94a3b8; }

/* Badges */
.pa-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.pa-badge-success { background: #ecfdf5; color: #059669; }
.pa-badge-warning { background: #fffbeb; color: #d97706; }
.pa-badge-danger { background: #fef2f2; color: #dc2626; }
.pa-badge-muted { background: #f1f5f9; color: #94a3b8; }
.pa-badge-info { background: #eff6ff; color: #2563eb; }
.pa-badge-purple { background: #f5f3ff; color: #7c3aed; }

/* Buttons */
.pa-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.pa-btn-primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.pa-btn-primary:hover { background: #2563eb; }
.pa-btn-warning { background: #f59e0b; color: #fff; border-color: #f59e0b; }
.pa-btn-warning:hover { background: #d97706; }
.pa-btn-outline { border-color: #d2c4b4; color: #624200; background: transparent; }
.pa-action-btn { width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pa-action-delete { background: #fef2f2; color: #ef4444; }
.pa-action-delete:hover { background: #ef4444; color: #fff; }
</style>

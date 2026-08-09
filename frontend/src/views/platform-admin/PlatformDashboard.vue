<template>
  <div class="pa-dashboard">
    <!-- Header -->
    <div class="pa-header">
      <div class="pa-header-content">
        <div>
          <h1 class="pa-title">Panel de Control Global</h1>
          <p class="pa-subtitle">Métricas de la plataforma SaaS en tiempo real</p>
        </div>
        <button class="pa-btn pa-btn-outline" @click="refresh" :disabled="loading">
          <svg class="pa-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          Actualizar
        </button>
      </div>
    </div>

    <!-- KPI Cards Row -->
    <div class="pa-kpi-grid" v-if="stats">
      <div class="pa-kpi-card pa-kpi-primary">
        <div class="pa-kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div class="pa-kpi-info">
          <span class="pa-kpi-value">{{ stats.total_companies }}</span>
          <span class="pa-kpi-label">Empresas Totales</span>
        </div>
      </div>

      <div class="pa-kpi-card pa-kpi-success">
        <div class="pa-kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="pa-kpi-info">
          <span class="pa-kpi-value">{{ stats.active_companies }}</span>
          <span class="pa-kpi-label">Empresas Activas</span>
        </div>
      </div>

      <div class="pa-kpi-card pa-kpi-warning">
        <div class="pa-kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="pa-kpi-info">
          <span class="pa-kpi-value">{{ stats.trial_companies }}</span>
          <span class="pa-kpi-label">En Prueba</span>
        </div>
      </div>

      <div class="pa-kpi-card pa-kpi-danger">
        <div class="pa-kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="pa-kpi-info">
          <span class="pa-kpi-value">{{ stats.suspended_companies }}</span>
          <span class="pa-kpi-label">Suspendidas</span>
        </div>
      </div>
    </div>

    <!-- Revenue & Users Row -->
    <div class="pa-stats-grid" v-if="stats">
      <div class="pa-stat-card">
        <h3 class="pa-card-title">💰 Ingresos</h3>
        <div class="pa-revenue-grid">
          <div class="pa-revenue-item">
            <span class="pa-revenue-label">MRR</span>
            <span class="pa-revenue-value">${{ formatMoney(stats.mrr) }}</span>
          </div>
          <div class="pa-revenue-item">
            <span class="pa-revenue-label">Ingresos Totales</span>
            <span class="pa-revenue-value">${{ formatMoney(stats.total_revenue) }}</span>
          </div>
          <div class="pa-revenue-item">
            <span class="pa-revenue-label">Empresas sin Subscripción</span>
            <span class="pa-revenue-value pa-text-muted">{{ stats.no_subscription_companies }}</span>
          </div>
          <div class="pa-revenue-item">
            <span class="pa-revenue-label">En Período de Gracia</span>
            <span class="pa-revenue-value pa-text-warning">{{ stats.grace_companies }}</span>
          </div>
        </div>
      </div>

      <div class="pa-stat-card">
        <h3 class="pa-card-title">👥 Usuarios & Clientes</h3>
        <div class="pa-revenue-grid">
          <div class="pa-revenue-item">
            <span class="pa-revenue-label">Usuarios Totales</span>
            <span class="pa-revenue-value">{{ stats.total_users }}</span>
          </div>
          <div class="pa-revenue-item">
            <span class="pa-revenue-label">Usuarios Activos</span>
            <span class="pa-revenue-value pa-text-success">{{ stats.active_users }}</span>
          </div>
          <div class="pa-revenue-item">
            <span class="pa-revenue-label">Clientes Totales</span>
            <span class="pa-revenue-value">{{ stats.total_clients }}</span>
          </div>
          <div class="pa-revenue-item">
            <span class="pa-revenue-label">Nuevos Usuarios Hoy</span>
            <span class="pa-revenue-value pa-text-primary">{{ stats.new_users_today }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Plans Distribution -->
    <div class="pa-stat-card" v-if="stats?.subscriptions_by_plan && Object.keys(stats.subscriptions_by_plan).length">
      <h3 class="pa-card-title">📊 Distribución por Plan</h3>
      <div class="pa-plans-bars">
        <div class="pa-plan-bar" v-for="(count, plan) in stats.subscriptions_by_plan" :key="plan">
          <div class="pa-plan-label">
            <span class="pa-plan-name">{{ plan }}</span>
            <span class="pa-plan-count">{{ count }}</span>
          </div>
          <div class="pa-plan-track">
            <div class="pa-plan-fill" :style="{ width: getPlanWidth(count) }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="pa-quick-actions">
      <h3 class="pa-card-title">⚡ Acciones Rápidas</h3>
      <div class="pa-actions-grid">
        <router-link to="/app/platform/companies" class="pa-action-card">
          <span class="pa-action-icon">🏢</span>
          <span class="pa-action-text">Gestionar Empresas</span>
        </router-link>
        <router-link to="/app/platform/users" class="pa-action-card">
          <span class="pa-action-icon">👥</span>
          <span class="pa-action-text">Usuarios Globales</span>
        </router-link>
        <router-link to="/app/platform/impersonation" class="pa-action-card">
          <span class="pa-action-icon">🔍</span>
          <span class="pa-action-text">Sesiones de Soporte</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { platformAdminAPI } from '../../api';

const stats = ref(null);
const loading = ref(false);

const maxPlanCount = computed(() => {
  if (!stats.value?.subscriptions_by_plan) return 1;
  return Math.max(...Object.values(stats.value.subscriptions_by_plan), 1);
});

const formatMoney = (v) => {
  if (!v) return '0.00';
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getPlanWidth = (count) => {
  return `${(count / maxPlanCount.value) * 100}%`;
};

const fetchStats = async () => {
  loading.value = true;
  try {
    const res = await platformAdminAPI.getStats();
    stats.value = res.data;
  } catch (e) {
    console.error('Failed to load platform stats:', e);
  } finally {
    loading.value = false;
  }
};

const refresh = () => fetchStats();

onMounted(fetchStats);
</script>

<style scoped>
.pa-dashboard { padding: 24px; max-width: 1400px; margin: 0 auto; }
.pa-header { margin-bottom: 28px; }
.pa-header-content { display: flex; justify-content: space-between; align-items: center; }
.pa-title { font-family: 'Inter', sans-serif; font-size: 1.75rem; font-weight: 800; color: var(--color-text, #1e293b); margin: 0; }
.pa-subtitle { font-family: 'Inter', sans-serif; font-size: 0.9rem; color: #94a3b8; margin: 4px 0 0; }

/* KPI Grid */
.pa-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px; }
.pa-kpi-card { display: flex; align-items: center; gap: 16px; padding: 24px; border-radius: 16px; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border-left: 4px solid transparent; transition: transform 0.2s; }
.pa-kpi-card:hover { transform: translateY(-2px); }
.pa-kpi-primary { border-left-color: #3b82f6; }
.pa-kpi-success { border-left-color: #10b981; }
.pa-kpi-warning { border-left-color: #f59e0b; }
.pa-kpi-danger { border-left-color: #ef4444; }
.pa-kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pa-kpi-primary .pa-kpi-icon { background: #eff6ff; color: #3b82f6; }
.pa-kpi-success .pa-kpi-icon { background: #ecfdf5; color: #10b981; }
.pa-kpi-warning .pa-kpi-icon { background: #fffbeb; color: #f59e0b; }
.pa-kpi-danger .pa-kpi-icon { background: #fef2f2; color: #ef4444; }
.pa-kpi-icon svg { width: 24px; height: 24px; }
.pa-kpi-info { display: flex; flex-direction: column; }
.pa-kpi-value { font-family: 'Inter', sans-serif; font-size: 1.75rem; font-weight: 800; color: #1e293b; }
.pa-kpi-label { font-family: 'Inter', sans-serif; font-size: 0.8rem; color: #94a3b8; margin-top: 2px; }

/* Stats Grid */
.pa-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
@media (max-width: 768px) { .pa-stats-grid { grid-template-columns: 1fr; } }
.pa-stat-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.pa-card-title { font-family: 'Inter', sans-serif; font-size: 1rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; }
.pa-revenue-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.pa-revenue-item { display: flex; flex-direction: column; }
.pa-revenue-label { font-size: 0.78rem; color: #94a3b8; font-weight: 500; }
.pa-revenue-value { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-top: 2px; }
.pa-text-muted { color: #94a3b8 !important; }
.pa-text-warning { color: #f59e0b !important; }
.pa-text-success { color: #10b981 !important; }
.pa-text-primary { color: #3b82f6 !important; }

/* Plans Distribution */
.pa-plans-bars { display: flex; flex-direction: column; gap: 12px; }
.pa-plan-bar { display: flex; flex-direction: column; gap: 4px; }
.pa-plan-label { display: flex; justify-content: space-between; align-items: center; }
.pa-plan-name { font-weight: 600; font-size: 0.85rem; color: #475569; }
.pa-plan-count { font-weight: 700; font-size: 0.85rem; color: #1e293b; }
.pa-plan-track { height: 8px; border-radius: 4px; background: #f1f5f9; overflow: hidden; }
.pa-plan-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); transition: width 0.6s ease; }

/* Quick Actions */
.pa-quick-actions { margin-top: 24px; }
.pa-actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.pa-action-card { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 24px; border-radius: 16px; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.06); text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; }
.pa-action-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
.pa-action-icon { font-size: 2rem; }
.pa-action-text { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.9rem; color: #1e293b; }

/* Button */
.pa-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.pa-btn-outline { border-color: #d2c4b4; color: #624200; background: transparent; }
.pa-btn-outline:hover { border-color: #624200; background: rgba(98,66,0,0.02); }
.pa-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pa-icon-sm { width: 16px; height: 16px; }
</style>

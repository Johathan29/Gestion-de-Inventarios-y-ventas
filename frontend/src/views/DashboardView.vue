<template>
  <DashboardSkeleton v-if="loading" />

  <div v-else class="space-y-4 aurora-entrance">
    <!-- ====== VIEW HEADER ====== -->
    <!-- Executive Overview Header -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> dashboard </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Executive Overview"
            description="Welcome back! Here's what's happening with your business."
            tag="h1"
          />
        </div>
        <div class="header-actions"></div>
      </div>
    </div>

    <!-- ====== SECTION 1: KPI CARDS ====== -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
      <!-- Ventas Hoy -->
      <div class="aurora-stat-card" style="border-left: 4px solid var(--aurora-primary)">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="aurora-badge aurora-badge-primary mb-3">Ventas Hoy</p>
            <h3
              class="text-[32px] font-bold leading-none truncate text-on-surface"
              style="font-family: 'Inter', sans-serif; max-width: 170px"
            >
              {{ formatCurrencyShort(kpis.todaySales) }}
            </h3>
          </div>
          <div class="aurora-btn-icon">
            <span
              class="material-symbols-outlined"
              style="color: var(--aurora-primary); font-variation-settings: 'FILL' 1"
              >today</span
            >
          </div>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span
            v-if="kpis.todayTrend != null"
            class="flex items-center font-semibold text-xs px-1.5 py-0.5 rounded-md"
            :style="{
              background:
                kpis.todayTrend >= 0 ? 'rgba(22,163,74,0.08)' : 'var(--aurora-error-container)',
              color: kpis.todayTrend >= 0 ? '#16a34a' : 'var(--aurora-on-error-container)'
            }"
          >
            <span class="material-symbols-outlined text-[16px] mr-0.5">{{
              kpis.todayTrend >= 0 ? 'arrow_upward' : 'arrow_downward'
            }}</span>
            {{ kpis.todayTrend >= 0 ? '+' : '' }}{{ kpis.todayTrend }}%
          </span>
          <span class="text-xs font-medium text-on-surface-variant">vs ayer</span>
        </div>
      </div>
      <!-- Ventas del Mes -->
      <div class="aurora-stat-card" style="border-left: 4px solid #16a34a">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="aurora-badge" style="background: #d4edda; color: #155724">Ventas del Mes</p>
            <h3
              class="text-[32px] font-bold leading-none truncate text-on-surface"
              style="font-family: 'Inter', sans-serif; max-width: 170px"
            >
              {{ formatCurrencyShort(kpis.monthSales) }}
            </h3>
          </div>
          <div class="aurora-btn-icon">
            <span
              class="material-symbols-outlined"
              style="color: #16a34a; font-variation-settings: 'FILL' 1"
              >calendar_month</span
            >
          </div>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span
            v-if="kpis.monthTrend != null"
            class="flex items-center font-semibold text-xs px-1.5 py-0.5 rounded-md"
            :style="{
              background:
                kpis.monthTrend >= 0 ? 'rgba(22,163,74,0.08)' : 'var(--aurora-error-container)',
              color: kpis.monthTrend >= 0 ? '#16a34a' : 'var(--aurora-on-error-container)'
            }"
          >
            <span class="material-symbols-outlined text-[16px] mr-0.5">{{
              kpis.monthTrend >= 0 ? 'arrow_upward' : 'arrow_downward'
            }}</span>
            {{ kpis.monthTrend >= 0 ? '+' : '' }}{{ kpis.monthTrend }}%
          </span>
          <span class="text-xs font-medium text-on-surface-variant">vs mes anterior</span>
        </div>
      </div>
      <!-- Productos Bajos -->
      <div class="aurora-stat-card" style="border-left: 4px solid var(--aurora-error)">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="aurora-badge aurora-badge-danger">Productos Bajos</p>
            <h3
              class="text-[32px] font-bold leading-none truncate text-on-surface"
              style="font-family: 'Inter', sans-serif; max-width: 170px"
            >
              {{ kpis.lowStock }}
            </h3>
          </div>
          <div class="aurora-btn-icon danger">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1"
              >inventory_2</span
            >
          </div>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-xs font-medium text-on-surface-variant">Stock ≤ 5 unidades</span>
        </div>
      </div>
      <!-- Total Productos -->
      <div class="aurora-stat-card" style="border-left: 4px solid #d97706">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="aurora-badge aurora-badge-warning">Total Productos</p>
            <h3
              class="text-[32px] font-bold leading-none truncate text-on-surface"
              style="font-family: 'Inter', sans-serif; max-width: 170px"
            >
              {{ kpis.totalProducts }}
            </h3>
          </div>
          <div class="aurora-btn-icon">
            <span
              class="material-symbols-outlined"
              style="color: #d97706; font-variation-settings: 'FILL' 1"
              >category</span
            >
          </div>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-xs font-medium text-on-surface-variant">En catálogo activo</span>
        </div>
      </div>
    </div>

    <!-- ====== SECTION 2: MAIN CHARTS ROW ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 aurora-raised-card">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3 class="font-bold text-lg text-on-surface">Ventas del Mes</h3>
            <p class="text-sm font-medium mt-0.5 text-on-surface-variant">
              Evolución diaria de {{ currentMonthName }}
            </p>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
            <span>Este Mes</span>
            <span class="material-symbols-outlined text-[18px]">expand_more</span>
          </div>
        </div>
        <div class="w-full" style="height: 300px">
          <canvas ref="monthDailyChartRef"></canvas>
        </div>
      </div>
      <div class="aurora-raised-card">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3 class="font-bold text-lg text-on-surface">Productos x Categoría</h3>
            <p class="text-sm font-medium mt-0.5 text-on-surface-variant">
              Distribución del catálogo
            </p>
          </div>
        </div>
        <div class="w-full" style="height: 300px">
          <canvas ref="categoryChartRef"></canvas>
        </div>
      </div>
    </div>

    <!-- ====== SECTION 3: CHARTS ROW 2 ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="aurora-raised-card">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3 class="font-bold text-lg text-on-surface">Ventas Hoy (Por Hora)</h3>
            <p class="text-sm font-medium mt-0.5 text-on-surface-variant">
              Distribución del día actual
            </p>
          </div>
          <div class="aurora-btn-icon">
            <span class="material-symbols-outlined" style="color: var(--aurora-primary)"
              >query_stats</span
            >
          </div>
        </div>
        <div class="w-full" style="height: 260px">
          <canvas ref="todayHourlyChartRef"></canvas>
        </div>
      </div>
      <div class="aurora-raised-card">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3 class="font-bold text-lg text-on-surface">Tendencia (7 Días)</h3>
            <p class="text-sm font-medium mt-0.5 text-on-surface-variant">Comparativa semanal</p>
          </div>
          <div class="aurora-btn-icon">
            <span class="material-symbols-outlined" style="color: var(--aurora-primary)"
              >trending_up</span
            >
          </div>
        </div>
        <div class="w-full" style="height: 260px">
          <canvas ref="sevenDayChartRef"></canvas>
        </div>
      </div>
    </div>

    <!-- ====== SECTION 4: RECENT ORDERS TABLE + ACTIVITY ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 aurora-raised-card flex flex-col">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3 class="font-bold text-lg text-on-surface">Ventas Recientes</h3>
            <p class="text-sm font-medium mt-0.5 text-on-surface-variant">
              Últimas transacciones registradas
            </p>
          </div>
          <router-link
            to="/app/sales"
            class="text-sm font-semibold flex items-center gap-1"
            style="color: var(--aurora-primary); text-decoration: none"
          >
            Ver Todas <span class="material-symbols-outlined text-[16px]">chevron_right</span>
          </router-link>
        </div>
        <div class="overflow-x-auto flex-1">
          <table class="aurora-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody class="text-sm">
              <tr
                v-for="sale in recentSales"
                :key="sale.id"
                class="transition-colors cursor-pointer hover:bg-surface-container-high"
              >
                <td class="font-semibold" style="color: var(--aurora-primary)">
                  #{{ sale.sale_number || sale.invoice_number || sale.id?.slice(0, 8) }}
                </td>
                <td>
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      :style="{
                        background: getClientColor(sale.clients?.name || sale.client_name || 'CG')
                          .bg,
                        color: getClientColor(sale.clients?.name || sale.client_name || 'CG').text
                      }"
                    >
                      {{ getInitials(sale.clients?.name || sale.client_name || 'CG') }}
                    </div>
                    <span class="text-on-surface-variant">{{
                      sale.clients?.name || sale.client_name || 'Cliente General'
                    }}</span>
                  </div>
                </td>
                <td class="font-semibold text-on-surface">{{ formatTable(sale.total) }}</td>
                <td>
                  <span
                    class="aurora-badge"
                    :style="{
                      background: getSaleStatus(sale).bg,
                      color: getSaleStatus(sale).text
                    }"
                  >
                    {{ getSaleStatus(sale).label }}
                  </span>
                </td>
              </tr>
              <tr v-if="recentSales.length === 0">
                <td colspan="4" class="py-12 text-center text-on-surface-variant">
                  Sin ventas recientes
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="aurora-raised-card flex-1">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="font-bold text-lg text-on-surface">Actividad</h3>
              <p class="text-sm font-medium mt-0.5 text-on-surface-variant">
                Movimientos recientes
              </p>
            </div>
            <router-link
              to="/app/admin"
              class="text-sm font-semibold flex items-center gap-1"
              style="color: var(--aurora-primary); text-decoration: none"
            >
              Ver Todo <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </router-link>
          </div>
          <div class="space-y-4">
            <div v-for="act in recentActivities.slice(0, 3)" :key="act.id" class="flex gap-4">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                :style="{ background: getActivityIcon(act.action).bg }"
              >
                <span
                  class="material-symbols-outlined text-[20px]"
                  :style="{ color: getActivityIcon(act.action).color }"
                  >{{ getActivityIcon(act.action).icon || 'circle' }}</span
                >
              </div>
              <div>
                <p class="text-sm font-semibold mb-0.5 text-on-surface">
                  {{ act.action }}
                  <span v-if="act.entity" class="text-on-surface-variant" style="font-weight: 400"
                    >— {{ act.entity }}</span
                  >
                </p>
                <p class="text-xs text-on-surface-variant">
                  {{ act.users?.name || act.users?.email || 'Sistema' }} ·
                  {{ formatRelativeTime(act.created_at) }}
                </p>
              </div>
            </div>
            <div
              v-if="recentActivities.length === 0"
              class="text-center py-6 text-on-surface-variant"
            >
              Sin actividad reciente
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== SECTION 5: TOP PRODUCTS + STOCK ALERTS ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 aurora-raised-card">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3 class="font-bold text-lg text-on-surface">Top Productos Más Vendidos</h3>
            <p class="text-sm font-medium mt-0.5 text-on-surface-variant">
              Ranking de productos con mayores ventas
            </p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="aurora-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Vendidos</th>
                <th>Ingresos</th>
              </tr>
            </thead>
            <tbody class="text-sm">
              <tr
                v-for="(product, idx) in topProducts"
                :key="idx"
                class="transition-colors hover:bg-surface-container-high"
              >
                <td>
                  <div
                    class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    :class="TOP_RANK_COLORS[idx] || 'bg-gray-100 text-gray-600'"
                  >
                    {{ idx + 1 }}
                  </div>
                </td>
                <td class="font-semibold text-on-surface-variant">{{ product.name }}</td>
                <td class="text-on-surface-variant">
                  {{ product.totalQuantity || product.quantity || 0 }}
                </td>
                <td class="font-semibold" style="color: var(--aurora-primary)">
                  {{ formatTable(product.totalRevenue || product.total || 0) }}
                </td>
              </tr>
              <tr v-if="topProducts.length === 0">
                <td colspan="4" class="py-12 text-center text-on-surface-variant">
                  Sin datos disponibles
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="aurora-raised-card">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3 class="font-bold text-lg text-on-surface">Alertas Stock</h3>
            <p class="text-sm font-medium mt-0.5 text-on-surface-variant">
              Productos con stock crítico
            </p>
          </div>
          <router-link
            to="/app/inventory"
            class="text-sm font-semibold flex items-center gap-1"
            style="color: var(--aurora-primary); text-decoration: none"
          >
            Ver Todo <span class="material-symbols-outlined text-[16px]">chevron_right</span>
          </router-link>
        </div>
        <div class="space-y-3">
          <div
            v-for="alert in stockAlerts.slice(0, 4)"
            :key="alert.id"
            class="flex items-center gap-4 p-4 rounded-2xl aurora-pressed"
            :style="{
              borderLeft: alert.stock <= 0 ? '4px solid var(--aurora-error)' : '4px solid #f59e0b'
            }"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate text-on-surface">{{ alert.name }}</p>
              <p class="text-xs mt-0.5 text-on-surface-variant">
                SKU: {{ alert.sku || 'N/A' }} · Stock: {{ alert.stock }}
              </p>
            </div>
            <span
              class="aurora-badge"
              :style="
                alert.stock <= 0
                  ? {
                      background: 'var(--aurora-error-container)',
                      color: 'var(--aurora-on-error-container)'
                    }
                  : { background: '#fffbeb', color: '#d97706' }
              "
            >
              {{ alert.stock <= 0 ? 'Sin stock' : 'Bajo' }}
            </span>
          </div>
          <div v-if="stockAlerts.length === 0" class="text-center py-6 text-on-surface-variant">
            No hay alertas
          </div>
        </div>
      </div>
    </div>

    <!-- ====== SECTION 6: ACTIVE OFFERS ====== -->
    <div v-if="activeOffers.length > 0" class="aurora-raised-card">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="font-bold text-lg text-on-surface">Ofertas Activas</h3>
          <p class="text-sm font-medium mt-0.5 text-on-surface-variant">
            Promociones y descuentos vigentes
          </p>
        </div>
        <router-link
          to="/app/products/offers"
          class="text-sm font-semibold flex items-center gap-1"
          style="color: var(--aurora-primary); text-decoration: none"
        >
          Ver Todo <span class="material-symbols-outlined text-[16px]">chevron_right</span>
        </router-link>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="offer in activeOffers"
          :key="offer.id"
          class="aurora-pressed p-4 rounded-2xl hover:-translate-y-1 transition-all cursor-pointer"
          @click="$router.push(`/app/products/offers?id=${offer.id}`)"
        >
          <div class="flex justify-between items-start mb-2">
            <p class="text-sm font-semibold truncate text-on-surface">
              {{ offer.name || offer.title || 'Oferta' }}
            </p>
            <span class="aurora-badge aurora-badge-warning text-[10px] px-1.5 py-0.5">
              -{{ offer.discount_percent || offer.discount }}%
            </span>
          </div>
          <p class="text-xs mb-2 text-on-surface-variant">{{ offer.description || '' }}</p>
          <div class="flex items-center justify-between text-xs text-on-surface-variant">
            <span v-if="offer.start_date && offer.end_date" class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">schedule</span>
              {{ formatDate(offer.start_date) }} - {{ formatDate(offer.end_date) }}
            </span>
            <span v-else class="flex items-center gap-1" style="color: #16a34a">
              <span class="material-symbols-outlined text-[14px]">check_circle</span> Activa
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== FOOTER ====== -->
    <footer
      class="pt-6 pb-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-medium text-on-surface-variant"
    >
      <p>© 2024 Aurora ERP. All rights reserved.</p>
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" style="background: #22c55e"></span>
        <span>System Status: All Systems Operational</span>
      </div>
    </footer>
  </div>
</template>
<script setup>
  import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
  import { Chart, registerables } from 'chart.js';
  import {
    reportsAPI,
    salesAPI,
    inventoryAPI,
    productsAPI,
    categoriesAPI,
    auditAPI,
    promotionsAPI
  } from '../api';
  import StatCard from '../components/shared/StatCard.vue';
  import PageHeader from '../components/shared/PageHeader.vue';
  import { useCurrency } from '../composables/useCurrency';
  import DashboardSkeleton from '../components/skeletons/DashboardSkeleton.vue';
  import { formatRelativeTime, formatDate } from '../utils';

  const { formatTable } = useCurrency();
  import { useLandingAnimations } from '../composables/useGsapAnimations';
  import {
    useStaggerEntrance,
    useIconPulse,
    useAnimeCounter
  } from '../composables/useAnimeEffects';

  Chart.register(...registerables);

  // ============================
  // STATE
  // ============================
  const kpis = ref({
    todaySales: 0,
    monthSales: 0,
    lowStock: 0,
    totalProducts: 0,
    totalClients: 0,
    totalUsers: 0,
    adminUsers: 0,
    cashierUsers: 0,
    todayTrend: null,
    monthTrend: null
  });

  // Time period selector (Stitch style)
  const selectedPeriod = ref('7d');

  const timePeriods = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: 'YTD', value: 'ytd' }
  ];
  const dateRangeLabel = computed(() => {
    const end = new Date();
    const start = new Date();
    if (selectedPeriod.value === '7d') start.setDate(start.getDate() - 7);
    else if (selectedPeriod.value === '30d') start.setMonth(start.getMonth() - 1);
    else start.setFullYear(start.getFullYear(), 0, 1);
    const fmt = (d) =>
      d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(start)} - ${fmt(end)}`;
  });
  const topProducts = ref([]);
  const recentSales = ref([]);
  const stockAlerts = ref([]);
  const recentActivities = ref([]);
  const activeOffers = ref([]);

  // Chart refs
  const todayHourlyChartRef = ref(null);
  const monthDailyChartRef = ref(null);
  const sevenDayChartRef = ref(null);
  const categoryChartRef = ref(null);

  // Chart instances
  let todayHourlyChart = null;
  let monthDailyChart = null;
  let sevenDayChart = null;
  let categoryChart = null;

  // ============================
  // CONSTANTS – Nexus Violet palette
  // ============================
  const HOURLY_GRADIENT = ['rgba(124,58,237,0.85)', 'rgba(124,58,237,0.1)'];
  const MONTH_GRADIENT = ['rgba(99,102,241,0.85)', 'rgba(99,102,241,0.1)'];
  const SEVEN_GRADIENT = ['rgba(139,92,246,0.75)', 'rgba(139,92,246,0.05)'];

  const CATEGORY_COLORS = [
    '#ef4444',
    '#3b82f6',
    '#22c55e',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#06b6d4',
    '#84cc16'
  ];

  const TOP_RANK_COLORS = [
    'bg-[#ef4444] text-white',
    'bg-[#3b82f6] text-white',
    'bg-[#22c55e] text-white',
    'bg-[#f59e0b] text-white',
    'bg-[#8b5cf6] text-white'
  ];

  // ============================
  // COMPUTED
  // ============================
  const currentMonthName = computed(() => {
    const m = new Date().toLocaleString('es-ES', { month: 'long' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  });

  // ============================
  // ACTIVITY ICON HELPERS
  // ============================
  const getActivityIcon = (action) => {
    const a = (action || '').toLowerCase();
    if (a.includes('venta') || a.includes('sale') || a.includes('create_venta'))
      return { icon: 'point_of_sale', bg: '#f0fdf4', color: '#059669', border: '#bbf7d0' };
    if (a.includes('producto') || a.includes('product') || a.includes('create_producto'))
      return { icon: 'inventory_2', bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
    if (a.includes('usuario') || a.includes('user') || a.includes('login'))
      return { icon: 'person', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    if (a.includes('compra') || a.includes('purchase'))
      return { icon: 'shopping_cart', bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
    if (a.includes('categoria') || a.includes('category'))
      return { icon: 'category', bg: '#fce7f3', color: '#db2777', border: '#fbcfe8' };
    if (a.includes('delete') || a.includes('eliminar') || a.includes('anular'))
      return { icon: 'delete', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    if (a.includes('update') || a.includes('actualizar') || a.includes('edit'))
      return { icon: 'edit', bg: '#cffafe', color: '#0891b2', border: '#a5f3fc' };
    return { icon: 'circle', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
  };

  // ============================
  // TABLE HELPERS — Stitch style
  // ============================
  const formatCurrencyShort = (num) => {
    const n = Number(num);
    if (isNaN(n)) return '$0';
    if (Math.abs(n) >= 1000000)
      return (
        '$' +
        (n / 1000000).toLocaleString('es-MX', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }) +
        ' M'
      );
    if (Math.abs(n) >= 1000)
      return (
        '$' +
        (n / 1000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) +
        'k'
      );
    return '$' + n.toLocaleString('es-MX');
  };

  const getInitials = (name) => {
    if (!name || name === 'CG') return 'CG';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getClientColor = (name) => {
    const colors = [
      { bg: '#f5f3ff', text: '#7c3aed' },
      { bg: '#f0fdf4', text: '#16a34a' },
      { bg: '#eff6ff', text: '#2563eb' },
      { bg: '#fef3c7', text: '#d97706' },
      { bg: '#fce7f3', text: '#db2777' },
      { bg: '#cffafe', text: '#0891b2' }
    ];
    let hash = 0;
    const str = name || 'CG';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getSaleStatus = (sale) => {
    const status = sale.status?.toLowerCase() || 'completada';
    if (status.includes('cancel') || status.includes('anul'))
      return { label: 'Cancelled', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    if (status.includes('pend') || status.includes('proces'))
      return { label: 'Processing', bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    if (status.includes('env') || status.includes('ship'))
      return { label: 'Shipped', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
    return { label: 'Completed', bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
  };

  // ============================
  // DATA FETCHING
  // ============================
  const loading = ref(true);
  const fetchDashboard = async () => {
    try {
      loading.value = true;
      const [kpiRes, topRes, salesRes, alertsRes, catRes, prodRes, chartRes, auditRes, offersRes] =
        await Promise.all([
          reportsAPI.dashboard().catch(() => ({ data: {} })),
          reportsAPI.topProducts({ limit: 5 }).catch(() => ({ data: [] })),
          salesAPI.getAll({ limit: 5 }).catch(() => ({ data: [] })),
          inventoryAPI.getAlerts().catch(() => ({ data: [] })),
          categoriesAPI.getAll({ limit: 999 }).catch(() => ({ data: [] })),
          productsAPI.getAll({ limit: 99999 }).catch(() => ({ data: [] })),
          reportsAPI.salesChart().catch(() => ({ data: { todayHourly: [], monthDaily: [] } })),
          auditAPI.getRecent().catch(() => ({ data: [] })),
          promotionsAPI.getActive().catch(() => ({ data: [] }))
        ]);

      // KPIs
      kpis.value = {
        todaySales: 0,
        monthSales: 0,
        lowStock: 0,
        totalProducts: 0,
        totalClients: 0,
        totalUsers: 0,
        adminUsers: 0,
        cashierUsers: 0,
        ...(kpiRes.data || kpiRes)
      };
      topProducts.value = topRes.data || [];
      recentSales.value = salesRes.data || [];
      stockAlerts.value = alertsRes.data || [];
      categories.value = catRes.data || [];
      allProducts.value = prodRes.data || [];
      recentActivities.value = auditRes.data || [];
      activeOffers.value = offersRes.data || [];

      // Build charts with fetched data
      const chartData = chartRes.data || { todayHourly: [], monthDaily: [] };
      nextTick(() => {
        buildTodayHourlyChart(chartData.todayHourly);
        buildMonthDailyChart(chartData.monthDaily);
        buildCategoryChart();
      });

      // Also build 7-day chart (need separate call to sales report)
      fetchSevenDaySales();

      // Animate dashboard cards after data loads
      animateDashboardCards();
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      loading.value = false;
    }
  };
  const fetchSevenDaySales = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const params = {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        group_by: 'day'
      };
      const res = await reportsAPI.sales(params).catch(() => ({ data: { byPeriod: [] } }));
      const byPeriod = res.data?.byPeriod || [];
      nextTick(() => buildSevenDayChart(byPeriod));
    } catch (e) {
      /* silent */
    }
  };

  // ============================
  // CHART BUILDERS
  // ============================

  /** Gradient helper */
  const createGradient = (ctx, colorStops) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    colorStops.forEach(([pos, color]) => gradient.addColorStop(pos, color));
    return gradient;
  };

  /** 1) Today hourly bar chart */
  const buildTodayHourlyChart = (hourlyData) => {
    if (!todayHourlyChartRef.value) return;
    if (todayHourlyChart) todayHourlyChart.destroy();

    const labels = hourlyData.map((d) => d.hour);
    const values = hourlyData.map((d) => d.total);

    const ctx = todayHourlyChartRef.value.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, '#7c3aed');
    gradient.addColorStop(0.6, '#a78bfa');
    gradient.addColorStop(1, '#e0e7ff');

    todayHourlyChart = new Chart(todayHourlyChartRef.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ventas ($)',
            data: values,
            backgroundColor: gradient,
            borderColor: '#6d28d9',
            borderWidth: 1,
            borderRadius: 4,
            hoverBackgroundColor: '#6d28d9'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#475569',
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 12
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => '$' + v.toLocaleString(), color: '#94a3b8' },
            grid: { color: 'rgba(124,58,237,0.06)' }
          },
          x: { ticks: { color: '#94a3b8', maxRotation: 45 }, grid: { display: false } }
        }
      }
    });
  };

  /** 2) Month daily line / area chart */
  const buildMonthDailyChart = (dailyData) => {
    if (!monthDailyChartRef.value) return;
    if (monthDailyChart) monthDailyChart.destroy();

    const labels = dailyData.map((d) => {
      const parts = d.date.split('-');
      return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
    });
    const values = dailyData.map((d) => d.total);

    const ctx = monthDailyChartRef.value.getContext('2d');
    const gradient = createGradient(ctx, [
      [0, 'rgba(99,102,241,0.7)'],
      [0.7, 'rgba(99,102,241,0.05)']
    ]);

    monthDailyChart = new Chart(monthDailyChartRef.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ventas ($)',
            data: values,
            borderColor: '#6366f1',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#475569', usePointStyle: true, padding: 12 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => '$' + v.toLocaleString(), color: '#94a3b8' },
            grid: { color: 'rgba(99,102,241,0.06)' }
          },
          x: { ticks: { color: '#94a3b8', maxTicksLimit: 15 }, grid: { display: false } }
        }
      }
    });
  };
  /** 3) Seven-day trend chart */
  const buildSevenDayChart = (byPeriod) => {
    if (!sevenDayChartRef.value) return;
    if (sevenDayChart) sevenDayChart.destroy();

    const labels = byPeriod.map((d) => d.period?.slice(5) || '');
    const values = byPeriod.map((d) => d.total || 0);
    const ctx = sevenDayChartRef.value.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(0.5, '#a78bfa');
    gradient.addColorStop(1, 'rgba(167,139,250,0.05)');

    sevenDayChart = new Chart(sevenDayChartRef.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ventas ($)',
            data: values,
            borderColor: '#8b5cf6',
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#8b5cf6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#475569', usePointStyle: true, padding: 12 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => '$' + v.toLocaleString(), color: '#94a3b8' },
            grid: { color: 'rgba(139,92,246,0.06)' }
          },
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        }
      }
    });
  };

  /** 4) Category distribution doughnut */
  const categories = ref([]);
  const allProducts = ref([]);

  const getProductCountByCategory = (catId) => {
    const catIdNum = Number(catId);
    return allProducts.value.filter((p) => {
      const pid = p.category_id ?? p.categories?.id;
      return Number(pid) === catIdNum;
    }).length;
  };

  const getCategoryColor = (catId) => {
    const idx = categories.value.findIndex((c) => c.id === catId);
    return CATEGORY_COLORS[Math.max(0, idx) % CATEGORY_COLORS.length];
  };

  const buildCategoryChart = () => {
    if (!categoryChartRef.value) return;
    if (categoryChart) categoryChart.destroy();

    const dist = categories.value
      .map((cat) => ({
        label: cat.name,
        value: getProductCountByCategory(cat.id),
        color: getCategoryColor(cat.id)
      }))
      .filter((d) => d.value > 0);

    if (dist.length === 0) return;

    categoryChart = new Chart(categoryChartRef.value, {
      type: 'doughnut',
      data: {
        labels: dist.map((d) => d.label),
        datasets: [
          {
            data: dist.map((d) => d.value),
            backgroundColor: dist.map((d) => d.color),
            borderColor: '#f8fafc',
            borderWidth: 2,
            hoverOffset: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#475569',
              padding: 12,
              font: { size: 11 },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          }
        },
        cutout: '62%'
      }
    });
  };
  // ============================
  // LIFECYCLE
  // ============================
  onMounted(() => {
    fetchDashboard();
  });

  async function animateDashboardCards() {
    await nextTick();

    // GSAP stagger for StatCard grid
    const { useStaggerReveal } = await import('../composables/useGsapAnimations');
    const grid = document.querySelector('[data-gsap="stagger"]');
    if (grid) {
      useStaggerReveal(grid, '[data-gsap="item"]', {
        start: 'top 85%',
        stagger: 0.12,
        from: { opacity: 0, y: 40, scale: 0.95 },
        duration: 0.7,
        ease: 'back.out(1.4)'
      });
    }

    // anime.js: pulse each StatCard icon
    await nextTick();
    document.querySelectorAll('.nexus-card .material-icons-outlined').forEach((icon, i) => {
      setTimeout(
        () => {
          useIconPulse(icon, { scale: 1.2, duration: 600, loop: false });
        },
        300 + i * 100
      );
    });
  }
  onUnmounted(() => {
    [todayHourlyChart, monthDailyChart, sevenDayChart, categoryChart].forEach((c) => c?.destroy());
  });
</script>

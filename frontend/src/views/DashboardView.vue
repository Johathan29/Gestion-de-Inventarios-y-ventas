<template>
  <div class="space-y-6">
    <!-- ====== SECTION 1: KPI CARDS ====== -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard label="Ventas Hoy" :value="kpis.todaySales" type="currency"
        icon="today" iconBg="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30"
        iconColor="text-emerald-600 dark:text-emerald-400" />
      <StatCard label="Ventas del Mes" :value="kpis.monthSales" type="currency"
        icon="calendar_month" iconBg="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
        iconColor="text-blue-600 dark:text-blue-400" />
      <StatCard label="Productos Bajos" :value="kpis.lowStock"
        icon="inventory_2" iconBg="bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30"
        iconColor="text-red-600 dark:text-red-400" subtext="Stock &le; 5" />
      <StatCard label="Total Productos" :value="kpis.totalProducts"
        icon="category" iconBg="bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30"
        iconColor="text-purple-600 dark:text-purple-400" />
      <StatCard label="Clientes" :value="kpis.totalClients"
        icon="people" iconBg="bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30"
        iconColor="text-pink-600 dark:text-pink-400" subtext="Registrados" />
      <StatCard label="Usuarios" :value="kpis.totalUsers"
        icon="badge" iconBg="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30"
        iconColor="text-amber-600 dark:text-amber-400" :subtext="`${kpis.adminUsers} Admin · ${kpis.cashierUsers} Cajeros`" />
    </div>

    <!-- ====== SECTION 2: CHARTS ROW (TODAY HOURLY + MONTH DAILY) ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Today Hourly Sales -->
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Ventas Hoy (Por Hora)</h3>
        <p class="text-xs text-gray-500 mb-4">Distribución de ventas del d&iacute;a actual</p>
        <div class="chart-container" style="height: 260px;">
          <canvas ref="todayHourlyChartRef"></canvas>
        </div>
      </div>
      <!-- Month Daily Sales -->
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Ventas del Mes (Por D&iacute;a)</h3>
        <p class="text-xs text-gray-500 mb-4">Evoluci&oacute;n diaria de {{ currentMonthName }}</p>
        <div class="chart-container" style="height: 260px;">
          <canvas ref="monthDailyChartRef"></canvas>
        </div>
      </div>
    </div>

    <!-- ====== SECTION 3: MIDDLE ROW (7-DAY TREND + CATEGORY DOUGHNUT) ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 7-Day Sales Trend -->
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Tendencia de Ventas (7 D&iacute;as)</h3>
        <p class="text-xs text-gray-500 mb-4">Comparativa de los &uacute;ltimos 7 d&iacute;as</p>
        <div class="chart-container" style="height: 260px;">
          <canvas ref="sevenDayChartRef"></canvas>
        </div>
      </div>
      <!-- Category Doughnut -->
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Productos por Categor&iacute;a</h3>
        <p class="text-xs text-gray-500 mb-4">Distribuci&oacute;n del cat&aacute;logo</p>
        <div class="chart-container" style="height: 260px;">
          <canvas ref="categoryChartRef"></canvas>
        </div>
      </div>
    </div>

    <!-- ====== SECTION 4: ACTIVITY LOG + TOP PRODUCTS ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Activity Log -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Actividades Recientes</h3>
            <p class="text-xs text-gray-500">&Uacute;ltimos movimientos en el sistema</p>
          </div>
          <span class="material-icons-outlined text-gray-400">history</span>
        </div>
        <div class="space-y-1 max-h-[360px] overflow-y-auto pr-1">
          <div v-for="act in recentActivities" :key="act.id"
            class="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
              :class="getActivityIcon(act.action).bg">
              <span class="material-icons-outlined text-sm" :class="getActivityIcon(act.action).color">{{ getActivityIcon(act.action).icon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {{ act.action }}
                <span v-if="act.entity" class="text-gray-500 font-normal"> — {{ act.entity }}</span>
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ act.users?.name || act.users?.email || 'Sistema' }}
                <span class="mx-1">&middot;</span>
                {{ formatRelativeTime(act.created_at) }}
              </p>
            </div>
          </div>
          <div v-if="recentActivities.length === 0" class="text-center py-8 text-gray-500">
            <span class="material-icons-outlined text-3xl mb-2 block text-gray-300">history</span>
            No hay actividades recientes
          </div>
        </div>
      </div>
      <!-- Top Products -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Top Productos M&aacute;s Vendidos</h3>
            <p class="text-xs text-gray-500">Ranking de productos con mayores ventas</p>
          </div>
          <span class="material-icons-outlined text-gray-400">trending_up</span>
        </div>
        <div class="space-y-3">
          <div v-for="(product, idx) in topProducts" :key="idx"
            class="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              :class="TOP_RANK_COLORS[idx] || 'bg-gray-100 text-gray-600'">
              {{ idx + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ product.name }}</p>
              <p class="text-xs text-gray-500">{{ product.totalQuantity || product.quantity || 0 }} vendidos</p>
            </div>
            <span class="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">{{ formatCurrency(product.totalRevenue || product.total || 0) }}</span>
          </div>
          <div v-if="topProducts.length === 0" class="text-center py-8 text-gray-500">
            <span class="material-icons-outlined text-3xl mb-2 block text-gray-300">inventory_2</span>
            No hay datos disponibles
          </div>
        </div>
      </div>
    </div>

    <!-- ====== SECTION 5: RECENT SALES + STOCK ALERTS ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Ventas Recientes</h3>
          <router-link to="/app/sales" class="text-xs text-primary-600 hover:underline font-medium">Ver todas</router-link>
        </div>
        <div class="space-y-2">
          <div v-for="sale in recentSales" :key="sale.id"
            class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">#{{ sale.sale_number || sale.invoice_number || sale.id?.slice(0,8) }}</p>
              <p class="text-xs text-gray-500">{{ sale.clients?.name || sale.client_name || 'Cliente General' }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatCurrency(sale.total) }}</p>
              <p class="text-xs text-gray-500">{{ formatRelativeTime(sale.created_at) }}</p>
            </div>
          </div>
          <div v-if="recentSales.length === 0" class="text-center py-6 text-gray-500">Sin ventas recientes</div>
        </div>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Alertas de Inventario</h3>
          <router-link to="/app/inventory" class="text-xs text-primary-600 hover:underline font-medium">Ver inventario</router-link>
        </div>
        <div class="space-y-2">
          <div v-for="alert in stockAlerts" :key="alert.id"
            class="flex items-center gap-3 p-3 rounded-lg transition-colors"
            :class="alert.stock <= 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'">
            <span class="material-icons-outlined text-lg flex-shrink-0" :class="alert.stock <= 0 ? 'text-red-500' : 'text-amber-500'">
              {{ alert.stock <= 0 ? 'block' : 'warning' }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ alert.name }}</p>
              <p class="text-xs text-gray-500">SKU: {{ alert.sku || 'N/A' }} · Stock: {{ alert.stock }}</p>
            </div>
            <span class="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
              :class="alert.stock <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'">
              {{ alert.stock <= 0 ? 'Sin stock' : 'Bajo' }}
            </span>
          </div>
          <div v-if="stockAlerts.length === 0" class="text-center py-6 text-gray-500">No hay alertas de inventario</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import { reportsAPI, salesAPI, inventoryAPI, productsAPI, categoriesAPI, auditAPI } from '../api';
import StatCard from '../components/shared/StatCard.vue';
import { formatCurrency, formatRelativeTime } from '../utils';

Chart.register(...registerables);

// ============================
// STATE
// ============================
const kpis = ref({
  todaySales: 0, monthSales: 0, lowStock: 0,
  totalProducts: 0, totalClients: 0,
  totalUsers: 0, adminUsers: 0, cashierUsers: 0
});
const topProducts = ref([]);
const recentSales = ref([]);
const stockAlerts = ref([]);
const recentActivities = ref([]);

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
// CONSTANTS – vibrant palette
// ============================
const HOURLY_GRADIENT = ['rgba(16,185,129,0.85)', 'rgba(16,185,129,0.1)'];
const MONTH_GRADIENT = ['rgba(99,102,241,0.85)', 'rgba(99,102,241,0.1)'];
const SEVEN_GRADIENT = ['rgba(168,85,247,0.85)', 'rgba(168,85,247,0.05)'];

const CATEGORY_COLORS = [
  '#6d28d9', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#db2777', '#4f46e5', '#ea580c',
  '#0d9488', '#7c3aed'
];

const TOP_RANK_COLORS = [
  'bg-yellow-400 text-yellow-900',
  'bg-gray-300 text-gray-700',
  'bg-amber-600 text-white',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700'
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
  if (a.includes('venta') || a.includes('sale') || a.includes('create_venta')) return { icon: 'point_of_sale', bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' };
  if (a.includes('producto') || a.includes('product') || a.includes('create_producto')) return { icon: 'inventory_2', bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400' };
  if (a.includes('usuario') || a.includes('user') || a.includes('login')) return { icon: 'person', bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' };
  if (a.includes('compra') || a.includes('purchase')) return { icon: 'shopping_cart', bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' };
  if (a.includes('categoria') || a.includes('category')) return { icon: 'category', bg: 'bg-pink-100 dark:bg-pink-900/30', color: 'text-pink-600 dark:text-pink-400' };
  if (a.includes('delete') || a.includes('eliminar') || a.includes('anular')) return { icon: 'delete', bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' };
  if (a.includes('update') || a.includes('actualizar') || a.includes('edit')) return { icon: 'edit', bg: 'bg-cyan-100 dark:bg-cyan-900/30', color: 'text-cyan-600 dark:text-cyan-400' };
  return { icon: 'circle', bg: 'bg-gray-100 dark:bg-gray-700', color: 'text-gray-500 dark:text-gray-400' };
};

// ============================
// DATA FETCHING
// ============================
const fetchDashboard = async () => {
  try {

    const [
      kpiRes, topRes, salesRes, alertsRes,
      catRes, prodRes, chartRes, auditRes
    ] = await Promise.all([
      reportsAPI.dashboard().catch(() => ({ data: {} })),
      reportsAPI.topProducts({ limit: 5 }).catch(() => ({ data: [] })),
      salesAPI.getAll({ limit: 5 }).catch(() => ({ data: [] })),
      inventoryAPI.getAlerts().catch(() => ({ data: [] })),
      categoriesAPI.getAll({}).catch(() => ({ data: [] })),
      productsAPI.getAll({}).catch(() => ({ data: [] })),
      reportsAPI.salesChart().catch(() => ({ data: { todayHourly: [], monthDaily: [] } })),
      auditAPI.getRecent().catch(() => ({ data: [] }))
    ]);

    // KPIs
    kpis.value = {
      todaySales: 0, monthSales: 0, lowStock: 0,
      totalProducts: 0, totalClients: 0,
      totalUsers: 0, adminUsers: 0, cashierUsers: 0,
      ...(kpiRes.data || kpiRes)
    };

    topProducts.value = topRes.data || [];
    recentSales.value = salesRes.data || [];
    stockAlerts.value = alertsRes.data || [];
    categories.value = catRes.data || [];
    allProducts.value = prodRes.data || [];
    recentActivities.value = auditRes.data || [];

    // Build charts with fetched data
    const chartData = chartRes.data || { todayHourly: [], monthDaily: [] };
    nextTick(() => {
      buildTodayHourlyChart(chartData.todayHourly);
      buildMonthDailyChart(chartData.monthDaily);
      buildCategoryChart();
    });

    // Also build 7-day chart (need separate call to sales report)
    fetchSevenDaySales();
  } catch (e) {
    console.error('Dashboard fetch error:', e);
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
  } catch (e) { /* silent */ }
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

  const labels = hourlyData.map(d => d.hour);
  const values = hourlyData.map(d => d.total);

  const ctx = todayHourlyChartRef.value.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, '#10b981');
  gradient.addColorStop(0.6, '#34d399');
  gradient.addColorStop(1, '#a7f3d0');

  todayHourlyChart = new Chart(todayHourlyChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ventas ($)',
        data: values,
        backgroundColor: gradient,
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: '#059669'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#9ca3af', usePointStyle: true, pointStyle: 'rectRounded', padding: 12 }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString(), color: '#9ca3af' }, grid: { color: 'rgba(156,163,175,0.1)' } },
        x: { ticks: { color: '#9ca3af', maxRotation: 45 }, grid: { display: false } }
      }
    }
  });
};

/** 2) Month daily line / area chart */
const buildMonthDailyChart = (dailyData) => {
  if (!monthDailyChartRef.value) return;
  if (monthDailyChart) monthDailyChart.destroy();

  const labels = dailyData.map(d => {
    const parts = d.date.split('-');
    return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
  });
  const values = dailyData.map(d => d.total);

  const ctx = monthDailyChartRef.value.getContext('2d');
  const gradient = createGradient(ctx, [[0, 'rgba(99,102,241,0.7)'],[0.7, 'rgba(99,102,241,0.05)']]);

  monthDailyChart = new Chart(monthDailyChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
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
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#9ca3af', usePointStyle: true, padding: 12 }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString(), color: '#9ca3af' }, grid: { color: 'rgba(156,163,175,0.1)' } },
        x: { ticks: { color: '#9ca3af', maxTicksLimit: 15 }, grid: { display: false } }
      }
    }
  });
};

/** 3) Seven-day trend chart */
const buildSevenDayChart = (byPeriod) => {
  if (!sevenDayChartRef.value) return;
  if (sevenDayChart) sevenDayChart.destroy();

  const labels = byPeriod.map(d => d.period?.slice(5) || '');
  const values = byPeriod.map(d => d.total || 0);

  const ctx = sevenDayChartRef.value.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, '#a855f7');
  gradient.addColorStop(0.5, '#c084fc');
  gradient.addColorStop(1, 'rgba(168,85,247,0.05)');

  sevenDayChart = new Chart(sevenDayChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Ventas ($)',
        data: values,
        borderColor: '#a855f7',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#a855f7',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#9ca3af', usePointStyle: true, padding: 12 }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString(), color: '#9ca3af' }, grid: { color: 'rgba(156,163,175,0.1)' } },
        x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
      }
    }
  });
};

/** 4) Category distribution doughnut */
const categories = ref([]);
const allProducts = ref([]);

const getProductCountByCategory = (catId) => {
  return allProducts.value.filter(p => p.category_id === catId).length;
};

const getCategoryColor = (catId) => {
  const idx = categories.value.findIndex(c => c.id === catId);
  return CATEGORY_COLORS[Math.max(0, idx) % CATEGORY_COLORS.length];
};

const buildCategoryChart = () => {
  if (!categoryChartRef.value) return;
  if (categoryChart) categoryChart.destroy();

  const dist = categories.value
    .map(cat => ({
      label: cat.name,
      value: getProductCountByCategory(cat.id),
      color: getCategoryColor(cat.id)
    }))
    .filter(d => d.value > 0);

  if (dist.length === 0) return;

  categoryChart = new Chart(categoryChartRef.value, {
    type: 'doughnut',
    data: {
      labels: dist.map(d => d.label),
      datasets: [{
        data: dist.map(d => d.value),
        backgroundColor: dist.map(d => d.color),
        borderColor: '#1f2937',
        borderWidth: 2,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#9ca3af',
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

onUnmounted(() => {
  [todayHourlyChart, monthDailyChart, sevenDayChart, categoryChart].forEach(c => c?.destroy());
});
</script>

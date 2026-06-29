<template>
  <div class="space-y-6">
    <!-- ====== SECTION 1: KPI CARDS ====== -->
    <div data-gsap="stagger" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
      <StatCard data-gsap="item" label="Ventas Hoy" :value="kpis.todaySales" type="currency"
        icon="today" iconBg="#ecfdf5" iconColor="#059669" />
      <StatCard data-gsap="item" label="Ventas del Mes" :value="kpis.monthSales" type="currency"
        icon="calendar_month" iconBg="#eff4ff" iconColor="#624200" />
      <StatCard data-gsap="item" label="Productos Bajos" :value="kpis.lowStock"
        icon="inventory_2" iconBg="#fee2e2" iconColor="#dc2626" subtext="Stock &le; 5" />
      <StatCard data-gsap="item" label="Total Productos" :value="kpis.totalProducts"
        icon="category" iconBg="#f3e8ff" iconColor="#7c3aed" />
      <StatCard data-gsap="item" label="Clientes" :value="kpis.totalClients"
        icon="people" iconBg="#fce7f3" iconColor="#db2777" subtext="Registrados" />
      <StatCard data-gsap="item" label="Usuarios" :value="kpis.totalUsers"
        icon="badge" iconBg="#fef3c7" iconColor="#d97706" :subtext="`${kpis.adminUsers} Admin · ${kpis.cashierUsers} Cajeros`" />
    </div>
    <!-- ====== SECTION 2: CHARTS ROW (TODAY HOURLY + MONTH DAILY) ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Today Hourly Sales -->
      <div class="dt-card p-5">
        <h3 class="dt-headline-sm mb-1">Ventas Hoy (Por Hora)</h3>
        <p class="dt-body-sm" style="color: #4f4539; margin-bottom: 1rem;">Distribución de ventas del día actual</p>
        <div class="chart-container" style="height: 260px;">
          <canvas ref="todayHourlyChartRef"></canvas>
        </div>
      </div>
      <!-- Month Daily Sales -->
      <div class="dt-card p-5">
        <h3 class="dt-headline-sm mb-1">Ventas del Mes (Por Día)</h3>
        <p class="dt-body-sm" style="color: #4f4539; margin-bottom: 1rem;">Evolución diaria de {{ currentMonthName }}</p>
        <div class="chart-container" style="height: 260px;">
          <canvas ref="monthDailyChartRef"></canvas>
        </div>
      </div>
    </div>

    <!-- ====== SECTION 3: MIDDLE ROW (7-DAY TREND + CATEGORY DOUGHNUT) ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 7-Day Sales Trend -->
      <div class="dt-card p-5">
        <h3 class="dt-headline-sm mb-1">Tendencia de Ventas (7 Días)</h3>
        <p class="dt-body-sm" style="color: #4f4539; margin-bottom: 1rem;">Comparativa de los últimos 7 días</p>
        <div class="chart-container" style="height: 260px;">
          <canvas ref="sevenDayChartRef"></canvas>
        </div>
      </div>
      <!-- Category Doughnut -->
      <div class="dt-card p-5">
        <h3 class="dt-headline-sm mb-1">Productos por Categoría</h3>
        <p class="dt-body-sm" style="color: #4f4539; margin-bottom: 1rem;">Distribución del catálogo</p>
        <div class="chart-container" style="height: 260px;">
          <canvas ref="categoryChartRef"></canvas>
        </div>
      </div>
    </div>
    <!-- ====== SECTION 4: ACTIVITY LOG + TOP PRODUCTS ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Activity Log -->
      <div class="dt-card p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="dt-headline-sm">Actividades Recientes</h3>
            <p class="dt-body-sm" style="color: #4f4539;">Últimos movimientos en el sistema</p>
          </div>
          <span class="material-icons-outlined" style="color: #817567;">history</span>
        </div>
        <div class="space-y-1 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
          <div v-for="act in recentActivities" :key="act.id"
            class="flex items-start gap-3 p-2.5 rounded-xl transition-all duration-200"
            style="color: #0b1c30;"
            @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.03)'"
            @mouseleave="e => e.currentTarget.style.background = 'transparent'">
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
              :style="{ background: getActivityIcon(act.action).bg }">
              <span class="material-icons-outlined text-sm" :style="{ color: getActivityIcon(act.action).color }">{{ getActivityIcon(act.action).icon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" style="color: #0b1c30;">
                {{ act.action }}
                <span v-if="act.entity" class="font-normal" style="color: #4f4539;"> — {{ act.entity }}</span>
              </p>
              <p class="text-xs mt-0.5" style="color: #817567;">
                {{ act.users?.name || act.users?.email || 'Sistema' }}
                <span class="mx-1">&middot;</span>
                {{ formatRelativeTime(act.created_at) }}
              </p>
            </div>
          </div>
          <div v-if="recentActivities.length === 0" class="text-center py-8" style="color: #4f4539;">
            <span class="material-icons-outlined text-3xl mb-2 block" style="color: #d2c4b4;">history</span>
            No hay actividades recientes
          </div>
        </div>
      </div>
      <!-- Top Products -->
      <div class="dt-card p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="dt-headline-sm">Top Productos Más Vendidos</h3>
            <p class="dt-body-sm" style="color: #4f4539;">Ranking de productos con mayores ventas</p>
          </div>
          <span class="material-icons-outlined" style="color: #817567;">trending_up</span>
        </div>
        <div class="space-y-3 divide-y divide-gray-200">
          <div v-for="(product, idx) in topProducts" :key="idx"
            class="flex items-center gap-4 p-3 hover:rounded-xl transition-all duration-200"
            @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.03)'"
            @mouseleave="e => e.currentTarget.style.background = 'transparent'">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              :class="TOP_RANK_COLORS[idx] || 'bg-gray-100 text-gray-600'">
              {{ idx + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" style="color: #0b1c30;">{{ product.name }}</p>
              <p class="text-xs" style="color: #4f4539;">{{ product.totalQuantity || product.quantity || 0 }} vendidos</p>
            </div>
            <span class="text-sm font-semibold flex-shrink-0 dt-mono" style="color: #452d00;">{{ formatCurrency(product.totalRevenue || product.total || 0) }}</span>
          </div>
          <div v-if="topProducts.length === 0" class="text-center py-8" style="color: #4f4539;">
            <span class="material-icons-outlined text-3xl mb-2 block" style="color: #d2c4b4;">inventory_2</span>
            No hay datos disponibles
          </div>
        </div>
      </div>
    </div>
    <!-- ====== SECTION 5: RECENT SALES + STOCK ALERTS ====== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="dt-card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="dt-headline-sm">Ventas Recientes</h3>
          <router-link to="/app/sales" style="color: #624200; font-size: 13px; text-decoration: none; font-weight: 500;">Ver todas</router-link>
        </div>
        <div class="space-y-2">
          <div v-for="sale in recentSales" :key="sale.id"
            class="flex items-center justify-between p-3 rounded-xl transition-all duration-200"
            @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.03)'"
            @mouseleave="e => e.currentTarget.style.background = 'transparent'">
            <div>
              <p class="text-sm font-medium" style="color: #0b1c30;">#{{ sale.sale_number || sale.invoice_number || sale.id?.slice(0,8) }}</p>
              <p class="text-xs" style="color: #4f4539;">{{ sale.clients?.name || sale.client_name || 'Cliente General' }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold dt-mono" style="color: #452d00;">{{ formatCurrency(sale.total) }}</p>
              <p class="text-xs" style="color: #817567;">{{ formatRelativeTime(sale.created_at) }}</p>
            </div>
          </div>
          <div v-if="recentSales.length === 0" class="text-center py-6" style="color: #4f4539;">Sin ventas recientes</div>
        </div>
      </div>
      <div class="dt-card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="dt-headline-sm">Alertas de Inventario</h3>
          <router-link to="/app/inventory" style="color: #624200; font-size: 13px; text-decoration: none; font-weight: 500;">Ver inventario</router-link>
        </div>
        <div class="space-y-2">
          <div v-for="alert in stockAlerts" :key="alert.id"
            class="flex items-center gap-3 p-3 rounded-xl"
            :style="alert.stock <= 0
              ? { background: '#fef2f2', borderLeft: '4px solid #dc2626' }
              : { background: '#fffbeb', borderLeft: '4px solid #d97706' }">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" style="color: #0b1c30;">{{ alert.name }}</p>
              <p class="text-xs" style="color: #4f4539;">SKU: {{ alert.sku || 'N/A' }} · Stock: {{ alert.stock }}</p>
            </div>
            <span class="dt-badge" :class="alert.stock <= 0 ? 'dt-badge-danger' : 'dt-badge-warning'">
              {{ alert.stock <= 0 ? 'Sin stock' : 'Bajo' }}
            </span>
          </div>
          <div v-if="stockAlerts.length === 0" class="text-center py-6" style="color: #4f4539;">No hay alertas de inventario</div>
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
import { useLandingAnimations } from '../composables/useGsapAnimations';
import { useStaggerEntrance, useIconPulse, useAnimeCounter } from '../composables/useAnimeEffects';

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
// CONSTANTS – Bronze & Gold palette
// ============================
const HOURLY_GRADIENT = ['rgba(212,163,115,0.85)', 'rgba(212,163,115,0.1)'];
const MONTH_GRADIENT = ['rgba(233,196,106,0.85)', 'rgba(233,196,106,0.1)'];
const SEVEN_GRADIENT = ['rgba(98,66,0,0.75)', 'rgba(98,66,0,0.05)'];

const CATEGORY_COLORS = [
  '#d4a373', '#e9c46a', '#f4a261', '#bc6c25',
  '#a17808', '#624200', '#cd8d5b', '#8b5e3c',
  '#e6b88a', '#795900'
];

const TOP_RANK_COLORS = [
  'bg-[#fbbf24] text-[#78350f]',
  'bg-[#d2c4b4] text-[#452d00]',
  'bg-[#cd8d5b] text-white',
  'bg-[#fef3c7] text-[#92400e]',
  'bg-[#f3e8ff] text-[#6b21a8]'
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
  if (a.includes('venta') || a.includes('sale') || a.includes('create_venta')) return { icon: 'point_of_sale', bg: '#d4edda', color: '#059669' };
  if (a.includes('producto') || a.includes('product') || a.includes('create_producto')) return { icon: 'inventory_2', bg: '#e9d8fd', color: '#7c3aed' };
  if (a.includes('usuario') || a.includes('user') || a.includes('login')) return { icon: 'person', bg: '#dbeafe', color: '#2563eb' };
  if (a.includes('compra') || a.includes('purchase')) return { icon: 'shopping_cart', bg: '#fef3c7', color: '#d97706' };
  if (a.includes('categoria') || a.includes('category')) return { icon: 'category', bg: '#fce7f3', color: '#db2777' };
  if (a.includes('delete') || a.includes('eliminar') || a.includes('anular')) return { icon: 'delete', bg: '#fee2e2', color: '#dc2626' };
  if (a.includes('update') || a.includes('actualizar') || a.includes('edit')) return { icon: 'edit', bg: '#cffafe', color: '#0891b2' };
  return { icon: 'circle', bg: '#f3f4f6', color: '#6b7280' };
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

    // Animate dashboard cards after data loads
    animateDashboardCards();
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
  gradient.addColorStop(0, '#d4a373');
  gradient.addColorStop(0.6, '#e9c46a');
  gradient.addColorStop(1, '#faedcd');

  todayHourlyChart = new Chart(todayHourlyChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ventas ($)',
        data: values,
        backgroundColor: gradient,
        borderColor: '#bc6c25',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: '#bc6c25'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#4f4539', usePointStyle: true, pointStyle: 'rectRounded', padding: 12 }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString(), color: '#817567' }, grid: { color: 'rgba(98,66,0,0.06)' } },
        x: { ticks: { color: '#817567', maxRotation: 45 }, grid: { display: false } }
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
  const gradient = createGradient(ctx, [[0, 'rgba(233,196,106,0.7)'],[0.7, 'rgba(233,196,106,0.05)']]);

  monthDailyChart = new Chart(monthDailyChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Ventas ($)',
        data: values,
        borderColor: '#e9c46a',
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#e9c46a',
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
          labels: { color: '#4f4539', usePointStyle: true, padding: 12 }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString(), color: '#817567' }, grid: { color: 'rgba(98,66,0,0.06)' } },
        x: { ticks: { color: '#817567', maxTicksLimit: 15 }, grid: { display: false } }
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
  gradient.addColorStop(0, '#624200');
  gradient.addColorStop(0.5, '#a17808');
  gradient.addColorStop(1, 'rgba(161,120,8,0.05)');

  sevenDayChart = new Chart(sevenDayChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Ventas ($)',
        data: values,
        borderColor: '#624200',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#624200',
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
          labels: { color: '#4f4539', usePointStyle: true, padding: 12 }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString(), color: '#817567' }, grid: { color: 'rgba(98,66,0,0.06)' } },
        x: { ticks: { color: '#817567' }, grid: { display: false } }
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
        borderColor: '#FDFBF7',
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
            color: '#4f4539',
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
      ease: 'back.out(1.4)',
    });
  }

  // anime.js: pulse each StatCard icon
  await nextTick();
  document.querySelectorAll('.dt-card .material-icons-outlined').forEach((icon, i) => {
    setTimeout(() => {
      useIconPulse(icon, { scale: 1.2, duration: 600, loop: false });
    }, 300 + i * 100);
  });
}
onUnmounted(() => {
  [todayHourlyChart, monthDailyChart, sevenDayChart, categoryChart].forEach(c => c?.destroy());
});
</script>

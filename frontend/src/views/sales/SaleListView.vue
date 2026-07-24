<template>
  <div class="space-y-6 px-gutter">
    <!-- Page Header & Toolbar -->
    <!-- Sales Header -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> point_of_sale </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Ventas"
            :description="`${total} venta${total !== 1 ? 's' : ''} registrada${total !== 1 ? 's' : ''}`"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <button
            v-if="can('sales', 'create')"
            @click="$router.push('/app/sales/create')"
            class="aurora-header-button aurora-header-button-primary"
          >
            <span class="material-symbols-outlined"> add </span>
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
    <!-- Financial Summary / Metrics — Dashboard style with counter animation -->
    <section class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter mb-xl">
      <StatCard
        label="Ventas Hoy"
        :value="dashboardKpis.todaySales"
        type="currency"
        icon="payments"
        iconColor="#7c3aed"
        :trend="salesTodayTrend"
        subtext="vs ayer"
        variant="dashboard"
        :stagger-delay="0"
        :animate="true"
      />
      <StatCard
        label="Total Generado"
        :value="totalRevenue"
        type="currency"
        icon="account_balance"
        iconColor="#059669"
        :subtext="`${dashboardKpis.totalSales || 0} ventas registradas`"
        variant="dashboard"
        :stagger-delay="100"
        :animate="true"
      />
      <StatCard
        label="Ticket Promedio"
        :value="averageTicket"
        type="currency"
        :icon="ticketMet ? 'verified' : 'gpp_bad'"
        :iconColor="ticketMet ? '#059669' : '#dc2626'"
        :subtext="ticketMet ? 'Cumpliendo meta $80,000' : 'Debajo de la meta $80,000'"
        variant="dashboard"
        :stagger-delay="200"
        :animate="true"
      />
      <StatCard
        label="Ventas del Mes"
        :value="dashboardKpis.monthSales"
        type="currency"
        icon="show_chart"
        iconColor="#d97706"
        :subtext="`${dashboardKpis.totalSales || 0} ventas totales`"
        variant="dashboard"
        :stagger-delay="300"
        :animate="true"
      />
    </section>

    <!-- Table & Filters Container -->
    <div class="aurora-raised-card !p-0 overflow-hidden">
      <!-- Filter/Sort Bar -->
      <div
        class="flex items-center justify-between p-md px-4 py-3"
        style="border-color: var(--aurora-outline-variant)"
      >
        <div class="flex gap-2">
          <button
            @click="showFilters = !showFilters"
            class="aurora-btn-secondary"
            :class="{ 'aurora-pressed': showFilters }"
            style="padding: 8px 12px; font-size: 0.8rem"
          >
            <span class="material-symbols-outlined" style="font-size: 1rem">filter_list</span>
            Filtrar
          </button>
        </div>
        <div class="relative">
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            type="text"
            placeholder="Buscar factura o cliente..."
            class="aurora-search"
          />
        </div>
      </div>

      <!-- Filter Panel -->
      <div
        v-if="showFilters"
        class="p-4 border-b"
        style="
          background: var(--aurora-surface-container);
          border-color: var(--aurora-outline-variant);
        "
      >
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <div class="col-span-2">
            <label class="block mb-1 font-medium text-xs text-on-surface-variant"
              >Rango de Fecha</label
            >
            <div class="flex items-center gap-2">
              <div class="aurora-input flex-1 flex items-center gap-2">
                <span
                  class="material-symbols-outlined text-on-surface-variant"
                  style="font-size: 1.25rem"
                  >calendar_month</span
                >
                <input
                  class="bg-transparent border-none focus:ring-0 w-full outline-none text-sm text-on-surface"
                  type="date"
                  v-model="dateFrom"
                  @change="applyFilters"
                />
              </div>
              <span class="text-on-surface-variant">—</span>
              <div class="aurora-input flex-1 flex items-center gap-2">
                <span
                  class="material-symbols-outlined text-on-surface-variant"
                  style="font-size: 1.25rem"
                  >calendar_month</span
                >
                <input
                  class="bg-transparent border-none focus:ring-0 w-full outline-none text-sm text-on-surface"
                  type="date"
                  v-model="dateTo"
                />
              </div>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium text-xs text-on-surface-variant">Estado</label>
            <select v-model="filterStatus" @change="applyFilters" class="aurora-select">
              <option value="">Todos</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Reembolsado</option>
              <option value="pending">Pendiente</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium text-xs text-on-surface-variant"
              >Método de Pago</label
            >
            <select v-model="filterPayment" @change="applyFilters" class="aurora-select">
              <option value="">Todos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
          <div class="flex items-end gap-2">
            <button @click="applyFilters" class="aurora-btn-primary">
              <span class="material-icons-outlined" style="font-size: 1rem">search</span>
              Aplicar Filtros
            </button>
            <button
              v-if="hasActiveFilters"
              @click="resetFilters"
              class="aurora-btn-icon text-on-surface-variant"
            >
              <span class="material-icons-outlined" style="font-size: 1rem">clear</span>
              Restablecer
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- DESKTOP TABLE (hidden on mobile) -->
      <!-- ============================================ -->
      <div class="overflow-x-auto hidden sm:block">
        <table class="aurora-table">
          <thead>
            <tr>
              <th>Factura #</th>
              <th>Fecha / Hora</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Pago</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="sale in sales"
              :key="sale.id"
              class="cursor-pointer hover:bg-[var(--aurora-surface-container)] transition-colors"
              @click="goToDetail(sale)"
            >
              <td>
                <span
                  class="font-mono text-sm font-semibold"
                  style="color: var(--aurora-primary)"
                  >{{ sale.invoice_number || 'N/A' }}</span
                >
              </td>
              <td>
                <div class="flex flex-col">
                  <span class="font-medium text-sm text-on-surface">{{
                    formatDate(sale.updatedAt)
                  }}</span>
                  <span class="text-xs text-on-surface-variant">{{
                    formatTime(sale.updatedAt)
                  }}</span>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase"
                    style="background: rgba(139, 92, 246, 0.12); color: var(--aurora-primary)"
                  >
                    {{ getInitials(sale.client_name) }}
                  </div>
                  <span class="font-medium text-sm text-on-surface">{{ sale.client_name }}</span>
                </div>
              </td>
              <td class="font-semibold font-mono" style="color: var(--aurora-primary)">
                {{ formatTable(sale.total) }}
              </td>
              <td>
                <div class="flex items-center gap-1 text-on-surface-variant">
                  <span class="material-symbols-outlined text-[18px]">{{
                    paymentIcon(sale.payment_type)
                  }}</span>
                  <span class="text-sm">{{ paymentLabel(sale.payment_type) }}</span>
                </div>
              </td>
              <td>
                <span
                  class="aurora-badge"
                  :class="
                    sale.status === 'completed'
                      ? 'aurora-badge-success'
                      : sale.status === 'cancelled'
                        ? 'aurora-badge-danger'
                        : 'aurora-badge-warning'
                  "
                >
                  {{ statusLabel(sale.status) }}
                </span>
              </td>
              <td>
                <div
                  class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <button
                    v-if="sale.status !== 'cancelled' && can('sales', 'create')"
                    @click.stop="cancelSale(sale)"
                    class="aurora-btn-icon"
                    title="Anular"
                    style="color: var(--aurora-error, #dc2626)"
                  >
                    <span class="material-symbols-outlined">cancel</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="sales.length === 0">
              <td colspan="7" class="text-center py-10 text-on-surface-variant">
                <span
                  class="material-symbols-outlined block mb-2"
                  style="font-size: 48px; color: var(--aurora-outline)"
                  >receipt_long</span
                >
                <p>No se encontraron ventas</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ============================================ -->
      <!-- MOBILE CARDS (hidden on desktop) -->
      <!-- ============================================ -->
      <div class="sm:hidden space-y-3 px-gutter pb-gutter">
        <div
          v-for="sale in sales"
          :key="sale.id"
          class="aurora-raised-card cursor-pointer"
          @click="goToDetail(sale)"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm font-semibold" style="color: var(--aurora-primary)">{{
              sale.invoice_number || 'N/A'
            }}</span>
            <span
              class="aurora-badge"
              :class="
                sale.status === 'completed'
                  ? 'aurora-badge-success'
                  : sale.status === 'cancelled'
                    ? 'aurora-badge-danger'
                    : 'aurora-badge-warning'
              "
            >
              {{ statusLabel(sale.status) }}
            </span>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase"
              style="background: rgba(139, 92, 246, 0.12); color: var(--aurora-primary)"
            >
              {{ getInitials(sale.client_name) }}
            </div>
            <div>
              <div class="font-medium text-sm text-on-surface">{{ sale.client_name }}</div>
              <div class="flex items-center gap-1 text-xs text-on-surface-variant">
                <span>{{ formatDate(sale.updated_at) }}</span>
                <span>&middot;</span>
                <span>{{ formatTime(sale.updated_at) }}</span>
              </div>
            </div>
          </div>
          <div
            class="flex items-center justify-between pt-2"
            style="border-top: 1px solid var(--aurora-outline-variant)"
          >
            <div class="flex items-center gap-1 text-on-surface-variant">
              <span class="material-symbols-outlined text-[18px]">{{
                paymentIcon(sale.payment_type)
              }}</span>
              <span class="text-xs">{{ paymentLabel(sale.payment_type) }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-sm font-semibold font-mono" style="color: var(--aurora-primary)">{{
                formatTable(sale.total)
              }}</span>
              <button
                @click.stop="$router.push(`/app/sales/${sale.id}`)"
                class="aurora-btn-icon"
                title="Ver detalles"
              >
                <span class="material-symbols-outlined" style="color: var(--aurora-primary)"
                  >chevron_right</span
                >
              </button>
            </div>
          </div>
        </div>
        <div
          v-if="sales.length === 0"
          class="flex flex-col items-center justify-center py-10 text-center text-on-surface-variant"
        >
          <span
            class="material-symbols-outlined mb-2"
            style="font-size: 48px; color: var(--aurora-outline)"
            >receipt_long</span
          >
          <p>No se encontraron ventas</p>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- Pagination -->
      <!-- ============================================ -->
      <div
        class="flex flex-col sm:flex-row items-center justify-between gap-gutter px-gutter py-md border-t"
        style="border-color: var(--aurora-outline-variant)"
      >
        <span class="text-xs text-on-surface-variant">
          Mostrando <strong class="text-on-surface">{{ (page - 1) * limit + 1 }}</strong> a
          <strong class="text-on-surface">{{ Math.min(page * limit, total) }}</strong> de
          <strong class="text-on-surface">{{ total }}</strong> ventas
        </span>
        <div class="flex items-center gap-1">
          <button
            @click="changePage(page - 1)"
            :disabled="page <= 1"
            class="aurora-btn-icon text-on-surface-variant disabled:opacity-30"
          >
            <span class="material-symbols-outlined" style="font-size: 1rem">chevron_left</span>
          </button>
          <template v-for="p in visiblePages" :key="p">
            <span
              v-if="p === '...'"
              class="w-8 h-8 flex items-center justify-center text-xs text-on-surface-variant"
              >...</span
            >
            <button
              v-else
              @click="changePage(p)"
              class="w-8 h-8 rounded-[32px] flex items-center justify-center text-sm font-medium transition-colors"
              :class="
                p === page
                  ? 'aurora-pressed'
                  : 'text-on-surface-variant hover:bg-[var(--aurora-surface-container)]'
              "
            >
              {{ p }}
            </button>
          </template>
          <button
            @click="changePage(page + 1)"
            :disabled="page >= totalPages"
            class="aurora-btn-icon text-on-surface-variant disabled:opacity-30"
          >
            <span class="material-symbols-outlined" style="font-size: 1rem">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- Monthly Sales Chart -->
    <!-- ============================================ -->
    <div class="aurora-raised-card p-md mt-6" v-if="monthlyChartLabels.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg text-on-surface">Ventas por Mes</h3>
        <span class="text-xs text-on-surface-variant">Evolución mensual de ventas</span>
      </div>
      <div class="relative" style="height: 300px">
        <canvas ref="monthlyChartRef"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
  import { useRouter } from 'vue-router';
  import { Chart, registerables } from 'chart.js';
  import { salesAPI, reportsAPI } from '../../api';
  import { useAuth } from '../../composables/useAuth';
  import { normalizeSales, formatDate } from '../../utils';
  import { useCurrency } from '../../composables/useCurrency';
  import PageHeader from '../../components/shared/PageHeader.vue';
  import StatCard from '../../components/shared/StatCard.vue';

  Chart.register(...registerables);

  const { format: formatCurrency, formatTable } = useCurrency();

  const router = useRouter();
  const { can } = useAuth();
  const sales = ref([]);
  const page = ref(1);
  const limit = 10;
  const total = ref(0);

  // Filters
  const searchQuery = ref('');
  const filterStatus = ref('');
  const filterPayment = ref('');
  const dateFrom = ref('');
  const dateTo = ref('');
  const showFilters = ref(false);

  const hasActiveFilters = computed(
    () =>
      searchQuery.value ||
      filterStatus.value ||
      filterPayment.value ||
      dateFrom.value ||
      dateTo.value
  );

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

  const visiblePages = computed(() => {
    const pages = [];
    const tp = totalPages.value;
    if (tp <= 7) {
      for (let i = 1; i <= tp; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page.value > 3) pages.push('...');
      const start = Math.max(2, page.value - 1);
      const end = Math.min(tp - 1, page.value + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page.value < tp - 2) pages.push('...');
      pages.push(tp);
    }
    return pages;
  });

  // Dashboard KPIs + Chart data
  const dashboardKpis = ref({ todaySales: 0, monthSales: 0, totalSales: 0 });
  const monthlyChartLabels = ref([]);
  const monthlyChartData = ref([]);

  // Chart ref + instance
  const monthlyChartRef = ref(null);
  let monthlyChart = null;

  const TICKET_TARGET = 80000; // Default target for average ticket compliance (COP)

  // Total revenue generated (from monthly report API)
  const totalRevenue = computed(() => {
    return monthlyChartData.value.reduce((sum, d) => sum + (Number(d.total) || 0), 0);
  });

  // Average ticket with compliance
  const averageTicket = computed(() => {
    const totalSalesCount = dashboardKpis.value.totalSales || 0;
    return totalSalesCount > 0 ? totalRevenue.value / totalSalesCount : 0;
  });

  const ticketMet = computed(() => averageTicket.value >= TICKET_TARGET);

  // Sales today trend (simple default)
  const salesTodayTrend = computed(() => 12);

  // Methods
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const paymentIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'cash' || t === 'efectivo') return 'payments';
    if (t === 'card' || t === 'tarjeta' || t === 'credit_card' || t === 'debit_card')
      return 'credit_card';
    if (t === 'transfer' || t === 'transferencia' || t === 'bank_transfer')
      return 'account_balance';
    return 'receipt_long';
  };

  const paymentLabel = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'cash' || t === 'efectivo') return 'Efectivo';
    if (t === 'card' || t === 'tarjeta' || t === 'credit_card' || t === 'debit_card')
      return 'Tarjeta';
    if (t === 'transfer' || t === 'transferencia' || t === 'bank_transfer') return 'Transferencia';
    return type || '-';
  };

  const statusLabel = (status) => {
    if (status === 'completed') return 'Completado';
    if (status === 'cancelled') return 'Reembolsado';
    return 'Pendiente';
  };

  const statusBadgeClass = (status) => {
    if (status === 'completed') return 'bg-green-100 text-green-700 border border-green-200';
    if (status === 'cancelled') return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  // Debounce timer for search
  let searchTimer = null;

  const fetchSales = async () => {
    try {
      const params = { page: page.value, limit };
      if (searchQuery.value) params.search = searchQuery.value;
      if (filterStatus.value) params.status = filterStatus.value;
      if (filterPayment.value) params.payment = filterPayment.value;
      if (dateFrom.value) params.dateFrom = dateFrom.value;
      if (dateTo.value) params.dateTo = dateTo.value;
      const res = await salesAPI.getAll(params);
      sales.value = normalizeSales(res.data || []);
      total.value = res.pagination?.total || 0;
    } catch (e) {
      console.error('Error fetching sales:', e);
    }
  };

  const changePage = (p) => {
    if (p >= 1 && p <= totalPages.value) {
      page.value = p;
      fetchSales();
    }
  };

  const resetFilters = () => {
    searchQuery.value = '';
    filterStatus.value = '';
    filterPayment.value = '';
    dateFrom.value = '';
    dateTo.value = '';
    page.value = 1;
    fetchSales();
  };

  const applyFilters = () => {
    page.value = 1;
    fetchSales();
  };

  // Debounced search handler
  const onSearchInput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page.value = 1;
      fetchSales();
    }, 400);
  };

  const goToDetail = (sale) => router.push(`/app/sales/${sale.id}`);

  const cancelSale = async (sale) => {
    if (!confirm(`¿Anular factura ${sale.invoice_number || ''}?`)) return;
    try {
      await salesAPI.cancel(sale.id);
      await fetchSales();
    } catch (e) {
      console.error('Error al anular venta:', e);
    }
  };

  // Fetch dashboard KPIs + monthly chart data
  const fetchDashboardData = async () => {
    try {
      const [dashRes, salesRepRes] = await Promise.all([
        reportsAPI.dashboard(),
        reportsAPI.sales({
          start_date: '2024-01-01',
          end_date: '2026-12-31',
          group_by: 'month'
        })
      ]);
      dashboardKpis.value = {
        todaySales: Number(dashRes.data?.todaySales || dashRes.todaySales || 0),
        monthSales: Number(dashRes.data?.monthSales || dashRes.monthSales || 0),
        totalSales: Number(dashRes.data?.totalSales || dashRes.totalSales || 0)
      };

      const byPeriod = salesRepRes.data?.byPeriod || salesRepRes.byPeriod || [];
      if (byPeriod.length > 0) {
        monthlyChartLabels.value = byPeriod.map((d) => {
          const [y, m] = d.period.split('-');
          const months = [
            'Ene',
            'Feb',
            'Mar',
            'Abr',
            'May',
            'Jun',
            'Jul',
            'Ago',
            'Sep',
            'Oct',
            'Nov',
            'Dic'
          ];
          return `${months[parseInt(m, 10) - 1]} ${y}`;
        });
        monthlyChartData.value = byPeriod;
        await nextTick();
        buildMonthlyChart(byPeriod);
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  // Chart builder
  const buildMonthlyChart = (data) => {
    if (!monthlyChartRef.value) return;
    if (monthlyChart) monthlyChart.destroy();

    const ctx = monthlyChartRef.value.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(212, 163, 115, 0.85)');
    gradient.addColorStop(1, 'rgba(212, 163, 115, 0.05)');

    monthlyChart = new Chart(monthlyChartRef.value, {
      type: 'bar',
      data: {
        labels: monthlyChartLabels.value,
        datasets: [
          {
            label: 'Ingresos ($)',
            data: data.map((d) => Number(d.total) || 0),
            backgroundColor: gradient,
            borderColor: 'rgba(98, 66, 0, 0.7)',
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: 'rgba(98, 66, 0, 0.7)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a2e',
            titleFont: { size: 12 },
            bodyFont: { size: 13 },
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y;
                return `$${val.toLocaleString('es-CO')}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { size: 11 },
              callback: (val) => '$' + (val / 1000).toFixed(0) + 'k'
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  };

  onMounted(async () => {
    await Promise.all([fetchSales(), fetchDashboardData()]);
  });

  onUnmounted(() => {
    if (monthlyChart) monthlyChart.destroy();
  });
</script>

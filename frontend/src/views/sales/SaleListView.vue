<template>
  <div class="space-y-6">
    <!-- Page Header & Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Ventas</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
          {{ filteredSales.length }} venta{{ filteredSales.length !== 1 ? 's' : '' }} registrada{{ filteredSales.length !== 1 ? 's' : '' }}
        </p>
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <button v-if="can('sales', 'create')" @click="$router.push('/app/sales/create')"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
          style="background: #624200; color: white; border-color: rgba(139,94,0,0.2); font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5;">
          <span class="material-icons-outlined" style="font-size: 1.25rem;">add</span>
          <span class="hidden sm:inline">Nueva Venta</span>
        </button>
      </div>
    </div>

    <!-- Financial Summary / Metrics (dt-kpi-card per DESIGN.md) -->
    <section class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-xl">
      <!-- Total Sales Today -->
      <div class="dt-kpi-card flex items-center justify-between">
        <div>
          <p class="dt-label-caps opacity-70 mb-xs">Ventas Hoy</p>
          <h2 class="dt-headline-lg mb-0">{{ formatCurrency(salesToday) }}</h2>
          <p class="dt-body-sm text-green-600 flex items-center gap-xs mt-xs">
            <span class="material-symbols-outlined text-[18px]">trending_up</span>
            +12% vs ayer
          </p>
        </div>
        <div class="!bg-yellow-100/30 p-3 rounded-full" >
          <span class="material-symbols-outlined text-[5rem]" style="color: #795900;">payments</span>
        </div>
      </div>
      <!-- Average Ticket -->
      <div class="dt-kpi-card flex items-center justify-between">
        <div>
          <p class="dt-label-caps opacity-70 mb-xs">Ticket Promedio</p>
          <h2 class="dt-headline-lg mb-0">{{ formatCurrency(averageTicket) }}</h2>
          <p class="dt-body-sm text-on-surface-variant flex items-center gap-xs mt-xs opacity-60">
            Basado en {{ filteredSales.length }} ventas
          </p>
        </div>
        <div class="bg-primary-container/10 p-md" style="border-radius: 12px;">
          <span class="material-symbols-outlined text-[32px]" style="color: #452d00;">confirmation_number</span>
        </div>
      </div>
      <!-- Monthly Volume -->
      <div class="dt-kpi-card flex items-center justify-between">
        <div>
          <p class="dt-label-caps opacity-70 mb-xs">Volumen Mensual</p>
          <h2 class="dt-headline-lg mb-0">{{ totalSales }}</h2>
          <p class="dt-body-sm text-red-600 flex items-center gap-xs mt-xs">
            <span class="material-symbols-outlined text-[18px]">trending_down</span>
            {{ sales.length }} registros
          </p>
        </div>
        <div class="bg-tertiary-container/20 p-md" style="border-radius: 12px;">
          <span class="material-symbols-outlined text-[32px]" style="color: #745b00;">show_chart</span>
        </div>
      </div>
    </section>

    <!-- Table & Filters Container (dt-card per DESIGN.md) -->
    <div class="dt-card space-y-8 overflow-hidden">
      <!-- Filter/Sort Bar -->
      <div class="filter-bar-container p-4 border-b border-[#d2c4b4]/30 flex justify-between items-center" style="background: #ffffff;">
        <div class="flex gap-2">
          <button @click="showFilters = !showFilters"
            class="px-3 py-1.5 text-sm font-medium border border-[#d2c4b4] rounded-md flex items-center gap-1 hover:bg-[#eff4ff] transition-colors bg-white relative"
            :class="{ 'ring-2 ring-[rgba(98,66,0,0.2)] border-[#624200]': showFilters }"
            style="font-family: 'Inter', sans-serif; color: #4f4539;">
            <span class="material-icons-outlined" style="font-size: 1rem;">filter_list</span>
            Filtrar
          </button>
        </div>
        <div class="relative">
          <div class="flex items-center bg-white border border-[#d2c4b4] rounded-full px-4 py-1.5 focus-within:border-[#624200] focus-within:ring-2 focus-within:ring-[rgba(98,66,0,0.2)] transition-all">
            <span class="material-icons-outlined" style="color: #d2c4b4; margin-right: 0.5rem; font-size: 1rem;">search</span>
            <input v-model="searchQuery" type="text" placeholder="Buscar factura o cliente..."
              class="bg-transparent border-none focus:ring-0 outline-none text-sm"
              style="font-family: 'Inter', sans-serif; color: #0b1c30;" />
          </div>
        </div>
      </div>

      <!-- Filter Panel -->
      <div v-if="showFilters" class="filter-panel-container px-4 py-4 border-b border-[#d2c4b4]/30" style="background: #fff;">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Rango de Fecha</label>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-sm bg-white px-3 py-2 border border-outline-variant/30 dt-focus-ring flex-1" style="border-radius: 12px;">
                <span class="material-symbols-outlined text-gray-500" style="font-size: 1.25rem;">calendar_month</span>
                <input class="dt-body-sm border-none p-0 focus:ring-0 w-full outline-none bg-transparent" type="date" v-model="dateFrom" placeholder="Desde" />
              </div>
              <span style="color: #4f4539; font-size: 0.875rem;">—</span>
              <div class="flex items-center gap-sm bg-white px-3 py-2 border border-outline-variant/30 dt-focus-ring flex-1" style="border-radius: 12px;">
                <span class="material-symbols-outlined text-gray-500" style="font-size: 1.25rem;">calendar_month</span>
                <input class="dt-body-sm border-none p-0 focus:ring-0 w-full outline-none bg-transparent" type="date" v-model="dateTo" placeholder="Hasta" />
              </div>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Estado</label>
            <select v-model="filterStatus" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all" style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;">
              <option value="">Todos</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Reembolsado</option>
              <option value="pending">Pendiente</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Método de Pago</label>
            <select v-model="filterPayment" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all" style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;">
              <option value="">Todos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
          <div class="flex items-end gap-2">
            <button @click="applyFilters" class="hidden px-4 py-2 rounded-lg text-sm font-semibold transition-all" style="background: #624200; color: white; font-family: 'Inter', sans-serif;">
              <span class="flex items-center gap-1">
                <span class="material-icons-outlined" style="font-size: 1rem;">search</span>
                Aplicar Filtros
              </span>
            </button>
            <button v-if="hasActiveFilters" @click="resetFilters" class="px-4 py-2 rounded-lg text-sm font-semibold transition-all border" style="background: #624200; color: white; font-family: 'Inter', sans-serif;">
              <span class="flex items-center gap-1">
                <span class="material-icons-outlined" style="font-size: 1rem;">clear</span>
                Restablecer
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- DESKTOP TABLE (hidden on mobile) -->
      <!-- ============================================ -->
      <div class="overflow-x-auto dt-hide-mobile">
        <table class="dt-table">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Factura #</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Pago</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in paginatedSales" :key="sale.id" class="cursor-pointer group" @click="goToDetail(sale)">
              <td>
                <div class="flex flex-col">
                  <span class="font-medium" style="color: #452d00;">{{ formatDate(sale.created_at) }}</span>
                  <span class="dt-body-sm" style="color: #4f4539; opacity: 0.6;">{{ formatTime(sale.created_at) }}</span>
                </div>
              </td>
              <td>
                <span class="dt-mono dt-sku">{{ sale.invoice_number || 'N/A' }}</span>
              </td>
              <td>
                <div class="flex items-center gap-sm">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase" style="background: rgba(253, 202, 92, 0.3); color: #795900;">{{ getInitials(sale.client_name) }}</div>
                  <span class="font-medium" style="color: #452d00;">{{ sale.client_name }}</span>
                </div>
              </td>
              <td class="dt-financial">{{ formatTable(sale.total) }}</td>
              <td>
                <div class="flex items-center gap-xs" style="color: #4f4539;">
                  <span class="material-symbols-outlined text-[18px]">{{ paymentIcon(sale.payment_type) }}</span>
                  <span class="dt-body-sm">{{ paymentLabel(sale.payment_type) }}</span>
                </div>
              </td>
              <td>
                <span class="dt-badge" :class="sale.status === 'completed' ? 'dt-badge-success' : sale.status === 'cancelled' ? 'dt-badge-danger' : 'dt-badge-warning'">
                  {{ statusLabel(sale.status) }}
                </span>
              </td>
              <td>
                <div class="flex items-center justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <button @click.stop="$router.push(`/app/sales/${sale.id}`)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Ver detalles" style="color: #4f4539; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; e.currentTarget.style.color = '#624200'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4f4539'; }">
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                  <button v-if="sale.status !== 'cancelled' && can('sales', 'create')" @click.stop="cancelSale(sale)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Anular" style="color: #ba1a1a; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ba1a1a'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ba1a1a'; }">
                    <span class="material-symbols-outlined">cancel</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="paginatedSales.length === 0">
              <td colspan="7" class="dt-empty-state">
                <span class="dt-empty-icon material-symbols-outlined">receipt_long</span>
                <p>No se encontraron ventas</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ============================================ -->
      <!-- MOBILE CARDS (hidden on desktop) -->
      <!-- ============================================ -->
      <div class="dt-hide-desktop p-md space-y-md">
        <div v-for="sale in paginatedSales" :key="sale.id"
             class="dt-card-sm p-md cursor-pointer dt-shadow-hover"
             @click="goToDetail(sale)">
          <!-- Card header: invoice + status -->
          <div class="flex items-center justify-between mb-sm">
            <span class="dt-mono dt-sku">{{ sale.invoice_number || 'N/A' }}</span>
            <span class="dt-badge" :class="sale.status === 'completed' ? 'dt-badge-success' : sale.status === 'cancelled' ? 'dt-badge-danger' : 'dt-badge-warning'">
              {{ statusLabel(sale.status) }}
            </span>
          </div>
          <!-- Client info -->
          <div class="flex items-center gap-sm mb-sm">
            <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase" style="background: rgba(253, 202, 92, 0.3); color: #795900;">{{ getInitials(sale.client_name) }}</div>
            <div>
              <div class="font-medium" style="color: #452d00;">{{ sale.client_name }}</div>
              <div class="flex items-center gap-xs dt-body-sm" style="color: #4f4539; opacity: 0.6;">
                <span>{{ formatDate(sale.created_at) }}</span>
                <span>&middot;</span>
                <span>{{ formatTime(sale.created_at) }}</span>
              </div>
            </div>
          </div>
          <!-- Card footer: payment + total + actions -->
          <div class="flex items-center justify-between pt-sm" style="border-top: 1px solid rgba(210, 196, 180, 0.2);">
            <div class="flex items-center gap-xs" style="color: #4f4539;">
              <span class="material-symbols-outlined text-[18px]">{{ paymentIcon(sale.payment_type) }}</span>
              <span class="dt-body-sm">{{ paymentLabel(sale.payment_type) }}</span>
            </div>
            <div class="flex items-center gap-sm">
              <span class="dt-financial">{{ formatTable(sale.total) }}</span>
              <button @click.stop="$router.push(`/app/sales/${sale.id}`)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Ver detalles" style="color: #4f4539; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; e.currentTarget.style.color = '#624200'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4f4539'; }">
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
        <!-- Empty state for mobile -->
        <div v-if="paginatedSales.length === 0" class="dt-empty-state">
          <span class="dt-empty-icon material-symbols-outlined">receipt_long</span>
          <p>No se encontraron ventas</p>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- Pagination (dt-pagination per DESIGN.md) -->
      <!-- ============================================ -->
      <div class="dt-pagination">
        <span class="dt-pagination-info">
          Mostrando <strong>{{ (currentPage - 1) * perPage + 1 }}</strong> a <strong>{{ Math.min(currentPage * perPage, filteredSales.length) }}</strong> de <strong>{{ filteredSales.length }}</strong> ventas
        </span>
        <div class="dt-pagination-buttons">
          <button @click="changePage(currentPage - 1)" :disabled="currentPage <= 1"
            class="dt-pagination-btn">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <template v-for="p in visiblePages" :key="p">
            <span v-if="p === '...'" class="dt-pagination-ellipsis">...</span>
            <button v-else @click="changePage(p)"
              class="dt-pagination-btn"
              :class="p === currentPage ? 'dt-pagination-active' : ''">
              {{ p }}
            </button>
          </template>
          <button @click="changePage(currentPage + 1)" :disabled="currentPage >= totalPages"
            class="dt-pagination-btn">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { salesAPI } from '../../api';
import { useAuth } from '../../composables/useAuth';
import { normalizeSales, formatDate } from '../../utils';
import { useCurrency } from '../../composables/useCurrency';

const { format: formatCurrency, formatTable } = useCurrency();

const router = useRouter();
const { can } = useAuth();
const sales = ref([]);

// Filters
const searchQuery = ref('');
const filterStatus = ref('');
const filterPayment = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const currentPage = ref(1);
const perPage = ref(10);
const showFilters = ref(false);

const hasActiveFilters = computed(() =>
  searchQuery.value || filterStatus.value || filterPayment.value || dateFrom.value || dateTo.value
);

// Computed: filtered sales
const filteredSales = computed(() => {
  let result = sales.value;

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(s =>
      (s.invoice_number || '').toLowerCase().includes(q) ||
      (s.client_name || '').toLowerCase().includes(q)
    );
  }

  if (filterStatus.value) {
    result = result.filter(s => s.status === filterStatus.value);
  }

  if (filterPayment.value) {
    result = result.filter(s => {
      const pt = (s.payment_type || s.payment_method || '').toLowerCase();
      if (filterPayment.value === 'cash') return pt === 'cash' || pt === 'efectivo';
      if (filterPayment.value === 'card') return pt === 'card' || pt === 'tarjeta' || pt === 'credit_card' || pt === 'debit_card';
      if (filterPayment.value === 'transfer') return pt === 'transfer' || pt === 'transferencia' || pt === 'bank_transfer';
      return true;
    });
  }

  // Date range filter
  if (dateFrom.value) {
    const from = new Date(dateFrom.value);
    from.setHours(0, 0, 0, 0);
    result = result.filter(s => s.created_at && new Date(s.created_at) >= from);
  }
  if (dateTo.value) {
    const to = new Date(dateTo.value);
    to.setHours(23, 59, 59, 999);
    result = result.filter(s => s.created_at && new Date(s.created_at) <= to);
  }

  return result;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSales.value.length / perPage.value)));

const paginatedSales = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return filteredSales.value.slice(start, start + perPage.value);
});

const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage.value > 3) pages.push('...');
    const start = Math.max(2, currentPage.value - 1);
    const end = Math.min(total - 1, currentPage.value + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage.value < total - 2) pages.push('...');
    pages.push(total);
  }
  return pages;
});

// Metrics
const salesToday = computed(() => {
  const today = new Date().toDateString();
  return filteredSales.value
    .filter(s => s.created_at && new Date(s.created_at).toDateString() === today)
    .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
});

const averageTicket = computed(() => {
  const total = filteredSales.value.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  return filteredSales.value.length > 0 ? total / filteredSales.value.length : 0;
});

const totalSales = computed(() => filteredSales.value.length);

// Methods
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
};

const paymentIcon = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'cash' || t === 'efectivo') return 'payments';
  if (t === 'card' || t === 'tarjeta' || t === 'credit_card' || t === 'debit_card') return 'credit_card';
  if (t === 'transfer' || t === 'transferencia' || t === 'bank_transfer') return 'account_balance';
  return 'receipt_long';
};

const paymentLabel = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'cash' || t === 'efectivo') return 'Efectivo';
  if (t === 'card' || t === 'tarjeta' || t === 'credit_card' || t === 'debit_card') return 'Tarjeta';
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

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

const resetFilters = () => {
  searchQuery.value = '';
  filterStatus.value = '';
  filterPayment.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  currentPage.value = 1;
};

const applyFilters = () => {
  currentPage.value = 1;
  // Data already filtered reactively via computed
};

const goToDetail = (sale) => router.push(`/app/sales/${sale.id}`);

const cancelSale = async (sale) => {
  if (!confirm(`¿Anular factura ${sale.invoice_number || ''}?`)) return;
  try {
    await salesAPI.cancel(sale.id);
    const res = await salesAPI.getAll();
    sales.value = normalizeSales(res.data || []);
  } catch (e) {
    console.error('Error al anular venta:', e);
  }
};

onMounted(async () => {
  try {
    const res = await salesAPI.getAll();
    sales.value = normalizeSales(res.data || []);
  } catch (e) {
    console.error('Error fetching sales:', e);
  }
});
</script>

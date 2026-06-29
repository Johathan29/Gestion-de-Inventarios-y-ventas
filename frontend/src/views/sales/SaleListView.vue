<template>
  <div class="px-4 md:px-12 pb-xl max-w-7xl mx-auto space-y-12">
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
      <!-- Advanced Filters -->
      <div class="p-lg border-b border-outline-variant/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 space-y-4 gap-4 p-8" style="background: #Fff;">
        <div class="flex flex-col gap-xs flex-1 min-w-[200px]">
          <label class="dt-label-caps">Rango de Fecha</label>
          <div class="flex items-center gap-sm bg-white px-4 py-4 border border-outline-variant/30 dt-focus-ring" style="border-radius: 12px;">
            <span class="material-symbols-outlined dt-body-md" style="color: #4f4539;">calendar_today</span>
            <input class="dt-body-sm border-none p-0 focus:ring-0 w-full outline-none bg-transparent" type="text" v-model="dateRangeText" placeholder="Seleccionar fechas" />
          </div>
        </div>
        <div class="flex flex-col gap-xs">
          <label class="dt-label-caps">Estado</label>
          <select v-model="filterStatus" class="dt-body-sm bg-white border-outline-variant/30 px-4 py-4 dt-focus-ring min-w-[140px]" style="border-radius: 12px; border-width: 1.5px; color: #0b1c30;">
            <option value="">Todos</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Reembolsado</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>
        <div class="flex flex-col gap-xs">
          <label class="dt-label-caps">Método de Pago</label>
          <select v-model="filterPayment" class="dt-body-sm bg-white border-outline-variant/30 px-4 py-4 dt-focus-ring min-w-[140px]" style="border-radius: 12px; border-width: 1.5px; color: #0b1c30;">
            <option value="">Todos</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        <div class="flex items-end self-end">
          <button @click="applyFilters" class="dt-btn dt-btn-secondary">
            <span class="material-symbols-outlined dt-body-md">filter_list</span>
            Aplicar Filtros
          </button>
        </div>
        <!-- Search -->
        <div class="flex items-end self-end">
          <div class="dt-search">
            <span class="material-symbols-outlined dt-search-icon dt-body-md">search</span>
            <input v-model="searchQuery" type="text" placeholder="Buscar factura o cliente..." class="dt-input dt-body-sm" style="padding-left: 2.5rem; border-radius: 12px; min-width: 200px;" />
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
              <td class="dt-financial">{{ formatCurrency(sale.total) }}</td>
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
                  <button @click.stop="$router.push(`/app/sales/${sale.id}`)" class="dt-btn-icon" title="Ver detalles">
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                  <button v-if="sale.status !== 'cancelled' && can('sales', 'create')" @click.stop="cancelSale(sale)" class="dt-btn-icon" title="Anular" style="color: #ba1a1a;">
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
              <span class="dt-financial">{{ formatCurrency(sale.total) }}</span>
              <button @click.stop="$router.push(`/app/sales/${sale.id}`)" class="dt-btn-icon" title="Ver detalles">
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
import { normalizeSales, formatCurrency, formatDate } from '../../utils';

const router = useRouter();
const { can } = useAuth();
const sales = ref([]);

// Filters
const searchQuery = ref('');
const filterStatus = ref('');
const filterPayment = ref('');
const dateRangeText = ref('');
const currentPage = ref(1);
const perPage = ref(10);

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

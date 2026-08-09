<template>
  <div class="px-gutter">
    <!-- Page Header -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> receipt_long </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Facturas"
            :description="`${total} factura${total !== 1 ? 's' : ''} registrada${total !== 1 ? 's' : ''}`"
            tag="h1"
          />
        </div>
        <div class="header-actions"></div>
      </div>
    </div>

    <!-- KPI Cards by Status — Dashboard style with counter animation -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter mb-6">
      <StatCard
        label="Monto Total"
        :value="invoiceStats.totalAmount"
        type="currency"
        icon="receipt"
        iconColor="#7c3aed"
        :subtext="`${invoiceStats.total} factura${invoiceStats.total !== 1 ? 's' : ''}`"
        variant="dashboard"
        :stagger-delay="0"
        :animate="true"
      />
      <StatCard
        label="Pagadas"
        :value="invoiceStats.paid.total"
        type="currency"
        icon="check_circle"
        iconColor="#059669"
        :subtext="`${invoiceStats.paid.count} factura${invoiceStats.paid.count !== 1 ? 's' : ''} pagadas`"
        variant="dashboard"
        :stagger-delay="100"
        :animate="true"
      />
      <StatCard
        label="Emitidas"
        :value="invoiceStats.issued.total"
        type="currency"
        icon="pending_actions"
        iconColor="#d97706"
        :subtext="`${invoiceStats.issued.count} factura${invoiceStats.issued.count !== 1 ? 's' : ''} emitidas`"
        variant="dashboard"
        :stagger-delay="200"
        :animate="true"
      />
      <StatCard
        label="Anuladas"
        :value="invoiceStats.cancelled.total"
        type="currency"
        icon="cancel"
        iconColor="#dc2626"
        :subtext="`${invoiceStats.cancelled.count} factura${invoiceStats.cancelled.count !== 1 ? 's' : ''} anuladas`"
        variant="dashboard"
        :stagger-delay="300"
        :animate="true"
      />
    </div>

    <!-- Filters -->
    <div class="aurora-raised-card !p-0 overflow-hidden mb-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-gutter p-4 items-end">
        <div class="flex-1 min-w-[200px]">
          <label class="block mb-1 font-medium text-xs text-on-surface-variant">Buscar</label>
          <input v-model="filters.search" @input="debouncedSearch" type="text" placeholder="Nombre o N° Factura..."
            class="aurora-search w-full" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-xs text-on-surface-variant">Estado</label>
          <select v-model="filters.status" @change="fetchInvoices" class="w-full aurora-select">
            <option value="">Todos</option>
            <option value="paid">Pagadas</option>
            <option value="issued">Emitidas</option>
            <option value="cancelled">Anuladas</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 font-medium text-xs text-on-surface-variant">Desde</label>
          <input v-model="filters.dateFrom" @change="fetchInvoices" type="date" class="aurora-input" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-xs text-on-surface-variant">Hasta</label>
          <input v-model="filters.dateTo" @change="fetchInvoices" type="date" class="aurora-input" />
        </div>
        <div class="flex gap-2">
          <button @click="clearFilters" title="Limpiar todos los campos" class="w-[9rem] p-[0.2rem] border border-on-surface-variant bg-[#ff000045] transition-colors duration-300  hover:text-white hover:bg-red-500 rounded-[12px] border-red-100 text-red-600 text-sm font-medium flex items-center gap-1 justify-center">
            <span class="material-icons-outlined" style="font-size: 1rem;">clear</span>
            Limpiar
          </button>
        </div>
      </div>
    </div>

    <div class="aurora-raised-card !p-0 overflow-hidden">
      <DataTable :columns="columns" :data="invoices" title="Lista de Facturas" :server-pagination="true" :total="total" :current-page-prop="page" :per-page="limit" @page-change="changePage" @sort-change="onSortChange">
        <template #cell-status="{ row }">
          <span class="aurora-badge" :class="row.status === 'paid' ? 'aurora-badge-success' : row.status === 'issued' ? 'aurora-badge-warning' : 'aurora-badge-danger'">
            {{ statusLabel(row.status) }}
          </span>
        </template>
        <template #cell-total="{ row }">
          <span class="text-sm font-semibold font-mono" style="color: var(--aurora-primary);">{{ formatTable(row.total) }}</span>
        </template>
        <template #cell-paidAt="{ row }">
          <span v-if="row.paidAt" class="text-sm" style="color: var(--aurora-success, #059669);">{{ formatDate(row.paidAt) }}</span>
          <span v-else class="text-on-surface-variant text-xs">—</span>
        </template>
        <template #actions="{ row }">
          <div class="flex items-center gap-1">
            <button @click.stop="downloadPDF(row)"
                    class="aurora-btn-icon"
                    style="color: #dc2626;"
                    title="Descargar PDF">
              <span class="material-icons-outlined" style="font-size: 0.875rem;">picture_as_pdf</span>
            </button>
            <button v-if="row.status === 'issued'"
                    @click.stop="markAsPaid(row)"
                    class="aurora-btn-primary text-xs px-3 py-1.5">
              <span class="material-icons-outlined" style="font-size: 0.875rem;">paid</span>
              Pagada
            </button>
            <button @click.stop="goToDetail(row)" class="aurora-btn-icon">
              <span class="material-icons-outlined" style="font-size: 0.875rem;">visibility</span>
              Ver
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-3 px-0 mt-4">
      <div v-for="inv in invoices" :key="inv.id"
           class="aurora-raised-card cursor-pointer"
           @click="goToDetail(inv)">
        <div class="flex items-center justify-between mb-2">
          <span class="font-mono text-sm font-semibold text-on-surface">#{{ inv.invoiceNumber || 'N/A' }}</span>
          <span class="aurora-badge" :class="inv.status === 'paid' ? 'aurora-badge-success' : inv.status === 'issued' ? 'aurora-badge-warning' : 'aurora-badge-danger'">
            {{ statusLabel(inv.status) }}
          </span>
        </div>
        <div class="flex items-center gap-2 mb-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0" style="background: rgba(139,92,246,0.12); color: var(--aurora-primary);">
            {{ (inv.clientName || '?').charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm truncate text-on-surface">{{ inv.clientName || '—' }}</p>
            <p class="text-xs text-on-surface-variant">{{ formatDate(inv.createdAt) }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between pt-2" style="border-top: 1px solid var(--aurora-outline-variant);">
          <div>
            <span class="text-xs text-on-surface-variant">Total</span>
            <p class="text-sm font-semibold font-mono" style="color: var(--aurora-primary);">{{ formatTable(inv.total) }}</p>
          </div>
          <div v-if="inv.paidAt" class="text-right">
            <span class="text-xs text-on-surface-variant">Pagada</span>
            <p class="text-xs font-medium" style="color: var(--aurora-success, #059669);">{{ formatDate(inv.paidAt) }}</p>
          </div>
        </div>
      </div>
      <div v-if="invoices.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
        <span class="material-icons-outlined mb-2" style="font-size: 48px; color: var(--aurora-outline);">receipt</span>
        <p class="text-on-surface-variant">No hay facturas registradas</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import { invoicesAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';
import PageHeader from '../../components/shared/PageHeader.vue';
import StatCard from '../../components/shared/StatCard.vue';
import { useCurrency } from '../../composables/useCurrency';
import { formatDate } from '../../utils';

const { formatTable } = useCurrency();
const router = useRouter();
const invoices = ref([]);
const page = ref(1);
const limit = 15;
const total = ref(0);
const sortKey = ref('createdAt');
const sortDir = ref('desc');
const filters = reactive({ search: '', status: '', dateFrom: '', dateTo: '' });
let searchTimeout = null;

const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchInvoices();
  }, 400);
};

const clearFilters = () => {
  filters.search = '';
  filters.status = '';
  filters.dateFrom = '';
  filters.dateTo = '';
  page.value = 1;
  fetchInvoices();
};

const invoiceStats = computed(() => {
  const invs = invoices.value;
  const paid = invs.filter(i => i.status === 'paid');
  const issued = invs.filter(i => i.status === 'issued');
  const cancelled = invs.filter(i => i.status === 'cancelled');
  return {
    total: invs.length,
    totalAmount: invs.reduce((sum, i) => sum + (Number(i.total) || 0), 0),
    paid: {
      count: paid.length,
      total: paid.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
    },
    issued: {
      count: issued.length,
      total: issued.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
    },
    cancelled: {
      count: cancelled.length,
      total: cancelled.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
    }
  };
});

const columns = [
  { key: 'invoiceNumber', label: 'N° Factura', sortable: true },
  { key: 'clientName', label: 'Cliente' },
  { key: 'total', label: 'Total', type: 'custom', sortable: true },
  { key: 'paidAt', label: 'Pagada', type: 'custom' },
  { key: 'status', label: 'Estado', type: 'custom' },
  { key: 'createdAt', label: 'Creada', type: 'date', sortable: true }
];

function statusBadgeClass(status) {
  if (status === 'paid') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'issued') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function statusLabel(status) {
  if (status === 'paid') return 'PAGADA';
  if (status === 'issued') return 'EMITIDA';
  if (status === 'cancelled') return 'ANULADA';
  return status || '—';
}

const goToDetail = (row) => router.push(`/app/invoices/${row.id}`);

const markAsPaid = async (row) => {
  const result = await Swal.fire({
    title: '¿Marcar como pagada?',
    text: `Factura ${row.invoiceNumber} será marcada como pagada`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, pagada',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#059669'
  });
  if (!result.isConfirmed) return;
  try {
    await invoicesAPI.updatePaymentStatus(row.id, 'paid');
    await Swal.fire('Pagada', 'Factura marcada como pagada', 'success');
    await fetchInvoices();
  } catch (e) {
    Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
  }
};

const changePage = (p) => { page.value = p; fetchInvoices(); };

const onSortChange = ({ key, dir }) => {
  sortKey.value = key;
  sortDir.value = dir;
  page.value = 1;
  fetchInvoices();
};

const downloadPDF = async (row) => {
  try {
    const response = await invoicesAPI.getPdf(row.id);
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `factura-${row.invoiceNumber || row.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (e) {
    console.error('[InvoiceList] Error downloading PDF:', e);
    Swal.fire('Error', 'No se pudo descargar el PDF', 'error');
  }
};

async function fetchInvoices() {
  try {
    const cleanFilters = {};
    if (filters.search) cleanFilters.search = filters.search;
    if (filters.status) cleanFilters.status = filters.status;
    if (filters.dateFrom) cleanFilters.startDate = filters.dateFrom;
    if (filters.dateTo) cleanFilters.endDate = filters.dateTo;
    // También enviar como fromDate/toDate para compatibilidad
    if (filters.dateFrom) cleanFilters.fromDate = filters.dateFrom;
    if (filters.dateTo) cleanFilters.toDate = filters.dateTo;
    const res = await invoicesAPI.getAll({ ...cleanFilters, page: page.value, limit, sortBy: sortKey.value, sortOrder: sortDir.value });
    invoices.value = res.data || [];
    total.value = res.pagination?.total || 0;
  } catch (e) {
    console.error('[InvoiceList] Error loading invoices:', e);
  }
}

onMounted(fetchInvoices);
</script>

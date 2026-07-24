<template>
  <div class="space-y-4 aurora-entrance">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
      <div
        class="mesh-gradient-header"
        style="
          background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
        "
      >
        <div class="header-icon-container">
          <span class="material-symbols-outlined animate-header-icon"> account_balance </span>
        </div>
        <div class="header-glass">
          <div class="header-information">
            <PageHeader
              title="Reporte de Caja"
              description="Consulta de turnos y movimientos de caja registradora"
              tag="h1"
            />
          </div>
          <div class="header-actions">
            <button @click="downloadPDF" class="aurora-header-button aurora-header-button-primary">
              <span class="material-symbols-outlined"> picture_as_pdf </span>
              PDF
            </button>
            <button @click="downloadExcel" class="aurora-header-button aurora-header-button-secondary">
              <span class="material-symbols-outlined"> table_chart </span>
              Excel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="aurora-raised-card">
      <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--aurora-on-surface-variant);">Usuario</label>
          <select v-model="filters.user_id" class="aurora-select">
            <option value="">Todos los usuarios</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--aurora-on-surface-variant);">Desde</label>
          <input v-model="filters.from_date" type="datetime-local" class="aurora-select" />
        </div>
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--aurora-on-surface-variant);">Hasta</label>
          <input v-model="filters.to_date" type="datetime-local" class="aurora-select" />
        </div>
        <div class="self-end">
          <button @click="fetchData" class="aurora-btn-primary aurora-btn-hover" style="padding: 8px 16px; font-size: 0.8rem;">
            <span class="material-symbols-outlined text-[16px]">search</span>
            Consultar
          </button>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="aurora-stat-card">
        <p class="aurora-badge aurora-badge-primary mb-2">Total Turnos</p>
        <h3 class="text-[28px] font-bold text-on-surface">{{ summary.total_sessions }}</h3>
        <p class="text-xs text-on-surface-variant">En el período seleccionado</p>
      </div>
      <div class="aurora-stat-card">
        <p class="aurora-badge aurora-badge-success mb-2">Total Ventas</p>
        <h3 class="text-[28px] font-bold text-on-surface">${{ formatPrice(summary.total_sales) }}</h3>
        <p class="text-xs text-on-surface-variant">Suma de ventas en turnos</p>
      </div>
      <div class="aurora-stat-card">
        <p class="aurora-badge aurora-badge-warning mb-2">Total Impuestos</p>
        <h3 class="text-[28px] font-bold text-on-surface">${{ formatPrice(summary.total_tax) }}</h3>
        <p class="text-xs text-on-surface-variant">Impuestos recaudados</p>
      </div>
      <div class="aurora-stat-card">
        <p class="aurora-badge aurora-badge-info mb-2">Diferencias</p>
        <h3 class="text-[28px] font-bold" :class="summary.difference >= 0 ? 'text-green-600' : 'text-red-600'">${{ formatPrice(summary.difference) }}</h3>
        <p class="text-xs text-on-surface-variant">Balance total</p>
      </div>
    </div>

    <!-- Sessions Table -->
    <div class="aurora-raised-card !p-0 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2" style="border-color: var(--aurora-primary);"></div>
      </div>
      <div v-else-if="!sessions.length" class="text-sm text-on-surface-variant text-center py-8">
        No hay turnos en el período seleccionado.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="aurora-table">
          <thead>
            <tr>
              <th class="text-left">Cajero</th>
              <th class="text-left">Apertura</th>
              <th class="text-left">Cierre</th>
              <th class="text-right">Inicial</th>
              <th class="text-right">Esperado</th>
              <th class="text-right">Real</th>
              <th class="text-right">Diferencia</th>
              <th class="text-right">Ventas</th>
              <th class="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sessions" :key="s.id" class="cursor-pointer hover:bg-surface-container-high" @click="viewDetail(s)">
              <td class="text-on-surface font-medium">{{ s.users?.name || '—' }}</td>
              <td class="text-on-surface-variant text-xs">{{ formatDateTime(s.opened_at) }}</td>
              <td class="text-on-surface-variant text-xs">{{ s.closed_at ? formatDateTime(s.closed_at) : '-' }}</td>
              <td class="text-right text-on-surface">${{ formatPrice(s.opening_balance) }}</td>
              <td class="text-right text-on-surface">${{ formatPrice(s.expected_balance || 0) }}</td>
              <td class="text-right text-on-surface">${{ formatPrice(s.closing_balance || 0) }}</td>
              <td class="text-right font-bold" :class="getDiffClass(s.difference)">
                ${{ formatPrice(s.difference || 0) }}
              </td>
              <td class="text-right text-on-surface">{{ s.sales_count || 0 }}</td>
              <td class="text-center">
                <span class="aurora-badge" :class="s.status === 'closed' ? 'aurora-badge-secondary' : s.status === 'reconciled' ? 'aurora-badge-success' : 'aurora-badge-info'">
                  {{ s.status === 'closed' ? 'Cerrado' : s.status === 'reconciled' ? 'Conciliado' : 'Abierto' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail Modal -->
    <Modal :show="showDetail" :title="'Detalle del Turno - ' + (selectedSession?.users?.name || '')" @close="showDetail = false" size="xl">
      <div v-if="detailLoading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2" style="border-color: var(--aurora-primary);"></div>
      </div>
      <div v-else-if="detailData">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="p-3" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Apertura</p>
            <p class="text-sm font-semibold text-on-surface">{{ formatDateTime(detailData.opened_at) }}</p>
          </div>
          <div class="p-3" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Cierre</p>
            <p class="text-sm font-semibold text-on-surface">{{ detailData.closed_at ? formatDateTime(detailData.closed_at) : '—' }}</p>
          </div>
          <div class="p-3" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Total Ventas</p>
            <p class="text-sm font-bold" style="color: var(--aurora-primary);">${{ formatPrice(detailData.total_sales || 0) }}</p>
          </div>
          <div class="p-3" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Diferencia</p>
            <p class="text-sm font-bold" :class="getDiffClass(detailData.difference)">${{ formatPrice(detailData.difference || 0) }}</p>
          </div>
        </div>
        <h4 class="font-semibold text-sm text-on-surface mb-3">Productos Vendidos</h4>
        <div class="overflow-x-auto">
          <table class="aurora-table w-full">
            <thead>
              <tr>
                <th class="text-left">Producto</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">P. Unit.</th>
                <th class="text-right">Subtotal</th>
                <th class="text-right">Impuesto</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in detailData.items" :key="idx">
                <td class="text-on-surface">{{ item.product_name || '—' }}</td>
                <td class="text-right text-on-surface">{{ item.quantity }}</td>
                <td class="text-right text-on-surface">${{ formatPrice(item.unit_price) }}</td>
                <td class="text-right text-on-surface">${{ formatPrice((item.quantity || 0) * (item.unit_price || 0)) }}</td>
                <td class="text-right text-on-surface">${{ formatPrice(item.tax || 0) }}</td>
                <td class="text-right font-bold text-on-surface">${{ formatPrice(item.total) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-right font-bold text-on-surface">Totales</td>
                <td class="text-right font-bold text-on-surface">${{ formatPrice(detailData.subtotal || 0) }}</td>
                <td class="text-right font-bold text-on-surface">${{ formatPrice(detailData.total_tax || 0) }}</td>
                <td class="text-right font-bold text-on-surface" style="color: var(--aurora-primary);">${{ formatPrice(detailData.total_sales || 0) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import PageHeader from '../../components/shared/PageHeader.vue';
import Modal from '../../components/shared/Modal.vue';
import { cashRegisterAPI, salesAPI, usersAPI } from '../../api';
import { useCurrency } from '../../composables/useCurrency';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const { format: formatPrice, formatTable } = useCurrency();

const users = ref([]);
const sessions = ref([]);
const loading = ref(false);
const showDetail = ref(false);
const detailLoading = ref(false);
const selectedSession = ref(null);
const detailData = ref(null);
const summary = ref(null);

const filters = reactive({
  user_id: '',
  from_date: '',
  to_date: ''
});

const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-CO') : '-';

const getDiffClass = (diff) => {
  if (!diff || diff === 0) return 'text-gray-500';
  return diff > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
};

const fetchUsers = async () => {
  try {
    const res = await usersAPI.getAll({ limit: 999 });
    users.value = res.data || [];
  } catch (e) { /* ignore */ }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filters.user_id) params.user_id = filters.user_id;
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;

    const res = await cashRegisterAPI.getSessions({ ...params, limit: 9999 });
    sessions.value = res.data || [];

    // Calculate summary
    let totalSales = 0;
    let totalTax = 0;
    let totalDiff = 0;

    // Fetch sales data for each session to calculate tax
    for (const session of sessions.value) {
      totalDiff += (session.difference || 0);
      if (session.sales_count > 0) {
        const saleParams = {
          start_date: session.opened_at?.split('T')[0],
          end_date: session.closed_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          limit: 9999
        };
        try {
          const saleRes = await salesAPI.getAll(saleParams);
          const salesList = saleRes.data || [];
          salesList.forEach(sale => {
            const items = sale.items || sale.sale_items || [];
            items.forEach(item => {
              totalSales += item.total || ((item.quantity || 1) * (item.unit_price || item.price || 0)) + (item.tax || 0);
              totalTax += item.tax || 0;
            });
          });
        } catch (e) { /* ignore */ }
      }
    }

    summary.value = {
      total_sessions: sessions.value.length,
      total_sales: totalSales,
      total_tax: totalTax,
      difference: totalDiff
    };
  } catch (e) {
    console.error('Error fetching report:', e);
  } finally {
    loading.value = false;
  }
};

const viewDetail = async (session) => {
  selectedSession.value = session;
  showDetail.value = true;
  detailLoading.value = true;
  detailData.value = null;
  try {
    const params = {
      fromDate: session.opened_at,
      toDate: session.closed_at || new Date().toISOString(),
      limit: 9999
    };
    const res = await salesAPI.getAll(params);
    const salesList = res.data || [];
    const allItems = [];
    let totalSales = 0;
    let totalTax = 0;
    let subtotal = 0;

    salesList.forEach(sale => {
      const items = sale.items || sale.sale_items || [];
      items.forEach(item => {
        const qty = item.quantity || 1;
        const price = item.unit_price || item.price || 0;
        const tax = item.tax || 0;
        const itemTotal = (qty * price) + tax;
        allItems.push({
          product_name: item.product_name || item.products?.name || 'Producto',
          quantity: qty,
          unit_price: price,
          tax,
          total: itemTotal
        });
        totalSales += itemTotal;
        totalTax += tax;
        subtotal += qty * price;
      });
    });

    detailData.value = {
      opened_at: session.opened_at,
      closed_at: session.closed_at,
      opening_balance: session.opening_balance,
      closing_balance: session.closing_balance,
      difference: session.difference,
      total_sales: totalSales,
      total_tax: totalTax,
      subtotal,
      items: allItems
    };
  } catch (e) {
    console.error('Error loading detail:', e);
  } finally {
    detailLoading.value = false;
  }
};

const downloadPDF = () => {
  if (!sessions.value.length) return;
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text('Reporte de Caja', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Período: ${filters.from_date || 'Inicio'} - ${filters.to_date || 'Fin'}`, 14, 30);

  const rows = sessions.value.map((s, i) => [
    i + 1,
    s.users?.name || '—',
    formatDateTime(s.opened_at),
    s.closed_at ? formatDateTime(s.closed_at) : '-',
    `$${formatPrice(s.opening_balance)}`,
    `$${formatPrice(s.closing_balance || 0)}`,
    `$${formatPrice(s.difference || 0)}`,
    s.sales_count || 0
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Cajero', 'Apertura', 'Cierre', 'Inicial', 'Real', 'Dif.', 'Ventas']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [124, 58, 237] }
  });

  doc.save('reporte-caja.pdf');
};

const downloadExcel = () => {
  if (!sessions.value.length) return;
  const wb = XLSX.utils.book_new();

  const data = [
    ['#', 'Cajero', 'Apertura', 'Cierre', 'Saldo Inicial', 'Saldo Real', 'Diferencia', 'Ventas'],
    ...sessions.value.map((s, i) => [
      i + 1, s.users?.name || '—',
      formatDateTime(s.opened_at),
      s.closed_at ? formatDateTime(s.closed_at) : '-',
      s.opening_balance, s.closing_balance || 0,
      s.difference || 0, s.sales_count || 0
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Turnos');
  XLSX.writeFile(wb, 'reporte-caja.xlsx');
};

fetchUsers();
</script>
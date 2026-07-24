<template>
  <div class="space-y-4 aurora-entrance">
    <!-- Mesh-gradient PageHeader -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> people </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Reporte de Clientes"
            description="Análisis de clientes registrados"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <button @click="$router.push('/app/reports')" class="aurora-header-button aurora-header-button-secondary">
            <span class="material-symbols-outlined" style="font-size: 1.125rem;">arrow_back</span>
            Volver
          </button>
          <button @click="handleDownloadPDF" class="aurora-header-button aurora-header-button-primary">
            <span class="material-symbols-outlined"> picture_as_pdf </span>
            PDF
          </button>
          <button @click="handleDownloadExcel" class="aurora-header-button aurora-header-button-secondary">
            <span class="material-symbols-outlined"> table_chart </span>
            Excel
          </button>
        </div>
      </div>
    </div>

    <div class="nexus-card p-6">
    <!-- Summary Cards — Stitch style with counter animation -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Total Clientes" :value="allClientsForCharts.length" icon="people" cardBg="#ffffff" iconBg="rgba(124,58,237,0.12)" iconColor="#7c3aed" :stagger-delay="0" :animate="true" />
      <StatCard label="Ingresos Totales" :value="totalClientRevenue" type="currency" icon="trending_up" cardBg="#ffffff" iconBg="rgba(22,163,74,0.12)" iconColor="#16a34a" subtext="Suma total de compras" :stagger-delay="100" :animate="true" />
      <StatCard label="Ticket Promedio" :value="avgClientTicket" type="currency" icon="receipt" cardBg="#ffffff" iconBg="rgba(217,119,6,0.12)" iconColor="#d97706" subtext="Por cliente" :stagger-delay="200" :animate="true" />
      <StatCard label="Clientes VIP" :value="vipClientCount" icon="workspace_premium" cardBg="#ffffff" iconBg="rgba(239,68,68,0.12)" iconColor="#dc2626" subtext="10+ compras" :stagger-delay="300" :animate="true" />
    </div>

    <!-- Client Chart -->
    <div class="rounded-xl p-4 mb-6" style="background: #f5f3ff;">
      <p class="font-semibold mb-3" style="color: #1e293b;">Top Clientes por Compras</p>
      <div class="chart-container" style="height: 280px;">
        <canvas ref="chartRef"></canvas>
      </div>
    </div>

    <DataTable :columns="columns" :data="clients" :server-pagination="true" :total="total" @page-change="changePage" searchable>
      <template #cell-total="{ row }">{{ formatTable(row.total_purchases) }}</template>
    </DataTable>
    <!-- Paginación -->
    <div v-if="total > limit" class="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-100">
      <button :disabled="page <= 1" @click="changePage(page - 1)" class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100" style="color: #64748b;">
        <span class="material-icons-outlined text-lg">chevron_left</span>
      </button>
      <span style="color: #94a3b8; font-size: 0.875rem;">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button :disabled="page >= Math.ceil(total / limit)" @click="changePage(page + 1)" class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100" style="color: #64748b;">
        <span class="material-icons-outlined text-lg">chevron_right</span>
      </button>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-4 mt-4">
      <div v-for="c in clients" :key="c.id"
           class="nexus-card !p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase shrink-0" style="background: rgba(139,92,246,0.12); color: #7c3aed;">
            {{ (c.name || '?').charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate" style="color: #1e293b;">{{ c.name || '—' }}</p>
            <p v-if="c.document_id" class="text-xs" style="color: #94a3b8;">{{ c.document_id }}</p>
          </div>
          <span v-if="getTypology(c) === 'VIP'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">{{ getTypology(c) }}</span>
          <span v-else-if="getTypology(c) === 'Frecuente'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">{{ getTypology(c) }}</span>
          <span v-else-if="getTypology(c) === 'Regular'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">{{ getTypology(c) }}</span>
          <span v-else class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-500 border-gray-200">{{ getTypology(c) }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm pt-2" style="border-top: 1px solid #e2e8f0;">
          <div>
            <span class="text-xs" style="color: #94a3b8;">Compras</span>
            <p class="font-medium" style="color: #1e293b;">{{ c.purchase_count || 0 }}</p>
          </div>
          <div>
            <span class="text-xs" style="color: #94a3b8;">Total</span>
            <p class="font-semibold" style="color: #7c3aed;">{{ formatTable(c.total_purchases) }}</p>
          </div>
        </div>
      </div>
      <div v-if="clients.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
        <span class="material-icons-outlined" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 0.5rem;">people</span>
        <p style="color: #94a3b8; font-family: 'Inter', sans-serif; font-size: 0.875rem;">No hay clientes registrados</p>
      </div>
    </div>
    </div>

    <!-- Download Progress Modal -->
    <AuroraDownloadModal
      :visible="showDownloadModal"
      :title="modalTitle"
      :subtitle="modalSubtitle"
      :success-message="modalSuccessMessage"
      :file-name="modalFileName"
      :download-fn="currentDownloadFn"
      @close="showDownloadModal = false"
    />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { reportsAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';
import PageHeader from '../../components/shared/PageHeader.vue';
import StatCard from '../../components/shared/StatCard.vue';
import AuroraDownloadModal from '../../components/shared/AuroraDownloadModal.vue';
import { useCurrency } from '../../composables/useCurrency';

const { formatTable } = useCurrency();
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

const clients = ref([]);
const allClientsForCharts = ref([]); // Full data for charts/exports
const page = ref(1);
const limit = 20;
const total = ref(0);
const chartRef = ref(null);
let chart = null;

// Download modal state
const showDownloadModal = ref(false);
const currentDownloadFn = ref(null);
const modalTitle = ref('Generating PDF Report...');
const modalSubtitle = ref('Please wait while Aurora ERP compiles your data and performance metrics.');
const modalSuccessMessage = ref('Your report is ready for download.');
const modalFileName = ref('report.pdf');

const handleDownloadPDF = () => {
  modalTitle.value = 'Generating Clients Report...';
  modalSubtitle.value = 'Compiling client data, purchase history, and performance metrics.';
  modalSuccessMessage.value = 'Your clients report is ready.';
  modalFileName.value = 'reporte-clientes.pdf';
  currentDownloadFn.value = downloadPDF;
  showDownloadModal.value = true;
};

const handleDownloadExcel = () => {
  modalTitle.value = 'Generating Excel Report...';
  modalSubtitle.value = 'Structuring client data tables and preparing spreadsheet export.';
  modalSuccessMessage.value = 'Your Excel report is ready.';
  modalFileName.value = 'reporte-clientes.xlsx';
  currentDownloadFn.value = downloadExcel;
  showDownloadModal.value = true;
};
const columns = [
  { key: 'name', label: 'Cliente', sortable: true },
  { key: 'document_id', label: 'Documento' },
  { key: 'purchase_count', label: 'Compras', type: 'number', sortable: true },
  { key: 'total', label: 'Total Comprado', type: 'currency', sortable: true }
];

const totalClientRevenue = computed(() => allClientsForCharts.value.reduce((s, c) => s + Number(c.total_purchases || 0), 0));
const avgClientTicket = computed(() => allClientsForCharts.value.length ? totalClientRevenue.value / allClientsForCharts.value.length : 0);
const vipClientCount = computed(() => allClientsForCharts.value.filter(c => (c.purchase_count || 0) >= 10).length);

function getTypology(client) {
  const count = client.purchase_count || 0;
  if (count >= 10) return 'VIP';
  if (count >= 5) return 'Frecuente';
  if (count >= 2) return 'Regular';
  return 'Ocasional';
}

function getTypologyClass(client) {
  // Kept for compatibility, badges now rendered inline in template
  return '';
}

const mapClients = (raw) => (Array.isArray(raw) ? raw : []);

const changePage = (newPage) => {
  page.value = newPage;
  fetchClientsPage();
};

const fetchClientsPage = async () => {
  try {
    const pRes = await reportsAPI.clients({ page: page.value, limit }).catch(() => ({ data: [], pagination: { total: 0 } }));
    const raw = pRes.data || [];
    clients.value = mapClients(raw);
    total.value = pRes.pagination?.total || 0;
  } catch (e) { /* ignore */ }
};

const buildChart = () => {
  const top = [...allClientsForCharts.value].sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0)).slice(0, 8);
  nextTick(() => {
    if (chart) chart.destroy();
    if (chartRef.value) {
      chart = new Chart(chartRef.value, {
        type: 'bar',
        data: {
          labels: top.map(c => c.name),
          datasets: [
            { label: 'Total Comprado ($)', data: top.map(c => c.total_purchases || 0), backgroundColor: '#059669', borderRadius: 6 },
            { label: 'Compras Realizadas', data: top.map(c => c.purchase_count || 0), backgroundColor: '#6a1b8a', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 16 } } },
          scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } }
        }
      });
    }
  });
};

onMounted(async () => {
  try {
    const [fullRes, pRes] = await Promise.all([
      reportsAPI.clients({}).catch(() => ({ data: [] })),
      reportsAPI.clients({ page: 1, limit }).catch(() => ({ data: [], pagination: { total: 0 } }))
    ]);
    // Full data for charts + exports
    allClientsForCharts.value = fullRes.data || [];
    // First paginated page for table
    clients.value = pRes.data || [];
    total.value = pRes.pagination?.total || 0;
    buildChart();
  } catch (e) { /* ignore */ }
});

onUnmounted(() => { if (chart) chart.destroy(); });

const downloadPDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text('Reporte de Clientes', 14, 22);
  doc.setFontSize(10);
  doc.text(`Total de clientes: ${allClientsForCharts.value.length}`, 14, 32);
  const tableData = allClientsForCharts.value.map(c => [c.name, c.document_id || '', String(c.purchase_count || 0), `$${Number(c.total || 0).toLocaleString('es-CO')}`]);
  autoTable(doc, { startY: 40, head: [['Cliente', 'Documento', 'Compras', 'Total Comprado']], body: tableData, headStyles: { fillColor: [106, 27, 138] } });
  doc.save('reporte-clientes.pdf');
};

const downloadExcel = () => {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Reporte de Clientes'], [],
    ['Cliente', 'Documento', 'Compras', 'Total Comprado'],
    ...allClientsForCharts.value.map(c => [c.name, c.document_id || '', c.purchase_count || 0, c.total || 0])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, 'reporte-clientes.xlsx');
};
</script>

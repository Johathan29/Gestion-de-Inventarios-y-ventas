<template>
  <div class="space-y-4 aurora-entrance">
    <!-- Mesh-gradient PageHeader -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);"
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> trending_up </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Productos Más Vendidos"
            description="Ranking de productos con mayores ventas"
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

    <div class="nexus-card overflow-hidden">
    <!-- Filter/Sort Bar -->
    <div class="filter-bar-container p-4 border-b border-gray-100 flex justify-between items-center" style="background: #ffffff;">
      <div class="flex gap-2">
        <button @click="showFilters = !showFilters"
          class="border !px-3 !py-1.5 flex items-center gap-1 border-[var(--aurora-outline-variant)] hover:!bg-[#9161f4] hover:text-white transition-colors duration-200 rounded-md text-[#9161f4] bg-white aurora-pressed"
          :class="{ '!bg-[#9161f4] !text-white': showFilters }">
          <span class="material-symbols-outlined" style="font-size: 1rem;">filter_list</span>
          Filtrar
        </button>
      </div>
      <div class="flex items-center gap-2">
        <button @click="handleDownloadPDF"
          class="btn btn-sm btn-ghost">
          <span class="material-icons-outlined" style="font-size: 1.125rem;">picture_as_pdf</span> PDF
        </button>
        <button @click="handleDownloadExcel"
          class="btn btn-sm btn-ghost">
          <span class="material-icons-outlined" style="font-size: 1.125rem;">table_chart</span> Excel
        </button>
      </div>
    </div>

    <!-- Filter Panel -->
    <div v-if="showFilters" class="filter-panel-container px-4 py-4 border-b border-gray-100" style="background: #f8fafc;">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block mb-1 font-medium text-xs" style="color: #64748b;">Límite</label>
          <select v-model="limit" @change="fetchData" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all border" style="color: #1e293b; border-color: #e2e8f0;">
            <option value="5">5</option><option value="10">10</option><option value="20">20</option>
          </select>
        </div>
      </div>
    </div>

    <div class="p-6">
      <!-- Summary Cards — Stitch style with counter animation -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Productos en Top" :value="products.length" icon="star" cardBg="#ffffff" iconBg="rgba(124,58,237,0.12)" iconColor="#7c3aed" :subtext="`Mostrando ${limit} productos`" :stagger-delay="0" :animate="true" />
        <StatCard label="Ingresos Totales" :value="totalRevenue" type="currency" icon="trending_up" cardBg="#ffffff" iconBg="rgba(22,163,74,0.12)" iconColor="#16a34a" :stagger-delay="100" :animate="true" />
        <StatCard label="Unidades Vendidas" :value="totalUnits" icon="inventory" cardBg="#ffffff" iconBg="rgba(217,119,6,0.12)" iconColor="#d97706" :stagger-delay="200" :animate="true" />
      </div>

      <!-- Chart -->
      <div class="nexus-card !p-4 mb-6">
        <p class="font-semibold mb-3" style="color: #1e293b;">Top Productos por Ventas</p>
        <div class="chart-container" style="height: 300px;">
          <canvas ref="chartRef"></canvas>
        </div>
      </div>

      <!-- Product List Header -->
      <div class="flex items-center justify-between mb-4">
        <p class="font-semibold" style="color: #1e293b;">Listado de Productos</p>
        <p class="text-xs" style="color: #94a3b8;">Mostrando {{ paginatedProducts.length }} de {{ products.length }} productos</p>
      </div>

    <div class="space-y-3">
      <div v-for="(p, idx) in paginatedProducts" :key="p.id || idx" class="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-purple-50/30">
        <span class="w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm shrink-0"
              :class="idx + displayOffset === 0 ? 'bg-yellow-100 text-yellow-700' : idx + displayOffset === 1 ? 'bg-gray-200 text-gray-600' : idx + displayOffset === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'">
          {{ idx + 1 + displayOffset }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate" style="color: #1e293b;">{{ p.name }}</p>
          <p class="text-xs font-mono" style="color: #94a3b8;">SKU: {{ p.sku }} · {{ p.total_quantity }} vendidos</p>
        </div>
        <div class="text-right shrink-0">
          <p class="font-semibold" style="color: #1e293b;">{{ formatTable(p.total_sales) }}</p>
          <p class="text-xs" style="color: #94a3b8;">{{ p.total_quantity }} uds.</p>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
      <span class="text-xs" style="color: #94a3b8;">Página {{ displayPage }} de {{ displayTotalPages }}</span>
      <div class="flex gap-2">
        <button :disabled="displayPage <= 1" @click="displayPage--"
          class="px-3 py-1.5 text-sm font-medium border rounded-md transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default"
          style="border-color: #e2e8f0; color: #64748b; background: white;">
          Anterior
        </button>
        <button :disabled="displayPage >= displayTotalPages" @click="displayPage++"
          class="px-3 py-1.5 text-sm font-medium border rounded-md transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default"
          style="border-color: #e2e8f0; color: #64748b; background: white;">
          Siguiente
        </button>
      </div>
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
</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { reportsAPI } from '../../api';
import { useCurrency } from '../../composables/useCurrency';
import StatCard from '../../components/shared/StatCard.vue';
import AuroraDownloadModal from '../../components/shared/AuroraDownloadModal.vue';
import PageHeader from '../../components/shared/PageHeader.vue';

const { formatTable } = useCurrency();
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

const limit = ref(10);
const showFilters = ref(false);
const products = ref([]);
const chartRef = ref(null);
let chart = null;
const displayPage = ref(1);
const displayPageSize = 10;

// Download modal state
const showDownloadModal = ref(false);
const currentDownloadFn = ref(null);
const modalTitle = ref('Generating PDF Report...');
const modalSubtitle = ref('Please wait while Aurora ERP compiles your data and performance metrics.');
const modalSuccessMessage = ref('Your report is ready for download.');
const modalFileName = ref('report.pdf');

const handleDownloadPDF = () => {
  modalTitle.value = 'Generating Top Products Report...';
  modalSubtitle.value = 'Compiling best-selling products data and revenue metrics.';
  modalSuccessMessage.value = 'Your top products report is ready.';
  modalFileName.value = 'top-productos.pdf';
  currentDownloadFn.value = downloadPDF;
  showDownloadModal.value = true;
};

const handleDownloadExcel = () => {
  modalTitle.value = 'Generating Excel Report...';
  modalSubtitle.value = 'Structuring products data tables and preparing spreadsheet export.';
  modalSuccessMessage.value = 'Your Excel report is ready.';
  modalFileName.value = 'top-productos.xlsx';
  currentDownloadFn.value = downloadExcel;
  showDownloadModal.value = true;
};

const displayOffset = computed(() => (displayPage.value - 1) * displayPageSize);

const totalRevenue = computed(() => products.value.reduce((sum, p) => sum + Number(p.total_sales || 0), 0));
const totalUnits = computed(() => products.value.reduce((sum, p) => sum + Number(p.total_quantity || 0), 0));

const paginatedProducts = computed(() => {
  const start = displayOffset.value;
  return products.value.slice(start, start + displayPageSize);
});

const displayTotalPages = computed(() => Math.max(1, Math.ceil(products.value.length / displayPageSize)));

const fetchData = async () => {
  try { const res = await reportsAPI.topProducts({ limit: limit.value }); products.value = res.data || []; displayPage.value = 1; }
  catch (e) { /* ignore */ }
};

const downloadPDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text('Top 10 - Productos Más Vendidos', 14, 22);
  doc.setFontSize(10);
  doc.text(`Productos listados: ${products.value.length}`, 14, 32);
  const tableData = products.value.map((p, i) => [String(i + 1), p.name, p.sku, String(p.total_quantity || 0), `$${Number(p.total_sales || 0).toLocaleString('es-CO')}`]);
  autoTable(doc, { startY: 40, head: [['#', 'Producto', 'SKU', 'Cant. Vendida', 'Total']], body: tableData, headStyles: { fillColor: [106, 27, 138] } });
  doc.save('top-productos.pdf');
};

const downloadExcel = () => {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Productos Más Vendidos'], [],
    ['#', 'Producto', 'SKU', 'Cant. Vendida', 'Total'],
    ...products.value.map((p, i) => [i + 1, p.name, p.sku, p.total_quantity || 0, p.total_sales || 0])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'TopProductos');
  XLSX.writeFile(wb, 'top-productos.xlsx');
};

const buildChart = () => {
  const top = [...products.value].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0)).slice(0, 10);
  nextTick(() => {
    if (chart) chart.destroy();
    if (chartRef.value) {
      chart = new Chart(chartRef.value, {
        type: 'bar',
        data: {
          labels: top.map(p => p.name),
          datasets: [{ label: 'Total Ventas ($)', data: top.map(p => p.total_sales || 0), backgroundColor: ['#6a1b8a', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#10b981', '#059669', '#f59e0b', '#f97316', '#ef4444'], borderRadius: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } }
        }
      });
    }
  });
};

onMounted(async () => {
  await fetchData();
  buildChart();
});

onUnmounted(() => { if (chart) chart.destroy(); });
</script>

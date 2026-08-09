<template>
  <div class="space-y-4 aurora-entrance">
    <!-- Mesh-gradient PageHeader -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);"
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> receipt </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Reporte de Ventas"
            description="Análisis de ventas por período"
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
        <span class="text-lg font-bold" style="color: #7c3aed;">{{ formatCurrency(totalSales) }}</span>
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
          <label class="block mb-1 font-medium text-xs" style="color: #64748b;">Periodo</label>
          <select v-model="period" @change="fetchData" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all border" style="color: #1e293b; border-color: #e2e8f0;">
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </select>
        </div>
      </div>
    </div>

    <div class="p-6">
    <!-- Summary Cards — Dashboard style with counter animation -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-6">
      <StatCard label="Total Ventas" :value="summary.totalSales || 0" icon="receipt" iconColor="#7c3aed" variant="dashboard" :stagger-delay="0" :animate="true" />
      <StatCard label="Total Ingresos" :value="summary.totalAmount || 0" type="currency" icon="payments" iconColor="#16a34a" variant="dashboard" :stagger-delay="100" :animate="true" />
      <StatCard label="IVA Total" :value="summary.totalTax || 0" type="currency" icon="receipt_long" iconColor="#d97706" variant="dashboard" :stagger-delay="200" :animate="true" />
    </div>

    <div class="chart-container" style="height: 350px;">
      <canvas ref="chartRef"></canvas>
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { reportsAPI } from '../../api';
import { useCurrency } from '../../composables/useCurrency';
import StatCard from '../../components/shared/StatCard.vue';
import AuroraDownloadModal from '../../components/shared/AuroraDownloadModal.vue';
import PageHeader from '../../components/shared/PageHeader.vue';

const { format: formatCurrency, formatTable } = useCurrency();
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

const period = ref('monthly');
const showFilters = ref(false);
const totalSales = ref(0);
const summary = ref({});
const chartRef = ref(null);
const rawData = ref([]);
let chart = null;

// Download modal state
const showDownloadModal = ref(false);
const currentDownloadFn = ref(null);
const modalTitle = ref('Generating PDF Report...');
const modalSubtitle = ref('Please wait while Aurora ERP compiles your data and performance metrics.');
const modalSuccessMessage = ref('Your report is ready for download.');
const modalFileName = ref('report.pdf');

const handleDownloadPDF = () => {
  modalTitle.value = 'Generating Sales Report...';
  modalSubtitle.value = 'Compiling sales data, income metrics, and tax summaries into a printable report.';
  modalSuccessMessage.value = 'Your sales report is ready.';
  modalFileName.value = `reporte-ventas-${getDateRange().start_date}.pdf`;
  currentDownloadFn.value = downloadPDF;
  showDownloadModal.value = true;
};

const handleDownloadExcel = () => {
  modalTitle.value = 'Generating Excel Report...';
  modalSubtitle.value = 'Formatting sales data tables and preparing spreadsheet export.';
  modalSuccessMessage.value = 'Your Excel report is ready.';
  modalFileName.value = `reporte-ventas-${getDateRange().start_date}.xlsx`;
  currentDownloadFn.value = downloadExcel;
  showDownloadModal.value = true;
};

const getDateRange = () => {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start;
  switch (period.value) {
    case 'daily': start = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]; break;
    case 'weekly': start = new Date(now.getTime() - 4 * 7 * 86400000).toISOString().split('T')[0]; break;
    case 'monthly': start = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0]; break;
    case 'yearly': start = new Date(now.getFullYear() - 4, 0, 1).toISOString().split('T')[0]; break;
    default: start = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  }
  return { start_date: start, end_date: end };
};

const fetchData = async () => {
  try {
    const range = getDateRange();
    const res = await reportsAPI.sales({
      start_date: range.start_date,
      end_date: range.end_date,
      group_by: period.value === 'daily' ? 'day' : period.value === 'weekly' ? 'week' : 'month'
    });
    const result = res.data || {};
    summary.value = result.summary || {};
    rawData.value = result.byPeriod || [];
    totalSales.value = result.summary?.totalAmount || 0;

    await nextTick();
    if (chart) chart.destroy();
    if (chartRef.value) {
      chart = new Chart(chartRef.value, {
        type: 'bar',
        data: {
          labels: rawData.value.map(d => d.period || d.date),
          datasets: [
            { label: 'Ingresos', data: rawData.value.map(d => d.total ?? 0), backgroundColor: '#059669', borderRadius: 6 },
            { label: 'Cant. Ventas', data: rawData.value.map(d => d.count ?? 0), backgroundColor: '#6a1b8a', borderRadius: 6, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 20 } } },
          scales: {
            y: { beginAtZero: true, position: 'left', ticks: { callback: v => '$' + v.toLocaleString() } },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { precision: 0 } }
          }
        }
      });
    }
  } catch (e) { /* ignore */ }
};

const downloadPDF = () => {
  const doc = new jsPDF('landscape');
  doc.setFontSize(18); doc.text('Reporte de Ventas', 14, 22);
  doc.setFontSize(10);
  doc.text(`Período: ${getDateRange().start_date} - ${getDateRange().end_date}`, 14, 30);
  doc.text(`Total Ventas: ${summary.value.totalSales || 0}`, 14, 42);
  doc.text(`Total Ingresos: $${Number(summary.value.totalAmount || 0).toLocaleString('es-CO')}`, 14, 50);
  doc.text(`IVA Total: $${Number(summary.value.totalTax || 0).toLocaleString('es-CO')}`, 14, 58);

  const tableData = rawData.value.map(d => [d.period || d.date, `$${Number(d.total).toLocaleString('es-CO')}`, d.count || 0]);
  autoTable(doc, { startY: 66, head: [['Período', 'Total', 'Cant. Ventas']], body: tableData, headStyles: { fillColor: [106, 27, 138] } });
  doc.save(`reporte-ventas-${getDateRange().start_date}.pdf`);
};

const downloadExcel = () => {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Reporte de Ventas'],
    [`Período: ${getDateRange().start_date} - ${getDateRange().end_date}`], [],
    ['Total Ventas', summary.value.totalSales || 0],
    ['Total Ingresos', summary.value.totalAmount || 0],
    ['IVA Total', summary.value.totalTax || 0], [],
    ['Período', 'Total', 'Cant. Ventas'],
    ...rawData.value.map(d => [d.period || d.date, d.total, d.count || 0])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
  XLSX.writeFile(wb, `reporte-ventas-${getDateRange().start_date}.xlsx`);
};

onMounted(fetchData);
onUnmounted(() => { if (chart) chart.destroy(); });
</script>

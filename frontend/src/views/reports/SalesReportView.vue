<template>
  <div>
    <button @click="$router.push('/app/reports')"
      class="shrink-0 flex items-center gap-2 font-semibold py-2 px-4 rounded-lg transition-all duration-200 mb-4 border-2"
      style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
      @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
      @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
      <span class="material-icons-outlined" style="font-size: 1.125rem;">arrow_back</span> Volver a Reportes
    </button>

    <div class="dt-card overflow-hidden">
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
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold" style="color: #624200;">{{ formatCurrency(totalSales) }}</span>
        <button @click="downloadPDF"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
          style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
          @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
          @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
          <span class="material-icons-outlined" style="font-size: 1.125rem;">picture_as_pdf</span> PDF
        </button>
        <button @click="downloadExcel"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
          style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
          @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
          @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
          <span class="material-icons-outlined" style="font-size: 1.125rem;">table_chart</span> Excel
        </button>
      </div>
    </div>

    <!-- Filter Panel -->
    <div v-if="showFilters" class="filter-panel-container px-4 py-4 border-b border-[#d2c4b4]/30" style="background: #faf9f6;">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Periodo</label>
          <select v-model="period" @change="fetchData" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all" style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;">
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </select>
        </div>
      </div>
    </div>

    <div class="p-6">
    <!-- Summary Cards -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="rounded-xl p-4 text-center" style="background: rgba(98,66,0,0.03);">
        <p class="dt-caption" style="text-transform: uppercase;">Total Ventas</p>
        <p class="dt-stat-value" style="color: #0b1c30;">{{ summary.totalSales || 0 }}</p>
      </div>
      <div class="rounded-xl p-4 text-center" style="background: rgba(98,66,0,0.03);">
        <p class="dt-caption" style="text-transform: uppercase;">Total Ingresos</p>
        <p class="dt-stat-value" style="color: #624200;">{{ formatTable(summary.totalAmount || 0) }}</p>
      </div>
      <div class="rounded-xl p-4 text-center" style="background: rgba(98,66,0,0.03);">
        <p class="dt-caption" style="text-transform: uppercase;">IVA Total</p>
        <p class="dt-stat-value" style="color: #795900;">{{ formatTable(summary.totalTax || 0) }}</p>
      </div>
    </div>

    <div class="chart-container" style="height: 350px;">
      <canvas ref="chartRef"></canvas>
    </div>
  </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { reportsAPI } from '../../api';
import { useCurrency } from '../../composables/useCurrency';

const { format: formatCurrency, formatTable } = useCurrency();
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

const period = ref('monthly');
const showFilters = ref(false);
const totalSales = ref(0);
const summary = ref({});
const chartRef = ref(null);
const rawData = ref([]);
let chart = null;

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
  doc.autoTable({ startY: 66, head: [['Período', 'Total', 'Cant. Ventas']], body: tableData, headStyles: { fillColor: [106, 27, 138] } });
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

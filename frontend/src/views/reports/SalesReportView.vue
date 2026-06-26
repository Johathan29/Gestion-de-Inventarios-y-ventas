<template>
  <div class="card p-6">
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Ventas</h3>
      <select v-model="period" @change="fetchData" class="form-input w-40">
        <option value="daily">Diario</option>
        <option value="weekly">Semanal</option>
        <option value="monthly">Mensual</option>
        <option value="yearly">Anual</option>
      </select>
      <span class="text-lg font-bold text-primary-600">{{ formatCurrency(totalSales) }}</span>
      <div class="flex-1"></div>
      <button @click="downloadPDF" class="btn btn-sm btn-secondary flex items-center gap-1">
        <span class="material-icons-outlined text-lg">picture_as_pdf</span> PDF
      </button>
      <button @click="downloadExcel" class="btn btn-sm btn-secondary flex items-center gap-1">
        <span class="material-icons-outlined text-lg">table_chart</span> Excel
      </button>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 text-center">
        <p class="text-xs text-gray-500 uppercase">Total Ventas</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ summary.totalSales || 0 }}</p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 text-center">
        <p class="text-xs text-gray-500 uppercase">Total Ingresos</p>
        <p class="text-xl font-bold text-primary-600">{{ formatCurrency(summary.totalAmount || 0) }}</p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 text-center">
        <p class="text-xs text-gray-500 uppercase">IVA Total</p>
        <p class="text-xl font-bold text-orange-600">{{ formatCurrency(summary.totalTax || 0) }}</p>
      </div>
    </div>

    <div class="chart-container" style="height: 350px;">
      <canvas ref="chartRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { reportsAPI } from '../../api';
import { formatCurrency } from '../../utils';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

const period = ref('monthly');
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
        data: { labels: rawData.value.map(d => d.period || d.date), datasets: [{ label: 'Ventas', data: rawData.value.map(d => d.total), backgroundColor: '#6a1b8a', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } } }
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

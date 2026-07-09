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
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Límite</label>
          <select v-model="limit" @change="fetchData" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all" style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;">
            <option value="5">5</option><option value="10">10</option><option value="20">20</option>
          </select>
        </div>
      </div>
    </div>

    <div class="p-6">
      <!-- Chart -->
      <div class="rounded-xl p-4 mb-6" style="background: rgba(98,66,0,0.03);">
        <p class="font-semibold mb-3" style="color: #0b1c30;">Top Productos por Ventas</p>
        <div class="chart-container" style="height: 300px;">
          <canvas ref="chartRef"></canvas>
        </div>
      </div>

    <div class="space-y-3">
      <div v-for="(p, idx) in products" :key="idx" class="flex items-center gap-4 p-3 rounded-xl" style="transition: background 0.15s;" @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.03)'" @mouseleave="e => e.currentTarget.style.background = ''">
        <span class="w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm"
              :class="idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'">
          {{ idx + 1 }}
        </span>
        <div class="flex-1"><p class="font-medium" style="color: #0b1c30;">{{ p.name }}</p><p class="dt-caption">SKU: {{ p.sku }}</p></div>
        <div class="text-right"><p class="font-semibold" style="color: #0b1c30;">{{ p.total_quantity }} vendidos</p><p class="dt-body-sm" style="color: #4f4539;">{{ formatTable(p.total_sales) }}</p></div>
      </div>
    </div>
  </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { reportsAPI } from '../../api';
import { useCurrency } from '../../composables/useCurrency';

const { formatTable } = useCurrency();
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

const limit = ref(10);
const showFilters = ref(false);
const products = ref([]);
const chartRef = ref(null);
let chart = null;

const fetchData = async () => {
  try { const res = await reportsAPI.topProducts({ limit: limit.value }); products.value = res.data || []; }
  catch (e) { /* ignore */ }
};

const downloadPDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text('Top 10 - Productos Más Vendidos', 14, 22);
  doc.setFontSize(10);
  doc.text(`Productos listados: ${products.value.length}`, 14, 32);
  const tableData = products.value.map((p, i) => [String(i + 1), p.name, p.sku, String(p.total_quantity || 0), `$${Number(p.total_sales || 0).toLocaleString('es-CO')}`]);
  doc.autoTable({ startY: 40, head: [['#', 'Producto', 'SKU', 'Cant. Vendida', 'Total']], body: tableData, headStyles: { fillColor: [106, 27, 138] } });
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

<template>
  <div>
    <button @click="$router.push('/app/reports')"
      class="shrink-0 flex items-center gap-2 font-semibold py-2 px-4 rounded-lg transition-all duration-200 mb-4 border-2"
      style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
      @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
      @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
      <span class="material-icons-outlined" style="font-size: 1.125rem;">arrow_back</span> Volver a Reportes
    </button>

    <div class="dt-card p-6">
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Reporte de Clientes</h2>
      <div class="flex-1"></div>
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

    <!-- Client Chart -->
    <div class="rounded-xl p-4 mb-6" style="background: rgba(98,66,0,0.03);">
      <p class="font-semibold mb-3" style="color: #0b1c30;">Top Clientes por Compras</p>
      <div class="chart-container" style="height: 280px;">
        <canvas ref="chartRef"></canvas>
      </div>
    </div>

    <DataTable :columns="columns" :data="clients" searchable>
      <template #cell-total="{ row }">{{ formatTable(row.total_purchases) }}</template>
    </DataTable>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { reportsAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';
import { useCurrency } from '../../composables/useCurrency';

const { formatTable } = useCurrency();
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

const clients = ref([]);
const chartRef = ref(null);
let chart = null;
const columns = [
  { key: 'name', label: 'Cliente', sortable: true },
  { key: 'document_id', label: 'Documento' },
  { key: 'purchase_count', label: 'Compras', type: 'number', sortable: true },
  { key: 'total', label: 'Total Comprado', type: 'currency', sortable: true }
];

const buildChart = () => {
  const top = [...clients.value].sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0)).slice(0, 8);
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
  try { const res = await reportsAPI.clients({}); clients.value = res.data || []; buildChart(); }
  catch (e) { /* ignore */ }
});

onUnmounted(() => { if (chart) chart.destroy(); });

const downloadPDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text('Reporte de Clientes', 14, 22);
  doc.setFontSize(10);
  doc.text(`Total de clientes: ${clients.value.length}`, 14, 32);
  const tableData = clients.value.map(c => [c.name, c.document_id || '', String(c.purchase_count || 0), `$${Number(c.total || 0).toLocaleString('es-CO')}`]);
  doc.autoTable({ startY: 40, head: [['Cliente', 'Documento', 'Compras', 'Total Comprado']], body: tableData, headStyles: { fillColor: [106, 27, 138] } });
  doc.save('reporte-clientes.pdf');
};

const downloadExcel = () => {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Reporte de Clientes'], [],
    ['Cliente', 'Documento', 'Compras', 'Total Comprado'],
    ...clients.value.map(c => [c.name, c.document_id || '', c.purchase_count || 0, c.total || 0])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, 'reporte-clientes.xlsx');
};
</script>

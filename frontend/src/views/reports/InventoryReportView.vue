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
      <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Reporte de Inventario</h2>
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
    <div class="grid grid-cols-3 gap-6 mb-6">
      <StatCard label="Total Productos" :value="summary.total_products" icon="inventory_2" />
      <StatCard label="Valor Total" :value="summary.total_value" type="currency" icon="payments" />
      <StatCard label="Productos Bajos" :value="summary.low_stock_count" icon="warning" iconBg="#fef3c7" iconColor="#ca8a04" />
    </div>

    <!-- Stock Distribution Chart -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="rounded-xl p-4" style="background: rgba(98,66,0,0.03);">
        <p class="font-semibold mb-3" style="color: #0b1c30;">Distribución de Stock</p>
        <div class="chart-container" style="height: 280px;">
          <canvas ref="distributionChartRef"></canvas>
        </div>
      </div>
      <div class="rounded-xl p-4" style="background: rgba(98,66,0,0.03);">
        <p class="font-semibold mb-3" style="color: #0b1c30;">Resumen de Valor</p>
        <div class="chart-container" style="height: 280px;">
          <canvas ref="valueChartRef"></canvas>
        </div>
      </div>
    </div>

    <DataTable :columns="columns" :data="products" searchable />
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { reportsAPI, inventoryAPI } from '../../api';
import StatCard from '../../components/shared/StatCard.vue';
import DataTable from '../../components/shared/DataTable.vue';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

const summary = ref({});
const products = ref([]);
const distributionChartRef = ref(null);
const valueChartRef = ref(null);
let distChart = null;
let valChart = null;
const columns = [
  { key: 'name', label: 'Producto' },
  { key: 'sku', label: 'SKU' },
  { key: 'stock', label: 'Stock', type: 'number' },
  { key: 'price', label: 'Precio', type: 'currency' },
  { key: 'stock_value', label: 'Valor Total', type: 'currency' }
];

const buildCharts = () => {
  const low = products.value.filter(p => (p.stock || 0) <= (p.min_stock || 5)).length;
  const mid = products.value.filter(p => (p.stock || 0) > (p.min_stock || 5) && (p.stock || 0) <= 20).length;
  const high = products.value.filter(p => (p.stock || 0) > 20).length;

  nextTick(() => {
    if (distributionChartRef.value) {
      if (distChart) distChart.destroy();
      distChart = new Chart(distributionChartRef.value, {
        type: 'doughnut',
        data: {
          labels: ['Stock Bajo', 'Stock Medio', 'Stock Alto'],
          datasets: [{ data: [low, mid, high], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } } }
      });
    }
    if (valueChartRef.value) {
      if (valChart) valChart.destroy();
      const totalValue = products.value.reduce((s, p) => s + (p.stock_value || p.stock * (p.price || 0) || 0), 0);
      const lowValue = products.value.filter(p => (p.stock || 0) <= (p.min_stock || 5)).reduce((s, p) => s + (p.stock_value || p.stock * (p.price || 0) || 0), 0);
      const restValue = totalValue - lowValue;
      valChart = new Chart(valueChartRef.value, {
        type: 'bar',
        data: {
          labels: ['Valor Total', 'Valor Stock Bajo'],
          datasets: [{ label: 'Valor ($)', data: [totalValue, lowValue], backgroundColor: ['#6a1b8a', '#ef4444'], borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } } }
      });
    }
  });
};

onMounted(async () => {
  try {
    const [sRes, pRes] = await Promise.all([
      inventoryAPI.getSummary().catch(() => ({ data: {} })),
      reportsAPI.inventory({}).catch(() => ({ data: [] }))
    ]);
    const rawSummary = sRes.data || {};
    const rawProducts = pRes.data || [];
    // Map summary fields (backend returns camelCase)
    summary.value = {
      total_products: rawSummary.totalProducts || rawSummary.total_products || 0,
      total_value: rawSummary.totalValueRetail || rawSummary.totalValue || rawSummary.total_value || 0,
      low_stock_count: rawSummary.lowStockCount || rawSummary.low_stock_count || 0
    };
    // Flatten products and compute stock_value = stock × sale price
    products.value = (Array.isArray(rawProducts) ? rawProducts : []).map(item => ({
      ...item,
      name: item.products?.name || item.name || '—',
      sku: item.products?.sku || item.sku || '—',
      price: item.products?.price || item.price || 0,
      stock_value: (item.stock || 0) * (item.products?.price || item.price || 0)
    }));
    // Compute low_stock_count from items if not provided
    if (!summary.value.low_stock_count) {
      summary.value.low_stock_count = products.value.filter(
        p => (p.stock || 0) <= (p.min_stock || 5)
      ).length;
    }
    buildCharts();
  } catch (e) { /* ignore */ }
});

onUnmounted(() => {
  if (distChart) distChart.destroy();
  if (valChart) valChart.destroy();
});

const downloadPDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text('Reporte de Inventario', 14, 22);
  doc.setFontSize(10);
  doc.text(`Total Productos: ${summary.value.total_products || 0}`, 14, 35);
  doc.text(`Valor Total: $${Number(summary.value.total_value || 0).toLocaleString('es-CO')}`, 14, 42);
  doc.text(`Productos Bajos: ${summary.value.low_stock_count || 0}`, 14, 49);
  const tableData = products.value.map(p => [p.name, p.sku, p.stock || 0, `$${Number(p.price || 0).toLocaleString('es-CO')}`, `$${Number(p.stock_value || 0).toLocaleString('es-CO')}`]);
  doc.autoTable({ startY: 57, head: [['Producto', 'SKU', 'Stock', 'Precio', 'Valor Total']], body: tableData, headStyles: { fillColor: [106, 27, 138] } });
  doc.save('reporte-inventario.pdf');
};

const downloadExcel = () => {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Reporte de Inventario'], [],
    ['Total Productos', summary.value.total_products || 0],
    ['Valor Total', summary.value.total_value || 0],
    ['Productos Bajos', summary.value.low_stock_count || 0], [],
    ['Producto', 'SKU', 'Stock', 'Precio', 'Valor Total'],
    ...products.value.map(p => [p.name, p.sku, p.stock || 0, p.price || 0, p.stock_value || 0])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, 'reporte-inventario.xlsx');
};
</script>

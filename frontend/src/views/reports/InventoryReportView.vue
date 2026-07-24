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
        <span class="material-symbols-outlined animate-header-icon"> inventory </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Reporte de Inventario"
            description="Análisis del inventario actual"
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
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
      <StatCard label="Total Productos" :value="summary.total_products" icon="inventory_2" cardBg="#ffffff" iconBg="rgba(124,58,237,0.12)" iconColor="#7c3aed" :stagger-delay="0" :animate="true" />
      <StatCard label="Valor Total" :value="summary.total_value" type="currency" icon="payments" cardBg="#ffffff" iconBg="rgba(22,163,74,0.12)" iconColor="#16a34a" :stagger-delay="100" :animate="true" />
      <StatCard label="Productos Bajos" :value="summary.low_stock_count" icon="warning" cardBg="#ffffff" iconBg="rgba(217,119,6,0.12)" iconColor="#d97706" :stagger-delay="200" :animate="true" />
    </div>

    <!-- Stock Distribution Chart -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="nexus-card !p-4">
        <p class="font-semibold mb-3" style="color: #1e293b;">Distribución de Stock</p>
        <div class="chart-container" style="height: 280px;">
          <canvas ref="distributionChartRef"></canvas>
        </div>
      </div>
      <div class="nexus-card !p-4">
        <p class="font-semibold mb-3" style="color: #1e293b;">Resumen de Valor</p>
        <div class="chart-container" style="height: 280px;">
          <canvas ref="valueChartRef"></canvas>
        </div>
      </div>
    </div>

    <DataTable :columns="columns" :data="products" :server-pagination="true" :total="total" :current-page-prop="page" :per-page="limit" @page-change="changePage" />

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-4 mt-4">
      <div v-for="p in products" :key="p.id || p.product_id"
           class="nexus-card !p-4 !shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style="background: rgba(124,58,237,0.08); color: #7c3aed;">
            <span class="material-icons-outlined">inventory_2</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate" style="color: #1e293b;">{{ p.name }}</p>
            <p class="text-xs font-mono" style="color: #94a3b8;">{{ p.sku }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span class="text-xs" style="color: #94a3b8;">Stock</span>
            <p class="font-medium" :class="p.stock <= 0 ? 'text-red-600' : p.stock <= (p.min_stock || 5) ? 'text-amber-600' : 'text-green-600'">{{ p.stock }}</p>
          </div>
          <div>
            <span class="text-xs" style="color: #94a3b8;">Precio</span>
            <p class="font-medium" style="color: #1e293b;">{{ formatTable(p.price) }}</p>
          </div>
          <div class="col-span-2">
            <span class="text-xs" style="color: #94a3b8;">Valor Total</span>
            <p class="font-semibold" style="color: #7c3aed;">{{ formatTable(p.stock_value) }}</p>
          </div>
        </div>
      </div>
      <div v-if="products.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <span class="material-icons-outlined text-4xl mb-3" style="color: #cbd5e1;">inventory</span>
        <p style="color: #94a3b8;">No hay productos en el inventario</p>
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
import { reportsAPI, inventoryAPI } from '../../api';
import AuroraDownloadModal from '../../components/shared/AuroraDownloadModal.vue';
import StatCard from '../../components/shared/StatCard.vue';
import DataTable from '../../components/shared/DataTable.vue';
import PageHeader from '../../components/shared/PageHeader.vue';
import { useCurrency } from '../../composables/useCurrency';
import { Chart, registerables } from 'chart.js';

const { formatTable } = useCurrency();
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
Chart.register(...registerables);

const summary = ref({});
const products = ref([]);
const allProductsForCharts = ref([]); // Full data for charts/exports
const page = ref(1);
const limit = 20;
const total = ref(0);
const distributionChartRef = ref(null);
const valueChartRef = ref(null);
let distChart = null;
let valChart = null;

// Download modal state
const showDownloadModal = ref(false);
const currentDownloadFn = ref(null);
const modalTitle = ref('Generating PDF Report...');
const modalSubtitle = ref('Please wait while Aurora ERP compiles your data and performance metrics.');
const modalSuccessMessage = ref('Your report is ready for download.');
const modalFileName = ref('report.pdf');

const handleDownloadPDF = () => {
  modalTitle.value = 'Generating Inventory Report...';
  modalSubtitle.value = 'Compiling product stock, values, and distribution metrics.';
  modalSuccessMessage.value = 'Your inventory report is ready.';
  modalFileName.value = 'reporte-inventario.pdf';
  currentDownloadFn.value = downloadPDF;
  showDownloadModal.value = true;
};

const handleDownloadExcel = () => {
  modalTitle.value = 'Generating Excel Report...';
  modalSubtitle.value = 'Structuring inventory data tables and preparing spreadsheet export.';
  modalSuccessMessage.value = 'Your Excel report is ready.';
  modalFileName.value = 'reporte-inventario.xlsx';
  currentDownloadFn.value = downloadExcel;
  showDownloadModal.value = true;
};
const columns = [
  { key: 'name', label: 'Producto' },
  { key: 'sku', label: 'SKU' },
  { key: 'stock', label: 'Stock', type: 'number' },
  { key: 'price', label: 'Precio', type: 'currency' },
  { key: 'stock_value', label: 'Valor Total', type: 'currency' }
];

const mapProducts = (raw) => (Array.isArray(raw) ? raw : []).map(item => ({
  ...item,
  name: item.products?.name || item.name || '—',
  sku: item.products?.sku || item.sku || '—',
  price: item.products?.price || item.price || 0,
  stock_value: (item.stock || 0) * (item.products?.price || item.price || 0)
}));

const changePage = (newPage) => {
  page.value = newPage;
  fetchInventoryPage();
};

const fetchInventoryPage = async () => {
  try {
    const pRes = await reportsAPI.inventory({ page: page.value, limit }).catch(() => ({ data: { items: [] }, pagination: { total: 0 } }));
    const response = pRes.data || {};
    const rawItems = response.items || pRes.data?.items || [];
    products.value = mapProducts(rawItems);
    total.value = pRes.pagination?.total || 0;
  } catch (e) { /* ignore */ }
};

const buildCharts = () => {
  const data = allProductsForCharts.value;
  const low = data.filter(p => (p.stock || 0) <= (p.min_stock || 5)).length;
  const mid = data.filter(p => (p.stock || 0) > (p.min_stock || 5) && (p.stock || 0) <= 20).length;
  const high = data.filter(p => (p.stock || 0) > 20).length;
  const totalValue = data.reduce((s, p) => s + (p.stock_value || 0), 0);
  const lowValue = data.filter(p => (p.stock || 0) <= (p.min_stock || 5)).reduce((s, p) => s + (p.stock_value || 0), 0);

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
    const [sRes, fullRes] = await Promise.all([
      inventoryAPI.getSummary().catch(() => ({ data: {} })),
      reportsAPI.inventory({}).catch(() => ({ data: [] }))
    ]);
    const rawSummary = sRes.data || {};
    // Map summary fields (backend returns camelCase)
    summary.value = {
      total_products: rawSummary.totalProducts || rawSummary.total_products || 0,
      total_value: rawSummary.totalValueRetail || rawSummary.totalValue || rawSummary.total_value || 0,
      low_stock_count: rawSummary.lowStockCount || rawSummary.low_stock_count || 0
    };
    // Full data for charts + exports
    const rawFull = fullRes.data || [];
    allProductsForCharts.value = (Array.isArray(rawFull) ? rawFull : []).map(item => ({
      ...item,
      name: item.products?.name || item.name || '—',
      sku: item.products?.sku || item.sku || '—',
      price: item.products?.price || item.price || 0,
      stock_value: (item.stock || 0) * (item.products?.price || item.price || 0)
    }));
    // Compute low_stock_count from items if not provided
    if (!summary.value.low_stock_count) {
      summary.value.low_stock_count = allProductsForCharts.value.filter(
        p => (p.stock || 0) <= (p.min_stock || 5)
      ).length;
    }
    // Fetch first paginated page for table
    const pRes = await reportsAPI.inventory({ page: 1, limit }).catch(() => ({ data: { items: [] }, pagination: { total: 0 } }));
    const pageResponse = pRes.data || {};
    const pageItems = pageResponse.items || [];
    products.value = mapProducts(pageItems);
    total.value = pRes.pagination?.total || 0;
    // Build charts after DOM is ready
    await nextTick();
    setTimeout(() => buildCharts(), 100);
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
  const tableData = allProductsForCharts.value.map(p => [p.name, p.sku, p.stock || 0, `$${Number(p.price || 0).toLocaleString('es-CO')}`, `$${Number(p.stock_value || 0).toLocaleString('es-CO')}`]);
  autoTable(doc, { startY: 57, head: [['Producto', 'SKU', 'Stock', 'Precio', 'Valor Total']], body: tableData, headStyles: { fillColor: [106, 27, 138] } });
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
    ...allProductsForCharts.value.map(p => [p.name, p.sku, p.stock || 0, p.price || 0, p.stock_value || 0])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, 'reporte-inventario.xlsx');
};
</script>

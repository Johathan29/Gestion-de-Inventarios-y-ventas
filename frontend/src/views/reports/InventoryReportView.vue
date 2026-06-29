<template>
  <div class="dt-card p-6">
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Reporte de Inventario</h3>
      <div class="flex-1"></div>
      <button @click="downloadPDF" class="dt-btn-secondary" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; font-size: 0.875rem;">
        <span class="material-icons-outlined text-lg">picture_as_pdf</span> PDF
      </button>
      <button @click="downloadExcel" class="dt-btn-secondary" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; font-size: 0.875rem;">
        <span class="material-icons-outlined text-lg">table_chart</span> Excel
      </button>
    </div>
    <div class="grid grid-cols-3 gap-6 mb-6">
      <StatCard label="Total Productos" :value="summary.total_products" icon="inventory_2" />
      <StatCard label="Valor Total" :value="summary.total_value" type="currency" icon="payments" />
      <StatCard label="Productos Bajos" :value="summary.low_stock_count" icon="warning" iconBg="#fef3c7" iconColor="#ca8a04" />
    </div>
    <DataTable :columns="columns" :data="products" searchable />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { reportsAPI, inventoryAPI } from '../../api';
import StatCard from '../../components/shared/StatCard.vue';
import DataTable from '../../components/shared/DataTable.vue';
import { formatCurrency } from '../../utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const summary = ref({});
const products = ref([]);
const columns = [
  { key: 'name', label: 'Producto' },
  { key: 'sku', label: 'SKU' },
  { key: 'stock', label: 'Stock', type: 'number' },
  { key: 'price', label: 'Precio', type: 'currency' },
  { key: 'stock_value', label: 'Valor Total', type: 'currency' }
];

onMounted(async () => {
  try {
    const [sRes, pRes] = await Promise.all([
      inventoryAPI.getSummary().catch(() => ({ data: {} })),
      reportsAPI.inventory({}).catch(() => ({ data: [] }))
    ]);
    summary.value = sRes.data || {};
    products.value = pRes.data || [];
  } catch (e) { /* ignore */ }
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

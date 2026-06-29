<template>
  <div class="dt-card p-6">
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Productos Más Vendidos</h3>
      <select v-model="limit" @change="fetchData" class="form-input w-24">
        <option value="5">5</option><option value="10">10</option><option value="20">20</option>
      </select>
      <div class="flex-1"></div>
      <button @click="downloadPDF" class="dt-btn-secondary" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; font-size: 0.875rem;">
        <span class="material-icons-outlined text-lg">picture_as_pdf</span> PDF
      </button>
      <button @click="downloadExcel" class="dt-btn-secondary" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; font-size: 0.875rem;">
        <span class="material-icons-outlined text-lg">table_chart</span> Excel
      </button>
    </div>
    <div class="space-y-3">
      <div v-for="(p, idx) in products" :key="idx" class="flex items-center gap-4 p-3 rounded-xl" style="transition: background 0.15s;" @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.03)'" @mouseleave="e => e.currentTarget.style.background = ''">
        <span class="w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm"
              :class="idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'">
          {{ idx + 1 }}
        </span>
        <div class="flex-1"><p class="font-medium" style="color: #0b1c30;">{{ p.name }}</p><p class="dt-caption">SKU: {{ p.sku }}</p></div>
        <div class="text-right"><p class="font-semibold" style="color: #0b1c30;">{{ p.total_quantity }} vendidos</p><p class="dt-body-sm" style="color: #4f4539;">{{ formatCurrency(p.total_sales) }}</p></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { reportsAPI } from '../../api';
import { formatCurrency } from '../../utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const limit = ref(10);
const products = ref([]);

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

onMounted(fetchData);
</script>

<template>
  <div class="dt-card p-6">
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Reporte de Clientes</h3>
      <div class="flex-1"></div>
      <button @click="downloadPDF" class="dt-btn-secondary" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; font-size: 0.875rem;">
        <span class="material-icons-outlined text-lg">picture_as_pdf</span> PDF
      </button>
      <button @click="downloadExcel" class="dt-btn-secondary" style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; font-size: 0.875rem;">
        <span class="material-icons-outlined text-lg">table_chart</span> Excel
      </button>
    </div>
    <DataTable :columns="columns" :data="clients" searchable>
      <template #cell-total="{ row }">{{ formatCurrency(row.total_purchases) }}</template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { reportsAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';
import { formatCurrency } from '../../utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const clients = ref([]);
const columns = [
  { key: 'name', label: 'Cliente', sortable: true },
  { key: 'document_id', label: 'Documento' },
  { key: 'purchase_count', label: 'Compras', type: 'number', sortable: true },
  { key: 'total', label: 'Total Comprado', type: 'currency', sortable: true }
];

onMounted(async () => {
  try { const res = await reportsAPI.clients({}); clients.value = res.data || []; }
  catch (e) { /* ignore */ }
});

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

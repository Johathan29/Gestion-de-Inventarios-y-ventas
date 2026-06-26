<template>
  <Loading v-if="loading" />
  <div v-else class="max-w-5xl mx-auto space-y-6">
    <!-- Invoice Display -->
    <div class="card p-8 mb-6" id="invoice-content"
         :class="{
           'border-l-4 border-green-500': invoice.status === 'paid',
           'border-l-4 border-yellow-500': invoice.status === 'issued',
           'border-l-4 border-red-500': invoice.status === 'cancelled' || invoice.status === 'voided'
         }">
      <!-- Status ribbon -->
      <div class="flex justify-between items-start mb-8">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Factura</h1>
            <span class="badge text-sm px-3 py-1"
              :class="invoice.status === 'paid' ? 'badge-green' : invoice.status === 'issued' ? 'badge-yellow' : 'badge-red'">
              {{ invoice.status === 'paid' ? 'PAGADA' : invoice.status === 'issued' ? 'EMITIDA' : invoice.status === 'cancelled' ? 'ANULADA' : 'ANULADA' }}
            </span>
          </div>
          <p class="text-gray-500 mt-1">N° {{ invoice.invoice_number }}</p>
          <p v-if="invoice.paid_at" class="text-sm text-green-600 mt-1">
            <span class="material-icons-outlined text-sm align-text-bottom">check_circle</span>
            Pagada el {{ formatDate(invoice.paid_at) }}
          </p>
        </div>
        <div class="text-right">
          <img v-if="invoice.qr_code" :src="invoice.qr_code" class="w-24 h-24" alt="QR" />
        </div>
      </div>

      <!-- Client & Invoice Info -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cliente</p>
          <p class="font-semibold text-gray-900 dark:text-white">{{ invoice.clients?.name || invoice.client_name || 'Cliente General' }}</p>
          <p v-if="invoice.clients?.document_id || invoice.client_document" class="text-sm text-gray-500">
            Doc: {{ invoice.clients?.document_id || invoice.client_document }}
          </p>
          <p v-if="invoice.clients?.email" class="text-sm text-gray-500">{{ invoice.clients.email }}</p>
          <p v-if="invoice.clients?.phone" class="text-sm text-gray-500">{{ invoice.clients.phone }}</p>
          <p v-if="invoice.clients?.address" class="text-sm text-gray-500">{{ invoice.clients.address }}</p>
        </div>
        <div class="sm:text-right">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detalles de Factura</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Emisión: {{ formatDate(invoice.created_at) }}</p>
          <p v-if="invoice.due_date" class="text-sm text-gray-600 dark:text-gray-400">Vencimiento: {{ formatDate(invoice.due_date) }}</p>
          <p v-if="invoice.sales?.sale_number" class="text-sm text-gray-600 dark:text-gray-400">
            Venta: {{ invoice.sales.sale_number }}
          </p>
        </div>
      </div>

      <!-- Products Table -->
      <table class="w-full text-sm mb-8">
        <thead>
          <tr class="bg-gray-50 dark:bg-gray-700/50">
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Cant.</th>
            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Precio</th>
            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/20">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 shrink-0">
                  <span class="material-icons-outlined text-sm">inventory_2</span>
                </div>
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ item.products?.name || item.product_name || 'Producto' }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3 text-right">{{ item.quantity }}</td>
            <td class="px-4 py-3 text-right">{{ formatCurrency(item.unit_price || item.price) }}</td>
            <td class="px-4 py-3 text-right font-medium">{{ formatCurrency(item.total || item.quantity * (item.unit_price || item.price)) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totales -->
      <div class="flex justify-end">
        <div class="w-72 space-y-1 text-sm">
          <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>{{ formatCurrency(invoice.subtotal) }}</span></div>
          <div class="flex justify-between text-gray-500"><span>Descuento</span><span v-if="invoice.discount > 0" class="text-red-500">-{{ formatCurrency(invoice.discount) }}</span><span v-else>$0</span></div>
          <div class="flex justify-between text-gray-500"><span>IVA (19%)</span><span>{{ formatCurrency(invoice.tax) }}</span></div>
          <div class="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
            <span class="text-gray-900 dark:text-white">Total</span>
            <span :class="invoice.status === 'paid' ? 'text-green-600' : 'text-primary-600'">
              {{ formatCurrency(invoice.total) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Watermark for paid -->
      <div v-if="invoice.status === 'paid'" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-6xl font-bold text-green-500/10 pointer-events-none select-none">
        PAGADA
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-3">
      <button @click="downloadPDF" class="btn btn-primary flex items-center gap-2">
        <span class="material-icons-outlined">picture_as_pdf</span> PDF
      </button>
      <button @click="downloadExcel" class="btn btn-secondary flex items-center gap-2">
        <span class="material-icons-outlined">table_chart</span> Excel
      </button>
      <button @click="printInvoice" class="btn btn-secondary flex items-center gap-2">
        <span class="material-icons-outlined">print</span> Imprimir
      </button>

      <!-- Payment toggle -->
      <button v-if="invoice.status === 'issued'"
              @click="handleTogglePaid"
              :disabled="updatingPayment"
              class="btn btn-success flex items-center gap-2">
        <span class="material-icons-outlined">paid</span>
        {{ updatingPayment ? 'Procesando...' : 'Marcar como Pagada' }}
      </button>
      <button v-if="invoice.status === 'paid'"
              @click="handleToggleIssued"
              :disabled="updatingPayment"
              class="btn btn-warning flex items-center gap-2">
        <span class="material-icons-outlined">undo</span>
        {{ updatingPayment ? 'Procesando...' : 'Revertir Pago' }}
      </button>

      <router-link to="/app/invoices" class="btn btn-secondary flex items-center gap-2">
        <span class="material-icons-outlined">arrow_back</span> Volver
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { invoicesAPI } from '../../api';
import Loading from '../../components/shared/Loading.vue';
import { formatCurrency, formatDate } from '../../utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const route = useRoute();
const invoice = ref({});
const loading = ref(true);
const updatingPayment = ref(false);

const items = computed(() => {
  const saleItems = invoice.value.sales?.sale_items || [];
  const directItems = invoice.value.items || [];
  return saleItems.length > 0 ? saleItems : directItems;
});

const downloadPDF = () => {
  const isPaid = invoice.value.status === 'paid';
  const doc = new jsPDF();

  // Colores según estado
  const primaryColor = isPaid ? [34, 197, 94] : [106, 27, 138];
  const secondaryColor = isPaid ? [22, 163, 74] : [80, 20, 110];

  // Encabezado con color
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('FACTURA', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(invoice.value.invoice_number || '', 105, 30, { align: 'center' });

  // Estado
  if (isPaid) {
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.text('PAGADA', 105, 45, { align: 'center' });
  }

  // Info
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  let y = isPaid ? 55 : 48;
  doc.text(`Cliente: ${invoice.value.clients?.name || invoice.value.client_name || 'Cliente General'}`, 14, y);
  doc.text(`Fecha: ${formatDate(invoice.value.created_at)}`, 14, y + 8);
  if (invoice.value.clients?.document_id) {
    doc.text(`Doc: ${invoice.value.clients.document_id}`, 14, y + 16);
  }

  // Tabla de productos
  const tableItems = items.value.map(i => [
    i.products?.name || i.product_name || 'Producto',
    String(i.quantity),
    `$${Number(i.unit_price || i.price).toLocaleString('es-CO')}`,
    `$${Number(i.total || (i.quantity * (i.unit_price || i.price))).toLocaleString('es-CO')}`
  ]);

  const tableStartY = y + (invoice.value.clients?.document_id ? 24 : 20);
  doc.autoTable({
    startY: tableStartY,
    head: [['Producto', 'Cant.', 'Precio', 'Subtotal']],
    body: tableItems,
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: isPaid ? [240, 253, 244] : [245, 243, 255] }
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.text(`Subtotal: $${Number(invoice.value.subtotal).toLocaleString('es-CO')}`, 140, finalY);
  doc.text(`IVA: $${Number(invoice.value.tax).toLocaleString('es-CO')}`, 140, finalY + 8);
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(`Total: $${Number(invoice.value.total).toLocaleString('es-CO')}`, 140, finalY + 20);

  if (isPaid) {
    doc.setFontSize(8);
    doc.setTextColor(34, 197, 94);
    doc.text(`Pagada el: ${formatDate(invoice.value.paid_at || invoice.value.created_at)}`, 14, finalY + 20);
  }

  doc.save(`factura-${invoice.value.invoice_number}.pdf`);
};

const downloadExcel = () => {
  const wb = XLSX.utils.book_new();

  // Datos de la factura
  const infoData = [
    ['FACTURA', invoice.value.invoice_number],
    ['Cliente', invoice.value.clients?.name || invoice.value.client_name || 'Cliente General'],
    ['Documento', invoice.value.clients?.document_id || invoice.value.client_document || 'N/A'],
    ['Fecha', formatDate(invoice.value.created_at)],
    ['Estado', invoice.value.status === 'paid' ? 'PAGADA' : invoice.value.status === 'issued' ? 'EMITIDA' : 'ANULADA'],
    ['Vencimiento', invoice.value.due_date ? formatDate(invoice.value.due_date) : 'N/A'],
    []
  ];

  const headerRow = ['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal'];
  const dataRows = items.value.map(i => [
    i.products?.name || i.product_name || 'Producto',
    i.quantity,
    Number(i.unit_price || i.price),
    Number(i.total || (i.quantity * (i.unit_price || i.price)))
  ]);

  const totalRow = [
    '',
    '',
    'IVA:',
    Number(invoice.value.tax)
  ];
  const totalRow2 = [
    '',
    '',
    'TOTAL:',
    Number(invoice.value.total)
  ];

  const wsData = [
    ...infoData,
    headerRow,
    ...dataRows,
    [],
    totalRow,
    totalRow2
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Factura');
  XLSX.writeFile(wb, `factura-${invoice.value.invoice_number}.xlsx`);
};

const printInvoice = () => { window.print(); };

const handleTogglePaid = async () => {
  const result = await Swal.fire({
    title: '¿Marcar como pagada?',
    text: 'La factura será marcada como pagada',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, pagada',
    cancelButtonText: 'Cancelar'
  });
  if (result.isConfirmed) {
    updatingPayment.value = true;
    try {
      await invoicesAPI.updatePaymentStatus(route.params.id, 'paid');
      await Swal.fire('Pagada', 'Factura marcada como pagada', 'success');
      await loadInvoice();
    } catch (e) {
      Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
    } finally {
      updatingPayment.value = false;
    }
  }
};

const handleToggleIssued = async () => {
  const result = await Swal.fire({
    title: '¿Revertir pago?',
    text: 'La factura volverá al estado emitida',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, revertir',
    cancelButtonText: 'Cancelar'
  });
  if (result.isConfirmed) {
    updatingPayment.value = true;
    try {
      await invoicesAPI.updatePaymentStatus(route.params.id, 'issued');
      await Swal.fire('Revertido', 'Pago revertido correctamente', 'success');
      await loadInvoice();
    } catch (e) {
      Swal.fire('Error', 'No se pudo revertir el pago', 'error');
    } finally {
      updatingPayment.value = false;
    }
  }
};

const loadInvoice = async () => {
  try {
    const res = await invoicesAPI.getById(route.params.id);
    invoice.value = res.data || {};
  } catch (e) { /* ignore */ }
};

onMounted(loadInvoice);
</script>

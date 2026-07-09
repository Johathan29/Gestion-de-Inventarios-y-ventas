<template>
  <Loading v-if="loading" />
  <div v-else class="max-w-5xl mx-auto space-y-6">
    <!-- Invoice Display -->
    <div class="dt-card p-8 mb-6" id="invoice-content"
         :style="{
           borderLeft: invoice.status === 'paid' ? '4px solid #22c55e' : invoice.status === 'issued' ? '4px solid #eab308' : (invoice.status === 'cancelled' || invoice.status === 'voided') ? '4px solid #ef4444' : '4px solid #e2d6c8'
         }">
      <!-- Status ribbon -->
      <div class="flex justify-between items-start mb-8">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="dt-headline" style="margin-bottom: 0;">Factura</h1>
            <span class="dt-badge"
              :class="invoice.status === 'paid' ? 'dt-badge-success' : invoice.status === 'issued' ? 'dt-badge-warning' : 'dt-badge-danger'">
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
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 p-4 rounded-xl" style="background: rgba(98,66,0,0.03);">
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cliente</p>
          <p class="font-semibold" style="color: #0b1c30;">{{ invoice.clients?.name || invoice.client_name || 'Cliente General' }}</p>
          <p v-if="invoice.clients?.document_id || invoice.client_document" class="text-sm text-gray-500">
            Doc: {{ invoice.clients?.document_id || invoice.client_document }}
          </p>
          <p v-if="invoice.clients?.email" class="text-sm text-gray-500">{{ invoice.clients.email }}</p>
          <p v-if="invoice.clients?.phone" class="text-sm text-gray-500">{{ invoice.clients.phone }}</p>
          <p v-if="invoice.clients?.address" class="text-sm text-gray-500">{{ invoice.clients.address }}</p>
        </div>
        <div class="sm:text-right">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detalles de Factura</p>
          <p class="text-sm" style="color: #4f4539;">Emisión: {{ formatDate(invoice.created_at) }}</p>
          <p v-if="invoice.due_date" class="text-sm" style="color: #4f4539;">Vencimiento: {{ formatDate(invoice.due_date) }}</p>
          <p v-if="invoice.sales?.sale_number" class="text-sm" style="color: #4f4539;">
            Venta: {{ invoice.sales.sale_number }}
          </p>
        </div>
      </div>

      <!-- Products Table -->
      <table class="w-full text-sm mb-8">
        <thead>
          <tr class="dt-table-header-row">
            <th class="dt-table-th text-left">Producto</th>
            <th class="dt-table-th text-right">Cant.</th>
            <th class="dt-table-th text-right">Precio</th>
            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
          </tr>
        </thead>
        <tbody class="divide-y" style="border-color: #d2c4b4;">
          <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0" style="color: #817567;">
                  <span class="material-icons-outlined text-sm">inventory_2</span>
                </div>
                <span class="font-medium" style="color: #0b1c30;">
                  {{ item.products?.name || item.product_name || 'Producto' }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3 text-right">{{ item.quantity }}</td>
            <td class="px-4 py-3 text-right">{{ formatTable(item.unit_price || item.price) }}</td>
            <td class="px-4 py-3 text-right font-medium">{{ formatTable(item.total || item.quantity * (item.unit_price || item.price)) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totales -->
      <div class="flex justify-end">
        <div class="w-72 space-y-1 text-sm">
          <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>{{ format(invoice.subtotal) }}</span></div>
          <div class="flex justify-between text-gray-500"><span>Descuento</span><span v-if="invoice.discount > 0" class="text-red-500">-{{ format(invoice.discount) }}</span><span v-else>$0</span></div>
          <div class="flex justify-between text-gray-500"><span>IVA (19%)</span><span>{{ format(invoice.tax) }}</span></div>
          <div class="flex justify-between text-lg font-bold pt-2 border-t" style="border-color: #d2c4b4;">
            <span style="color: #0b1c30;">Total</span>
            <span :class="invoice.status === 'paid' ? 'text-green-600' : 'text-primary-600'">
              {{ format(invoice.total) }}
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
      <button @click="downloadPDF"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
        style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
        <span class="material-icons-outlined" style="font-size: 1.125rem;">picture_as_pdf</span> PDF
      </button>
      <button @click="downloadExcel"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
        style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
        @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
        @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
        <span class="material-icons-outlined" style="font-size: 1.125rem;">table_chart</span> Excel
      </button>
      <button @click="downloadFiscalPDF"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
        style="background: #1e40af; color: white; border-color: rgba(30, 64, 175, 0.3); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
        <span class="material-icons-outlined" style="font-size: 1.125rem;">receipt_long</span> Asiento Fiscal
      </button>
      <button @click="printInvoice"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
        style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
        @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
        @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
        <span class="material-icons-outlined" style="font-size: 1.125rem;">print</span> Imprimir
      </button>

      <button v-if="invoice.status === 'issued'"
              @click="handleTogglePaid"
              :disabled="updatingPayment"
              class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
              style="background: #059669; color: white; border-color: rgba(5, 150, 105, 0.3); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
        <span class="material-icons-outlined" style="font-size: 1.125rem;">paid</span>
        {{ updatingPayment ? 'Procesando...' : 'Marcar como Pagada' }}
      </button>
      <button v-if="invoice.status === 'paid'"
              @click="handleToggleIssued"
              :disabled="updatingPayment"
              class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
              style="border-color: #d97706; color: #d97706; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
              @mouseenter="e => { e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.borderColor = '#b45309'; }"
              @mouseleave="e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = '#d97706'; }">
        <span class="material-icons-outlined" style="font-size: 1.125rem;">undo</span>
        {{ updatingPayment ? 'Procesando...' : 'Revertir Pago' }}
      </button>

      <router-link to="/app/invoices"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
        style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
        @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
        @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
        <span class="material-icons-outlined" style="font-size: 1.125rem;">arrow_back</span> Volver
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { invoicesAPI } from '../../api';
import Loading from '../../components/shared/Loading.vue';
import { useCurrency } from '../../composables/useCurrency';
import { formatDate } from '../../utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const { format, formatTable } = useCurrency();
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

const downloadFiscalPDF = () => {
  const doc = new jsPDF();
  const inv = invoice.value;
  const client = inv.clients || {};

  // Header fiscal
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('ASIENTO FISCAL', 105, 18, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Factura N°: ${inv.invoice_number || ''}`, 105, 28, { align: 'center' });
  doc.text(`Fecha de emisión: ${formatDate(inv.created_at)}`, 105, 36, { align: 'center' });

  // Datos del contribuyente
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(11);
  doc.text('DATOS DEL CONTRIBUYENTE', 14, 55);
  doc.setDrawColor(30, 64, 175);
  doc.line(14, 58, 80, 58);
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text(`Razón Social: ${client.business_name || client.name || 'Cliente General'}`, 14, 66);
  doc.text(`RUC/CI: ${client.document_id || inv.client_document || 'N/A'}`, 14, 74);
  doc.text(`Dirección: ${client.address || 'N/A'}`, 14, 82);
  doc.text(`Teléfono: ${client.phone || 'N/A'}`, 14, 90);
  doc.text(`Email: ${client.email || 'N/A'}`, 14, 98);

  // Detalle de transacción
  let y = 110;
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(11);
  doc.text('DETALLE DE TRANSACCIÓN', 14, y);
  doc.line(14, y + 3, 80, y + 3);
  y += 11;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text(`Tipo de Comprobante: Factura de Venta`, 14, y);
  doc.text(`N° de Factura: ${inv.invoice_number || ''}`, 14, y + 8);
  doc.text(`Fecha de Emisión: ${formatDate(inv.created_at)}`, 14, y + 16);
  if (inv.due_date) doc.text(`Fecha de Vencimiento: ${formatDate(inv.due_date)}`, 14, y + 24);
  doc.text(`Estado Fiscal: ${inv.status === 'paid' ? 'PAGADA' : inv.status === 'issued' ? 'EMITIDA' : 'ANULADA'}`, 14, y + 32);
  if (inv.paid_at) doc.text(`Fecha de Pago: ${formatDate(inv.paid_at)}`, 14, y + 40);

  // Tabla de items
  y += 50;
  const tableItems = items.value.map(i => [
    i.products?.name || i.product_name || 'Producto',
    String(i.quantity),
    `$${Number(i.unit_price || i.price).toLocaleString('es-CO')}`,
    `$${Number(i.total || (i.quantity * (i.unit_price || i.price))).toLocaleString('es-CO')}`
  ]);
  doc.autoTable({
    startY: y,
    head: [['Producto/Servicio', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: tableItems,
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 245, 255] }
  });

  // Resumen fiscal
  const fy = doc.lastAutoTable.finalY + 12;
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(11);
  doc.text('RESUMEN FISCAL', 14, fy);
  doc.line(14, fy + 3, 60, fy + 3);
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  const subY = fy + 12;
  doc.text('Subtotal:', 140, subY);
  doc.text(`$${Number(inv.subtotal).toLocaleString('es-CO')}`, 175, subY, { align: 'right' });
  if (inv.discount > 0) {
    doc.text('Descuento:', 140, subY + 8);
    doc.text(`-$${Number(inv.discount).toLocaleString('es-CO')}`, 175, subY + 8, { align: 'right' });
  }
  doc.text('IVA (19%):', 140, subY + (inv.discount > 0 ? 16 : 8));
  doc.text(`$${Number(inv.tax).toLocaleString('es-CO')}`, 175, subY + (inv.discount > 0 ? 16 : 8), { align: 'right' });

  doc.setDrawColor(30, 64, 175);
  doc.line(130, subY + (inv.discount > 0 ? 22 : 14), 190, subY + (inv.discount > 0 ? 22 : 14));
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const totalY = subY + (inv.discount > 0 ? 30 : 22);
  doc.text('TOTAL:', 140, totalY);
  doc.text(`$${Number(inv.total).toLocaleString('es-CO')}`, 175, totalY, { align: 'right' });

  // Footer fiscal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generado electrónicamente. Este comprobante tiene validez fiscal conforme a la normativa vigente.', 105, 280, { align: 'center' });

  doc.save(`asiento-fiscal-${inv.invoice_number}.pdf`);
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

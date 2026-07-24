<template>
  <DetailSkeleton v-if="loading" />
  <div v-else class="max-w-5xl mx-auto" style="display: flex; flex-direction: column; gap: var(--aurora-gutter);">
    <!-- Invoice Display -->
    <div class="aurora-raised-card" id="invoice-content"
         :style="{
           borderLeft: invoice.status === 'paid' ? '4px solid #22c55e' : invoice.status === 'issued' ? '4px solid #eab308' : (invoice.status === 'cancelled' || invoice.status === 'voided') ? '4px solid #ef4444' : '4px solid var(--aurora-outline)'
         }">
      <!-- Status ribbon -->
      <div class="flex justify-between items-start" style="margin-bottom: var(--aurora-md);">
        <div>
          <div class="flex items-center gap-3">
            <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.75rem; font-weight: 700; color: var(--aurora-on-surface); letter-spacing: -0.02em; margin: 0;">Factura</h1>
            <span class="aurora-badge"
              :class="invoice.status === 'paid' ? 'aurora-badge-success' : invoice.status === 'issued' ? 'aurora-badge-warning' : 'aurora-badge-danger'">
              {{ invoice.status === 'paid' ? 'PAGADA' : invoice.status === 'issued' ? 'EMITIDA' : invoice.status === 'cancelled' ? 'ANULADA' : 'ANULADA' }}
            </span>
          </div>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant); margin-top: 0.25rem;">N° {{ invoice.invoice_number }}</p>
          <p v-if="invoice.paid_at" style="font-size: 0.875rem; color: #16a34a; margin-top: 0.25rem;">
            <span class="material-symbols-outlined" style="font-size: 0.875rem; vertical-align: text-bottom;">check_circle</span>
            Pagada el {{ formatDate(invoice.paid_at) }}
          </p>
        </div>
        <div class="text-right">
          <img v-if="invoice.qr_code" :src="invoice.qr_code" class="w-24 h-24" alt="QR" />
        </div>
      </div>

      <!-- Client & Invoice Info -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6" style="margin-bottom: var(--aurora-md); padding: var(--aurora-md); border-radius: var(--aurora-radius-lg); background: var(--aurora-surface-container);">
        <div>
          <p style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--aurora-on-surface-variant); margin-bottom: 0.5rem;">Cliente</p>
          <p style="font-weight: 600; color: var(--aurora-on-surface);">{{ invoice.clients?.name || invoice.client_name || 'Cliente General' }}</p>
          <p v-if="invoice.clients?.document_id || invoice.client_document" style="font-size: 0.875rem; color: var(--aurora-on-surface-variant);">
            Doc: {{ invoice.clients?.document_id || invoice.client_document }}
          </p>
          <p v-if="invoice.clients?.email" style="font-size: 0.875rem; color: var(--aurora-on-surface-variant);">{{ invoice.clients.email }}</p>
          <p v-if="invoice.clients?.phone" style="font-size: 0.875rem; color: var(--aurora-on-surface-variant);">{{ invoice.clients.phone }}</p>
          <p v-if="invoice.clients?.address" style="font-size: 0.875rem; color: var(--aurora-on-surface-variant);">{{ invoice.clients.address }}</p>
        </div>
        <div class="sm:text-right">
          <p style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--aurora-on-surface-variant); margin-bottom: 0.5rem;">Detalles de Factura</p>
          <p style="font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Emisión: {{ formatDate(invoice.created_at) }}</p>
          <p v-if="invoice.due_date" style="font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Vencimiento: {{ formatDate(invoice.due_date) }}</p>
          <p v-if="invoice.sales?.sale_number" style="font-size: 0.875rem; color: var(--aurora-on-surface-variant);">
            Venta: {{ invoice.sales.sale_number }}
          </p>
        </div>
      </div>

      <!-- Products Table -->
      <table class="aurora-table" style="margin-bottom: var(--aurora-md);">
        <thead>
          <tr>
            <th style="text-align: left;">Producto</th>
            <th style="text-align: right;">Cant.</th>
            <th style="text-align: right;">Precio</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded" style="background: var(--aurora-surface-container); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--aurora-on-surface-variant);">
                  <span class="material-symbols-outlined" style="font-size: 0.875rem;">inventory_2</span>
                </div>
                <span style="font-weight: 500; color: var(--aurora-on-surface);">
                  {{ item.products?.name || item.product_name || 'Producto' }}
                </span>
              </div>
            </td>
            <td style="text-align: right;">{{ item.quantity }}</td>
            <td style="text-align: right;">{{ formatTable(item.unit_price || item.price) }}</td>
            <td style="text-align: right; font-weight: 500;">{{ formatTable(item.total || item.quantity * (item.unit_price || item.price)) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totales -->
      <div class="flex justify-end">
        <div style="width: 18rem; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem;">
          <div class="flex justify-between" style="color: var(--aurora-on-surface-variant);"><span>Subtotal</span><span>{{ format(invoice.subtotal) }}</span></div>
          <div class="flex justify-between" style="color: var(--aurora-on-surface-variant);"><span>Descuento</span><span v-if="invoice.discount > 0" style="color: #dc2626;">-{{ format(invoice.discount) }}</span><span v-else>$0</span></div>
          <div class="flex justify-between" style="color: var(--aurora-on-surface-variant);"><span>IVA (19%)</span><span>{{ format(invoice.tax) }}</span></div>
          <div class="flex justify-between text-lg font-bold pt-2" style="border-top: 1px solid var(--aurora-outline-variant);">
            <span style="color: var(--aurora-on-surface);">Total</span>
            <span :style="{ color: invoice.status === 'paid' ? '#16a34a' : 'var(--aurora-primary)' }">
              {{ format(invoice.total) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Watermark for paid -->
      <div v-if="invoice.status === 'paid'" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 4rem; font-weight: 700; color: rgba(34,197,94,0.1); pointer-events: none; user-select: none;">
        PAGADA
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-3">
      <button @click="handleDownloadPDF"
        class="aurora-btn-primary">
        <span class="material-symbols-outlined" style="font-size: 1.125rem;">picture_as_pdf</span> PDF
      </button>
      <button @click="handleDownloadExcel"
        class="aurora-btn-secondary">
        <span class="material-symbols-outlined" style="font-size: 1.125rem;">table_chart</span> Excel
      </button>
      <button @click="handleDownloadFiscalPDF"
        class="aurora-btn-primary">
        <span class="material-symbols-outlined" style="font-size: 1.125rem;">receipt_long</span> Asiento Fiscal
      </button>
      <button @click="printInvoice"
        class="aurora-btn-secondary">
        <span class="material-symbols-outlined" style="font-size: 1.125rem;">print</span> Imprimir
      </button>

      <button v-if="invoice.status === 'issued'"
              @click="handleTogglePaid"
              :disabled="updatingPayment"
              class="aurora-btn-primary">
        <span class="material-symbols-outlined" style="font-size: 1.125rem;">paid</span>
        {{ updatingPayment ? 'Procesando...' : 'Marcar como Pagada' }}
      </button>
      <button v-if="invoice.status === 'paid'"
              @click="handleToggleIssued"
              :disabled="updatingPayment"
              class="aurora-btn-secondary">
        <span class="material-symbols-outlined" style="font-size: 1.125rem;">undo</span>
        {{ updatingPayment ? 'Procesando...' : 'Revertir Pago' }}
      </button>

      <router-link to="/app/invoices"
        class="aurora-btn-secondary">
        <span class="material-symbols-outlined" style="font-size: 1.125rem;">arrow_back</span> Volver
      </router-link>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { invoicesAPI } from '../../api';
import DetailSkeleton from '../../components/skeletons/DetailSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';
import AuroraDownloadModal from '../../components/shared/AuroraDownloadModal.vue';
import { useCurrency } from '../../composables/useCurrency';
import { formatDate } from '../../utils';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const { format, formatTable } = useCurrency();

const route = useRoute();
const invoice = ref({});
const loading = ref(true);
const updatingPayment = ref(false);

// Download modal state
const showDownloadModal = ref(false);
const currentDownloadFn = ref(null);
const modalTitle = ref('Generating PDF Report...');
const modalSubtitle = ref('Please wait while Aurora ERP compiles your data and performance metrics.');
const modalSuccessMessage = ref('Your report is ready for download.');
const modalFileName = ref('report.pdf');

const items = computed(() => {
  const saleItems = invoice.value.sales?.sale_items || [];
  const directItems = invoice.value.items || [];
  return saleItems.length > 0 ? saleItems : directItems;
});

// Download modal handlers
const handleDownloadPDF = () => {
  modalTitle.value = 'Generating Invoice PDF...';
  modalSubtitle.value = 'Compiling invoice data, items, and tax information into a printable document.';
  modalSuccessMessage.value = 'Your invoice PDF is ready.';
  modalFileName.value = `factura-${invoice.value.invoice_number}.pdf`;
  currentDownloadFn.value = downloadPDF;
  showDownloadModal.value = true;
};

const handleDownloadFiscalPDF = () => {
  modalTitle.value = 'Generating Fiscal Document...';
  modalSubtitle.value = 'Compiling fiscal records, tax breakdown, and legal compliance data.';
  modalSuccessMessage.value = 'Your fiscal document is ready.';
  modalFileName.value = `asiento-fiscal-${invoice.value.invoice_number}.pdf`;
  currentDownloadFn.value = downloadFiscalPDF;
  showDownloadModal.value = true;
};

const handleDownloadExcel = () => {
  modalTitle.value = 'Generating Excel Report...';
  modalSubtitle.value = 'Structuring data tables, formatting cells, and preparing spreadsheet.';
  modalSuccessMessage.value = 'Your Excel report is ready.';
  modalFileName.value = `factura-${invoice.value.invoice_number}.xlsx`;
  currentDownloadFn.value = downloadExcel;
  showDownloadModal.value = true;
};

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
  autoTable(doc, {
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
  autoTable(doc, {
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

function mapInvoiceData(data) {
  if (!data) return {};
  return {
    id: data.id,
    invoice_number: data.invoiceNumber || data.invoice_number,
    ncf: data.ncf,
    sale_id: data.saleId || data.sale_id,
    client_id: data.clientId || data.client_id,
    client_name: data.clientName || data.client_name,
    client_document: data.clientDocumentNumber || data.client_document_number || data.clientDocument,
    user_id: data.userId || data.user_id,
    status: data.status,
    subtotal: data.subtotal,
    discount: data.discount,
    tax: data.tax,
    total: data.total,
    invoice_type: data.invoiceType || data.invoice_type,
    qr_code: data.qrCodeText || data.qr_code,
    due_date: data.dueDate || data.due_date,
    paid_at: data.paidAt || data.paid_at,
    cancelled_at: data.cancelledAt || data.cancelled_at,
    created_at: data.createdAt || data.created_at,
    updated_at: data.updatedAt || data.updated_at,
    notes: data.notes,
    source: data.source || data.source,
    clients: data.clients || (data.clientName ? {
      name: data.clientName || data.client_name,
      email: data.clientEmail || data.client_email,
      phone: data.clientPhone || data.client_phone,
      document_id: data.clientDocumentNumber || data.client_document_number,
      address: data.clientAddress || data.client_address,
    } : null),
    sales: data.sales || (data.saleId ? {
      sale_number: data.saleNumber || data.sale_number,
      sale_items: (data.items || []).map(i => ({
        id: i.id,
        product_id: i.productId || i.product_id,
        product_name: i.productName || i.product_name,
        quantity: i.quantity,
        unit_price: i.unitPrice || i.unit_price,
        price: i.unitPrice || i.unit_price || i.price,
        total: i.total,
        discount: i.discount,
        tax: i.tax,
        products: i.products || (i.productName ? { name: i.productName || i.product_name } : null),
      }))
    } : null),
    items: (data.items || []).map(i => ({
      id: i.id,
      product_id: i.productId || i.product_id,
      product_name: i.productName || i.product_name,
      quantity: i.quantity,
      unit_price: i.unitPrice || i.unit_price,
      price: i.unitPrice || i.unit_price || i.price,
      total: i.total,
      discount: i.discount,
      tax: i.tax,
      products: i.products || (i.productName ? { name: i.productName || i.product_name } : null),
    })),
  };
}

const loadInvoice = async () => {
  try {
    const res = await invoicesAPI.getById(route.params.id);
    invoice.value = mapInvoiceData(res.data || {});
  } catch (e) {
    console.error('[InvoiceDetail] Error loading invoice:', e);
  } finally {
    loading.value = false;
  }
};

onMounted(loadInvoice);
</script>

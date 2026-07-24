<template>
  <div class="space-y-4 aurora-entrance">
    <!-- Page Header -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> point_of_sale </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Punto de Venta"
            description="Gestión de turnos de caja registradora"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <button v-if="!isOpen" @click="confirmOpenSession" class="aurora-header-button aurora-header-button-primary">
            <span class="material-symbols-outlined"> lock_open </span>
            Abrir Turno
          </button>
          <button v-else @click="confirmCloseSession" class="aurora-header-button" style="color: white; background: var(--aurora-error); box-shadow: 0 10px 25px rgba(220, 38, 38, 0.35);">
            <span class="material-symbols-outlined"> lock </span>
            Cerrar Turno
          </button>
          <button v-if="isOpen" @click="openMovementForm" class="aurora-header-button aurora-header-button-secondary">
            <span class="material-symbols-outlined"> payments </span>
            Registrar Movimiento
          </button>
        </div>
      </div>
    </div>

    <!-- Current Session Status -->
    <div v-if="currentSession" class="aurora-raised-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-semibold text-on-surface">Turno Actual</h3>
          <p class="text-xs text-on-surface-variant">Turno abierto por {{ currentSession.users?.name || '—' }}</p>
        </div>
        <span class="aurora-badge" :class="isOpen ? 'aurora-badge-success' : 'aurora-badge-secondary'">
          {{ isOpen ? 'Abierto' : 'Cerrado' }}
        </span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p class="text-xs text-on-surface-variant">Apertura</p>
          <p class="text-sm font-medium text-on-surface">{{ formatDateTime(currentSession.opened_at) }}</p>
        </div>
        <div>
          <p class="text-xs text-on-surface-variant">Saldo Inicial</p>
          <p class="text-sm font-medium text-on-surface">${{ formatPrice(currentSession.opening_balance) }}</p>
        </div>
        <div>
          <p class="text-xs text-on-surface-variant">Ventas</p>
          <p class="text-sm font-medium text-on-surface">{{ currentSession.sales_count || 0 }}</p>
        </div>
        <div>
          <p class="text-xs text-on-surface-variant">Total Esperado</p>
          <p class="text-sm font-bold" style="color: var(--aurora-tertiary);">${{ formatPrice(currentSession.expected_balance || 0) }}</p>
        </div>
      </div>
    </div>

    <!-- Alert messages -->
    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" />

    <!-- Sessions History -->
    <div class="aurora-raised-card">
      <div class="flex items-center justify-between p-4" style="border-bottom: 1px solid var(--aurora-outline-variant);">
        <h3 class="font-semibold text-on-surface">Historial de Turnos</h3>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2" style="border-color: var(--aurora-primary);"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="!sessions.length" class="text-sm text-on-surface-variant text-center py-8">
        No hay turnos registrados.
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="aurora-table">
          <thead>
            <tr>
              <th class="text-left">#</th>
              <th class="text-left">Apertura</th>
              <th class="text-left">Cierre</th>
              <th class="text-left">Cajero</th>
              <th class="text-right">Inicial</th>
              <th class="text-right">Esperado</th>
              <th class="text-right">Real</th>
              <th class="text-right">Diferencia</th>
              <th class="text-center">Estado</th>
              <th class="text-center">Reporte</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sessions" :key="s.id">
              <td class="font-mono text-xs text-on-surface">{{ s.id?.substring(0, 8) }}</td>
              <td class="text-on-surface-variant">{{ formatDateTime(s.opened_at) }}</td>
              <td class="text-on-surface-variant">{{ s.closed_at ? formatDateTime(s.closed_at) : '-' }}</td>
              <td class="text-on-surface">{{ s.users?.name || '—' }}</td>
              <td class="text-right text-on-surface">${{ formatPrice(s.opening_balance) }}</td>
              <td class="text-right text-on-surface">${{ formatPrice(s.expected_balance || 0) }}</td>
              <td class="text-right text-on-surface">${{ formatPrice(s.closing_balance || 0) }}</td>
              <td class="text-right" :class="getDifferenceClass(s.difference)">
                ${{ formatPrice(s.difference || 0) }}
              </td>
              <td class="text-center">
                <span class="aurora-badge" :class="s.status === 'closed' ? 'aurora-badge-secondary' : s.status === 'reconciled' ? 'aurora-badge-success' : 'aurora-badge-info'">
                  {{ s.status === 'closed' ? 'Cerrado' : s.status === 'reconciled' ? 'Conciliado' : 'Abierto' }}
                </span>
              </td>
              <td class="text-center">
                <button @click="viewSessionReport(s)" class="text-xs font-medium" style="color: var(--aurora-primary);">
                  Reporte
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
<POSView ></POSView>
    <!-- Open Session Modal -->
    <Modal :show="showOpenForm" title="Abrir Turno" @close="showOpenForm = false" size="sm">
      <form @submit.prevent="handleOpen" class="space-y-4">
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Saldo Inicial <span style="color: var(--aurora-error);">*</span></label>
          <input v-model.number="openFormData.opening_balance" type="number" min="0" step="100" required
            class="aurora-input w-full" placeholder="0" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Nota (opcional)</label>
          <input v-model="openFormData.notes" class="aurora-input w-full" placeholder="Nota de apertura..." />
        </div>
        <div v-if="formError" class="text-sm" style="color: var(--aurora-error); background: var(--aurora-error-container); padding: 0.75rem; border-radius: 0.75rem;">{{ formError }}</div>
        <div class="flex justify-end gap-3">
          <button type="button" @click="showOpenForm = false" class="aurora-btn-secondary">Cancelar</button>
          <button type="submit" class="aurora-btn-primary" :disabled="saving">{{ saving ? 'Abriendo...' : 'Abrir Turno' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Close Session Modal -->
    <Modal :show="showCloseForm" title="Cerrar Turno" @close="showCloseForm = false" size="sm">
      <form @submit.prevent="handleClose" class="space-y-4">
        <div v-if="currentSession" class="grid grid-cols-2 gap-3 mb-4">
          <div class="p-3 text-sm" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Saldo Inicial</p>
            <p class="text-sm font-bold text-on-surface">${{ formatPrice(currentSession.opening_balance) }}</p>
          </div>
          <div class="p-3 text-sm" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Ventas</p>
            <p class="text-sm font-bold text-on-surface">{{ currentSession.sales_count || 0 }}</p>
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Saldo Final <span style="color: var(--aurora-error);">*</span></label>
          <input v-model.number="closeFormData.closing_balance" type="number" min="0" step="100" required
            class="aurora-input w-full" placeholder="0" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Nota</label>
          <input v-model="closeFormData.notes" class="aurora-input w-full" placeholder="Nota de cierre..." />
        </div>
        <div v-if="formError" class="text-sm" style="color: var(--aurora-error); background: var(--aurora-error-container); padding: 0.75rem; border-radius: 0.75rem;">{{ formError }}</div>
        <div class="flex justify-end gap-3">
          <button type="button" @click="showCloseForm = false" class="aurora-btn-secondary">Cancelar</button>
          <button type="submit" class="aurora-btn-primary" :disabled="saving" style="background: var(--aurora-error);">{{ saving ? 'Cerrando...' : 'Cerrar Turno' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Movement Form Modal -->
    <Modal :show="showMovementForm" title="Registrar Movimiento" @close="showMovementForm = false" size="sm">
      <form @submit.prevent="handleMovement" class="space-y-4">
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Tipo <span style="color: var(--aurora-error);">*</span></label>
          <select v-model="movementFormData.type" required class="aurora-select w-full">
            <option value="income">Ingreso</option>
            <option value="expense">Egreso</option>
            <option value="withdrawal">Retiro</option>
            <option value="deposit">Depósito</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Monto <span style="color: var(--aurora-error);">*</span></label>
          <input v-model.number="movementFormData.amount" type="number" min="0" step="100" required class="aurora-input w-full" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Método de Pago</label>
          <select v-model="movementFormData.payment_method" class="aurora-select w-full">
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Referencia</label>
          <input v-model="movementFormData.reference" class="aurora-input w-full" placeholder="N° referencia..." />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Descripción</label>
          <textarea v-model="movementFormData.description" rows="2" class="aurora-input w-full" placeholder="Motivo del movimiento..."></textarea>
        </div>
        <div v-if="formError" class="text-sm" style="color: var(--aurora-error); background: var(--aurora-error-container); padding: 0.75rem; border-radius: 0.75rem;">{{ formError }}</div>
        <div class="flex justify-end gap-3">
          <button type="button" @click="showMovementForm = false" class="aurora-btn-secondary">Cancelar</button>
          <button type="submit" class="aurora-btn-primary" :disabled="saving">{{ saving ? 'Registrando...' : 'Registrar' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Session Report Modal -->
    <Modal :show="showReport" title="Reporte de Turno" @close="showReport = false" size="xl">
      <div v-if="reportLoading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2" style="border-color: var(--aurora-primary);"></div>
      </div>
      <div v-else-if="reportData">
        <!-- Report Header -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="p-3" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Cajero</p>
            <p class="text-sm font-semibold text-on-surface">{{ reportData.cashier_name || '—' }}</p>
          </div>
          <div class="p-3" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Apertura</p>
            <p class="text-sm font-semibold text-on-surface">{{ formatDateTime(reportData.opened_at) }}</p>
          </div>
          <div class="p-3" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Cierre</p>
            <p class="text-sm font-semibold text-on-surface">{{ reportData.closed_at ? formatDateTime(reportData.closed_at) : '—' }}</p>
          </div>
          <div class="p-3" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
            <p class="text-xs text-on-surface-variant">Total Vendido</p>
            <p class="text-sm font-bold" style="color: var(--aurora-primary);">${{ formatPrice(reportData.total_sales || 0) }}</p>
          </div>
        </div>

        <!-- Products Sold Table -->
        <h4 class="font-semibold text-sm text-on-surface mb-3">Productos Vendidos</h4>
        <div class="overflow-x-auto mb-6">
          <table class="aurora-table w-full">
            <thead>
              <tr>
                <th class="text-left">Producto</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Precio Unit.</th>
                <th class="text-right">Subtotal</th>
                <th class="text-right">Impuesto</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in reportData.items" :key="idx">
                <td class="text-on-surface">{{ item.product_name || item.products?.name || '—' }}</td>
                <td class="text-right text-on-surface">{{ item.quantity }}</td>
                <td class="text-right text-on-surface">${{ formatPrice(item.unit_price || item.price) }}</td>
                <td class="text-right text-on-surface">${{ formatPrice((item.quantity || 0) * (item.unit_price || item.price || 0)) }}</td>
                <td class="text-right text-on-surface">${{ formatPrice(item.tax || 0) }}</td>
                <td class="text-right font-bold text-on-surface">${{ formatPrice(item.total || (item.quantity || 0) * (item.unit_price || item.price || 0)) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-right font-bold text-on-surface">Totales</td>
                <td class="text-right font-bold text-on-surface">${{ formatPrice(reportData.subtotal || 0) }}</td>
                <td class="text-right font-bold text-on-surface">${{ formatPrice(reportData.total_tax || 0) }}</td>
                <td class="text-right font-bold text-on-surface" style="color: var(--aurora-primary);">${{ formatPrice(reportData.total_sales || 0) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Download Buttons -->
        <div class="flex justify-end gap-3">
          <button @click="downloadReportPDF" class="aurora-btn-primary">
            <span class="material-symbols-outlined" style="font-size: 1.125rem;">picture_as_pdf</span>
            Descargar PDF
          </button>
          <button @click="downloadReportExcel" class="aurora-btn-secondary">
            <span class="material-symbols-outlined" style="font-size: 1.125rem;">table_chart</span>
            Descargar Excel
          </button>
        </div>
      </div>
      <div v-else class="text-center py-8 text-on-surface-variant text-sm">
        No hay datos disponibles para este turno.
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useCashRegisterStore } from '../../stores/cashRegister';
import { useCurrencyStore } from '../../stores/currency';
import { authAPI, salesAPI } from '../../api';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PageHeader from '../../components/shared/PageHeader.vue';
import Alert from '../../components/shared/Alert.vue';
import Modal from '../../components/shared/Modal.vue';
import POSView from './POSView.vue';

const cashStore = useCashRegisterStore();
const currencyStore = useCurrencyStore();

const currentSession = computed(() => cashStore.currentSession);
const isOpen = computed(() => cashStore.isOpen);
const sessions = computed(() => cashStore.sessions);
const loading = computed(() => cashStore.loading);

const saving = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const formError = ref('');
const showOpenForm = ref(false);
const showCloseForm = ref(false);
const showMovementForm = ref(false);
const showReport = ref(false);
const reportData = ref(null);
const reportLoading = ref(false);
const movements = ref([]);
const movementsLoading = ref(false);

const openFormData = ref({ opening_balance: 0, notes: '' });
const closeFormData = ref({ closing_balance: 0, notes: '' });
const movementFormData = ref({
  type: 'income',
  amount: 0,
  payment_method: 'cash',
  reference: '',
  description: ''
});

const formatPrice = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '0.00';
  try {
    return new Intl.NumberFormat(currencyStore.locale || 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(v);
  } catch {
    return Number(v).toFixed(2);
  }
};
const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-CO') : '-';

const getDifferenceClass = (diff) => {
  if (!diff || diff === 0) return 'text-gray-500';
  return diff > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
};

// --- Admin password verification ---
const verifyAdminPassword = async () => {
  const { value: password } = await Swal.fire({
    title: 'Verificación de Administrador',
    text: 'Ingresa tu contraseña para continuar',
    icon: 'warning',
    input: 'password',
    inputPlaceholder: 'Contraseña',
    showCancelButton: true,
    confirmButtonText: 'Verificar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#7c3aed',
    inputValidator: (value) => !value ? 'Debes ingresar la contraseña' : null
  });
  if (!password) return false;
  try {
    const res = await authAPI.verifyPassword({ password });
    if (!res.data?.valid) {
      Swal.fire('Error', 'Contraseña incorrecta', 'error');
      return false;
    }
    return true;
  } catch (e) {
    Swal.fire('Error', 'Error al verificar contraseña', 'error');
    return false;
  }
};

const loadSessions = async () => {
  await cashStore.fetchSessions({ page: 1, limit: 50 });
};

const confirmOpenSession = async () => {
  const verified = await verifyAdminPassword();
  if (!verified) return;
  openFormData.value = { opening_balance: 0, notes: '' };
  formError.value = '';
  showOpenForm.value = true;
};

const confirmCloseSession = async () => {
  const verified = await verifyAdminPassword();
  if (!verified) return;
  closeFormData.value = { closing_balance: 0, notes: '' };
  formError.value = '';
  showCloseForm.value = true;
};

const openMovementForm = () => {
  movementFormData.value = { type: 'income', amount: 0, payment_method: 'cash', reference: '', description: '' };
  formError.value = '';
  showMovementForm.value = true;
};

const handleOpen = async () => {
  saving.value = true;
  formError.value = '';
  try {
    await cashStore.openSession(openFormData.value);
    successMsg.value = 'Turno abierto correctamente';
    showOpenForm.value = false;
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Error al abrir turno';
  } finally {
    saving.value = false;
  }
};

const handleClose = async () => {
  saving.value = true;
  formError.value = '';
  try {
    await cashStore.closeSession(currentSession.value.id, closeFormData.value);
    successMsg.value = 'Turno cerrado correctamente';
    showCloseForm.value = false;
    await loadSessions();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Error al cerrar turno';
  } finally {
    saving.value = false;
  }
};

const handleMovement = async () => {
  saving.value = true;
  formError.value = '';
  try {
    await cashStore.registerMovement({
      ...movementFormData.value,
      session_id: currentSession.value?.id
    });
    successMsg.value = 'Movimiento registrado correctamente';
    showMovementForm.value = false;
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Error al registrar movimiento';
  } finally {
    saving.value = false;
  }
};

// --- Session Report ---
const viewSessionReport = async (session) => {
  showReport.value = true;
  reportLoading.value = true;
  reportData.value = null;
  try {
    // Fetch sales for this session's time range
    const params = {
      fromDate: session.opened_at,
      toDate: session.closed_at || new Date().toISOString(),
      limit: 9999
    };
    const res = await salesAPI.getAll(params);
    const salesList = res.data || [];

    // Build report data
    const allItems = [];
    let totalSales = 0;
    let totalTax = 0;
    let subtotal = 0;

    salesList.forEach(sale => {
      const items = sale.items || sale.sale_items || [];
      items.forEach(item => {
        const qty = item.quantity || 1;
        const price = item.unit_price || item.price || 0;
        const tax = item.tax || 0;
        const itemTotal = (qty * price) + tax;
        allItems.push({
          product_name: item.product_name || item.products?.name || 'Producto',
          products: item.products,
          quantity: qty,
          unit_price: price,
          price,
          tax,
          total: itemTotal
        });
        totalSales += itemTotal;
        totalTax += tax;
        subtotal += qty * price;
      });
    });

    reportData.value = {
      cashier_name: session.users?.name || '—',
      opened_at: session.opened_at,
      closed_at: session.closed_at,
      opening_balance: session.opening_balance,
      closing_balance: session.closing_balance,
      total_sales: totalSales,
      total_tax: totalTax,
      subtotal,
      items: allItems
    };
  } catch (e) {
    console.error('Error loading report:', e);
  } finally {
    reportLoading.value = false;
  }
};

const downloadReportPDF = () => {
  if (!reportData.value) return;
  const data = reportData.value;
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text('Reporte de Turno - Punto de Venta', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Cajero: ${data.cashier_name}`, 14, 30);
  doc.text(`Apertura: ${formatDateTime(data.opened_at)}`, 14, 36);
  doc.text(`Cierre: ${formatDateTime(data.closed_at)}`, 14, 42);

  const rows = data.items.map((item, i) => [
    i + 1,
    item.product_name,
    item.quantity,
    `$${formatPrice(item.unit_price)}`,
    `$${formatPrice(item.tax)}`,
    `$${formatPrice(item.total)}`
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Producto', 'Cant.', 'P. Unit.', 'Impuesto', 'Total']],
    body: rows,
    foot: [[{ content: 'Totales', colSpan: 3 }, '', `$${formatPrice(data.total_tax)}`, `$${formatPrice(data.total_sales)}`]],
    theme: 'striped',
    headStyles: { fillColor: [124, 58, 237] },
    footStyles: { fillColor: [245, 245, 245], textColor: [30, 41, 59], fontStyle: 'bold' }
  });

  const finalY = doc.lastAutoTable.finalY || 50;
  doc.setFontSize(10);
  doc.text(`Total Vendido: $${formatPrice(data.total_sales)}`, 14, finalY + 10);
  doc.text(`Total Impuestos: $${formatPrice(data.total_tax)}`, 14, finalY + 16);

  doc.save(`reporte-turno-${data.cashier_name?.replace(/\s+/g, '_') || 'caja'}.pdf`);
};

const downloadReportExcel = () => {
  if (!reportData.value) return;
  const data = reportData.value;
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Cajero', data.cashier_name],
    ['Apertura', formatDateTime(data.opened_at)],
    ['Cierre', formatDateTime(data.closed_at)],
    ['Total Ventas', data.total_sales],
    ['Total Impuestos', data.total_tax],
    ['Subtotal', data.subtotal]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // Products sheet
  const productsData = [
    ['#', 'Producto', 'Cantidad', 'Precio Unit.', 'Impuesto', 'Total'],
    ...data.items.map((item, i) => [
      i + 1,
      item.product_name,
      item.quantity,
      item.unit_price,
      item.tax,
      item.total
    ])
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(productsData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Productos');

  XLSX.writeFile(wb, `reporte-turno-${data.cashier_name?.replace(/\s+/g, '_') || 'caja'}.xlsx`);
};

onMounted(async () => {
  await cashStore.fetchCurrentSession();
  await loadSessions();
});
</script>

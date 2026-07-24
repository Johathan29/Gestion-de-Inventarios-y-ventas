<template>
  <DetailSkeleton v-if="loading" />
  <div v-else class="max-w-5xl mx-auto" style="display: flex; flex-direction: column; gap: var(--aurora-gutter);">
    <div class="aurora-raised-card">
      <div class="flex items-start justify-between" style="margin-bottom: var(--aurora-md);">
        <div>
          <div class="flex items-center gap-3">
            <h2 style="margin-bottom: 0; font-size: 1.25rem; font-weight: 700; color: var(--aurora-on-surface); font-family: 'Inter', sans-serif;">Venta #{{ sale.sale_number || sale.invoice_number || sale.id?.substring(0, 8) }}</h2>
            <span v-if="sale.status === 'completed'" class="aurora-badge aurora-badge-success">Completada</span>
            <span v-else-if="sale.status === 'cancelled'" class="aurora-badge aurora-badge-danger">Cancelada</span>
            <span v-else class="aurora-badge aurora-badge-warning">Pendiente</span>
          </div>
          <p style="color: var(--aurora-on-surface-variant); font-family: 'Inter', sans-serif; font-size: 0.875rem; margin-top: 0.25rem;">{{ formatDateTime(sale.created_at) }}</p>
        </div>
      </div>

      <!-- Client Info -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" style="margin-bottom: var(--aurora-md); font-size: 0.875rem;">
        <div class="aurora-pressed" style="border-radius: var(--aurora-radius-lg); padding: var(--aurora-base) var(--aurora-md);">
          <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Cliente</span>
          <span class="font-medium" style="color: var(--aurora-on-surface);">{{ sale.clients?.name || sale.client_name || 'Cliente General' }}</span>
        </div>
        <div class="aurora-pressed" style="border-radius: var(--aurora-radius-lg); padding: var(--aurora-base) var(--aurora-md);">
          <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Tipo de Pago</span>
          <span class="font-medium" style="color: var(--aurora-on-surface);">{{ sale.payment_method || sale.payment_type || '-' }}</span>
        </div>
        <div class="aurora-pressed" style="border-radius: var(--aurora-radius-lg); padding: var(--aurora-base) var(--aurora-md);">
          <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Cajero</span>
          <span class="font-medium" style="color: var(--aurora-on-surface);">{{ sale.users?.name || sale.user_name || '-' }}</span>
        </div>
      </div>

      <!-- Items with product info from products table -->
      <h3 style="font-weight: 600; color: var(--aurora-on-surface); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem;">
        <span class="material-symbols-outlined" style="color: var(--aurora-primary);">inventory_2</span>
        Productos ({{ sale.sale_items?.length || sale.items?.length || 0 }})
      </h3>

      <!-- Desktop -->
      <div class="hidden md:block overflow-x-auto">
        <table class="aurora-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU / Barra</th>
              <th style="text-align: right;">Cant.</th>
              <th style="text-align: right;">Precio U.</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg overflow-hidden" style="background: var(--aurora-surface-container); flex-shrink: 0;">
                    <img v-if="getProductImage(item)" :src="getProductImage(item)" class="w-full h-full object-cover" alt="" />
                    <span v-else class="flex items-center justify-center h-full" style="color: var(--aurora-on-surface-variant);">
                      <span class="material-symbols-outlined text-lg">inventory_2</span>
                    </span>
                  </div>
                  <div>
                    <p class="font-medium" style="color: var(--aurora-on-surface);">{{ item.product_name || item.productName || item.products?.name }}</p>
                    <p v-if="item.variantName || item.variant_name" class="text-xs mt-0.5" style="color: var(--aurora-primary); font-weight: 500;">
                      {{ item.variantName || item.variant_name }}
                      <span v-if="item.variantAttributes || item.variant_attributes" style="color: var(--aurora-on-surface-variant); font-weight: 400; margin-left: 0.25rem;">
                        ({{ Object.entries(item.variantAttributes || item.variant_attributes || {}).map(([k,v]) => `${k}: ${v}`).join(', ') }})
                      </span>
                    </p>
                  </div>
                </div>
              </td>
              <td>
                <div style="font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; color: var(--aurora-on-surface-variant);">
                  <div v-if="item.sku || item.products?.sku">SKU: {{ item.sku || item.products?.sku }}</div>
                  <div v-if="item.products?.barcode" class="flex items-center gap-1 mt-0.5">
                    <span class="material-symbols-outlined" style="font-size: 0.75rem;">qr_code_scanner</span>
                    {{ item.products.barcode }}
                  </div>
                </div>
              </td>
              <td style="text-align: right; font-weight: 500;">{{ item.quantity }}</td>
              <td style="text-align: right;">{{ formatTable(item.unit_price || item.price) }}</td>
              <td style="text-align: right; font-weight: 500; font-family: 'JetBrains Mono', monospace; color: var(--aurora-primary);">
                {{ formatTable(item.total || (item.quantity * (item.unit_price || item.price))) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="md:hidden" style="display: flex; flex-direction: column; gap: var(--aurora-sm);">
        <div v-for="item in items" :key="item.id"
          class="aurora-raised-card" style="padding: var(--aurora-sm);">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-lg overflow-hidden" style="background: var(--aurora-surface-container); flex-shrink: 0;">
              <img v-if="getProductImage(item)" :src="getProductImage(item)" class="w-full h-full object-cover" alt="" />
              <span v-else class="flex items-center justify-center h-full" style="color: var(--aurora-on-surface-variant);">
                <span class="material-symbols-outlined">inventory_2</span>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold truncate" style="color: var(--aurora-on-surface);">{{ item.product_name || item.productName || item.products?.name }}</p>
              <p v-if="item.variantName || item.variant_name" class="text-xs mt-0.5" style="color: var(--aurora-primary); font-weight: 500;">
                {{ item.variantName || item.variant_name }}
                <span v-if="item.variantAttributes || item.variant_attributes" style="color: var(--aurora-on-surface-variant); font-weight: 400; margin-left: 0.25rem;">
                  ({{ Object.entries(item.variantAttributes || item.variant_attributes || {}).map(([k,v]) => `${k}: ${v}`).join(', ') }})
                </span>
              </p>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem; font-size: 0.75rem; color: var(--aurora-on-surface-variant);">
                <span v-if="item.sku || item.products?.sku" style="font-family: 'JetBrains Mono', monospace;">SKU: {{ item.sku || item.products?.sku }}</span>
                <span v-if="item.products?.barcode" style="font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 0.25rem;">
                  <span class="material-symbols-outlined" style="font-size: 0.75rem;">qr_code_scanner</span>
                  {{ item.products.barcode }}
                </span>
              </div>
              <div class="flex justify-between items-center mt-2 text-sm">
                <span>{{ item.quantity }} x {{ formatTable(item.unit_price || item.price) }}</span>
                <span class="font-bold" style="font-family: 'JetBrains Mono', monospace; color: var(--aurora-primary);">
                  {{ formatTable(item.total || (item.quantity * (item.unit_price || item.price))) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-4" style="border-top: 1px solid var(--aurora-outline-variant);">
        <div class="w-64" style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem;">
          <div class="flex justify-between"><span style="color: var(--aurora-on-surface-variant);">Subtotal</span><span class="font-medium">{{ format(sale.subtotal) }}</span></div>
          <div class="flex justify-between"><span style="color: var(--aurora-on-surface-variant);">IVA</span><span class="font-medium">{{ format(sale.tax) }}</span></div>
          <div class="flex justify-between text-lg font-bold pt-1" style="border-top: 1px solid var(--aurora-outline-variant);"><span>Total</span><span style="color: var(--aurora-primary);">{{ format(sale.total) }}</span></div>
        </div>
      </div>
    </div>

    <div class="flex gap-3">
      <button @click="printAsDraft"
        class="aurora-btn-primary">
        <span class="material-symbols-outlined" style="font-size: 1.1rem;">print</span>
        Imprimir Borrador
      </button>
      <router-link :to="`/invoices/${sale.invoice_id}`" v-if="sale.invoice_id"
        class="aurora-btn-primary">
        <span class="material-symbols-outlined" style="font-size: 1.1rem;">receipt</span>
        Ver Factura
      </router-link>
      <button v-if="sale.status === 'completed'" @click="handleCancel"
        class="aurora-btn-primary" style="background: var(--aurora-error); box-shadow: 4px 4px 10px rgba(186,26,26,0.3), inset -2px -2px 4px rgba(0,0,0,0.1);">
        <span class="material-symbols-outlined" style="font-size: 1.1rem;">cancel</span>
        Anular Venta
      </button>
      <router-link to="/app/sales" class="aurora-btn-secondary">
        <span class="material-symbols-outlined" style="font-size: 1.1rem;">arrow_back</span>
        Volver
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { normalizeSale } from '../../utils';
import { useRoute, useRouter } from 'vue-router';
import { salesAPI } from '../../api';
import DetailSkeleton from '../../components/skeletons/DetailSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';
import { useCurrency } from '../../composables/useCurrency';
import { formatDateTime } from '../../utils';

const { format, formatTable } = useCurrency();
import Swal from 'sweetalert2';

const route = useRoute();
const router = useRouter();
const sale = ref({});
const loading = ref(true);

const items = computed(() => sale.value.sale_items || sale.value.items || []);

const getProductImage = (item) => {
  if (item.products?.images && Array.isArray(item.products.images)) {
    const first = item.products.images[0];
    return typeof first === 'string' ? first : first?.url || '';
  }
  if (item.products?.images && typeof item.products.images === 'string') {
    try {
      const parsed = JSON.parse(item.products.images);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      return typeof first === 'string' ? first : first?.url || '';
    } catch { /* ignore */ }
  }
  return '';
};

const printAsDraft = () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para imprimir');
    return;
  }
  const s = sale.value;
  const itemsList = items.value || [];
  const companyName = 'ANIMAL STORE';
  const dateStr = new Date(s.created_at).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let itemsHtml = itemsList.map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: left;">${item.product_name || item.productName || item.products?.name || 'Producto'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${Number(item.unit_price || item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${Number(item.total || (item.quantity * (item.unit_price || item.price || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Borrador Venta #${s.sale_number || s.invoice_number || s.id?.substring(0, 8)}</title>
      <style>
        @page { margin: 15mm; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #333; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
        .header p { margin: 4px 0; font-size: 11px; color: #666; }
        .info { margin-bottom: 20px; }
        .info table { width: 100%; }
        .info td { padding: 3px 5px; font-size: 11px; }
        .info td:last-child { text-align: right; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.items th { background: #f8f8f8; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #333; }
        table.items td { font-size: 11px; }
        .totals { width: 300px; margin-left: auto; }
        .totals table { width: 100%; }
        .totals td { padding: 4px 8px; font-size: 11px; }
        .totals tr:last-child td { font-weight: bold; font-size: 14px; border-top: 2px solid #333; padding-top: 8px; }
        .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
        .badge { display: inline-block; padding: 4px 12px; border: 1px solid #333; font-size: 10px; letter-spacing: 1px; margin-top: 10px; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(0,0,0,0.03); pointer-events: none; z-index: -1; font-weight: bold; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="watermark">BORRADOR</div>
      <div class="header">
        <h1>${companyName}</h1>
        <p>BORRADOR - NO ES UNA FACTURA OFICIAL</p>
        <p>Venta #${s.sale_number || s.invoice_number || s.id?.substring(0, 8)}</p>
        <p>${dateStr}</p>
        <div class="badge">BORRADOR</div>
      </div>
      <div class="info">
        <table>
          <tr><td><strong>Cliente:</strong> ${s.clients?.name || s.client_name || 'Cliente General'}</td><td><strong>Estado:</strong> ${s.status === 'completed' ? 'Completada' : s.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}</td></tr>
          <tr><td><strong>Pago:</strong> ${s.payment_method || s.payment_type || '-'}</td><td><strong>Cajero:</strong> ${s.users?.name || s.user_name || '-'}</td></tr>
        </table>
      </div>
      <table class="items">
        <thead>
          <tr><th>Producto</th><th style="text-align:center;">Cant.</th><th style="text-align:right;">Precio U.</th><th style="text-align:right;">Subtotal</th></tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div class="totals">
        <table>
          <tr><td>Subtotal</td><td style="text-align:right;">$${Number(s.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>IVA</td><td style="text-align:right;">$${Number(s.tax || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>TOTAL</td><td style="text-align:right;">$${Number(s.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
        </table>
      </div>
      <div class="footer">
        <p>Este documento es un borrador preliminar de venta.</p>
        <p>No tiene validez como factura oficial hasta su confirmación.</p>
        <p style="margin-top:8px;">Generado el ${new Date().toLocaleString('es-ES')}</p>
      </div>
      <div class="no-print" style="text-align:center; margin-top:20px;">
        <button onclick="window.print()" style="padding:10px 30px; background:#7c3aed; color:white; border:none; border-radius:8px; font-size:14px; cursor:pointer;">Imprimir</button>
        <button onclick="window.close()" style="padding:10px 30px; background:#e2e8f0; color:#333; border:none; border-radius:8px; font-size:14px; cursor:pointer; margin-left:10px;">Cerrar</button>
      </div>
      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 500); }
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

const handleCancel = async () => {
  const result = await Swal.fire({ title: '¿Anular venta?', text: 'Esta acción no se puede deshacer', icon: 'warning', showCancelButton: true });
  if (result.isConfirmed) {
    try {
      await salesAPI.cancel(route.params.id);
      await Swal.fire('Anulada', 'La venta ha sido anulada', 'success');
      router.push('/app/sales');
    } catch (e) {
      Swal.fire('Error', 'No se pudo anular la venta', 'error');
    }
  }
};

onMounted(async () => {
  try {
    const res = await salesAPI.getById(route.params.id);
    sale.value = normalizeSale(res.data || {});
  } catch (e) { /* ignore */ }
  finally { loading.value = false; }
});
</script>

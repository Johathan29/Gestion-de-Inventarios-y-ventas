<template>
  <Loading v-if="loading" />
  <div v-else class="max-w-5xl mx-auto space-y-6">
    <div class="dt-card p-6">
      <div class="flex items-start justify-between mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h2 class="dt-headline" style="margin-bottom: 0;">Venta #{{ sale.sale_number || sale.invoice_number || sale.id?.substring(0, 8) }}</h2>
            <span class="dt-badge" :class="sale.status === 'completed' ? 'dt-badge-success' : sale.status === 'cancelled' ? 'dt-badge-danger' : 'dt-badge-warning'">
              {{ sale.status === 'completed' ? 'Completada' : sale.status === 'cancelled' ? 'Cancelada' : 'Pendiente' }}
            </span>
          </div>
          <p class="dt-body-sm" style="color: #4f4539;">{{ formatDateTime(sale.created_at) }}</p>
        </div>
      </div>

      <!-- Client Info -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm rounded-xl p-4" style="background: rgba(98,66,0,0.03);">
        <div>
          <span class="text-gray-400 block text-xs">Cliente</span>
          <span class="font-medium" style="color: #0b1c30;">{{ sale.clients?.name || sale.client_name || 'Cliente General' }}</span>
        </div>
        <div>
          <span class="text-gray-400 block text-xs">Tipo de Pago</span>
          <span class="font-medium" style="color: #0b1c30;">{{ sale.payment_method || sale.payment_type || '-' }}</span>
        </div>
        <div>
          <span class="text-gray-400 block text-xs">Cajero</span>
          <span class="font-medium" style="color: #0b1c30;">{{ sale.users?.name || sale.user_name || '-' }}</span>
        </div>
      </div>

      <!-- Items with product info from products table -->
      <h3 class="font-semibold" style="color: #0b1c30; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <span class="material-icons-outlined" style="color: #624200;">inventory_2</span>
        Productos ({{ sale.sale_items?.length || sale.items?.length || 0 }})
      </h3>

      <!-- Desktop -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="dt-table-header-row">
              <th class="dt-table-th text-left">Producto</th>
              <th class="dt-table-th text-left">SKU / Barra</th>
              <th class="dt-table-th text-right">Cant.</th>
              <th class="dt-table-th text-right">Precio U.</th>
              <th class="dt-table-th text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody class="dt-table-tbody">
            <tr v-for="item in items" :key="item.id" style="transition: background 0.15s;" @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.03)'" @mouseleave="e => e.currentTarget.style.background = ''">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <img v-if="getProductImage(item)" :src="getProductImage(item)" class="w-full h-full object-cover" alt="" />
                    <span v-else class="flex items-center justify-center h-full text-gray-400">
                      <span class="material-icons-outlined text-lg">inventory_2</span>
                    </span>
                  </div>
                  <div>
                    <p class="font-medium" style="color: #0b1c30;">{{ item.product_name || item.products?.name }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="text-xs font-mono text-gray-500">
                  <div v-if="item.sku || item.products?.sku">SKU: {{ item.sku || item.products?.sku }}</div>
                  <div v-if="item.products?.barcode" class="flex items-center gap-1 mt-0.5">
                    <span class="material-icons-outlined text-xs">qr_code_scanner</span>
                    {{ item.products.barcode }}
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-right font-medium">{{ item.quantity }}</td>
              <td class="px-4 py-3 text-right">{{ formatTable(item.unit_price || item.price) }}</td>
              <td class="px-4 py-3 text-right font-medium dt-financial">
                {{ formatTable(item.total || (item.quantity * (item.unit_price || item.price))) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="md:hidden space-y-3">
        <div v-for="item in items" :key="item.id"
          class="dt-card-sm p-3">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              <img v-if="getProductImage(item)" :src="getProductImage(item)" class="w-full h-full object-cover" alt="" />
              <span v-else class="flex items-center justify-center h-full text-gray-400">
                <span class="material-icons-outlined">inventory_2</span>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold truncate" style="color: #0b1c30;">{{ item.product_name || item.products?.name }}</p>
              <div class="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                <span v-if="item.sku || item.products?.sku" class="font-mono">SKU: {{ item.sku || item.products?.sku }}</span>
                <span v-if="item.products?.barcode" class="font-mono flex items-center gap-1">
                  <span class="material-icons-outlined text-xs">qr_code_scanner</span>
                  {{ item.products.barcode }}
                </span>
              </div>
              <div class="flex justify-between items-center mt-2 text-sm">
                <span>{{ item.quantity }} x {{ formatTable(item.unit_price || item.price) }}</span>
                <span class="font-bold dt-financial">
                  {{ formatTable(item.total || (item.quantity * (item.unit_price || item.price))) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-4" style="border-top: 1px solid #e2d6c8;">
        <div class="w-64 space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-gray-500">Subtotal</span><span class="font-medium">{{ format(sale.subtotal) }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">IVA</span><span class="font-medium">{{ format(sale.tax) }}</span></div>
          <div class="flex justify-between text-lg font-bold pt-1 border-t"><span>Total</span><span class="text-primary-600">{{ format(sale.total) }}</span></div>
        </div>
      </div>
    </div>

    <div class="flex gap-3">
      <router-link :to="`/invoices/${sale.invoice_id}`" v-if="sale.invoice_id"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
        style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">Ver Factura</router-link>
      <button v-if="sale.status === 'completed'" @click="handleCancel"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
        style="border-color: #ef4444; color: #ef4444; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
        @mouseenter="e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#dc2626'; }"
        @mouseleave="e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = '#ef4444'; }">Anular Venta</button>
      <router-link to="/app/sales"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
        style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
        @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
        @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Volver</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { normalizeSale } from '../../utils';
import { useRoute, useRouter } from 'vue-router';
import { salesAPI } from '../../api';
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

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Form Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between" style="gap: var(--aurora-base); margin-bottom: var(--aurora-md);">
      <div class="flex items-start gap-3">
        <button @click="$router.push('/app/purchases')"
          class="aurora-btn-icon"
          @mouseenter="e => e.currentTarget.style.background = 'rgba(119,56,193,0.05)'"
          @mouseleave="e => e.currentTarget.style.background = 'transparent'">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(1.25rem, 3vw, 1.5rem); line-height: 1.3; font-weight: 700; color: var(--aurora-on-surface);">Nueva Compra</h2>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant); margin-top: 0.25rem;">
            N° de orden: <strong style="font-family: 'JetBrains Mono', monospace; color: var(--aurora-primary);">{{ purchaseNumberPreview || 'Generado automáticamente' }}</strong>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <router-link to="/app/purchases"
          class="aurora-btn-secondary">
          Cancelar
        </router-link>
        <button type="submit" form="purchase-form" :disabled="loading || !form.supplier_id || !form.items.length"
          class="aurora-btn-primary">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">add_shopping_cart</span>
          {{ loading ? 'Creando...' : 'Crear Compra' }}
        </button>
      </div>
    </div>

    <Alert v-if="errorMsg" type="error" :message="String(errorMsg)" :show="!!errorMsg" dismissible @close="errorMsg = ''" style="margin-bottom: var(--aurora-base);" />

    <form id="purchase-form" @submit.prevent="handleSubmit" style="display: flex; flex-direction: column; gap: 1.25rem;">
      <!-- Información de la Compra -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">assignment</span>
          Información de la Compra
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2" style="gap: var(--aurora-base);">
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Proveedor <span style="color: #ba1a1a;">*</span></label>
            <select v-model="form.supplier_id" required
              class="aurora-select"
              :style="{ background: `var(--aurora-surface-bright) url(${selectBgSvg}) no-repeat right 0.75rem center` }"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="" disabled>Seleccionar proveedor</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">
                {{ s.name }}<template v-if="s.tax_id"> - {{ s.tax_id }}</template>
              </option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Notas (opcional)</label>
            <input v-model="form.notes" placeholder="Observaciones de la compra"
              class="aurora-input"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
        </div>
      </div>

      <!-- Productos -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">inventory_2</span>
          Productos
        </h3>
        <div class="flex items-center justify-between" style="margin-bottom: 0.75rem;">
          <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Agrega los productos a la compra</span>
          <button type="button" @click="addItem"
            class="aurora-btn-secondary" style="font-family: 'Inter', sans-serif; font-size: 0.8125rem;">
            <span class="material-symbols-outlined" style="font-size: 1rem;">add</span> Agregar
          </button>
        </div>

        <div v-for="(item, idx) in form.items" :key="idx" class="aurora-raised-card" style="padding: var(--aurora-md); margin-bottom: 0.75rem;">
          <div class="flex flex-wrap gap-2 items-start">
            <!-- Selector producto con búsqueda -->
            <div class="relative flex-1 min-w-[220px]">
              <input
                v-model="item.searchTerm"
                @input="onSearchProduct(idx)"
                @focus="onSearchFocus(idx, $event)"
                @blur="onBlurProduct(idx, $event)"
                class="aurora-input w-full"
                :placeholder="item.product_id ? item.product_name : 'Buscar producto...'"
                autocomplete="off" />
              <div v-if="item.showResults && item.results.length" class="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto" style="background: var(--aurora-surface-bright); border: 1px solid var(--aurora-outline-variant); border-radius: var(--aurora-radius-lg); box-shadow: 0px 8px 32px rgba(119,56,193,0.12);">
                <div
                  v-for="prod in item.results"
                  :key="prod.id"
                  @mousedown.prevent="selectProduct(idx, prod)"
                  class="px-3 py-2 text-sm flex items-center gap-3 cursor-pointer transition-colors"
                  style="color: var(--aurora-on-surface);"
                  @mouseenter="e => e.currentTarget.style.background = 'var(--aurora-surface-container)'"
                  @mouseleave="e => e.currentTarget.style.background = 'transparent'"
                >
                  <img v-if="prod.images && prod.images.length" :src="getImageUrl(prod.images)" class="w-8 h-8 rounded object-cover" style="background: var(--aurora-surface-container);" alt="" />
                  <span v-else class="w-8 h-8 rounded flex items-center justify-center" style="background: var(--aurora-surface-container);">
                    <span class="material-symbols-outlined" style="color: var(--aurora-outline); font-size: 0.875rem;">inventory_2</span>
                  </span>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium block truncate">{{ prod.name }}</span>
                    <span style="color: var(--aurora-outline); font-size: 0.75rem;">{{ prod.sku }}<template v-if="prod.barcode"> | {{ prod.barcode }}</template></span>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--aurora-outline); flex-shrink: 0;">${{ prod.cost_price || prod.price || 0 }}</span>
                </div>
                <div v-if="!item.results.length && item.searchTerm" style="padding: 0.75rem; font-size: 0.875rem; color: var(--aurora-outline);">
                  <div class="flex flex-col items-center gap-2 py-2">
                    <span style="color: var(--aurora-outline);">Sin resultados</span>
                    <button type="button" @mousedown.prevent="addAsNewProduct(idx)"
                      class="aurora-btn-secondary" style="font-size: 0.75rem; padding: 0.375rem 0.75rem;">
                      <span class="material-symbols-outlined" style="font-size: 0.875rem; vertical-align: middle;">add</span>
                      Agregar como producto nuevo
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cantidad -->
            <div style="width: 5rem;">
              <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.75rem; color: var(--aurora-on-surface-variant);">Cant.</label>
              <input v-model.number="item.quantity" type="number" min="1"
                class="aurora-input w-full text-center"
                style="font-family: 'JetBrains Mono', monospace;"
                @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" required />
            </div>

            <!-- Costo unitario -->
            <div style="width: 7rem;">
              <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.75rem; color: var(--aurora-on-surface-variant);">Costo U.</label>
              <input v-model.number="item.unit_cost" type="number" step="0.01" min="0"
                class="aurora-input w-full text-right"
                style="font-family: 'JetBrains Mono', monospace;"
                @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" required />
            </div>

            <!-- Total x item -->
            <div style="width: 7rem; padding-top: 1.25rem;">
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: var(--aurora-primary); font-weight: 600;">
                {{ formatTable((item.quantity || 0) * (item.unit_cost || 0)) }}
              </span>
            </div>

            <button type="button" @click="form.items.splice(idx, 1)"
              class="aurora-btn-icon danger"
              style="margin-top: 1.25rem;"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(186,26,26,0.08)'"
              @mouseleave="e => e.currentTarget.style.background = 'transparent'">
              <span class="material-symbols-outlined" style="font-size: 1.25rem;">delete</span>
            </button>
          </div>

          <!-- Thumbnail + Barcode del producto seleccionado -->
          <div v-if="item.product_id" class="flex items-center gap-3 mt-2 pt-2" style="border-top: 1px solid var(--aurora-outline-variant);">
            <div class="w-10 h-10 rounded-lg overflow-hidden shrink-0" style="background: var(--aurora-surface-container);">
              <img v-if="item.product_image" :src="item.product_image" class="w-full h-full object-cover" alt="" />
              <span v-else class="flex items-center justify-center h-full" style="color: var(--aurora-outline);">
                <span class="material-symbols-outlined text-lg">image</span>
              </span>
            </div>
            <div v-if="item.barcode" class="flex items-center gap-2 text-xs font-mono" style="color: var(--aurora-on-surface-variant);">
              <span class="material-symbols-outlined" style="font-size: 0.875rem;">qr_code_scanner</span>
              <span>{{ item.barcode }}</span>
            </div>
            <div v-if="item.sku" style="font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; color: var(--aurora-on-surface-variant);">SKU: {{ item.sku }}</div>
          </div>
        </div>

        <p v-if="!form.items.length" style="text-align: center; padding: 1rem 0; color: var(--aurora-on-surface-variant); font-family: 'Inter', sans-serif; font-size: 0.875rem; font-style: italic;">
          Agregue al menos un producto para crear la compra
        </p>
      </div>

      <!-- Totales -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">receipt_long</span>
          Resumen de Totales
        </h3>
        <div class="flex flex-col items-end">
          <div style="text-align: right; width: 16rem; display: flex; flex-direction: column; gap: 0.25rem;">
            <div class="flex justify-between text-sm">
              <span style="color: var(--aurora-on-surface-variant); font-family: 'Inter', sans-serif;">Subtotal</span>
              <span style="font-family: 'JetBrains Mono', monospace; color: var(--aurora-on-surface);">{{ format(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span style="color: var(--aurora-on-surface-variant); font-family: 'Inter', sans-serif;">IVA (19%)</span>
              <span style="font-family: 'JetBrains Mono', monospace; color: var(--aurora-on-surface);">{{ format(taxAmount) }}</span>
            </div>
            <div class="flex justify-between text-lg font-bold pt-2" style="border-top: 1px solid var(--aurora-outline-variant);">
              <span style="color: var(--aurora-on-surface); font-family: 'Inter', sans-serif;">Total</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 1.125rem; color: var(--aurora-primary);">{{ format(total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { purchasesAPI, suppliersAPI, productsAPI } from '../../api';
import Alert from '../../components/shared/Alert.vue';
import { useCurrency } from '../../composables/useCurrency';

const { format, formatTable } = useCurrency();

const selectBgSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234f4539' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E";

const router = useRouter();
const loading = ref(false);
const errorMsg = ref('');
const suppliers = ref([]);
const purchaseNumberPreview = ref('');

const form = reactive({
  supplier_id: '',
  notes: '',
  items: []
});

const addItem = () => {
  form.items.push({
    product_id: null,
    product_name: '',
    sku: '',
    barcode: '',
    product_image: '',
    searchTerm: '',
    quantity: 1,
    unit_cost: 0,
    results: [],
    showResults: false,
    _selected: false
  });
};

const subtotal = computed(() =>
  form.items.reduce((s, i) => s + ((i.quantity || 0) * (i.unit_cost || 0)), 0)
);
const taxAmount = computed(() => subtotal.value * 0.19);
const total = computed(() => subtotal.value + taxAmount.value);

const getImageUrl = (images) => {
  if (!images || !images.length) return '';
  const first = images[0];
  return typeof first === 'string' ? first : first?.url || '';
};

// Búsqueda de productos
const searchTimers = {};

const onSearchProduct = (idx) => {
  const item = form.items[idx];
  if (!item) return;
  if (item._selected) item._selected = false;

  if (searchTimers[idx]) clearTimeout(searchTimers[idx]);
  searchTimers[idx] = setTimeout(async () => {
    const term = item.searchTerm?.trim();
    if (!term || term.length < 1) {
      item.results = [];
      item.showResults = false;
      return;
    }
    try {
      const res = await productsAPI.getAll({ search: term, limit: 10 });
      item.results = res.data || [];
      item.showResults = item.results.length > 0;
    } catch (e) {
      item.results = [];
    }
  }, 300);
};

const selectProduct = (idx, prod) => {
  const item = form.items[idx];
  if (!item) return;
  item.product_id = prod.id;
  item.product_name = prod.name;
  item.sku = prod.sku || '';
  item.barcode = prod.barcode || '';
  item.product_image = getImageUrl(prod.images);
  item.searchTerm = `${prod.name} (${prod.sku})`;
  item.unit_cost = prod.cost_price || prod.price || 0;
  item.quantity = 1;
  item.results = [];
  item.showResults = false;
  item._selected = true;
};

const addAsNewProduct = (idx) => {
  const item = form.items[idx];
  if (!item) return;
  // Marcar como nuevo producto sin ID (se creará al guardar la compra)
  item.product_id = null;
  item.product_name = item.searchTerm?.split(' (')[0]?.trim() || item.searchTerm?.trim() || 'Nuevo Producto';
  item.sku = item.sku || '';
  item.barcode = item.barcode || '';
  item._selected = true;
  item.showResults = false;
  item.is_new = true;
  item.results = [];
  // Si no tiene costo, sugerir 0
  if (!item.unit_cost) item.unit_cost = 0;
};

const onBlurProduct = (idx, event) => {
  if (event?.currentTarget) {
    event.currentTarget.style.borderColor = '#E5E7EB';
    event.currentTarget.style.boxShadow = 'none';
  }
  setTimeout(() => {
    const item = form.items[idx];
    if (item) item.showResults = false;
  }, 200);
};

const onSearchFocus = (idx, event) => {
  event.currentTarget.style.borderColor = '#624200';
  event.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)';
  onSearchProduct(idx);
};

onMounted(async () => {
  try {
    const [suppliersRes, nextNumRes] = await Promise.all([
      suppliersAPI.getAll({ limit: 200 }),
      purchasesAPI.getNextNumber()
    ]);
    suppliers.value = suppliersRes.data || [];
    purchaseNumberPreview.value = nextNumRes.data?.purchase_number || '';
  } catch (e) {
    console.error('Error loading form data:', e);
  }
  if (!form.items.length) addItem();
});

const handleSubmit = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const payload = {
      supplier_id: form.supplier_id,
      notes: form.notes || '',
      items: form.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || item.searchTerm?.split(' (')[0] || 'Producto',
        quantity: item.quantity || 1,
        unit_cost: item.unit_cost || 0,
        barcode: item.barcode || '',
        product_image: item.product_image || ''
      }))
    };
    await purchasesAPI.create(payload);
    router.push('/app/purchases');
  } catch (err) {
    const errData = err.response?.data;
    errorMsg.value = errData?.error?.message || errData?.error || err.message || 'Error al crear compra';
  } finally {
    loading.value = false;
  }
};
</script>

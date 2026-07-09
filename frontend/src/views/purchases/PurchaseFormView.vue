<template>
  <div class="max-w-5xl mx-auto">
    <!-- Form Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div class="flex items-start gap-3">
        <button @click="$router.push('/app/purchases')"
          class="p-2 rounded-xl transition-all duration-200 active:scale-95" style="color: #624200;"
          @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.05)'"
          @mouseleave="e => e.currentTarget.style.background = 'transparent'">
          <span class="material-icons-outlined">arrow_back</span>
        </button>
        <div>
          <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(1.25rem, 3vw, 1.5rem); line-height: 1.3; font-weight: 700; color: #0b1c30;">Nueva Compra</h2>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539; margin-top: 0.25rem;">
            N° de orden: <strong style="font-family: 'JetBrains Mono', monospace; color: #624200;">{{ purchaseNumberPreview || 'Generado automáticamente' }}</strong>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <router-link to="/app/purchases"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
          style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
          @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
          @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
          Cancelar
        </router-link>
        <button type="submit" form="purchase-form" :disabled="loading || !form.supplier_id || !form.items.length"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
          style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
          <span class="material-icons-outlined" style="font-size: 1.125rem;">add_shopping_cart</span>
          {{ loading ? 'Creando...' : 'Crear Compra' }}
        </button>
      </div>
    </div>

    <Alert v-if="errorMsg" type="error" :message="String(errorMsg)" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <form id="purchase-form" @submit.prevent="handleSubmit" class="flex flex-col gap-5">
      <!-- Información de la Compra -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <h3 class="font-semibold pb-2 mb-4 flex items-center gap-2" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; color: #0b1c30; border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200;">assignment</span>
          Información de la Compra
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Proveedor <span style="color: #ba1a1a;">*</span></label>
            <select v-model="form.supplier_id" required
              class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
              :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: `#ffffff url(${selectBgSvg}) no-repeat right 0.75rem center`, border: '1.5px solid #E5E7EB', paddingRight: '2.5rem' }"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="" disabled>Seleccionar proveedor</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">
                {{ s.name }}<template v-if="s.tax_id"> - {{ s.tax_id }}</template>
              </option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Notas (opcional)</label>
            <input v-model="form.notes" placeholder="Observaciones de la compra"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
        </div>
      </div>

      <!-- Productos -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <h3 class="font-semibold pb-2 mb-4 flex items-center gap-2" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; color: #0b1c30; border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200;">inventory_2</span>
          Productos
        </h3>
        <div class="flex items-center justify-between mb-3">
          <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #4f4539;">Agrega los productos a la compra</span>
          <button type="button" @click="addItem"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all border"
            style="background: #ffffff; color: #624200; border-color: #d2c4b4; font-family: 'Inter', sans-serif; font-size: 0.8125rem;"
            @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
            @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = '#ffffff'; }">
            <span class="material-icons-outlined" style="font-size: 1rem;">add</span> Agregar
          </button>
        </div>

        <div v-for="(item, idx) in form.items" :key="idx" class="rounded-[12px] p-4 mb-3 border" style="background: rgba(98,66,0,0.02); border-color: #d2c4b4;">
          <div class="flex flex-wrap gap-2 items-start">
            <!-- Selector producto con búsqueda -->
            <div class="relative flex-1 min-w-[220px]">
              <input
                v-model="item.searchTerm"
                @input="onSearchProduct(idx)"
                @focus="onSearchFocus(idx, $event)"
                @blur="onBlurProduct(idx, $event)"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                :placeholder="item.product_id ? item.product_name : 'Buscar producto...'"
                autocomplete="off" />
              <div v-if="item.showResults && item.results.length" class="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto mt-1" style="box-shadow: 0px 8px 32px rgba(98, 66, 0, 0.12);">
                <div
                  v-for="prod in item.results"
                  :key="prod.id"
                  @mousedown.prevent="selectProduct(idx, prod)"
                  class="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                >
                  <img v-if="prod.images && prod.images.length" :src="getImageUrl(prod.images)" class="w-8 h-8 rounded object-cover bg-gray-100" alt="" />
                  <span v-else class="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                    <span class="material-icons-outlined text-gray-400 text-sm">inventory_2</span>
                  </span>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium block truncate">{{ prod.name }}</span>
                    <span class="text-gray-400 text-xs">{{ prod.sku }}<template v-if="prod.barcode"> | {{ prod.barcode }}</template></span>
                  </div>
                  <span class="text-xs text-gray-400 shrink-0">${{ prod.cost_price || prod.price || 0 }}</span>
                </div>
                <div v-if="!item.results.length && item.searchTerm" class="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
              </div>
            </div>

            <!-- Cantidad -->
            <div class="w-20">
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Cant.</label>
              <input v-model.number="item.quantity" type="number" min="1"
                class="w-full rounded-lg px-3 py-2.5 text-center transition-all"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" required />
            </div>

            <!-- Costo unitario -->
            <div class="w-28">
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Costo U.</label>
              <input v-model.number="item.unit_cost" type="number" step="0.01" min="0"
                class="w-full rounded-lg px-3 py-2.5 transition-all text-right"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" required />
            </div>

            <!-- Total x item -->
            <div class="w-28 pt-5">
              <span class="dt-financial" style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #624200; font-weight: 600;">
                {{ formatTable((item.quantity || 0) * (item.unit_cost || 0)) }}
              </span>
            </div>

            <button type="button" @click="form.items.splice(idx, 1)"
              class="pt-5 p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95"
              style="color: #ba1a1a;"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(186,26,26,0.08)'"
              @mouseleave="e => e.currentTarget.style.background = 'transparent'">
              <span class="material-icons-outlined" style="font-size: 1.25rem;">delete</span>
            </button>
          </div>

          <!-- Thumbnail + Barcode del producto seleccionado -->
          <div v-if="item.product_id" class="flex items-center gap-3 mt-2 pt-2 border-t" style="border-color: #d2c4b4;">
            <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              <img v-if="item.product_image" :src="item.product_image" class="w-full h-full object-cover" alt="" />
              <span v-else class="flex items-center justify-center h-full text-gray-400">
                <span class="material-icons-outlined text-lg">image</span>
              </span>
            </div>
            <div v-if="item.barcode" class="flex items-center gap-2 text-xs font-mono" style="color: #4f4539;">
              <span class="material-icons-outlined text-sm">qr_code_scanner</span>
              <span>{{ item.barcode }}</span>
            </div>
            <div v-if="item.sku" class="text-xs font-mono" style="color: #4f4539;">SKU: {{ item.sku }}</div>
          </div>
        </div>

        <p v-if="!form.items.length" class="text-center py-4" style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-style: italic;">
          Agregue al menos un producto para crear la compra
        </p>
      </div>

      <!-- Totales -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <h3 class="font-semibold pb-2 mb-4 flex items-center gap-2" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; color: #0b1c30; border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200;">receipt_long</span>
          Resumen de Totales
        </h3>
        <div class="flex flex-col items-end">
          <div class="text-right space-y-1 w-64">
            <div class="flex justify-between text-sm">
              <span style="color: #817567; font-family: 'Inter', sans-serif;">Subtotal</span>
              <span style="font-family: 'JetBrains Mono', monospace; color: #0b1c30;">{{ format(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span style="color: #817567; font-family: 'Inter', sans-serif;">IVA (19%)</span>
              <span style="font-family: 'JetBrains Mono', monospace; color: #0b1c30;">{{ format(taxAmount) }}</span>
            </div>
            <div class="flex justify-between text-lg font-bold pt-2" style="border-top: 1px solid #d2c4b4;">
              <span style="color: #0b1c30; font-family: 'Inter', sans-serif;">Total</span>
              <span class="dt-financial" style="font-family: 'JetBrains Mono', monospace; font-size: 1.125rem; color: #624200;">{{ format(total) }}</span>
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

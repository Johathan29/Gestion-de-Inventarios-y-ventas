<template>
  <div class="dt-card p-6 max-w-4xl mx-auto">
    <!-- Encabezado con número de orden -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="dt-headline" style="margin-bottom: 0;">Nueva Compra</h2>
        <p class="dt-body-sm" style="color: #4f4539;">
          N° de orden: <strong class="dt-financial">{{ purchaseNumberPreview || 'Generado automáticamente' }}</strong>
        </p>
      </div>
      <span v-if="purchaseNumberPreview" class="dt-sku">
        {{ purchaseNumberPreview }}
      </span>
    </div>

    <Alert v-if="errorMsg" type="error" :message="String(errorMsg)" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Proveedor (select) -->
        <div>
          <label class="dt-label">Proveedor *</label>
          <select v-model="form.supplier_id" class="dt-input" required>
            <option value="" disabled>Seleccionar proveedor</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">
              {{ s.name }}<template v-if="s.tax_id"> - {{ s.tax_id }}</template>
            </option>
          </select>
        </div>
        <!-- Notas -->
        <div>
          <label class="dt-label">Notas (opcional)</label>
          <input v-model="form.notes" class="dt-input" placeholder="Observaciones de la compra" />
        </div>
      </div>

      <!-- Productos -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <label class="dt-label" style="font-weight: 700;">Productos</label>
          <button type="button" @click="addItem" class="dt-btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">
            <span class="material-icons-outlined text-lg">add</span> Agregar
          </button>
        </div>

        <div v-for="(item, idx) in form.items" :key="idx" class="dt-card p-3 mb-3" style="border-width: 1px; border-style: solid; border-color: #e2d6c8;">
          <div class="flex flex-wrap gap-2 items-start">
            <!-- Selector producto con búsqueda -->
            <div class="relative flex-1 min-w-[220px]">
              <input
                v-model="item.searchTerm"
                @input="onSearchProduct(idx)"
                @focus="onSearchProduct(idx)"
                @blur="onBlurProduct(idx)"
                class="dt-input"
                :placeholder="item.product_id ? item.product_name : 'Buscar producto...'"
                autocomplete="off"
              />
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
              <label class="text-xs text-gray-400 block mb-0.5">Cant.</label>
              <input v-model.number="item.quantity" type="number" min="1" class="dt-input" style="text-align: center;" required />
            </div>

            <!-- Costo unitario -->
            <div class="w-28">
              <label class="text-xs text-gray-400 block mb-0.5">Costo U.</label>
              <input v-model.number="item.unit_cost" type="number" step="0.01" min="0" class="dt-input" required />
            </div>

            <!-- Total x item -->
            <div class="w-28 pt-5">
              <span class="text-sm font-bold dt-financial">
                {{ formatCurrency((item.quantity || 0) * (item.unit_cost || 0)) }}
              </span>
            </div>

            <button type="button" @click="form.items.splice(idx, 1)" class="pt-5 text-red-500 hover:text-red-700 p-1">
              <span class="material-icons-outlined">delete</span>
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
            <div v-if="item.barcode" class="flex items-center gap-2 text-xs text-gray-500 font-mono">
              <span class="material-icons-outlined text-sm">qr_code_scanner</span>
              <span>{{ item.barcode }}</span>
            </div>
            <div v-if="item.sku" class="text-xs text-gray-400 font-mono">SKU: {{ item.sku }}</div>
          </div>
        </div>

        <p v-if="!form.items.length" class="text-gray-400 text-sm italic py-4 text-center">
          Agregue al menos un producto para crear la compra
        </p>
      </div>

      <!-- Totales -->
      <div class="flex flex-col items-end pt-4 border-t" style="border-color: #d2c4b4;">
        <div class="text-right space-y-1 w-64">
          <div class="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{{ formatCurrency(subtotal) }}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-500">
            <span>IVA (19%)</span>
            <span>{{ formatCurrency(taxAmount) }}</span>
          </div>
          <div class="flex justify-between text-lg font-bold" style="color: #0b1c30; padding-top: 0.25rem; border-top: 1px solid #d2c4b4;">
            <span>Total</span>
            <span class="dt-financial" style="font-size: 1.125rem;">{{ formatCurrency(total) }}</span>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex justify-between items-center">
        <router-link to="/app/purchases" class="dt-btn-secondary">Cancelar</router-link>
        <button type="submit" :disabled="loading || !form.supplier_id || !form.items.length" class="dt-btn-primary">
          {{ loading ? 'Creando...' : 'Crear Compra' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { purchasesAPI, suppliersAPI, productsAPI } from '../../api';
import Alert from '../../components/shared/Alert.vue';
import { formatCurrency } from '../../utils';

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

const onBlurProduct = (idx) => {
  setTimeout(() => {
    const item = form.items[idx];
    if (item) item.showResults = false;
  }, 200);
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

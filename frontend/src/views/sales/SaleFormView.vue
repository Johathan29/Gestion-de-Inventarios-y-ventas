<template>
  <div class="max-w-5xl mx-auto">
    <!-- Form Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between" style="gap: var(--aurora-base); margin-bottom: var(--aurora-md);">
      <div class="flex items-start gap-3">
        <button @click="$router.push('/app/sales')"
          class="aurora-btn-icon"
          @mouseenter="e => e.currentTarget.style.background = 'rgba(124,58,237,0.05)'"
          @mouseleave="e => e.currentTarget.style.background = 'transparent'">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(1.25rem, 3vw, 1.5rem); line-height: 1.3; font-weight: 700; color: var(--aurora-on-surface);">Nueva Venta</h2>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant); margin-top: 0.25rem;">
            Registra una nueva venta y selecciona los productos
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <router-link to="/app/sales" class="aurora-btn-secondary">
          Cancelar
        </router-link>
        <button type="submit" form="sale-form" :disabled="loading || !form.items.length"
          class="aurora-btn-primary">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">shopping_cart</span>
          {{ loading ? 'Creando...' : 'Completar Venta' }}
        </button>
      </div>
    </div>

    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" style="margin-bottom: var(--aurora-base);" />

    <form id="sale-form" @submit.prevent="handleSubmit" style="display: flex; flex-direction: column; gap: 1.25rem;">
      <!-- Información de la Venta -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">point_of_sale</span>
          Información de la Venta
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2" style="gap: var(--aurora-base);">
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Cliente</label>
            <select v-model="form.client_id"
              class="aurora-select"
              :style="{ background: `var(--aurora-surface-bright) url(${selectBgSvg}) no-repeat right 0.75rem center` }"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.15)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="">Cliente General</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }} - {{ c.document_id }}</option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Tipo de Pago <span style="color: #ba1a1a;">*</span></label>
            <select v-model="form.payment_type" required
              class="aurora-select"
              :style="{ background: `var(--aurora-surface-bright) url(${selectBgSvg}) no-repeat right 0.75rem center` }"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.15)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="credit">Crédito</option>
            </select>
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
          <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Agrega los productos a la venta</span>
          <button type="button" @click="addItem"
            class="aurora-btn-secondary">
            <span class="material-symbols-outlined" style="font-size: 1rem;">add</span> Agregar Producto
          </button>
        </div>

        <div v-if="form.items.length" style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div v-for="(item, idx) in form.items" :key="idx"
               class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--aurora-surface-container);">
            <div class="flex-1 flex gap-2">
              <select v-model="item.product_id" @change="selectProduct(idx)" required
                class="aurora-select flex-1"
                :style="{ background: `var(--aurora-surface-bright) url(${selectBgSvg}) no-repeat right 0.75rem center` }"
                @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.15)'; }"
                @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }">
                <option value="">Seleccionar...</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} - {{ formatTable(p.price) }} (Stock: {{ p.stock }})</option>
              </select>
              <select v-if="item.variants && item.variants.length > 0" v-model="item.variant_id" @change="selectVariant(idx)" required
                class="aurora-select" style="width: 12rem;"
                :style="{ background: `var(--aurora-surface-bright) url(${selectBgSvg}) no-repeat right 0.75rem center` }">
                <option value="">Variante...</option>
                <option v-for="v in item.variants" :key="v.id" :value="v.id">{{ v.name }} - {{ formatTable(v.price || item.price) }} (Stock: {{ v.stock }})</option>
              </select>
            </div>
            <input v-model.number="item.quantity" type="number" min="1" placeholder="Cant"
              class="aurora-input" style="width: 5rem; text-align: center; font-family: 'JetBrains Mono', monospace;"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.15)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" required />
            <span style="width: 6rem; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; font-weight: 600; color: var(--aurora-primary);">{{ formatTable(item.subtotal) }}</span>
            <button type="button" @click="removeItem(idx)"
              class="aurora-btn-icon danger"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'"
              @mouseleave="e => e.currentTarget.style.background = 'transparent'">
              <span class="material-symbols-outlined" style="font-size: 1.25rem;">delete</span>
            </button>
          </div>
        </div>
        <p v-else style="text-align: center; padding: 1rem 0; color: var(--aurora-outline); font-family: 'Inter', sans-serif; font-size: 0.875rem;">Agrega productos a la venta</p>
      </div>

      <!-- Totales -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">receipt_long</span>
          Resumen de Totales
        </h3>
        <div class="flex justify-end">
          <div style="width: 16rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <div class="flex justify-between text-sm">
              <span style="color: var(--aurora-on-surface-variant); font-family: 'Inter', sans-serif;">Subtotal</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--aurora-primary);">{{ format(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span style="color: var(--aurora-on-surface-variant); font-family: 'Inter', sans-serif;">IVA ({{ taxRate }}%)</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--aurora-primary);">{{ format(tax) }}</span>
            </div>
            <div class="flex justify-between text-lg font-bold pt-2" style="border-top: 1px solid var(--aurora-outline-variant);">
              <span style="color: var(--aurora-on-surface); font-family: 'Inter', sans-serif;">Total</span>
              <span style="color: var(--aurora-primary); font-family: 'JetBrains Mono', monospace;">{{ format(total) }}</span>
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
import { salesAPI, productsAPI, clientsAPI } from '../../api';
import Alert from '../../components/shared/Alert.vue';
import { useCurrency } from '../../composables/useCurrency';
import { useEcommerceConfig } from '../../composables/useEcommerceConfig';

const { format, formatTable } = useCurrency();
const { taxRate, taxIncluded, loadConfig } = useEcommerceConfig();

const selectBgSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234f4539' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E";

const router = useRouter();
const clients = ref([]);
const products = ref([]);
const loading = ref(false);
const errorMsg = ref('');

// Product variants map for quick lookup
const productVariantsMap = ref({});

const form = reactive({ client_id: '', payment_type: 'cash', items: [] });

const addItem = () => { form.items.push({ product_id: '', quantity: 1, price: 0, subtotal: 0, variant_id: '', variants: [] }); };
const removeItem = (idx) => { form.items.splice(idx, 1); };

const selectProduct = async (idx) => {
  const product = products.value.find(p => p.id == form.items[idx].product_id);
  if (product) {
    form.items[idx].price = product.price;
    form.items[idx].subtotal = product.price;
    form.items[idx].variant_id = '';
    // Check if product has variants
    let variants = productVariantsMap.value[product.id];
    if (!variants) {
      try {
        const vRes = await productsAPI.getVariants(product.id);
        variants = (vRes.data || []).filter(v => v.is_active !== false);
        productVariantsMap.value[product.id] = variants;
      } catch (e) { variants = []; }
    }
    form.items[idx].variants = variants || [];
    if (variants && variants.length > 0) {
      form.items[idx].variant_id = '';
    }
  }
};

const selectVariant = (idx) => {
  const item = form.items[idx];
  const variant = item.variants.find(v => v.id == item.variant_id);
  if (variant) {
    item.price = variant.price || item.price;
    item.subtotal = item.price * item.quantity;
  }
};

const subtotal = computed(() => form.items.reduce((s, i) => s + (i.price * i.quantity), 0));
const tax = computed(() => {
  const rate = taxRate.value / 100;
  if (taxIncluded.value) {
    return subtotal.value - (subtotal.value / (1 + rate));
  }
  return subtotal.value * rate;
});
const total = computed(() => subtotal.value + tax.value);

const handleSubmit = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    await salesAPI.create({
      clientId: form.client_id || null,
      paymentMethod: form.payment_type,
      source: 'pos',
      items: form.items.map(i => ({
        productId: i.product_id,
        quantity: i.quantity,
        unitPrice: i.price,
        variantId: i.variant_id || undefined,
      }))
    });
    router.push('/app/sales');
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Error al crear venta';
  } finally { loading.value = false; }
};

onMounted(async () => {
  try {
    const [cRes, pRes] = await Promise.all([clientsAPI.getAll(), productsAPI.getAll()]);
    clients.value = cRes.data || [];
    products.value = pRes.data || [];
  } catch (e) { /* ignore */ }
  await loadConfig();
});
</script>

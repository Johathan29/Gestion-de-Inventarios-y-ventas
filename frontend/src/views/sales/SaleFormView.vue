<template>
  <div class="max-w-5xl mx-auto">
    <!-- Form Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div class="flex items-start gap-3">
        <button @click="$router.push('/app/sales')"
          class="p-2 rounded-xl transition-all duration-200 active:scale-95" style="color: #624200;"
          @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.05)'"
          @mouseleave="e => e.currentTarget.style.background = 'transparent'">
          <span class="material-icons-outlined">arrow_back</span>
        </button>
        <div>
          <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(1.25rem, 3vw, 1.5rem); line-height: 1.3; font-weight: 700; color: #0b1c30;">Nueva Venta</h2>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539; margin-top: 0.25rem;">
            Registra una nueva venta y selecciona los productos
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <router-link to="/app/sales"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
          style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
          @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
          @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
          Cancelar
        </router-link>
        <button type="submit" form="sale-form" :disabled="loading || !form.items.length"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
          style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
          <span class="material-icons-outlined" style="font-size: 1.125rem;">shopping_cart</span>
          {{ loading ? 'Creando...' : 'Completar Venta' }}
        </button>
      </div>
    </div>

    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <form id="sale-form" @submit.prevent="handleSubmit" class="flex flex-col gap-5">
      <!-- Información de la Venta -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <h3 class="font-semibold pb-2 mb-4 flex items-center gap-2" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; color: #0b1c30; border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200;">point_of_sale</span>
          Información de la Venta
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Cliente</label>
            <select v-model="form.client_id"
              class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
              :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: `#ffffff url(${selectBgSvg}) no-repeat right 0.75rem center`, border: '1.5px solid #E5E7EB', paddingRight: '2.5rem' }"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="">Cliente General</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }} - {{ c.document_id }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Tipo de Pago <span style="color: #ba1a1a;">*</span></label>
            <select v-model="form.payment_type" required
              class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
              :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: `#ffffff url(${selectBgSvg}) no-repeat right 0.75rem center`, border: '1.5px solid #E5E7EB', paddingRight: '2.5rem' }"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="credit">Crédito</option>
            </select>
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
          <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #4f4539;">Agrega los productos a la venta</span>
          <button type="button" @click="addItem"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all border"
            style="background: #ffffff; color: #624200; border-color: #d2c4b4; font-family: 'Inter', sans-serif; font-size: 0.8125rem;"
            @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
            @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = '#ffffff'; }">
            <span class="material-icons-outlined" style="font-size: 1rem;">add</span> Agregar Producto
          </button>
        </div>

        <div class="space-y-2" v-if="form.items.length">
          <div v-for="(item, idx) in form.items" :key="idx"
               class="flex items-center gap-3 p-3 rounded-xl" style="background: rgba(98,66,0,0.03);">
            <select v-model="item.product_id" @change="selectProduct(idx)" required
              class="flex-1 rounded-lg px-3 py-2.5 appearance-none transition-all"
              :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: `#ffffff url(${selectBgSvg}) no-repeat right 0.75rem center`, border: '1.5px solid #E5E7EB', paddingRight: '2.5rem' }"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="">Seleccionar...</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} - {{ formatTable(p.price) }} (Stock: {{ p.stock }})</option>
            </select>
            <input v-model.number="item.quantity" type="number" min="1" placeholder="Cant"
              class="w-20 text-center rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" required />
            <span class="dt-financial" style="width: 6rem; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem;">{{ formatTable(item.subtotal) }}</span>
            <button type="button" @click="removeItem(idx)"
              class="p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95"
              style="color: #ba1a1a;"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(186,26,26,0.08)'"
              @mouseleave="e => e.currentTarget.style.background = 'transparent'">
              <span class="material-icons-outlined" style="font-size: 1.25rem;">delete</span>
            </button>
          </div>
        </div>
        <p v-else class="text-center py-4" style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 0.875rem;">Agrega productos a la venta</p>
      </div>

      <!-- Totales -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <h3 class="font-semibold pb-2 mb-4 flex items-center gap-2" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; color: #0b1c30; border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200;">receipt_long</span>
          Resumen de Totales
        </h3>
        <div class="flex justify-end">
          <div class="w-64 space-y-2">
            <div class="flex justify-between text-sm">
              <span style="color: #817567; font-family: 'Inter', sans-serif;">Subtotal</span>
              <span class="dt-financial" style="font-family: 'JetBrains Mono', monospace;">{{ format(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span style="color: #817567; font-family: 'Inter', sans-serif;">IVA ({{ taxRate }}%)</span>
              <span class="dt-financial" style="font-family: 'JetBrains Mono', monospace;">{{ format(tax) }}</span>
            </div>
            <div class="flex justify-between text-lg font-bold pt-2" style="border-top: 1px solid #d2c4b4;">
              <span style="color: #0b1c30; font-family: 'Inter', sans-serif;">Total</span>
              <span style="color: #624200; font-family: 'JetBrains Mono', monospace;">{{ format(total) }}</span>
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

const form = reactive({ client_id: '', payment_type: 'cash', items: [] });

const addItem = () => { form.items.push({ product_id: '', quantity: 1, price: 0, subtotal: 0 }); };
const removeItem = (idx) => { form.items.splice(idx, 1); };
const selectProduct = (idx) => {
  const product = products.value.find(p => p.id == form.items[idx].product_id);
  if (product) { form.items[idx].price = product.price; form.items[idx].subtotal = product.price; }
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
      items: form.items.map(i => ({ productId: i.product_id, quantity: i.quantity, unitPrice: i.price }))
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

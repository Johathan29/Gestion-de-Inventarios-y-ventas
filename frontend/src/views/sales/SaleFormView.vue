<template>
  <div class="card p-6 max-w-4xl mx-auto">
    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6">Nueva Venta</h2>

    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Client -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Cliente</label>
          <select v-model="form.client_id" class="form-input">
            <option value="">Cliente General</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }} - {{ c.document_id }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Tipo de Pago</label>
          <select v-model="form.payment_type" class="form-input" required>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="credit">Crédito</option>
          </select>
        </div>
      </div>

      <!-- Items -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <label class="form-label mb-0">Productos</label>
          <button type="button" @click="addItem" class="btn btn-sm btn-secondary">
            <span class="material-icons-outlined text-lg">add</span> Agregar Producto
          </button>
        </div>

        <div class="space-y-2" v-if="form.items.length">
          <div v-for="(item, idx) in form.items" :key="idx"
               class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <select v-model="item.product_id" @change="selectProduct(idx)" class="form-input flex-1" required>
              <option value="">Seleccionar...</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} - ${{ formatCurrency(p.price) }} (Stock: {{ p.stock }})</option>
            </select>
            <input v-model.number="item.quantity" type="number" min="1" class="form-input w-20 text-center" placeholder="Cant" required />
            <span class="text-sm font-medium text-gray-900 dark:text-white w-24 text-right">{{ formatCurrency(item.subtotal) }}</span>
            <button type="button" @click="removeItem(idx)" class="text-red-500 hover:text-red-700">
              <span class="material-icons-outlined">delete</span>
            </button>
          </div>
        </div>
        <p v-else class="text-center py-4 text-gray-500">Agrega productos a la venta</p>
      </div>

      <!-- Totals -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div class="flex justify-end">
          <div class="w-64 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Subtotal</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">IVA (19%)</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(tax) }}</span>
            </div>
            <div class="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
              <span class="text-gray-900 dark:text-white">Total</span>
              <span class="text-primary-600">{{ formatCurrency(total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <router-link to="/app/sales" class="btn btn-secondary">Cancelar</router-link>
        <button type="submit" :disabled="loading || !form.items.length" class="btn btn-primary btn-lg">
          <span v-if="loading" class="material-icons-outlined animate-spin">refresh</span>
          <span v-else>Completar Venta</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { salesAPI, productsAPI, clientsAPI } from '../../api';
import Alert from '../../components/shared/Alert.vue';
import { formatCurrency } from '../../utils';

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
const tax = computed(() => subtotal.value * 0.19);
const total = computed(() => subtotal.value + tax.value);

const handleSubmit = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    await salesAPI.create({
      client_id: form.client_id || null,
      payment_type: form.payment_type,
      items: form.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price }))
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
});
</script>

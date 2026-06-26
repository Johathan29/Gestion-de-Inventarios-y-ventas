<template>
  <div class="flex gap-6 h-[calc(100vh-12rem)]">
    <!-- Products Grid -->
    <div class="flex-1 overflow-y-auto">
      <div class="mb-4">
        <input v-model="search" type="text" placeholder="Buscar producto..." class="form-input" @input="fetchProducts" />
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div v-for="p in products" :key="p.id"
             @click="addToCart(p)"
             class="card p-3 cursor-pointer hover:shadow-md transition-shadow text-center">
          <div class="w-full h-20 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
            <span class="material-icons-outlined text-3xl text-gray-400">inventory_2</span>
          </div>
          <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ p.name }}</p>
          <p class="text-sm font-bold text-primary-600">{{ formatCurrency(p.price) }}</p>
          <p class="text-xs text-gray-500">Stock: {{ p.stock }}</p>
        </div>
      </div>
      <p v-if="!products.length" class="text-center py-8 text-gray-500">No se encontraron productos</p>
    </div>

    <!-- Cart Panel -->
    <div class="w-96 card p-4 flex flex-col">
      <h3 class="font-semibold text-gray-900 dark:text-white mb-4">Carrito</h3>

      <div class="flex-1 overflow-y-auto space-y-2 mb-4">
        <div v-for="(item, idx) in cart" :key="idx"
             class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ item.name }}</p>
            <p class="text-xs text-gray-500">{{ formatCurrency(item.price) }} x {{ item.quantity }}</p>
          </div>
          <div class="flex items-center gap-1">
            <button @click="updateQty(idx, -1)" class="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm">-</button>
            <span class="w-6 text-center text-sm font-medium">{{ item.quantity }}</span>
            <button @click="updateQty(idx, 1)" class="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm">+</button>
          </div>
          <p class="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">{{ formatCurrency(item.price * item.quantity) }}</p>
          <button @click="removeItem(idx)" class="text-red-500">
            <span class="material-icons-outlined text-lg">close</span>
          </button>
        </div>
        <p v-if="!cart.length" class="text-center py-8 text-gray-500 text-sm">Carrito vacío</p>
      </div>

      <!-- Totals -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1 text-sm mb-4">
        <div class="flex justify-between"><span class="text-gray-500">Subtotal</span><span class="font-medium">{{ formatCurrency(subtotal) }}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">IVA (19%)</span><span class="font-medium">{{ formatCurrency(tax) }}</span></div>
        <div class="flex justify-between text-lg font-bold pt-1 border-t border-gray-200 dark:border-gray-700">
          <span>Total</span><span class="text-primary-600">{{ formatCurrency(total) }}</span>
        </div>
      </div>

      <!-- Payment -->
      <div class="flex gap-2">
        <select v-model="paymentType" class="form-input flex-1">
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
        </select>
        <button @click="checkout" :disabled="!cart.length || loading" class="btn btn-primary flex-1">
          <span v-if="loading" class="material-icons-outlined animate-spin">refresh</span>
          <span v-else>Cobrar</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { productsAPI, salesAPI } from '../../api';
import { formatCurrency } from '../../utils';
import Swal from 'sweetalert2';

const router = useRouter();
const search = ref('');
const products = ref([]);
const cart = ref([]);
const paymentType = ref('cash');
const loading = ref(false);

const subtotal = computed(() => cart.value.reduce((s, i) => s + (i.price * i.quantity), 0));
const tax = computed(() => subtotal.value * 0.19);
const total = computed(() => subtotal.value + tax.value);

const fetchProducts = async () => {
  try {
    const res = await productsAPI.getAll({ search: search.value, active: true });
    products.value = res.data || [];
  } catch (e) { /* ignore */ }
};

const addToCart = (p) => {
  const existing = cart.value.find(i => i.product_id === p.id);
  if (existing) existing.quantity++;
  else cart.value.push({ product_id: p.id, name: p.name, price: p.price, quantity: 1 });
};

const updateQty = (idx, delta) => {
  const newQty = cart.value[idx].quantity + delta;
  if (newQty <= 0) cart.value.splice(idx, 1);
  else cart.value[idx].quantity = newQty;
};

const removeItem = (idx) => cart.value.splice(idx, 1);

const checkout = async () => {
  loading.value = true;
  try {
    await salesAPI.create({ payment_type: paymentType.value, items: cart.value.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })) });
    await Swal.fire('Venta Exitosa', 'La venta se ha completado correctamente', 'success');
    cart.value = [];
    fetchProducts();
  } catch (e) {
    Swal.fire('Error', 'No se pudo completar la venta', 'error');
  } finally { loading.value = false; }
};

fetchProducts();
</script>

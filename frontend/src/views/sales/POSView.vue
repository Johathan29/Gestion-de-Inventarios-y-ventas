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
             class="dt-card p-3 cursor-pointer text-center"
             style="transition: box-shadow 0.2s ease, transform 0.2s ease;"
             @mouseenter="e => { e.currentTarget.style.boxShadow = '0px 8px 30px rgba(98,66,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }"
             @mouseleave="e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }">
          <div class="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
            <span class="material-icons-outlined text-3xl text-gray-400">inventory_2</span>
          </div>
          <p class="text-sm font-medium truncate" style="color: #0b1c30;">{{ p.name }}</p>
          <p class="text-sm font-bold text-primary-600">{{ formatCurrency(p.price) }}</p>
          <p class="text-xs text-gray-500">Stock: {{ p.stock }}</p>
        </div>
      </div>
      <p v-if="!products.length" class="text-center py-8 text-gray-500">No se encontraron productos</p>
    </div>

    <!-- Cart Panel -->
    <div class="w-96 dt-card p-4 flex flex-col">
<h3 class="dt-headline-sm" style="margin-bottom: 1rem;">Carrito</h3>

      <div class="flex-1 overflow-y-auto space-y-2 mb-4">
        <div v-for="(item, idx) in cart" :key="idx"
             class="flex items-center gap-2 p-2 rounded-xl" style="background: rgba(98,66,0,0.03);">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate" style="color: #0b1c30;">{{ item.name }}</p>
            <p class="text-xs text-gray-500">{{ formatCurrency(item.price) }} x {{ item.quantity }}</p>
          </div>
          <div class="flex items-center gap-1">
            <button @click="updateQty(idx, -1)" class="w-6 h-6 rounded flex items-center justify-center text-sm" style="background: #e2d6c8;">-</button>
            <span class="w-6 text-center text-sm font-medium">{{ item.quantity }}</span>
            <button @click="updateQty(idx, 1)" class="w-6 h-6 rounded flex items-center justify-center text-sm" style="background: #e2d6c8;">+</button>
          </div>
          <p class="text-sm font-medium w-20 text-right" style="color: #0b1c30;">{{ formatCurrency(item.price * item.quantity) }}</p>
          <button @click="removeItem(idx)" class="text-red-500">
            <span class="material-icons-outlined text-lg">close</span>
          </button>
        </div>
        <p v-if="!cart.length" class="text-center py-8 text-gray-500 text-sm">Carrito vacío</p>
      </div>

      <!-- Totals -->
      <div class="pt-3 space-y-1 text-sm mb-4" style="border-top: 1px solid #e2d6c8;">
        <div class="flex justify-between"><span class="text-gray-500">Subtotal</span><span class="font-medium">{{ formatCurrency(subtotal) }}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">IVA (19%)</span><span class="font-medium">{{ formatCurrency(tax) }}</span></div>
        <div class="flex justify-between text-lg font-bold pt-1" style="border-top: 1px solid #e2d6c8;">
          <span>Total</span><span style="color: #624200;">{{ formatCurrency(total) }}</span>
        </div>
      </div>

      <!-- Payment -->
      <div class="flex gap-2">
        <select v-model="paymentType" class="form-input flex-1">
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
        </select>
        <button @click="checkout" :disabled="!cart.length || loading" class="dt-btn-primary" style="flex: 1;">
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

<template>
  <div class="space-y-8">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Punto de Venta</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
          {{ products.length }} producto{{ products.length !== 1 ? 's' : '' }} disponibles
        </p>
      </div>
    </div>

    <div class="flex gap-6 h-[calc(100vh-16rem)] space-y-4">
      <!-- Products Grid -->
      <div class="flex-1 overflow-y-auto">
        <div class="mb-4">
          <div class="flex items-center w-full bg-white border border-[#d2c4b4] rounded-full px-4 py-2.5 focus-within:border-[#624200] focus-within:ring-2 focus-within:ring-[rgba(98,66,0,0.2)] transition-all shadow-sm">
            <span class="material-icons-outlined" style="color: #d2c4b4; margin-right: 0.5rem; font-size: 1.25rem;">search</span>
            <input v-model="search" @input="fetchProducts" type="text" placeholder="Buscar producto..."
              class="w-full bg-transparent border-none focus:ring-0 outline-none"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #0b1c30;" />
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div v-for="p in products" :key="p.id"
               @click="addToCart(p)"
               class="bg-white rounded-[12px] border border-[#d2c4b4]/30 p-3 cursor-pointer text-center transition-all duration-200"
               style="box-shadow: 0px 4px 20px rgba(98,66,0,0.05);"
               @mouseenter="e => { e.currentTarget.style.boxShadow = '0px 8px 30px rgba(98,66,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(98,66,0,0.3)'; }"
               @mouseleave="e => { e.currentTarget.style.boxShadow = '0px 4px 20px rgba(98,66,0,0.05)'; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(210,196,180,0.3)'; }">
            <div class="w-full aspect-square bg-[#e5eeff] rounded-lg mb-2 flex items-center justify-center overflow-hidden">
              <img v-if="p.images?.[0]" :src="p.images[0]" :alt="p.name" class="w-full h-full object-cover" />
              <span v-else class="material-icons-outlined text-3xl" style="color: #d2c4b4;">inventory_2</span>
            </div>
            <p class="text-sm font-medium truncate" style="color: #0b1c30;">{{ p.name }}</p>
            <p class="text-sm font-bold" style="color: #624200;">{{ formatTable(p.price) }}</p>
            <p class="text-xs" style="color: #4f4539;">Stock: {{ p.stock }}</p>
          </div>
        </div>
        <p v-if="!products.length" class="text-center py-8" style="color: #4f4539;">No se encontraron productos</p>
      </div>

      <!-- Cart Panel -->
      <div class="w-96 dt-card p-4 flex flex-col">
        <h3 class="dt-headline-sm" style="margin-bottom: 1rem;">Carrito</h3>

        <div class="flex-1 overflow-y-auto space-y-2 mb-4">
          <div v-for="(item, idx) in cart" :key="idx"
               class="flex items-center gap-2 p-2 rounded-xl" style="background: rgba(98,66,0,0.03);">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" style="color: #0b1c30;">{{ item.name }}</p>
              <p class="text-xs" style="color: #4f4539;">{{ formatTable(item.price) }} x {{ item.quantity }}</p>
            </div>
            <div class="flex items-center gap-1">
              <button @click="updateQty(idx, -1)" class="w-6 h-6 rounded flex items-center justify-center text-sm transition-colors" style="background: #e2d6c8; color: #4f4539;" @mouseenter="e => e.currentTarget.style.background = '#d2c4b4'" @mouseleave="e => e.currentTarget.style.background = '#e2d6c8'">-</button>
              <span class="w-6 text-center text-sm font-medium" style="color: #0b1c30;">{{ item.quantity }}</span>
              <button @click="updateQty(idx, 1)" class="w-6 h-6 rounded flex items-center justify-center text-sm transition-colors" style="background: #e2d6c8; color: #4f4539;" @mouseenter="e => e.currentTarget.style.background = '#d2c4b4'" @mouseleave="e => e.currentTarget.style.background = '#e2d6c8'">+</button>
            </div>
            <p class="text-sm font-medium w-20 text-right" style="color: #0b1c30;">{{ formatTable(item.price * item.quantity) }}</p>
            <button @click="removeItem(idx)" class="text-red-500 hover:text-red-700 transition-colors">
              <span class="material-icons-outlined text-lg">close</span>
            </button>
          </div>
          <p v-if="!cart.length" class="text-center py-8" style="color: #4f4539; font-size: 0.875rem;">Carrito vacío</p>
        </div>

        <!-- Totals -->
        <div class="pt-3 space-y-1 text-sm mb-4" style="border-top: 1px solid #e2d6c8;">
          <div class="flex justify-between"><span style="color: #4f4539;">Subtotal</span><span class="font-medium" style="color: #0b1c30;">{{ format(subtotal) }}</span></div>
          <div class="flex justify-between"><span style="color: #4f4539;">IVA ({{ taxRate }}%)</span><span class="font-medium" style="color: #0b1c30;">{{ format(tax) }}</span></div>
          <div class="flex justify-between text-lg font-bold pt-1" style="border-top: 1px solid #e2d6c8;">
            <span style="color: #0b1c30;">Total</span><span style="color: #624200;">{{ format(total) }}</span>
          </div>
        </div>

        <!-- Client Selector -->
        <div class="mb-3 relative">
          <label class="text-xs font-medium mb-1 block" style="color: #4f4539;">Cliente (opcional)</label>
          <div class="flex items-center w-full bg-white border border-[#d2c4b4] rounded-lg px-3 py-2 focus-within:border-[#624200] focus-within:ring-2 focus-within:ring-[rgba(98,66,0,0.2)] transition-all cursor-pointer"
               @click="clientSearchOpen = !clientSearchOpen">
            <span class="material-icons-outlined text-base" style="color: #d2c4b4; margin-right: 0.5rem;">person</span>
            <span v-if="selectedClient" class="text-sm" style="color: #0b1c30;">{{ selectedClient.name }} <span style="color: #4f4539;">{{ selectedClient.document_number ? `- ${selectedClient.document_number}` : '' }}</span></span>
            <span v-else class="text-sm" style="color: #b0a090;">Buscar cliente...</span>
            <span v-if="selectedClient" @click.stop="clearClient" class="material-icons-outlined text-base ml-auto" style="color: #b0a090;">close</span>
          </div>
          <!-- Client dropdown -->
          <div v-if="clientSearchOpen"
               class="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#d2c4b4] rounded-lg shadow-lg max-h-48 overflow-y-auto"
               style="box-shadow: 0px 8px 30px rgba(98,66,0,0.12);">
            <div class="p-2 border-b border-[#d2c4b4]/30">
              <input v-model="clientSearch" @input="searchClients"
                     placeholder="Nombre o documento..."
                     class="w-full bg-transparent border-none text-sm focus:ring-0 outline-none"
                     style="color: #0b1c30; font-family: 'Inter', sans-serif;" />
            </div>
            <div v-for="c in filteredClients" :key="c.id"
                 @click="selectClient(c)"
                 class="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-[rgba(98,66,0,0.06)]"
                 style="color: #0b1c30;">
              <span class="font-medium">{{ c.name }}</span>
              <span v-if="c.document_number" class="ml-2 text-xs" style="color: #4f4539;">{{ c.document_type }}: {{ c.document_number }}</span>
            </div>
            <div v-if="!filteredClients.length" class="px-3 py-2 text-sm" style="color: #b0a090;">
              Sin resultados
            </div>
          </div>
        </div>

        <!-- Payment -->
        <div class="flex gap-2">
          <select v-model="paymentType"
            class="flex-1 rounded-lg px-3 py-2.5 text-sm bg-white border transition-all outline-none"
            style="font-family: 'Inter', sans-serif; color: #0b1c30; border-color: #d2c4b4; border-width: 1.5px;"
            @focus="e => e.currentTarget.style.borderColor = '#a17808'"
            @blur="e => e.currentTarget.style.borderColor = '#d2c4b4'">
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>
          <button @click="checkout" :disabled="!cart.length || loading"
            class="flex-1 shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
            style="flex: 1; background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
            <span v-if="loading" class="material-icons-outlined animate-spin" style="font-size: 1.125rem;">refresh</span>
            <span v-else>Cobrar</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { productsAPI, salesAPI, clientsAPI } from '../../api';
import { useCurrency } from '../../composables/useCurrency';
import { useEcommerceConfig } from '../../composables/useEcommerceConfig';
import Swal from 'sweetalert2';

const { format, formatTable } = useCurrency();
const { taxRate, taxIncluded, loadConfig } = useEcommerceConfig();

const router = useRouter();
const search = ref('');
const products = ref([]);
const cart = ref([]);
const paymentType = ref('cash');
const loading = ref(false);
const lastSaleId = ref(null);

// Client selector
const selectedClient = ref(null);
const clientSearch = ref('');
const clientSearchOpen = ref(false);
const allClients = ref([]);
const filteredClients = computed(() => {
  if (!clientSearch.value) return allClients.value.slice(0, 20);
  const q = clientSearch.value.toLowerCase();
  return allClients.value.filter(c =>
    c.name?.toLowerCase().includes(q) ||
    c.document_number?.toLowerCase().includes(q) ||
    c.email?.toLowerCase().includes(q)
  ).slice(0, 20);
});

const fetchClients = async () => {
  try {
    const res = await clientsAPI.getAll({ limit: 200 });
    allClients.value = res.data || [];
  } catch (e) { /* ignore */ }
};

const selectClient = (c) => {
  selectedClient.value = c;
  clientSearchOpen.value = false;
  clientSearch.value = '';
};

const clearClient = () => {
  selectedClient.value = null;
};

const subtotal = computed(() => cart.value.reduce((s, i) => s + (i.price * i.quantity), 0));
const tax = computed(() => {
  const rate = taxRate.value / 100;
  if (taxIncluded.value) {
    // Precio ya incluye IVA → calcular IVA = subtotal - (subtotal / (1 + tasa))
    return subtotal.value - (subtotal.value / (1 + rate));
  }
  return subtotal.value * rate;
});
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

const printTicket = (saleData) => {
  const printWindow = window.open('', '_blank', 'width=320,height=600');
  if (!printWindow) return;
  const itemsHtml = cart.value.map(i => `
    <tr>
      <td style="font-size:11px;">${i.name}</td>
      <td style="font-size:11px;text-align:center;">${i.quantity}</td>
      <td style="font-size:11px;text-align:right;">${formatTable(i.price)}</td>
      <td style="font-size:11px;text-align:right;">${formatTable(i.price * i.quantity)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html>
    <head>
      <title>Ticket de Venta</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 5px; }
        h2 { text-align: center; font-size: 14px; margin: 5px 0; }
        hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 10px; text-align: left; border-bottom: 1px solid #000; }
        .total-row { font-weight: bold; font-size: 14px; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <h2>TIENDA</h2>
      <p class="center" style="font-size:10px;">Fecha: ${new Date().toLocaleString('es-DO')}</p>
      <p class="center" style="font-size:10px;">Pago: ${paymentType.value === 'cash' ? 'Efectivo' : paymentType.value === 'card' ? 'Tarjeta' : 'Transferencia'}</p>
      <hr>
      <table>
        <tr><th>Producto</th><th style="text-align:center;">Cant</th><th style="text-align:right;">Precio</th><th style="text-align:right;">Total</th></tr>
        ${itemsHtml}
      </table>
      <hr>
      <table>
        <tr><td>Subtotal</td><td style="text-align:right;">${formatTable(subtotal.value)}</td></tr>
        <tr><td>IVA (${taxRate.value}%)</td><td style="text-align:right;">${formatTable(tax.value)}</td></tr>
        <tr class="total-row"><td>TOTAL</td><td style="text-align:right;">${formatTable(total.value)}</td></tr>
      </table>
      <hr>
      <p class="center" style="font-size:10px;">¡Gracias por su compra!</p>
      <script>window.print();window.close();<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

const checkout = async () => {
  loading.value = true;
  try {
    const payload = {
      paymentMethod: paymentType.value,
      source: 'pos',
      items: cart.value.map(i => ({ productId: i.product_id, quantity: i.quantity, unitPrice: i.price }))
    };
    if (selectedClient.value) {
      payload.clientId = selectedClient.value.id;
    }
    const res = await salesAPI.create(payload);
    lastSaleId.value = res.data?.id || null;

    const result = await Swal.fire({
      icon: 'success',
      title: 'Venta Exitosa',
      text: 'La venta se ha completado correctamente',
      showCancelButton: true,
      confirmButtonText: 'Imprimir Ticket',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#624200',
    });

    if (result.isConfirmed) {
      printTicket(res.data);
    }

    cart.value = [];
    fetchProducts();
  } catch (e) {
    Swal.fire('Error', 'No se pudo completar la venta', 'error');
  } finally { loading.value = false; }
};

fetchProducts();
fetchClients();
loadConfig();
</script>

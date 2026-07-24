<template>
  <div class="aurora-entrance space-y-4">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold tracking-tight" style="color: var(--aurora-primary); font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">
            Punto de Venta
          </h2>
          <span v-if="shiftStore.isOpen" class="aurora-badge aurora-badge-success">Turno Activo</span>
          <span v-else class="aurora-badge aurora-badge-secondary">Sin Turno</span>
        </div>
        <p class="text-sm font-medium" style="color: var(--aurora-on-surface-variant); font-family: 'Inter', sans-serif;">
          {{ products.length }} producto{{ products.length !== 1 ? 's' : '' }} disponibles
        </p>
      </div>
    </div>

    <!-- Shift Active Banner -->
    <div v-if="shiftStore.isOpen && shiftStore.currentSession" class="aurora-raised-card !p-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-4 flex-wrap">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-full flex items-center justify-center" style="background: var(--aurora-primary-container); color: var(--aurora-primary);">
              <span class="material-symbols-outlined" style="font-size: 1.25rem;">person</span>
            </div>
            <div>
              <p class="text-xs text-on-surface-variant">Cajero</p>
              <p class="text-sm font-semibold text-on-surface">{{ shiftStore.currentSession.users?.name || '—' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-full flex items-center justify-center" style="background: var(--aurora-secondary-container); color: var(--aurora-secondary);">
              <span class="material-symbols-outlined" style="font-size: 1.25rem;">point_of_sale</span>
            </div>
            <div>
              <p class="text-xs text-on-surface-variant">Caja</p>
              <p class="text-sm font-semibold text-on-surface">{{ shiftStore.currentSession.registers?.name || 'Caja Principal' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-full flex items-center justify-center" style="background: var(--aurora-tertiary-container); color: var(--aurora-tertiary);">
              <span class="material-symbols-outlined" style="font-size: 1.25rem;">payments</span>
            </div>
            <div>
              <p class="text-xs text-on-surface-variant">Saldo Inicial</p>
              <p class="text-sm font-semibold text-on-surface">${{ formatPrice(shiftStore.currentSession.opening_balance) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-full flex items-center justify-center" style="background: var(--aurora-surface-container);">
              <span class="material-symbols-outlined" style="font-size: 1.25rem; color: var(--aurora-on-surface-variant);">schedule</span>
            </div>
            <div>
              <p class="text-xs text-on-surface-variant">Abierto</p>
              <p class="text-sm font-semibold text-on-surface">{{ formatRelativeTime(shiftStore.currentSession.opened_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Shift Alert -->
    <div v-else class="aurora-raised-card !p-6 text-center">
      <div class="flex flex-col items-center gap-3 py-6">
        <div class="w-16 h-16 rounded-full flex items-center justify-center" style="background: var(--aurora-surface-container);">
          <span class="material-symbols-outlined text-3xl" style="color: var(--aurora-on-surface-variant);">point_of_sale</span>
        </div>
        <div>
          <h3 class="font-semibold text-on-surface">No hay turno activo</h3>
          <p class="text-sm text-on-surface-variant mt-1">Debes abrir un turno antes de realizar ventas</p>
        </div>
        <button @click="goToShifts" class="aurora-btn-primary mt-2">
          <span class="material-symbols-outlined" style="font-size: 1.25rem;">lock_open</span>
          Abrir Turno
        </button>
      </div>
    </div>

    <!-- Main POS Layout -->
    <div class="flex flex-col lg:flex-row gap-4" :class="shiftStore.isOpen ? 'lg:h-[calc(100vh-22rem)]' : 'lg:h-[calc(100vh-18rem)]'">
      <!-- Products Grid -->
      <div class="flex-1 overflow-y-auto">
        <!-- Search -->
        <div class="mb-3">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" style="font-size: 1.25rem;">search</span>
            <input v-model="search" @input="onSearchInput" type="text" placeholder="Buscar producto..."
              class="aurora-input w-full pl-10" />
          </div>
        </div>

        <!-- Product count -->
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs text-on-surface-variant">
            {{ paginatedProducts.length }} de {{ products.length }} producto{{ products.length !== 1 ? 's' : '' }}
          </p>
        </div>

        <!-- Products -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <div v-for="p in paginatedProducts" :key="p.id"
               @click="handleProductClick(p)"
               class="aurora-card cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group"
               :class="{ 'opacity-60 pointer-events-none': !shiftStore.isOpen }">
            <div class="w-full aspect-square rounded-lg mb-2 flex items-center justify-center overflow-hidden"
                 style="background: var(--aurora-surface-container);">
              <img v-if="p.images?.[0]" :src="p.images[0]" :alt="p.name" class="w-full h-full object-cover" />
              <span v-else class="material-symbols-outlined text-3xl" style="color: var(--aurora-outline);">inventory_2</span>
            </div>
            <p class="text-sm font-medium truncate text-on-surface">{{ p.name }}</p>
            <p class="text-sm font-bold" style="color: var(--aurora-primary);">${{ formatPrice(p.price) }}</p>
            <p class="text-xs text-on-surface-variant">Stock: {{ p.stock }}</p>
            <span v-if="productVariantsMap[p.id]?.length"
                  class="absolute top-2 right-2 text-xs rounded-full px-1.5 py-0.5 font-medium"
                  style="background: var(--aurora-primary); color: var(--aurora-on-primary);">
              {{ productVariantsMap[p.id].length }}
            </span>
          </div>
        </div>
        <p v-if="!products.length" class="text-center py-8 text-on-surface-variant text-sm">
          No se encontraron productos
        </p>
        <!-- Pagination -->
        <div v-if="totalProductPages > 1" class="flex items-center justify-center gap-2 mt-4">
          <button @click="productPage--" :disabled="productPage <= 1"
            class="aurora-btn-icon text-on-surface-variant disabled:opacity-30">
            <span class="material-symbols-outlined" style="font-size: 1.125rem;">chevron_left</span>
          </button>
          <span class="text-xs text-on-surface-variant font-medium">
            {{ productPage }} / {{ totalProductPages }}
          </span>
          <button @click="productPage++" :disabled="productPage >= totalProductPages"
            class="aurora-btn-icon text-on-surface-variant disabled:opacity-30">
            <span class="material-symbols-outlined" style="font-size: 1.125rem;">chevron_right</span>
          </button>
        </div>
      </div>

      <!-- Cart Panel -->
      <div class="w-full lg:w-96 aurora-raised-card p-4 flex flex-col" style="min-height: 400px;">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-on-surface">Carrito</h3>
          <span v-if="cart.length" class="text-xs font-medium px-2 py-0.5 rounded-full"
                style="background: var(--aurora-primary-container); color: var(--aurora-primary);">
            {{ cart.length }} item{{ cart.length !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto space-y-2 mb-3">
          <div v-for="(item, idx) in cart" :key="idx"
               class="flex items-center gap-2 p-2 rounded-xl"
               style="background: var(--aurora-surface-container);">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate text-on-surface">{{ item.name }}</p>
              <p class="text-xs text-on-surface-variant">
                ${{ formatPrice(item.price) }} x {{ item.quantity }}
                <span v-if="item.variant_name" class="ml-1 font-medium" style="color: var(--aurora-secondary);">({{ item.variant_name }})</span>
              </p>
            </div>
            <div class="flex items-center gap-1">
              <button @click="updateQty(idx, -1)"
                      class="w-6 h-6 rounded-full flex items-center justify-center text-sm transition-colors hover:scale-110"
                      style="background: var(--aurora-surface-high); color: var(--aurora-on-surface-variant);">-</button>
              <span class="w-6 text-center text-sm font-medium text-on-surface">{{ item.quantity }}</span>
              <button @click="updateQty(idx, 1)"
                      class="w-6 h-6 rounded-full flex items-center justify-center text-sm transition-colors hover:scale-110"
                      style="background: var(--aurora-surface-high); color: var(--aurora-on-surface-variant);">+</button>
            </div>
            <p class="text-sm font-medium w-20 text-right text-on-surface">${{ formatPrice(item.price * item.quantity) }}</p>
            <button @click="removeItem(idx)" class="p-1 rounded-full hover:bg-red-50 transition-colors">
              <span class="material-symbols-outlined text-lg" style="color: var(--aurora-error);">close</span>
            </button>
          </div>
          <p v-if="!cart.length" class="text-center py-8 text-on-surface-variant text-sm">
            Carrito vacío
          </p>
        </div>

        <!-- Totals -->
        <div class="pt-3 space-y-1 text-sm mb-3" style="border-top: 1px solid var(--aurora-outline-variant);">
          <div class="flex justify-between">
            <span class="text-on-surface-variant">Subtotal</span>
            <span class="font-medium text-on-surface">${{ formatPrice(subtotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-on-surface-variant">IVA ({{ taxRate }}%)</span>
            <span class="font-medium text-on-surface">${{ formatPrice(tax) }}</span>
          </div>
          <div class="flex justify-between text-lg font-bold pt-1" style="border-top: 1px solid var(--aurora-outline-variant);">
            <span class="text-on-surface">Total</span>
            <span style="color: var(--aurora-primary);">${{ formatPrice(total) }}</span>
          </div>
        </div>

        <!-- Client Selector -->
        <div class="mb-3 relative">
          <label class="text-xs font-medium mb-1 block text-on-surface-variant">Cliente (opcional)</label>
          <div class="aurora-input-wrapper cursor-pointer"
               @click="clientSearchOpen = !clientSearchOpen">
            <span class="material-symbols-outlined aurora-input-icon">person</span>
            <span v-if="selectedClient" class="text-sm text-on-surface flex-1">
              {{ selectedClient.name }}
              <span v-if="selectedClient.document_number" class="text-on-surface-variant">- {{ selectedClient.document_number }}</span>
            </span>
            <span v-else class="text-sm text-on-surface-variant flex-1">Buscar cliente...</span>
            <span v-if="selectedClient" @click.stop="clearClient" class="material-symbols-outlined text-sm" style="color: var(--aurora-on-surface-variant);">close</span>
          </div>
          <!-- Client dropdown -->
          <div v-if="clientSearchOpen"
               class="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto"
               style="box-shadow: 0px 8px 30px rgba(124,58,237,0.08);">
            <div class="p-2 border-b border-gray-100">
              <input v-model="clientSearch" @input="searchClients"
                     placeholder="Nombre o documento..."
                     class="w-full bg-transparent border-none text-sm focus:ring-0 outline-none"
                     style="color: #1e293b; font-family: 'Inter', sans-serif;" />
            </div>
            <div v-for="c in filteredClients" :key="c.id"
                 @click="selectClient(c)"
                 class="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-purple-50"
                 style="color: #1e293b;">
              <span class="font-medium">{{ c.name }}</span>
              <span v-if="c.document_number" class="ml-2 text-xs" style="color: #64748b;">{{ c.document_type }}: {{ c.document_number }}</span>
            </div>
            <div v-if="!filteredClients.length" class="px-3 py-2 text-sm" style="color: #94a3b8;">
              Sin resultados
            </div>
          </div>
        </div>

        <!-- Payment & Checkout -->
        <div class="flex gap-2">
          <select v-model="paymentType"
            class="aurora-select flex-1">
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>
          <button @click="checkout" :disabled="!cart.length || loading || !shiftStore.isOpen"
            class="aurora-btn-primary flex-1">
            <span v-if="loading" class="material-symbols-outlined animate-spin" style="font-size: 1.125rem;">refresh</span>
            <span v-else>Cobrar</span>
          </button>
        </div>
        <p v-if="!shiftStore.isOpen" class="text-xs text-center mt-2" style="color: var(--aurora-error);">
          Abre un turno para habilitar las ventas
        </p>
      </div>
    </div>

    <!-- Variant Selection Modal -->
    <Teleport to="body">
      <div v-if="variantModal.show" class="fixed inset-0 z-50 flex items-center justify-center"
           style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);"
           @click.self="closeVariantModal">
        <div class="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
             style="box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
          <div class="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-gray-100">
            <h3 class="font-semibold text-lg" style="color: #1e293b;">{{ variantModal.product?.name }}</h3>
            <button @click="closeVariantModal" class="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="material-symbols-outlined" style="color: #64748b;">close</span>
            </button>
          </div>
          <div class="p-4 space-y-3">
            <div v-for="v in variantModal.variants" :key="v.id"
                 @click="addVariantToCart(v)"
                 class="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border-2 hover:border-purple-300 active:scale-[0.98]"
                 :class="v.stock > 0 ? 'border-gray-100 bg-white' : 'border-red-100 bg-red-50 opacity-70'"
                 style="box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
              <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                <img v-if="v.images?.[0]" :src="v.images[0]" :alt="v.name" class="w-full h-full object-cover" />
                <span v-else class="flex items-center justify-center h-full text-gray-400">
                  <span class="material-symbols-outlined">inventory_2</span>
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm" style="color: #1e293b;">{{ v.name }}</p>
                <p v-if="v.attributes && Object.keys(v.attributes).length" class="text-xs mt-0.5" style="color: #64748b;">
                  <span v-for="(val, key) in v.attributes" :key="key" class="mr-2">{{ key }}: {{ val }}</span>
                </p>
                <div class="flex items-center gap-3 mt-1">
                  <span class="text-sm font-bold" style="color: #7c3aed;">${{ formatPrice(v.price || variantModal.product?.price) }}</span>
                  <span class="text-xs" :style="{ color: v.stock > 0 ? '#10b981' : '#ef4444' }">
                    {{ v.stock > 0 ? `Stock: ${v.stock}` : 'Sin stock' }}
                  </span>
                </div>
              </div>
              <button v-if="v.stock > 0"
                      class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
                      style="background: #7c3aed;">
                <span class="material-symbols-outlined text-lg">add</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Close Session Admin Verification Modal -->
    <Teleport to="body">
      <div v-if="showCloseModal" class="fixed inset-0 z-50 flex items-center justify-center"
           style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);"
           @click.self="showCloseModal = false">
        <div class="bg-white rounded-2xl w-full max-w-md mx-4 p-6"
             style="box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-on-surface">Cerrar Turno</h3>
            <button @click="showCloseModal = false" class="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <span class="material-symbols-outlined" style="color: #64748b;">close</span>
            </button>
          </div>
          <p class="text-sm text-on-surface-variant mb-4">
            Se requiere autorización de administrador o supervisor para cerrar el turno.
          </p>

          <!-- Session summary -->
          <div v-if="shiftStore.currentSession" class="grid grid-cols-2 gap-2 mb-4 p-3 rounded-xl" style="background: var(--aurora-surface-container);">
            <div>
              <p class="text-xs text-on-surface-variant">Saldo Inicial</p>
              <p class="text-sm font-bold text-on-surface">${{ formatPrice(shiftStore.currentSession.opening_balance) }}</p>
            </div>
            <div>
              <p class="text-xs text-on-surface-variant">Ventas</p>
              <p class="text-sm font-bold text-on-surface">{{ salesCount }}</p>
            </div>
            <div>
              <p class="text-xs text-on-surface-variant">Cajero</p>
              <p class="text-sm font-medium text-on-surface">{{ shiftStore.currentSession.users?.name || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-on-surface-variant">Caja</p>
              <p class="text-sm font-medium text-on-surface">{{ shiftStore.currentSession.registers?.name || 'Caja Principal' }}</p>
            </div>
          </div>

          <!-- Admin credentials -->
          <div class="space-y-3">
            <div>
              <label class="block mb-1 text-sm font-medium text-on-surface">Email del Administrador</label>
              <input v-model="adminEmail" type="email" class="aurora-input w-full" placeholder="admin@ejemplo.com" />
            </div>
            <div>
              <label class="block mb-1 text-sm font-medium text-on-surface">Contraseña</label>
              <input v-model="adminPassword" type="password" class="aurora-input w-full" placeholder="••••••••" />
            </div>
            <div>
              <label class="block mb-1 text-sm font-medium text-on-surface">Saldo Final en Caja</label>
              <input v-model.number="closingBalance" type="number" min="0" step="100" class="aurora-input w-full" placeholder="0" />
            </div>
            <div>
              <label class="block mb-1 text-sm font-medium text-on-surface">Nota (opcional)</label>
              <textarea v-model="closeNotes" rows="2" class="aurora-input w-full" placeholder="Observaciones..."></textarea>
            </div>
          </div>

          <div v-if="closeError" class="text-sm p-3 rounded-xl mt-3"
               style="color: var(--aurora-error); background: var(--aurora-error-container);">
            {{ closeError }}
          </div>

          <div class="flex justify-end gap-3 mt-5">
            <button @click="showCloseModal = false" class="aurora-btn-secondary">Cancelar</button>
            <button @click="handleCloseSession" :disabled="closingLoading" class="aurora-btn-primary" style="background: var(--aurora-error);">
              <span v-if="closingLoading" class="material-symbols-outlined animate-spin" style="font-size: 1.125rem;">refresh</span>
              <span v-else>Cerrar Turno</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCashRegisterStore } from '../../stores/cashRegister';
import { productsAPI, salesAPI, clientsAPI, authAPI, cashRegisterAPI } from '../../api';
import { useCurrency } from '../../composables/useCurrency';
import { useEcommerceConfig } from '../../composables/useEcommerceConfig';
import Swal from 'sweetalert2';

const { format: formatPrice } = useCurrency();
const { taxRate, taxIncluded, loadConfig } = useEcommerceConfig();

const router = useRouter();
const shiftStore = useCashRegisterStore();

const search = ref('');
const products = ref([]);
const cart = ref([]);
const paymentType = ref('cash');
const loading = ref(false);
const lastSaleId = ref(null);
const productPage = ref(1);
const PRODUCTS_PER_PAGE = 20;

// Shift state
const salesCount = ref(0);
const showCloseModal = ref(false);
const adminEmail = ref('');
const adminPassword = ref('');
const closingBalance = ref(0);
const closeNotes = ref('');
const closeError = ref('');
const closingLoading = ref(false);

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

const subtotal = computed(() => cart.value.reduce((s, i) => s + (i.price * i.quantity), 0));

// POS product pagination
const totalProductPages = computed(() => Math.max(1, Math.ceil(products.value.length / PRODUCTS_PER_PAGE)));
const paginatedProducts = computed(() => {
  const start = (productPage.value - 1) * PRODUCTS_PER_PAGE;
  return products.value.slice(start, start + PRODUCTS_PER_PAGE);
});

// Reset product page on search
const onSearchInput = () => {
  clearTimeout(onSearchInput._timer);
  onSearchInput._timer = setTimeout(() => {
    productPage.value = 1;
    fetchProducts();
  }, 400);
};
watch(search, () => { productPage.value = 1; });
const tax = computed(() => {
  const rate = taxRate.value / 100;
  if (taxIncluded.value) {
    return subtotal.value - (subtotal.value / (1 + rate));
  }
  return subtotal.value * rate;
});
const total = computed(() => subtotal.value + tax.value);

// Variant modal state
const variantModal = ref({ show: false, product: null, variants: [] });
const productVariantsMap = ref({});

// ============================================================
// Helpers
// ============================================================
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// ============================================================
// Product & Client Fetching
// ============================================================
const fetchProducts = async () => {
  try {
    const res = await productsAPI.getAll({ search: search.value, active: true });
    products.value = res.data || [];
    const map = {};
    await Promise.all((res.data || []).map(async (p) => {
      try {
        const vRes = await productsAPI.getVariants(p.id);
        const activeVariants = (vRes.data || []).filter(v => v.is_active !== false);
        if (activeVariants.length > 0) map[p.id] = activeVariants;
      } catch (e) { /* no variants */ }
    }));
    productVariantsMap.value = map;
  } catch (e) { /* ignore */ }
};

const fetchClients = async () => {
  try {
    const res = await clientsAPI.getAll({ limit: 200 });
    allClients.value = res.data || [];
  } catch (e) { /* ignore */ }
};

const searchClients = () => {
  // reactive via computed
};

const selectClient = (c) => {
  selectedClient.value = c;
  clientSearchOpen.value = false;
  clientSearch.value = '';
};

const clearClient = () => {
  selectedClient.value = null;
};

// ============================================================
// Cart Operations
// ============================================================
const handleProductClick = async (p) => {
  if (!shiftStore.isOpen) return;
  const variants = productVariantsMap.value[p.id];
  if (variants && variants.length > 0) {
    variantModal.value = { show: true, product: p, variants };
  } else {
    addToCart(p);
  }
};

const addToCart = (p) => {
  const existing = cart.value.find(i => i.product_id === p.id && !i.variant_id);
  if (existing) existing.quantity++;
  else cart.value.push({ product_id: p.id, name: p.name, price: p.price, quantity: 1, variant_id: null, variant_name: null, variant_attributes: null });
};

const addVariantToCart = (v) => {
  const p = variantModal.value.product;
  const existing = cart.value.find(i => i.product_id === p.id && i.variant_id === v.id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.value.push({
      product_id: p.id,
      variant_id: v.id,
      variant_name: v.name,
      variant_attributes: v.attributes || null,
      name: `${p.name} - ${v.name}`,
      price: v.price || p.price,
      quantity: 1,
    });
  }
  closeVariantModal();
};

const closeVariantModal = () => {
  variantModal.value = { show: false, product: null, variants: [] };
};

const updateQty = (idx, delta) => {
  const newQty = cart.value[idx].quantity + delta;
  if (newQty <= 0) cart.value.splice(idx, 1);
  else cart.value[idx].quantity = newQty;
};

const removeItem = (idx) => cart.value.splice(idx, 1);

// ============================================================
// Checkout - Create Sale + Register Cash Movement
// ============================================================
const checkout = async () => {
  if (!shiftStore.isOpen || !shiftStore.currentSession) {
    Swal.fire('Sin Turno', 'Debes abrir un turno antes de realizar ventas', 'warning');
    return;
  }
  loading.value = true;
  try {
    const payload = {
      paymentMethod: paymentType.value,
      source: 'pos',
      items: cart.value.map(i => ({
        productId: i.product_id,
        quantity: i.quantity,
        unitPrice: i.price,
        variantId: i.variant_id || undefined,
      }))
    };
    if (selectedClient.value) {
      payload.clientId = selectedClient.value.id;
    }

    // 1. Create the sale
    const res = await salesAPI.create(payload);
    lastSaleId.value = res.data?.id || null;

    // 2. Register cash movement linked to the active session
    if (lastSaleId.value) {
      try {
        await cashRegisterAPI.registerMovement({
          session_id: shiftStore.currentSession.id,
          type: 'sale',
          amount: total.value,
          payment_method: paymentType.value === 'card' ? 'card' : paymentType.value === 'transfer' ? 'transfer' : 'cash',
          reference_type: 'sale',
          reference_id: lastSaleId.value,
          description: `Venta #${res.data?.sale_number || lastSaleId.value.substring(0, 8)}`
        });
        salesCount.value++;
      } catch (movErr) {
        console.error('Error registering cash movement:', movErr);
        // Don't block the sale if movement fails
      }
    }

    // 3. Show success & print ticket
    const result = await Swal.fire({
      icon: 'success',
      title: 'Venta Exitosa',
      text: 'La venta se ha completado correctamente',
      showCancelButton: true,
      confirmButtonText: 'Imprimir Ticket',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#7c3aed',
    });

    if (result.isConfirmed) {
      printTicket(res.data);
    }

    cart.value = [];
    fetchProducts();
  } catch (e) {
    Swal.fire('Error', e.response?.data?.error?.message || 'No se pudo completar la venta', 'error');
  } finally { loading.value = false; }
};

// ============================================================
// Print Ticket
// ============================================================
const printTicket = (saleData) => {
  const printWindow = window.open('', '_blank', 'width=320,height=600');
  if (!printWindow) return;

  const session = shiftStore.currentSession;
  const itemsHtml = cart.value.map(i => `
    <tr>
      <td style="font-size:11px;">${i.name}${i.variant_name ? ` (${i.variant_name})` : ''}</td>
      <td style="font-size:11px;text-align:center;">${i.quantity}</td>
      <td style="font-size:11px;text-align:right;">$${formatPrice(i.price)}</td>
      <td style="font-size:11px;text-align:right;">$${formatPrice(i.price * i.quantity)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html>
    <head>
      <title>Ticket de Venta</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 5px; }
        h2 { text-align: center; font-size: 14px; margin: 5px 0; }
        h3 { text-align: center; font-size: 11px; margin: 2px 0; font-weight: normal; }
        hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 10px; text-align: left; border-bottom: 1px solid #000; }
        .total-row { font-weight: bold; font-size: 14px; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <h2>TIENDA</h2>
      ${session ? `<h3>Cajero: ${session.users?.name || '—'}</h3>` : ''}
      ${session ? `<h3>Caja: ${session.registers?.name || 'Caja Principal'}</h3>` : ''}
      <p class="center" style="font-size:10px;">Fecha: ${new Date().toLocaleString('es-DO')}</p>
      <p class="center" style="font-size:10px;">Pago: ${paymentType.value === 'cash' ? 'Efectivo' : paymentType.value === 'card' ? 'Tarjeta' : 'Transferencia'}</p>
      ${selectedClient.value ? `<p class="center" style="font-size:10px;">Cliente: ${selectedClient.value.name}</p>` : ''}
      <hr>
      <table>
        <tr><th>Producto</th><th style="text-align:center;">Cant</th><th style="text-align:right;">Precio</th><th style="text-align:right;">Total</th></tr>
        ${itemsHtml}
      </table>
      <hr>
      <table>
        <tr><td>Subtotal</td><td style="text-align:right;">$${formatPrice(subtotal.value)}</td></tr>
        <tr><td>IVA (${taxRate.value}%)</td><td style="text-align:right;">$${formatPrice(tax.value)}</td></tr>
        <tr class="total-row"><td>TOTAL</td><td style="text-align:right;">$${formatPrice(total.value)}</td></tr>
      </table>
      <hr>
      <p class="center" style="font-size:10px;">¡Gracias por su compra!</p>
      <script>window.print();window.close();<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// ============================================================
// Close Session with Admin Verification
// ============================================================
const confirmCloseSession = () => {
  showCloseModal.value = true;
  adminEmail.value = '';
  adminPassword.value = '';
  closingBalance.value = 0;
  closeNotes.value = '';
  closeError.value = '';
};

const handleCloseSession = async () => {
  if (!adminEmail.value || !adminPassword.value) {
    closeError.value = 'Debes ingresar email y contraseña del administrador';
    return;
  }
  if (!closingBalance.value || closingBalance.value <= 0) {
    closeError.value = 'Debes ingresar el saldo final en caja';
    return;
  }

  closingLoading.value = true;
  closeError.value = '';

  try {
    // 1. Verify admin credentials via the payment-service endpoint
    const verifyRes = await cashRegisterAPI.verifyAdmin({
      email: adminEmail.value,
      password: adminPassword.value
    });

    if (!verifyRes.data?.valid) {
      closeError.value = verifyRes.data?.message || 'Credenciales inválidas';
      closingLoading.value = false;
      return;
    }

    // 2. Close the session
    await shiftStore.closeSession(shiftStore.currentSession.id, {
      closing_balance: closingBalance.value,
      notes: closeNotes.value || 'Cerrado desde POS'
    });

    showCloseModal.value = false;

    // 3. Show report summary
    await Swal.fire({
      icon: 'success',
      title: 'Turno Cerrado',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <p><strong>Autorizado por:</strong> ${verifyRes.data.user?.name || '—'}</p>
          <p><strong>Saldo Inicial:</strong> $${formatPrice(shiftStore.currentSession.opening_balance)}</p>
          <p><strong>Ventas realizadas:</strong> ${salesCount.value}</p>
          <p><strong>Saldo Final:</strong> $${formatPrice(closingBalance.value)}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Imprimir Reporte',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#7c3aed',
    }).then(async (result) => {
      if (result.isConfirmed) {
        await printCloseReport();
      }
    });

    // 4. Refresh current session
    await shiftStore.fetchCurrentSession();
    salesCount.value = 0;

  } catch (e) {
    closeError.value = e.response?.data?.error?.message || 'Error al cerrar el turno';
  } finally {
    closingLoading.value = false;
  }
};

const printCloseReport = async () => {
  const session = shiftStore.currentSession;
  if (!session) return;

  const printWindow = window.open('', '_blank', 'width=400,height=700');
  if (!printWindow) return;

  // Get movements for this session
  let movementsHtml = '';
  try {
    const movRes = await cashRegisterAPI.getMovements(session.id);
    const movements = movRes.data || [];
    movementsHtml = movements.map(m => `
      <tr>
        <td style="font-size:10px;">${new Date(m.created_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="font-size:10px;">${m.type === 'sale' ? 'Venta' : m.type === 'withdrawal' ? 'Retiro' : m.type === 'deposit' ? 'Depósito' : m.type === 'expense' ? 'Gasto' : m.type === 'refund' ? 'Devolución' : m.type}</td>
        <td style="font-size:10px;text-align:right;">$${formatPrice(m.amount)}</td>
      </tr>
    `).join('');
  } catch (e) { movementsHtml = '<tr><td colspan="3" style="font-size:10px;">Error al cargar movimientos</td></tr>'; }

  printWindow.document.write(`
    <html>
    <head>
      <title>Reporte de Cierre de Caja</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 5px; }
        h2 { text-align: center; font-size: 14px; margin: 5px 0; }
        h3 { text-align: center; font-size: 11px; margin: 2px 0; font-weight: normal; }
        hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 10px; text-align: left; border-bottom: 1px solid #000; }
        .total-row { font-weight: bold; font-size: 14px; }
        .right { text-align: right; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <h2>REPORTE DE CIERRE</h2>
      <h3>${session.registers?.name || 'Caja Principal'}</h3>
      <hr>
      <p style="font-size:10px;">Cajero: ${session.users?.name || '—'}</p>
      <p style="font-size:10px;">Apertura: ${new Date(session.opened_at).toLocaleString('es-DO')}</p>
      <p style="font-size:10px;">Cierre: ${new Date().toLocaleString('es-DO')}</p>
      <hr>
      <table>
        <tr><td>Saldo Inicial</td><td class="right">$${formatPrice(session.opening_balance)}</td></tr>
        <tr><td>Saldo Final Ingresado</td><td class="right">$${formatPrice(closingBalance.value)}</td></tr>
        <tr><td>Esperado (Ventas)</td><td class="right">$${formatPrice(session.expected_balance || 0)}</td></tr>
        <tr><td>Diferencia</td><td class="right">$${formatPrice(session.difference || 0)}</td></tr>
      </table>
      <hr>
      <h3>Movimientos</h3>
      <table>
        <tr><th>Hora</th><th>Tipo</th><th class="right">Monto</th></tr>
        ${movementsHtml}
      </table>
      <hr>
      <p class="center" style="font-size:10px;">Total Ventas: ${salesCount.value}</p>
      ${closeNotes.value ? `<p class="center" style="font-size:10px;">Nota: ${closeNotes.value}</p>` : ''}
      <hr>
      <p class="center" style="font-size:10px;">¡Gracias!</p>
      <script>window.print();window.close();<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// ============================================================
// Navigation
// ============================================================
const goToShifts = () => {
  router.push('/app/cash-register');
};

// ============================================================
// Init
// ============================================================
onMounted(async () => {
  await shiftStore.fetchCurrentSession();
  fetchProducts();
  fetchClients();
  loadConfig();
});
</script>

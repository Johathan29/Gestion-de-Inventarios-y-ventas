<template>
  <div>
    <!-- Header & Summary -->
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Inventario</h1>
          <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
            {{ pagination.total || inventoryItems.length }} producto{{ (pagination.total || inventoryItems.length) !== 1 ? 's' : '' }} en inventario
          </p>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
            style="background: #624200; color: white; border-color: rgba(139,94,0,0.2); font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5;"
            @mouseenter="$event => $event.currentTarget.style.background = '#452d00'"
            @mouseleave="$event => $event.currentTarget.style.background = '#624200'">
            <span class="material-icons-outlined" style="font-size: 1.25rem;">download</span>
            <span class="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Total Value Card -->
        <div class="bg-white rounded-[16px] p-4 border relative overflow-hidden" style="border-color: rgba(210,196,180,0.2); box-shadow: 0px 4px 20px rgba(98,66,0,0.05);">
          <div class="absolute -right-4 -top-4 w-24 h-24 rounded-full" style="background: rgba(98,66,0,0.03);"></div>
          <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">VALOR TOTAL INVENTARIO</p>
          <p class="text-[32px] lg:text-[48px] font-bold leading-tight tracking-tight" style="font-family: 'Plus Jakarta Sans', sans-serif; color: #452d00;">
            {{ formatCurrencyTotal(summary.totalValue) }}
            <span class="text-base font-normal" style="color: #4f4539; font-family: 'Inter', sans-serif; margin-left: 0.25rem;">{{ currencySymbol }}</span>
          </p>
        </div>

        <!-- Low Stock Alert Card -->
        <div class="bg-white rounded-[16px] p-4 border-l-4 flex items-center justify-between" style="border-color: rgba(210,196,180,0.2); border-left-color: #d0a71f; box-shadow: 0px 4px 20px rgba(98,66,0,0.05);">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">STOCK BAJO</p>
            <p class="text-2xl font-bold" style="color: #0b1c30; font-family: 'Plus Jakarta Sans', sans-serif;">
              {{ summary.lowStock }}
              <span class="text-sm font-normal" style="color: #4f4539; font-family: 'Inter', sans-serif;">Productos</span>
            </p>
          </div>
          <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: rgba(208,167,31,0.1); color: #d0a71f;">
            <span class="material-icons-outlined" style="font-variation-settings: 'FILL' 1;">warning</span>
          </div>
        </div>

        <!-- Out of Stock Alert Card -->
        <div class="bg-white rounded-[16px] p-4 border-l-4 flex items-center justify-between" style="border-color: rgba(210,196,180,0.2); border-left-color: #ba1a1a; box-shadow: 0px 4px 20px rgba(98,66,0,0.05);">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">AGOTADOS</p>
            <p class="text-2xl font-bold" style="color: #0b1c30; font-family: 'Plus Jakarta Sans', sans-serif;">
              {{ summary.outOfStock }}
              <span class="text-sm font-normal" style="color: #4f4539; font-family: 'Inter', sans-serif;">Productos</span>
            </p>
          </div>
          <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background: #ffdad6; color: #93000a;">
            <span class="material-icons-outlined" style="font-variation-settings: 'FILL' 1;">error</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-navigation Tabs (shared component) -->
    <InventoryTabs />

    <!-- Filter/Sort Bar -->
    <div class="bg-white rounded-[16px] overflow-hidden" style="box-shadow: 0px 4px 20px rgba(98,66,0,0.05);">
      <div class="filter-bar-container p-4 border-b border-[#d2c4b4]/30 flex justify-between items-center" style="background: #ffffff;">
        <div class="flex gap-2">
          <button @click="showFilters = !showFilters"
            class="px-3 py-1.5 text-sm font-medium border border-[#d2c4b4] rounded-md flex items-center gap-1 hover:bg-[#eff4ff] transition-colors bg-white relative"
            :class="{ 'ring-2 ring-[rgba(98,66,0,0.2)] border-[#624200]': showFilters }"
            style="font-family: 'Inter', sans-serif; color: #4f4539;">
            <span class="material-icons-outlined" style="font-size: 1rem;">filter_list</span>
            Filtrar
          </button>
        </div>
        <div class="relative">
          <div class="flex items-center bg-white border border-[#d2c4b4] rounded-full px-4 py-1.5 focus-within:border-[#624200] focus-within:ring-2 focus-within:ring-[rgba(98,66,0,0.2)] transition-all">
            <span class="material-icons-outlined" style="color: #d2c4b4; margin-right: 0.5rem; font-size: 1rem;">search</span>
            <input v-model="searchQuery" @input="onSearchInput" type="text" placeholder="Buscar por producto o SKU..."
              class="bg-transparent border-none focus:ring-0 outline-none text-sm"
              style="font-family: 'Inter', sans-serif; color: #0b1c30;" />
          </div>
        </div>
      </div>

      <!-- Filter Panel -->
      <div v-if="showFilters" class="filter-panel-container px-4 py-4 border-b border-[#d2c4b4]/30" style="background: #faf9f6;">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Categoría</label>
            <select v-model="filters.category_id"
              class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all"
              style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;">
              <option value="">Todas las categorías</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <InventoryTable
        :data="inventoryItems"
        :loading="loading"
        :total="pagination.total"
        :current-page="pagination.currentPage"
        :per-page="perPage"
        empty-message="No hay productos en inventario"
        @page-change="changePage"
        @row-click="openDetail"
        @view-kardex="viewKardex"
      />
    </div>

    <!-- Product Detail Modal -->
    <Teleport to="body">
      <div v-if="selectedProduct" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="selectedProduct = null">
        <div class="bg-white rounded-2xl w-full max-w-lg mx-4 p-6" style="box-shadow: 0px 12px 48px rgba(98, 66, 0, 0.16);">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold" style="color: #0b1c30;">Detalle de Producto</h3>
            <button @click="selectedProduct = null" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors !cursor-pointer" style="border: none; background: transparent;">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>
          <div v-if="selectedProduct" class="space-y-4">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                <img v-if="selectedProduct.product?.images?.[0]" :src="selectedProduct.product.images[0]" class="w-full h-full object-cover" />
                <span v-else class="material-icons-outlined flex items-center justify-center w-full h-full" style="color: #d2c4b4; font-size: 28px;">inventory_2</span>
              </div>
              <div>
                <p class="font-bold text-lg" style="color: #0b1c30;">{{ selectedProduct.product_name }}</p>
                <p class="text-sm text-gray-500">SKU: {{ selectedProduct.product?.sku || selectedProduct.sku }}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 p-4 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Actual</p>
                <p class="text-xl font-bold" :class="selectedProduct.stock <= (selectedProduct.min_stock || 5) ? 'text-red-600' : 'text-green-600'">{{ selectedProduct.stock || 0 }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Mínimo</p>
                <p class="text-xl font-bold" style="color: #0b1c30;">{{ selectedProduct.min_stock || 0 }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Costo Compra</p>
                <p class="font-bold" style="color: #0b1c30;">{{ formatCurrencyTable(selectedProduct.purchase_price || selectedProduct.cost_price || selectedProduct.product?.cost_price || 0) }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio Venta</p>
                <p class="font-bold" style="color: #624200;">{{ formatCurrencyTable(selectedProduct.price || selectedProduct.product?.price || 0) }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor Total en Stock</p>
                <p class="text-xl font-bold" style="color: #452d00;">{{ formatCurrencyTable((selectedProduct.stock || 0) * (selectedProduct.price || selectedProduct.product?.price || 0)) }}</p>
              </div>
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button @click="viewKardexFromDetail()"
                class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2 !cursor-pointer"
                style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
                <span class="material-icons-outlined" style="font-size: 1.125rem;">history</span> Ver Kardex
              </button>
              <button @click="selectedProduct = null"
                class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2 !cursor-pointer"
                style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { inventoryAPI, categoriesAPI } from '../../api';
import { useCurrency } from '../../composables/useCurrency';
import { normalizeInventoryItems } from '../../utils';

const { format: formatCurrencyTotal, formatTable: formatCurrencyTable, currencySymbol } = useCurrency();

import InventoryTabs from '../../components/inventory/InventoryTabs.vue';
import InventoryTable from '../../components/inventory/InventoryTable.vue';

const router = useRouter();
const loading = ref(true);
const inventoryItems = ref([]);
const categories = ref([]);
const searchQuery = ref('');
const selectedProduct = ref(null);
const filters = reactive({ category_id: '' });
const showFilters = ref(false);
const perPage = ref(15);
const summary = reactive({ totalValue: 0, lowStock: 0, outOfStock: 0 });
const pagination = reactive({
  currentPage: 1,
  lastPage: 1,
  total: 0,
  from: 0,
  to: 0,
  pages: []
});

let searchTimer = null;

const onSearchInput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    pagination.currentPage = 1;
    fetchInventory();
  }, 300);
};

const changePage = (page) => {
  if (page < 1 || page > pagination.lastPage) return;
  pagination.currentPage = page;
  fetchInventory();
};

const buildPagination = (data) => {
  pagination.currentPage = data.current_page || data.page || 1;
  pagination.lastPage = data.last_page || data.totalPages || 1;
  pagination.total = data.total || 0;
  pagination.from = data.from || ((pagination.currentPage - 1) * 15) + 1;
  pagination.to = data.to || Math.min(pagination.currentPage * 15, pagination.total);

  // Build page buttons with ellipsis
  const pages = [];
  const total = pagination.lastPage;
  const current = pagination.currentPage;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }
  pagination.pages = pages;
};

const fetchInventory = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.currentPage,
      limit: 15
    };
    if (searchQuery.value) params.search = searchQuery.value;
    if (filters.category_id) params.category_id = filters.category_id;

    const res = await inventoryAPI.getAll(params);
    const data = res.data;

    if (Array.isArray(data)) {
      inventoryItems.value = normalizeInventoryItems(data);
    } else if (data?.data) {
      inventoryItems.value = normalizeInventoryItems(data.data);
      if (data.pagination) {
        buildPagination(data.pagination);
      } else {
        buildPagination(data);
      }
    } else {
      inventoryItems.value = [];
    }
  } catch (e) {
    console.error('Error fetching inventory:', e);
    inventoryItems.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchSummary = async () => {
  try {
    const res = await inventoryAPI.getSummary();
    const data = res.data;
    // Usamos totalValueRetail (stock * price) para que coincida con la columna "Valor Total" de la tabla
    summary.totalValue = data?.totalValueRetail ?? data?.total_value_retail ?? data?.totalValue ?? data?.total_value ?? 0;
    summary.lowStock = data?.lowStock ?? data?.low_stock ?? 0;
    summary.outOfStock = data?.outOfStock ?? data?.out_of_stock ?? 0;
  } catch (e) {
    console.error('Error fetching summary:', e);
  }
};

const fetchCategories = async () => {
  try {
    const res = await categoriesAPI.getAll();
    categories.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error('Error fetching categories:', e);
  }
};

const openDetail = (row) => {
  selectedProduct.value = row;
};

const viewKardexFromDetail = () => {
  if (selectedProduct.value) {
    const item = selectedProduct.value;
    selectedProduct.value = null;
    const productId = item.product?.id || item.product_id || item.id;
    router.push(`/app/inventory/kardex/${productId}`);
  }
};

const viewKardex = (item) => {
  const productId = item.product?.id || item.product_id || item.id;
  router.push(`/app/inventory/kardex/${productId}`);
};

onMounted(() => {
  fetchSummary();
  fetchInventory();
  fetchCategories();
});

onUnmounted(() => {
  clearTimeout(searchTimer);
});
</script>

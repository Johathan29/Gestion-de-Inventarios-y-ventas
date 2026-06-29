<template>
  <div>
    <!-- Header & Summary -->
    <div class="mb-6">
      <h1 class="text-2xl lg:text-[32px] font-bold tracking-tight" style="font-family: 'Plus Jakarta Sans', sans-serif; color: #452d00; line-height: 1.25; margin-bottom: 1rem;">Inventario</h1>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Total Value Card -->
        <div class="bg-white rounded-[16px] p-4 border relative overflow-hidden" style="border-color: rgba(210,196,180,0.2); box-shadow: 0px 4px 20px rgba(98,66,0,0.05);">
          <div class="absolute -right-4 -top-4 w-24 h-24 rounded-full" style="background: rgba(98,66,0,0.03);"></div>
          <p class="text-xs font-semibold uppercase tracking-wider mb-2" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">VALOR TOTAL INVENTARIO</p>
          <p class="text-[32px] lg:text-[48px] font-bold leading-tight tracking-tight" style="font-family: 'Plus Jakarta Sans', sans-serif; color: #452d00;">
            {{ formatCurrency(summary.totalValue) }}
            <span class="text-base font-normal" style="color: #4f4539; font-family: 'Inter', sans-serif; margin-left: 0.25rem;">COP</span>
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

    <!-- Toolbar -->
    <div class="flex flex-col md:flex-row justify-between gap-4 mb-4">
      <div class="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
        <div class="relative w-full sm:w-64">
          <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2" style="color: #4f4539; font-size: 20px;">search</span>
          <input v-model="searchQuery" @input="onSearchInput" type="text" placeholder="Buscar por producto o SKU..."
            class="w-full pl-10 pr-4 py-2 bg-white border rounded-lg text-sm transition-all"
            style="font-family: 'Inter', sans-serif; color: #0b1c30; border-color: #E5E7EB; border-width: 1.5px;"
            @focus="e => { e.currentTarget.style.borderColor = '#a17808'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(161,120,8,0.2)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div class="relative w-full sm:w-48">
          <select v-model="filters.category_id"
            class="w-full pl-3 pr-8 py-2 bg-white border rounded-lg text-sm appearance-none transition-all"
            style="font-family: 'Inter', sans-serif; color: #0b1c30; border-color: #E5E7EB; border-width: 1.5px;"
            @focus="e => { e.currentTarget.style.borderColor = '#a17808'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(161,120,8,0.2)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
            <option value="">Todas las categorías</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
          <span class="material-icons-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style="color: #4f4539; font-size: 20px;">arrow_drop_down</span>
        </div>
      </div>
      <button class="inline-flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors w-full md:w-auto"
        style="font-family: 'Inter', sans-serif; color: #452d00; border-color: #a17808; background: white;"
        @mouseenter="e => e.currentTarget.style.background = 'rgba(161,120,8,0.05)'"
        @mouseleave="e => e.currentTarget.style.background = ''">
        <span class="material-icons-outlined" style="font-size: 20px;">download</span>
        Exportar
      </button>
    </div>

    <!-- Inventory Table Card -->
    <Loading v-if="loading" />
    <div v-else class="bg-white rounded-[16px] overflow-hidden" style="box-shadow: 0px 4px 20px rgba(98,66,0,0.05);">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead style="background: #F9F7F2;">
            <tr>
              <th class="py-3 px-4 text-xs font-semibold uppercase tracking-wider" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">PRODUCTO</th>
              <th class="py-3 px-4 text-xs font-semibold uppercase tracking-wider" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">SKU</th>
              <th class="py-3 px-4 text-xs font-semibold uppercase tracking-wider" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">STOCK ACTUAL</th>
              <th class="py-3 px-4 text-xs font-semibold uppercase tracking-wider" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">STOCK MÍN.</th>
              <th class="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-right" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">PRECIO VENTA</th>
              <th class="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-right" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">VALOR TOTAL</th>
              <th class="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-center" style="font-family: 'Inter', sans-serif; color: #4f4539; line-height: 1; letter-spacing: 0.05em;">ACCIONES</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y" style="color: #0b1c30; font-family: 'Inter', sans-serif; border-color: #E5E7EB;">
            <tr v-for="item in inventoryItems" :key="item.id"
              class="transition-colors group"
              :class="{ 'opacity-60': item.stock === 0 }">
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded flex-shrink-0 overflow-hidden" style="background: #e5eeff;">
                    <img v-if="item.product?.images?.[0]" :src="item.product.images[0]" :alt="item.product.name"
                      class="w-full h-full object-cover"
                      :class="item.stock === 0 ? 'grayscale' : ''" />
                    <span v-else class="material-icons-outlined flex items-center justify-center w-full h-full" style="color: #d2c4b4; font-size: 20px;">inventory_2</span>
                  </div>
                  <span class="font-semibold line-clamp-2" style="color: #0b1c30;">{{ item.product?.name || item.name || '—' }}</span>
                </div>
              </td>
              <td class="py-3 px-4">
                <span class="text-xs px-2 py-1 rounded" style="font-family: 'JetBrains Mono', monospace; color: #4f4539; background: #eff4ff;">{{ item.product?.sku || item.sku || '—' }}</span>
              </td>
              <td class="py-3 px-4">
                <!-- Stock badge: green (good), amber (low), red (out) -->
                <span v-if="item.stock > 0 && item.stock >= (item.min_stock || 0)"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style="background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;">
                  <span class="w-1.5 h-1.5 rounded-full" style="background: #16a34a;"></span>
                  {{ item.stock }}
                </span>
                <span v-else-if="item.stock > 0 && item.stock < (item.min_stock || 5)"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style="background: rgba(253,202,92,0.2); color: #745b00; border: 1px solid rgba(253,202,92,0.3);">
                  <span class="w-1.5 h-1.5 rounded-full" style="background: #d0a71f;"></span>
                  {{ item.stock }}
                </span>
                <span v-else
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style="background: rgba(255,218,214,0.5); color: #ba1a1a; border: 1px solid #ffdad6;">
                  <span class="w-1.5 h-1.5 rounded-full" style="background: #ba1a1a;"></span>
                  0
                </span>
              </td>
              <td class="py-3 px-4" style="color: #4f4539;">{{ item.min_stock ?? '—' }}</td>
              <td class="py-3 px-4 text-right" style="font-family: 'JetBrains Mono', monospace;">{{ formatCurrency(item.price || item.product?.price || 0) }}</td>
              <td class="py-3 px-4 text-right font-semibold" style="font-family: 'JetBrains Mono', monospace; color: #452d00;">{{ formatCurrency((item.stock || 0) * (item.price || item.product?.price || 0)) }}</td>
              <td class="py-3 px-4 text-center">
                <button @click="viewKardex(item)"
                  class="p-1 rounded transition-colors"
                  style="color: #452d00;"
                  @mouseenter="e => { e.currentTarget.style.color = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; }"
                  @mouseleave="e => { e.currentTarget.style.color = '#452d00'; e.currentTarget.style.background = ''; }"
                  title="Ver Kardex">
                  <span class="material-icons-outlined" style="font-size: 20px;">history</span>
                </button>
              </td>
            </tr>
            <tr v-if="inventoryItems.length === 0">
              <td colspan="7" class="px-5 py-16 text-center">
                <span class="material-icons-outlined" style="font-size: 3rem; color: #d2c4b4; display: block; margin-bottom: 0.75rem;">warehouse</span>
                <p style="color: #4f4539; margin-bottom: 0.25rem;">No hay productos en inventario</p>
                <p style="font-size: 0.75rem; color: #4f4539;">Registra compras o ajustes para empezar</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-4 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style="border-color: #E5E7EB; background: #FDFBF7;">
        <p class="text-sm" style="color: #4f4539; font-family: 'Inter', sans-serif;">
          Mostrando <span class="font-semibold" style="color: #0b1c30;">{{ pagination.from }}-{{ pagination.to }}</span> de <span class="font-semibold" style="color: #0b1c30;">{{ pagination.total }}</span> resultados
        </p>
        <div class="flex items-center gap-2">
          <button @click="changePage(pagination.currentPage - 1)" :disabled="pagination.currentPage <= 1"
            class="p-1 rounded transition-colors" style="color: #4f4539;"
            @mouseenter="e => { if(!pagination.currentPage <= 1) e.currentTarget.style.background = '#eff4ff'; }"
            @mouseleave="e => e.currentTarget.style.background = ''">
            <span class="material-icons-outlined" style="font-size: 20px;">chevron_left</span>
          </button>
          <template v-for="page in pagination.pages" :key="page">
            <button v-if="page === '...'" class="px-2 text-sm" style="color: #4f4539;">...</button>
            <button v-else @click="changePage(page)"
              class="w-8 h-8 rounded text-sm font-semibold flex items-center justify-center transition-colors"
              :style="page === pagination.currentPage
                ? { background: '#624200', color: 'white' }
                : { color: '#4f4539' }"
              @mouseenter="e => { if(page !== pagination.currentPage) e.currentTarget.style.background = '#eff4ff'; }"
              @mouseleave="e => { if(page !== pagination.currentPage) e.currentTarget.style.background = ''; }">
              {{ page }}
            </button>
          </template>
          <button @click="changePage(pagination.currentPage + 1)" :disabled="pagination.currentPage >= pagination.lastPage"
            class="p-1 rounded transition-colors" style="color: #4f4539;"
            @mouseenter="e => { if(pagination.currentPage < pagination.lastPage) e.currentTarget.style.background = '#eff4ff'; }"
            @mouseleave="e => e.currentTarget.style.background = ''">
            <span class="material-icons-outlined" style="font-size: 20px;">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { inventoryAPI, categoriesAPI } from '../../api';
import { formatCurrency } from '../../utils';

import InventoryTabs from '../../components/inventory/InventoryTabs.vue';

const router = useRouter();
const loading = ref(true);
const inventoryItems = ref([]);
const categories = ref([]);
const searchQuery = ref('');
const filters = reactive({ category_id: '' });
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
  pagination.currentPage = data.current_page || 1;
  pagination.lastPage = data.last_page || 1;
  pagination.total = data.total || 0;
  pagination.from = data.from || 0;
  pagination.to = data.to || 0;

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
      inventoryItems.value = data;
    } else if (data?.data) {
      inventoryItems.value = data.data;
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
    summary.totalValue = data?.total_value || data?.totalValue || 0;
    summary.lowStock = data?.low_stock || data?.lowStock || 0;
    summary.outOfStock = data?.out_of_stock || data?.outOfStock || 0;
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

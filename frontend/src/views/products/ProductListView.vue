<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Productos</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ pagination.total || products.length }} producto{{ (pagination.total || products.length) !== 1 ? 's' : '' }} registrados
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Search -->
        <div class="relative">
          <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
          <input v-model="searchQuery" type="text" placeholder="Buscar productos..."
            class="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48 lg:w-64"
            @input="debouncedSearch" />
        </div>
        <button v-if="can('products', 'create')" @click="$router.push('/app/products/create')"
          class="btn-primary px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-primary-600 text-white font-medium text-sm hover:from-purple-700 hover:to-primary-700 transition-all duration-300 shadow-lg shadow-purple-600/20 flex items-center gap-2">
          <span class="material-icons-outlined text-lg">add</span>
          <span class="hidden sm:inline">Nuevo Producto</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="hidden md:block">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Loading v-if="loading" />
        <table v-else class="w-full">
          <thead>
            <tr class="bg-gray-50 dark:bg-gray-700/50">
              <th class="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Img</th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                  @click="toggleSort('name')">
                <span class="flex items-center gap-1">Nombre <span v-if="sortKey === 'name'" class="material-icons-outlined text-sm">{{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></span>
              </th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoría</th>
              <th class="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                  @click="toggleSort('price')">
                <span class="flex items-center justify-end gap-1">Precio <span v-if="sortKey === 'price'" class="material-icons-outlined text-sm">{{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></span>
              </th>
              <th class="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="prod in products" :key="prod.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
              @click="$router.push(`/app/products/${prod.id}`)">
              <td class="px-4 py-3">
                <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                  <img v-if="firstImage(prod)" :src="firstImage(prod)" :alt="prod.name"
                    class="w-full h-full object-cover"
                    @error="brokenImages[prod.id] = true" />
                  <span v-else class="material-icons-outlined text-gray-400 text-lg">inventory_2</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ prod.name }}</p>
                <p v-if="prod.brand" class="text-xs text-gray-400">{{ prod.brand }}</p>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{{ prod.sku }}</td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ prod.categories?.name || prod.category_name || '-' }}</td>
              <td class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">{{ formatCurrency(prod.price) }}</td>
              <td class="px-4 py-3 text-right">
                <span class="text-sm font-medium"
                  :class="stockClass(prod)">
                  {{ prod.stock ?? 0 }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="(prod.status === 'active' || prod.is_active)
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
                  {{ (prod.status === 'active' || prod.is_active) ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <button @click="$router.push(`/app/products/${prod.id}`)"
                    class="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
                    <span class="material-icons-outlined text-lg">visibility</span>
                  </button>
                  <button v-if="can('products', 'update')" @click="$router.push(`/app/products/${prod.id}/edit`)"
                    class="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
                    <span class="material-icons-outlined text-lg">edit</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="products.length === 0">
              <td colspan="8" class="px-5 py-16 text-center">
                <span class="material-icons-outlined text-5xl text-gray-300 dark:text-gray-600 block mb-3">inventory_2</span>
                <p class="text-gray-500 dark:text-gray-400 mb-1">No hay productos registrados</p>
                <p class="text-xs text-gray-400 mb-4">Crea tu primer producto para empezar a gestionar tu inventario</p>
                <button @click="$router.push('/app/products/create')"
                  class="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  + Crear producto
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Pagination -->
        <div v-if="totalPages > 1" class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p class="text-sm text-gray-500">
            Mostrando {{ ((currentPage - 1) * perPage) + 1 }} - {{ Math.min(currentPage * perPage, pagination.total) }} de {{ pagination.total }}
          </p>
          <div class="flex items-center gap-1">
            <button @click="changePage(currentPage - 1)" :disabled="currentPage <= 1"
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <span class="material-icons-outlined">chevron_left</span>
            </button>
            <span v-for="p in visiblePages" :key="p">
              <button v-if="p === '...'" disabled class="px-2 text-gray-400 text-sm">...</button>
              <button v-else @click="changePage(p)"
                class="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                :class="p === currentPage ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                {{ p }}
              </button>
            </span>
            <button @click="changePage(currentPage + 1)" :disabled="currentPage >= totalPages"
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <span class="material-icons-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Cards with Accordion -->
    <div class="md:hidden space-y-3">
      <Loading v-if="loading" />
      <template v-else>
        <div v-for="prod in products" :key="prod.id"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <!-- Card Header -->
          <div class="p-4 cursor-pointer" @click="toggleAccordion(prod.id)">
            <div class="flex items-start gap-3">
              <div class="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                <img v-if="firstImage(prod)" :src="firstImage(prod)" :alt="prod.name"
                  class="w-full h-full object-cover"
                  @error="brokenImages[prod.id] = true" />
                <span v-else class="material-icons-outlined text-gray-400">inventory_2</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ prod.name }}</p>
                  <span class="material-icons-outlined text-gray-400 text-lg transition-transform duration-300 shrink-0"
                    :class="{ 'rotate-180': accordionOpen === prod.id }">expand_more</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ prod.sku }}</p>
                <div class="flex items-center gap-3 mt-2">
                  <span class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(prod.price) }}</span>
                  <span class="text-xs font-medium"
                    :class="stockClass(prod)">
                    {{ prod.stock ?? 0 }} en stock
                  </span>
                  <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
                    :class="(prod.status === 'active' || prod.is_active)
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
                    {{ (prod.status === 'active' || prod.is_active) ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <!-- Accordion Detail -->
          <div v-show="accordionOpen === prod.id"
            class="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
            <div class="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Categoría</p>
                <p class="font-medium text-gray-900 dark:text-white">{{ prod.categories?.name || prod.category_name || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Marca</p>
                <p class="font-medium text-gray-900 dark:text-white">{{ prod.brand || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Stock Mínimo</p>
                <p class="font-medium text-gray-900 dark:text-white">{{ prod.min_stock ?? 0 }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Unidad</p>
                <p class="font-medium text-gray-900 dark:text-white">{{ prod.unit || 'unidad' }}</p>
              </div>
              <div v-if="prod.cost_price" class="col-span-2">
                <p class="text-xs text-gray-500 dark:text-gray-400">Costo</p>
                <p class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(prod.cost_price) }}</p>
              </div>
            </div>
            <div v-if="prod.description" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <p class="text-xs text-gray-500 mb-1">Descripción</p>
              <p>{{ prod.description }}</p>
            </div>
            <div class="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button @click="$router.push(`/app/products/${prod.id}`)"
                class="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-all">
                Ver detalle
              </button>
              <button v-if="can('products', 'update')" @click="$router.push(`/app/products/${prod.id}/edit`)"
                class="flex-1 px-3 py-2 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                Editar
              </button>
            </div>
          </div>
        </div>
        <div v-if="products.length === 0" class="text-center py-12">
          <span class="material-icons-outlined text-5xl text-gray-300 dark:text-gray-600 block mb-3">inventory_2</span>
          <p class="text-gray-500 dark:text-gray-400">No hay productos registrados</p>
        </div>
        <!-- Mobile Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between px-2 py-3">
          <button @click="changePage(currentPage - 1)" :disabled="currentPage <= 1"
            class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
            Anterior
          </button>
          <span class="text-sm text-gray-500">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button @click="changePage(currentPage + 1)" :disabled="currentPage >= totalPages"
            class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
            Siguiente
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { productsAPI } from '../../api';
import { useAuth } from '../../composables/useAuth';
import Loading from '../../components/shared/Loading.vue';
import { formatCurrency } from '../../utils';

const router = useRouter();
const { can } = useAuth();
const products = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const currentPage = ref(1);
const perPage = ref(10);
const sortKey = ref('');
const sortDir = ref('asc');
const accordionOpen = ref(null);
const pagination = ref({ total: 0, totalPages: 1 });
const brokenImages = reactive({});

const totalPages = computed(() => pagination.value.totalPages || 1);

const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }
  return pages;
});

const firstImage = (prod) => {
  if (!prod.images) return null;
  if (brokenImages[prod.id]) return null;
  if (Array.isArray(prod.images) && prod.images.length > 0) return prod.images[0];
  if (typeof prod.images === 'string') return prod.images;
  return null;
};

const stockClass = (prod) => {
  const stock = prod.stock ?? 0;
  const min = prod.min_stock ?? 5;
  if (stock <= 0) return 'text-red-600 dark:text-red-400';
  if (stock <= min) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
};

const toggleAccordion = (id) => {
  accordionOpen.value = accordionOpen.value === id ? null : id;
};

const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
  fetchProducts();
};

const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchProducts();
};

let debounceTimer = null;
const debouncedSearch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchProducts();
  }, 400);
};

const fetchProducts = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: perPage.value,
      search: searchQuery.value || undefined,
      sort_by: sortKey.value || undefined,
      sort_order: sortDir.value || undefined
    };
    const res = await productsAPI.getAll(params);
    // After interceptor unwrap: res.data = products array, res.pagination = { total, totalPages, ... }
    products.value = Array.isArray(res.data) ? res.data : [];
    if (res.pagination) {
      pagination.value = res.pagination;
    }
  } catch (e) {
    console.error('Error fetching products:', e);
    products.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(fetchProducts);
</script>

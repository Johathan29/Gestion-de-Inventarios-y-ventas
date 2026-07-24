<template>
  <InventorySkeleton v-if="loading" />
  <div v-else class="px-gutter">
    <!-- Header & Summary -->
    <div class="mb-6">
      <!-- Inventory Header -->
      <div
        class="mesh-gradient-header"
        style="
          background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
        "
      >
        <div class="header-icon-container">
          <span class="material-symbols-outlined animate-header-icon"> inventory </span>
        </div>
        <div class="header-glass">
          <div class="header-information">
            <PageHeader
              title="Inventario"
              tag="h1"
              :description="`${pagination.total || inventoryItems.length} producto${
                (pagination.total || inventoryItems.length) !== 1 ? 's' : ''
              } en inventario`"
            />
          </div>
          <div class="header-actions">
            <button class="aurora-header-button aurora-header-button-secondary">
              <span class="material-symbols-outlined"> download </span>
              Exportar
            </button>
          </div>
        </div>
      </div>

      <!-- Summary Cards — Dashboard style with counter animation -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <StatCard
          label="Valor Total Inventario"
          :value="summary.totalValue"
          type="currency"
          icon="inventory_2"
          iconColor="#7c3aed"
          variant="dashboard"
          :stagger-delay="0"
          :animate="true"
        />
        <StatCard
          label="Stock Bajo"
          :value="summary.lowStock"
          icon="warning"
          iconColor="#d97706"
          subtext="Productos por debajo del mínimo"
          variant="dashboard"
          :stagger-delay="100"
          :animate="true"
        />
        <StatCard
          label="Agotados"
          :value="summary.outOfStock"
          icon="error"
          iconColor="#dc2626"
          subtext="Productos sin stock"
          variant="dashboard"
          :stagger-delay="200"
          :animate="true"
        />
        <StatCard
          label="Pendientes de Verificación"
          :value="summary.pending"
          icon="fact_check"
          iconColor="#d97706"
          subtext="Productos por verificar"
          variant="dashboard"
          :stagger-delay="300"
          :animate="true"
        />
      </div>
    </div>

    <!-- Sub-navigation Tabs (shared component) -->
    <InventoryTabs />

    <!-- Filter/Sort Bar -->
    <div class="aurora-raised-card !p-0 overflow-hidden">
      <div
        class="flex flex-col p-4 sm:flex-row justify-between items-stretch sm:items-center gap-gutter "
        style="border-color: var(--aurora-outline-variant)"
      >
        <div class="flex gap-2" >
          <button
            @click="showFilters = !showFilters"
            class="border !px-3 !py-1.5 flex items-center gap-1 border-[var(--aurora-outline-variant)] hover:!bg-[#9161f4] hover:text-white transition-colors duration-200 rounded-md text-[#9161f4] bg-white"
            :class="{ 'aurora-pressed': showFilters }"
            style="padding: 8px 12px; font-size: 0.8rem"
          >
            <span class="material-symbols-outlined" style="font-size: 1rem">filter_list</span>
            Filtrar
          </button>
        </div>
        <div class="relative w-full sm:w-auto">
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            type="text"
            placeholder="Buscar por producto o SKU..."
            class="aurora-search w-full"
          />
        </div>
      </div>

      <!-- Filter Panel -->
      <div
        v-if="showFilters"
        class="p-4 border-b"
        style="
          background: var(--aurora-surface-container);
          border-color: var(--aurora-outline-variant);
        "
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-xs text-on-surface-variant">Categoría</label>
            <select v-model="filters.category_id" class="aurora-select">
              <option value="">Todas las categorías</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium text-xs text-on-surface-variant">Estado</label>
            <select v-model="filters.status" class="aurora-select">
              <option value="">Todos los estados</option>
              <option value="available">Disponible</option>
              <option value="pending">Pendiente</option>
              <option value="blocked">Bloqueado</option>
              <option value="not_available">No Disponible</option>
              <option value="in_review">En Revisión</option>
              <option value="not_available_for_sales">No Disponible para Ventas</option>
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
        @row-click="goToProductDetail"
        @view-kardex="viewKardex"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, watch, onMounted, onUnmounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { inventoryAPI, categoriesAPI } from '../../api';
  import { normalizeInventoryItems } from '../../utils';
  import PageHeader from '../../components/shared/PageHeader.vue';
  import StatCard from '../../components/shared/StatCard.vue';
  import { useCurrency } from '../../composables/useCurrency';

  const {
    format: formatCurrencyTotal,
    formatTable: formatCurrencyTable,
    currencySymbol
  } = useCurrency();

  import InventoryTabs from '../../components/inventory/InventoryTabs.vue';
  import InventoryTable from '../../components/inventory/InventoryTable.vue';
  import InventorySkeleton from '../../components/skeletons/InventorySkeleton.vue';

  const router = useRouter();
  const loading = ref(true);
  const inventoryItems = ref([]);
  const categories = ref([]);
  const searchQuery = ref('');
  const filters = reactive({ category_id: '', status: '' });
  const showFilters = ref(false);
  const perPage = ref(10);
  const summary = reactive({ totalValue: 0, lowStock: 0, outOfStock: 0, pending: 0 });
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
    pagination.from = data.from || (pagination.currentPage - 1) * 10 + 1;
    pagination.to = data.to || Math.min(pagination.currentPage * 10, pagination.total);

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
        limit: 10
      };
      if (searchQuery.value) params.search = searchQuery.value;
      if (filters.category_id) params.categoryId = filters.category_id;
      if (filters.status) params.status = filters.status;

      const res = await inventoryAPI.getAll(params);
      const data = res.data;

      if (Array.isArray(data)) {
        inventoryItems.value = normalizeInventoryItems(data);
        // El interceptor de axios extrae la paginación a res.pagination
        if (res.pagination) {
          buildPagination(res.pagination);
        }
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
      summary.totalValue =
        data?.totalValueRetail ??
        data?.total_value_retail ??
        data?.totalValue ??
        data?.total_value ??
        0;
      summary.lowStock = data?.lowStock ?? data?.low_stock ?? 0;
      summary.outOfStock = data?.outOfStock ?? data?.out_of_stock ?? 0;
      summary.pending = data?.pending ?? 0;
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

  const goToProductDetail = (row) => {
    const productId = row.product?.id || row.product_id || row.id;
    router.push(`/app/inventory/product/${productId}`);
  };

  const viewKardex = (item) => {
    const productId = item.product?.id || item.product_id || item.id;
    router.push(`/app/inventory/kardex/${productId}`);
  };

  // Watch para detectar cambio en los filtros
  watch(
    () => filters.category_id,
    () => {
      pagination.currentPage = 1;
      fetchInventory();
    }
  );

  watch(
    () => filters.status,
    () => {
      pagination.currentPage = 1;
      fetchInventory();
    }
  );

  onMounted(() => {
    fetchSummary();
    fetchInventory();
    fetchCategories();
  });

  onUnmounted(() => {
    clearTimeout(searchTimer);
  });
</script>

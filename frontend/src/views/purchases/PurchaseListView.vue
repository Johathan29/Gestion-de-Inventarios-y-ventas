<template>
  <div class="space-y-6 aurora-entrance">
    <!-- Header -->
    
      <div
        class="mesh-gradient-header "
        style="
          background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
        "
      >
        <div class="header-icon-container">
          <span class="material-symbols-outlined animate-header-icon"> shopping_cart </span>
        </div>
        <div class="header-glass">
          <div class="header-information">
            <PageHeader
              title="Compras"
              description="Lista de compras registradas en el sistema"
              tag="h1"
            />
          </div>
          <div class="header-actions">
            <button
              v-if="can('purchases', 'create')"
              @click="$router.push('/app/purchases/create')"
              class="aurora-header-button aurora-header-button-primary"
            >
              <span class="material-symbols-outlined"> add </span>
              Nueva Compra
            </button>
          </div>
        </div>
      </div>
   

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="aurora-stat-card">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="aurora-badge aurora-badge-primary mb-2">Total Compras</p>
            <h3 class="text-[28px] font-bold leading-none text-on-surface">{{ summary.total }}</h3>
          </div>
          <div class="aurora-btn-icon">
            <span class="material-symbols-outlined" style="color: var(--aurora-primary); font-variation-settings: 'FILL' 1;">receipt_long</span>
          </div>
        </div>
        <p class="text-xs text-on-surface-variant">Total de compras registradas</p>
      </div>
      <div class="aurora-stat-card">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="aurora-badge aurora-badge-warning mb-2">Pendientes</p>
            <h3 class="text-[28px] font-bold leading-none text-on-surface">{{ summary.pending }}</h3>
          </div>
          <div class="aurora-btn-icon">
            <span class="material-symbols-outlined" style="color: var(--aurora-primary); font-variation-settings: 'FILL' 1;">pending</span>
          </div>
        </div>
        <p class="text-xs text-on-surface-variant">Órdenes pendientes por recibir</p>
      </div>
      <div class="aurora-stat-card">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="aurora-badge aurora-badge-success mb-2">Este Mes</p>
            <h3 class="text-[28px] font-bold leading-none text-on-surface">{{ summary.monthTotal }}</h3>
          </div>
          <div class="aurora-btn-icon">
            <span class="material-symbols-outlined" style="color: var(--aurora-primary); font-variation-settings: 'FILL' 1;">calendar_month</span>
          </div>
        </div>
        <p class="text-xs text-on-surface-variant">Compras realizadas en el mes</p>
      </div>
    </div>

    <!-- Search + Filters Bar -->
    <div class="aurora-raised-card">
      <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div class="flex-1 w-full sm:max-w-xs">
          <div class="aurora-search">
            <span class="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar compras..."
              class="flex-1 bg-transparent border-none outline-none text-sm py-2"
              style="color: var(--aurora-on-surface);"
              @input="debouncedSearch"
            />
          </div>
        </div>
        <button
          class="aurora-btn-secondary"
          style="padding: 8px 16px; font-size: 0.8rem;"
          @click="showFilters = !showFilters"
        >
          <span class="material-symbols-outlined text-[16px]">filter_list</span>
          Filtrar
          <span v-if="activeFilterCount" class="ml-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style="background: var(--aurora-primary); color: white;">{{ activeFilterCount }}</span>
        </button>
        <button
          v-if="activeFilterCount"
          class="aurora-btn-secondary"
          style="padding: 8px 16px; font-size: 0.8rem;"
          @click="clearFilters"
        >
          <span class="material-symbols-outlined text-[16px]">clear</span>
          Limpiar
        </button>
      </div>

      <!-- Filter Panel -->
      <div v-if="showFilters" class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style="border-top: 1px solid var(--aurora-outline-variant);">
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--aurora-on-surface-variant);">Proveedor</label>
          <select v-model="filters.supplier_id" class="aurora-select">
            <option value="">Todos</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--aurora-on-surface-variant);">Estado</label>
          <select v-model="filters.status" class="aurora-select">
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="received">Recibida</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: var(--aurora-on-surface-variant);">Verificación</label>
          <select v-model="filters.verification_status" class="aurora-select">
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="in_review">En Revisión</option>
            <option value="verified">Verificada</option>
            <option value="rejected">Rechazada</option>
          </select>
        </div>
        <div class="flex gap-2">
          <div class="flex-1">
            <label class="block text-xs font-semibold mb-1.5" style="color: var(--aurora-on-surface-variant);">Fecha Desde</label>
            <input v-model="filters.from_date" type="date" class="aurora-select" />
          </div>
          <div class="flex-1">
            <label class="block text-xs font-semibold mb-1.5" style="color: var(--aurora-on-surface-variant);">Fecha Hasta</label>
            <input v-model="filters.to_date" type="date" class="aurora-select" />
          </div>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="aurora-raised-card !p-0 overflow-hidden">
      <DataTable
        :columns="columns"
        :data="purchases"
        title="Lista de Compras"
        :server-pagination="true"
        :total="total"
        :current-page-prop="page"
        :per-page="limit"
        @page-change="changePage"
        @rowClick="goToDetail"
      >
        <template #cell-status="{ row }">
          <span
            class="aurora-badge"
            :class="
              row.status === 'received'
                ? 'aurora-badge-success'
                : row.status === 'cancelled'
                  ? 'aurora-badge-danger'
                  : 'aurora-badge-warning'
            "
          >
            {{
              row.status === 'received'
                ? 'Recibida'
                : row.status === 'cancelled'
                  ? 'Cancelada'
                  : 'Pendiente'
            }}
          </span>
        </template>
        <template #cell-verification_status="{ row }">
          <span
            v-if="row.verification_status"
            class="aurora-badge"
            :class="{
              'aurora-badge-success': row.verification_status === 'verified',
              'aurora-badge-warning': row.verification_status === 'pending',
              '': row.verification_status === 'in_review',
              'aurora-badge-danger': row.verification_status === 'rejected'
            }"
            :style="row.verification_status === 'in_review' ? 'background: rgba(139,92,246,0.12); color: var(--aurora-primary);' : ''"
          >
            <span class="w-1.5 h-1.5 rounded-full inline-block mr-1"
              :class="{
                'bg-green-500': row.verification_status === 'verified',
                'bg-yellow-500': row.verification_status === 'pending',
                'bg-purple-500': row.verification_status === 'in_review',
                'bg-red-500': row.verification_status === 'rejected'
              }"
            ></span>
            {{
              row.verification_status === 'verified'
                ? 'Verificada'
                : row.verification_status === 'pending'
                  ? 'Pendiente'
                  : row.verification_status === 'in_review'
                    ? 'En Revisión'
                    : 'Rechazada'
            }}
          </span>
          <span v-else class="text-on-surface-variant text-xs">—</span>
        </template>
      </DataTable>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-3 px-0 pb-4">
      <div
        v-for="purchase in purchases"
        :key="purchase.id"
        class="aurora-raised-card cursor-pointer"
        @click="goToDetail(purchase)"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="font-mono text-sm font-semibold text-on-surface">#{{ purchase.purchase_number || 'N/A' }}</span>
          <div class="flex items-center gap-2">
            <span
              v-if="purchase.verification_status"
              class="aurora-badge"
              :class="{
                'aurora-badge-success': purchase.verification_status === 'verified',
                'aurora-badge-warning': purchase.verification_status === 'pending',
                '': purchase.verification_status === 'in_review',
                'aurora-badge-danger': purchase.verification_status === 'rejected'
              }"
              :style="purchase.verification_status === 'in_review' ? 'background: rgba(139,92,246,0.12); color: var(--aurora-primary);' : ''"
            >
              <span class="w-1.5 h-1.5 rounded-full inline-block mr-1"
                :class="{
                  'bg-green-500': purchase.verification_status === 'verified',
                  'bg-yellow-500': purchase.verification_status === 'pending',
                  'bg-purple-500': purchase.verification_status === 'in_review',
                  'bg-red-500': purchase.verification_status === 'rejected'
                }"
              ></span>
              {{
                purchase.verification_status === 'verified'
                  ? 'Verificada'
                  : purchase.verification_status === 'pending'
                    ? 'Pendiente'
                    : purchase.verification_status === 'in_review'
                      ? 'En Revisión'
                      : 'Rechazada'
              }}
            </span>
            <span
              class="aurora-badge"
              :class="
                purchase.status === 'received'
                  ? 'aurora-badge-success'
                  : purchase.status === 'cancelled'
                    ? 'aurora-badge-danger'
                    : 'aurora-badge-warning'
              "
            >
              {{
                purchase.status === 'received'
                  ? 'Recibida'
                  : purchase.status === 'cancelled'
                    ? 'Cancelada'
                    : 'Pendiente'
              }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase"
            style="background: rgba(139, 92, 246, 0.12); color: var(--aurora-primary);"
          >
            {{ (purchase.suppliers?.name || '?').charAt(0) }}
          </div>
          <div>
            <p class="font-medium text-sm text-on-surface">{{ purchase.suppliers?.name || '—' }}</p>
            <p class="text-xs text-on-surface-variant">{{ formatDate(purchase.created_at) }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between pt-2" style="border-top: 1px solid var(--aurora-outline-variant);">
          <span class="text-xs text-on-surface-variant">Total</span>
          <span class="text-sm font-semibold font-mono" style="color: var(--aurora-primary);">{{ formatTable(purchase.total) }}</span>
        </div>
      </div>
      <div
        v-if="purchases.length === 0"
        class="flex flex-col items-center justify-center py-10 text-center"
      >
        <span class="material-icons-outlined mb-2" style="font-size: 48px; color: var(--aurora-outline);">shopping_cart</span>
        <p class="text-on-surface-variant">No hay compras registradas</p>
      </div>
    </div>
  </div>
</template>

<script setup>
  import PageHeader from '../../components/shared/PageHeader.vue';
  import { ref, reactive, computed, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { purchasesAPI, suppliersAPI } from '../../api';
  import { useAuth } from '../../composables/useAuth';
  import DataTable from '../../components/shared/DataTable.vue';
  import { formatDate } from '../../utils';
  import { useCurrency } from '../../composables/useCurrency';

  const { formatTable } = useCurrency();
  const router = useRouter();
  const { can } = useAuth();

  const purchases = ref([]);
  const suppliers = ref([]);
  const page = ref(1);
  const limit = 15;
  const total = ref(0);
  const showFilters = ref(false);
  const searchQuery = ref('');
  let searchTimer = null;

  const filters = reactive({
    supplier_id: '',
    status: '',
    verification_status: '',
    from_date: '',
    to_date: ''
  });

  const summary = reactive({
    total: 0,
    pending: 0,
    monthTotal: 0
  });

  const columns = [
    { key: 'purchase_number', label: 'Orden', sortable: true },
    { key: 'suppliers.name', label: 'Proveedor' },
    { key: 'total', label: 'Total', type: 'currency', sortable: true },
    { key: 'status', label: 'Estado', type: 'custom' },
    { key: 'verification_status', label: 'Verificación', type: 'custom' },
    { key: 'created_at', label: 'Fecha', type: 'datetime', sortable: true }
  ];

  const activeFilterCount = computed(() => {
    let count = 0;
    if (filters.supplier_id) count++;
    if (filters.status) count++;
    if (filters.verification_status) count++;
    if (filters.from_date) count++;
    if (filters.to_date) count++;
    if (searchQuery.value) count++;
    return count;
  });

  const goToDetail = (row) => router.push(`/app/purchases/${row.id}`);

  const changePage = (p) => {
    page.value = p;
    fetchPurchases();
  };

  const clearFilters = () => {
    filters.supplier_id = '';
    filters.status = '';
    filters.verification_status = '';
    filters.from_date = '';
    filters.to_date = '';
    searchQuery.value = '';
    page.value = 1;
    fetchPurchases();
  };

  const debouncedSearch = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page.value = 1;
      fetchPurchases();
    }, 400);
  };

  const fetchPurchases = async () => {
    try {
      const params = {
        page: page.value,
        limit,
        ...(filters.supplier_id && { supplier_id: filters.supplier_id }),
        ...(filters.status && { status: filters.status }),
        ...(filters.verification_status && { verification_status: filters.verification_status }),
        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date }),
        ...(searchQuery.value && { search: searchQuery.value })
      };
      const res = await purchasesAPI.getAll(params);
      purchases.value = res.data || [];
      total.value = res.pagination?.total || 0;
    } catch (e) {
      /* ignore */
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await suppliersAPI.getAll({ limit: 999 });
      suppliers.value = res.data || [];
    } catch (e) {
      /* ignore */
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await purchasesAPI.getAll({ limit: 1 });
      const totalCount = res.pagination?.total || 0;

      // Pending count
      const pendingRes = await purchasesAPI.getAll({ limit: 1, status: 'pending' });
      const pendingCount = pendingRes.pagination?.total || 0;

      // Month count
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthRes = await purchasesAPI.getAll({ limit: 1, from_date: startOfMonth });
      const monthCount = monthRes.pagination?.total || 0;

      summary.total = totalCount;
      summary.pending = pendingCount;
      summary.monthTotal = monthCount;
    } catch (e) {
      /* ignore */
    }
  };

  onMounted(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchSummary();
  });
</script>

<template>
  <div class="px-gutter">
    <!-- Page Header -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> people </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Clientes"
            :description="`${total} cliente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <div class="header-search-wrapper">
            <input
              v-model="searchQuery"
              @input="debouncedSearch"
              type="text"
              placeholder="Buscar cliente..."
              class="aurora-header-search"
            />
            <span class="material-symbols-outlined header-search-icon"> search </span>
          </div>
          <button @click="openCreate" class="aurora-header-button aurora-header-button-primary">
            <span class="material-symbols-outlined"> person_add </span>
            Nuevo Cliente
          </button>
        </div>
      </div>
    </div>

    <!-- Filters + Actions -->
    <div class="flex flex-wrap items-center justify-between gap-gutter mb-6">
      <div class="flex items-center gap-gutter flex-1 min-w-[200px]">
        <div class="relative flex-1 max-w-xs">
        </div>
      </div>
    </div>

    <div class="aurora-raised-card !p-0 overflow-hidden">
      <DataTable :columns="columns" :data="clients" title="Clientes" :server-pagination="true" :total="total" :current-page-prop="page" :per-page="limit" @page-change="changePage" @row-click="goToDetail">
        <template #cell-status="{ row }">
          <span class="aurora-badge" :class="row.is_active !== false ? 'aurora-badge-success' : ''" :style="row.is_active === false ? 'background: var(--aurora-surface-container); color: var(--aurora-on-surface-variant);' : ''">
            {{ row.is_active !== false ? 'Activo' : 'Inactivo' }}
          </span>
        </template>
      </DataTable>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-3 px-0 mt-4">
      <div v-for="client in clients" :key="client.id"
           class="aurora-raised-card cursor-pointer"
           @click="goToDetail(client)">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase shrink-0" style="background: rgba(139,92,246,0.12); color: var(--aurora-primary);">
            {{ (client.name || '?').charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold truncate text-sm text-on-surface">{{ client.name || '—' }}</p>
            <p v-if="client.email" class="text-xs truncate text-on-surface-variant">{{ client.email }}</p>
          </div>
          <span class="aurora-badge shrink-0" :class="client.is_active !== false ? 'aurora-badge-success' : ''" :style="client.is_active === false ? 'background: var(--aurora-surface-container); color: var(--aurora-on-surface-variant);' : ''">
            {{ client.is_active !== false ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div v-if="client.document_id">
            <span class="text-xs text-on-surface-variant">Documento</span>
            <p class="font-medium text-on-surface">{{ client.document_id }}</p>
          </div>
          <div v-if="client.phone">
            <span class="text-xs text-on-surface-variant">Teléfono</span>
            <p class="font-medium text-on-surface">{{ client.phone }}</p>
          </div>
        </div>
      </div>
      <div v-if="clients.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
        <span class="material-icons-outlined mb-2" style="font-size: 48px; color: var(--aurora-outline);">people</span>
        <p class="text-on-surface-variant">No hay clientes registrados</p>
      </div>
    </div>

    <!-- Client Form Modal -->
    <ClientFormModal :visible="showFormModal" :client="editingClient" @close="closeFormModal" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { clientsAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';
import PageHeader from '../../components/shared/PageHeader.vue';
import ClientFormModal from '../../components/clients/ClientFormModal.vue';

const router = useRouter();
const clients = ref([]);
const page = ref(1);
const limit = 15;
const total = ref(0);
const searchQuery = ref('');
const showFormModal = ref(false);
const editingClient = ref(null);
let searchTimeout = null;

const columns = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'document_id', label: 'Documento' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'status', label: 'Estado', type: 'custom' }
];

const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchClients();
  }, 400);
};

const openCreate = () => {
  editingClient.value = null;
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
  editingClient.value = null;
};

const onSaved = () => {
  fetchClients();
};

const goToDetail = (row) => router.push(`/app/clients/${row.id}`);

const changePage = (p) => { page.value = p; fetchClients(); };

const fetchClients = async () => {
  try {
    const params = { page: page.value, limit };
    if (searchQuery.value) params.search = searchQuery.value;
    const res = await clientsAPI.getAll(params);
    clients.value = res.data || [];
    total.value = res.pagination?.total || 0;
  }
  catch (e) { /* ignore */ }
};

onMounted(fetchClients);
</script>

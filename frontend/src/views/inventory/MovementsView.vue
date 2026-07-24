<template>
  <InventoryMovementsSkeleton v-if="loading" />
  <div v-else>
    <InventoryTabs />
    <div>
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
      <div
        class="mesh-gradient-header"
        style="
          background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
        "
      >
        <div class="header-icon-container">
          <span class="material-symbols-outlined animate-header-icon"> swap_horiz </span>
        </div>
        <div class="header-glass">
          <div class="header-information">
            <PageHeader
              title="Movimientos de Inventario"
              description="Movimientos registrados en el sistema"
              tag="h1"
            />
          </div>
          <div class="header-actions">
            <select v-model="typeFilter" @change="fetchMovements" class="w-full sm:w-48">
              <option value="">Todos los tipos</option>
              <option value="entry">Entrada</option>
              <option value="exit">Salida</option>
              <option value="adjustment">Ajuste</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    <DataTable :columns="columns" :data="movements" :server-pagination="true" :total="total" :current-page-prop="page" :per-page="limit" @page-change="changePage" @rowClick="openDetail">
      <template #cell-type="{ row }">
        <span class="dt-badge" :class="row.type === 'entry' ? 'dt-badge-success' : row.type === 'exit' ? 'dt-badge-danger' : row.type === 'adjustment' ? 'dt-badge-warning' : 'dt-badge-info'">
          {{ row.type === 'entry' ? 'Entrada' : row.type === 'exit' ? 'Salida' : row.type === 'adjustment' ? 'Ajuste' : 'Transferencia' }}
        </span>
      </template>
      <template #cell-product_id="{ row }">
        <span class="font-mono text-xs" style="color: #624200;">#{{ row.product_id }}</span>
      </template>
    </DataTable>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-4">
      <div v-for="mov in movements" :key="mov.id"
           class="dt-card-sm p-4 cursor-pointer dt-shadow-hover"
           @click="openDetail(mov)">
        <div class="flex items-center justify-between mb-2">
          <span class="font-mono text-xs" style="color: #624200;">#{{ mov.product_id }}</span>
          <span class="dt-badge" :class="mov.type === 'entry' ? 'dt-badge-success' : mov.type === 'exit' ? 'dt-badge-danger' : mov.type === 'adjustment' ? 'dt-badge-warning' : 'dt-badge-info'">
            {{ mov.type === 'entry' ? 'Entrada' : mov.type === 'exit' ? 'Salida' : mov.type === 'adjustment' ? 'Ajuste' : 'Transferencia' }}
          </span>
        </div>
        <p class="font-medium text-sm mb-2" style="color: #0b1c30;">{{ mov.product_name || '—' }}</p>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span class="text-xs opacity-60" style="color: #4f4539;">Cantidad</span>
            <p class="font-bold" :class="mov.type === 'entry' ? 'text-green-600' : 'text-red-600'">
              {{ mov.type === 'entry' ? '+' : '-' }}{{ mov.quantity }}
            </p>
          </div>
          <div>
            <span class="text-xs opacity-60" style="color: #4f4539;">Referencia</span>
            <p class="font-medium truncate" style="color: #0b1c30;">{{ mov.reference || '—' }}</p>
          </div>
          <div class="col-span-2">
            <span class="text-xs opacity-60" style="color: #4f4539;">Fecha</span>
            <p style="color: #4f4539;">{{ formatDateTime(mov.created_at) }}</p>
          </div>
        </div>
      </div>
      <div v-if="movements.length === 0" class="dt-empty-state py-8">
        <span class="dt-empty-icon material-icons-outlined">swap_horiz</span>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif;">No hay movimientos registrados</p>
      </div>
    </div>

    <!-- Movement Detail Modal -->
    <Teleport to="body">
      <div v-if="selectedMovement" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="selectedMovement = null">
        <div class="bg-white rounded-2xl w-full max-w-lg mx-4 p-6" style="box-shadow: 0px 12px 48px rgba(98, 66, 0, 0.16);">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold" style="color: #0b1c30;">Detalle de Movimiento</h3>
            <button @click="selectedMovement = null" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors !cursor-pointer" style="border: none; background: transparent;">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto ID</p>
                <p class="font-mono font-medium" style="color: #0b1c30;">#{{ selectedMovement.product_id || '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</p>
                <p class="font-medium" style="color: #0b1c30;">{{ selectedMovement.product_name || '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</p>
                <span class="dt-badge" :class="selectedMovement.type === 'entry' ? 'dt-badge-success' : selectedMovement.type === 'exit' ? 'dt-badge-danger' : selectedMovement.type === 'adjustment' ? 'dt-badge-warning' : 'dt-badge-info'">
                  {{ selectedMovement.type === 'entry' ? 'Entrada' : selectedMovement.type === 'exit' ? 'Salida' : selectedMovement.type === 'adjustment' ? 'Ajuste' : 'Transferencia' }}
                </span>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad</p>
                <p class="font-bold text-lg" :class="selectedMovement.type === 'entry' ? 'text-green-600' : 'text-red-600'">
                  {{ selectedMovement.type === 'entry' ? '+' : '-' }}{{ selectedMovement.quantity }}
                </p>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Referencia</p>
                <p style="color: #4f4539;">{{ selectedMovement.reference || '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</p>
                <p style="color: #4f4539;">{{ formatDateTime(selectedMovement.created_at) }}</p>
              </div>
            </div>
            <div v-if="selectedMovement.notes">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notas</p>
              <p class="p-3 rounded-lg text-sm" style="background: #f5f0eb; color: #4f4539;">{{ selectedMovement.notes }}</p>
            </div>
            <div v-if="selectedMovement.from_location || selectedMovement.to_location" class="border-t pt-4" style="border-color: #e2d6c8;">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ubicación</p>
              <div class="flex items-center gap-2 text-sm">
                <span style="color: #4f4539;">{{ selectedMovement.from_location || '—' }}</span>
                <span class="material-icons-outlined text-sm" style="color: #624200;">arrow_forward</span>
                <span style="color: #4f4539;">{{ selectedMovement.to_location || '—' }}</span>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" style="border-top: 1px solid #e2d6c8;">
            <button @click="selectedMovement = null"
              class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2 !cursor-pointer"
              style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
              @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
              @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Cerrar</button>
          </div>
        </div>
      </div>
    </Teleport>

    
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { inventoryAPI } from '../../api';
import InventoryTabs from '../../components/inventory/InventoryTabs.vue';
import PageHeader from '../../components/shared/PageHeader.vue';
import DataTable from '../../components/shared/DataTable.vue';
import { formatDateTime } from '../../utils';
import InventoryMovementsSkeleton from '../../components/skeletons/InventoryMovementsSkeleton.vue';

const movements = ref([]);
const page = ref(1);
const limit = 15;
const total = ref(0);
const typeFilter = ref('');
const selectedMovement = ref(null);
const loading = ref(true);
const columns = [
  { key: 'product_id', label: 'ID', type: 'custom' },
  { key: 'product_name', label: 'Producto' },
  { key: 'type', label: 'Tipo', type: 'custom' },
  { key: 'quantity', label: 'Cantidad', type: 'number', sortable: true },
  { key: 'reference', label: 'Referencia' },
  { key: 'created_at', label: 'Fecha', type: 'datetime', sortable: true }
];

function openDetail(row) {
  selectedMovement.value = row;
}

const changePage = (p) => { page.value = p; fetchMovements(); };

const fetchMovements = async () => {
  try {
    loading.value = true;
    const params = { page: page.value, limit };
    if (typeFilter.value) params.type = typeFilter.value;
    const res = await inventoryAPI.getMovements(params);
    movements.value = res.data || [];
    total.value = res.pagination?.total || 0;
  } catch (e) { /* ignore */ }
  finally { loading.value = false; }
};

onMounted(fetchMovements);
</script>

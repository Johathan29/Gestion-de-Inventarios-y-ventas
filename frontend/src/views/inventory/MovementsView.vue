<template>
  <InventoryTabs />
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Movimientos de Inventario</h2>
      <select v-model="typeFilter" @change="fetchMovements" class="dt-input" style="width: 12rem;">
        <option value="">Todos los tipos</option>
        <option value="entry">Entrada</option>
        <option value="exit">Salida</option>
        <option value="adjustment">Ajuste</option>
        <option value="transfer">Transferencia</option>
      </select>
    </div>
    <DataTable :columns="columns" :data="movements" searchable @rowClick="openDetail">
      <template #cell-type="{ row }">
        <span class="dt-badge" :class="row.type === 'entry' ? 'dt-badge-success' : row.type === 'exit' ? 'dt-badge-danger' : row.type === 'adjustment' ? 'dt-badge-warning' : 'dt-badge-info'">
          {{ row.type === 'entry' ? 'Entrada' : row.type === 'exit' ? 'Salida' : row.type === 'adjustment' ? 'Ajuste' : 'Transferencia' }}
        </span>
      </template>
      <template #cell-product_id="{ row }">
        <span class="font-mono text-xs" style="color: #624200;">#{{ row.product_id }}</span>
      </template>
    </DataTable>

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
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { inventoryAPI } from '../../api';
import InventoryTabs from '../../components/inventory/InventoryTabs.vue';
import DataTable from '../../components/shared/DataTable.vue';
import { formatDateTime } from '../../utils';

const movements = ref([]);
const typeFilter = ref('');
const selectedMovement = ref(null);

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

const fetchMovements = async () => {
  try {
    const params = typeFilter.value ? { type: typeFilter.value } : {};
    const res = await inventoryAPI.getMovements(params);
    movements.value = res.data || [];
  } catch (e) { /* ignore */ }
};

onMounted(fetchMovements);
</script>

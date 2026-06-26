<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Movimientos de Inventario</h3>
      <select v-model="typeFilter" @change="fetchMovements" class="form-input w-48">
        <option value="">Todos los tipos</option>
        <option value="entry">Entrada</option>
        <option value="exit">Salida</option>
        <option value="adjustment">Ajuste</option>
        <option value="transfer">Transferencia</option>
      </select>
    </div>
    <DataTable :columns="columns" :data="movements" searchable>
      <template #cell-type="{ row }">
        <span class="badge" :class="row.type === 'entry' ? 'badge-green' : row.type === 'exit' ? 'badge-red' : row.type === 'adjustment' ? 'badge-yellow' : 'badge-blue'">
          {{ row.type === 'entry' ? 'Entrada' : row.type === 'exit' ? 'Salida' : row.type === 'adjustment' ? 'Ajuste' : 'Transferencia' }}
        </span>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { inventoryAPI } from '../../api';
import DataTable from '../../components/shared/DataTable.vue';

const movements = ref([]);
const typeFilter = ref('');

const columns = [
  { key: 'product_name', label: 'Producto' },
  { key: 'type', label: 'Tipo', type: 'custom' },
  { key: 'quantity', label: 'Cantidad', type: 'number', sortable: true },
  { key: 'reference', label: 'Referencia' },
  { key: 'notes', label: 'Notas' },
  { key: 'created_at', label: 'Fecha', type: 'datetime', sortable: true }
];

const fetchMovements = async () => {
  try {
    const params = typeFilter.value ? { type: typeFilter.value } : {};
    const res = await inventoryAPI.getMovements(params);
    movements.value = res.data || [];
  } catch (e) { /* ignore */ }
};

onMounted(fetchMovements);
</script>

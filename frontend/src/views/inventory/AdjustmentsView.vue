<template>
  <div>
    <InventoryTabs />
    <div class="flex justify-between items-center mb-4">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Ajustes de Inventario</h3>
      <button @click="showForm = true" class="dt-btn-primary">Nuevo Ajuste</button>
    </div>

    <DataTable :columns="columns" :data="adjustments" searchable>
      <template #cell-type="{ row }">
        <span class="dt-badge" :class="row.adjustment_type === 'increase' ? 'dt-badge-success' : 'dt-badge-danger'">
          {{ row.adjustment_type === 'increase' ? 'Incremento' : 'Decremento' }}
        </span>
      </template>
    </DataTable>

    <Modal :show="showForm" title="Nuevo Ajuste de Inventario" @close="showForm = false">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="dt-label">Producto</label>
          <select v-model="form.product_id" class="dt-input" required>
            <option value="">Seleccionar...</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="dt-label">Tipo</label>
          <select v-model="form.adjustment_type" class="dt-input" required>
            <option value="increase">Incrementar Stock</option>
            <option value="decrease">Disminuir Stock</option>
          </select>
        </div>
        <div>
          <label class="dt-label">Cantidad</label>
          <input v-model.number="form.quantity" type="number" min="1" class="dt-input" required />
        </div>
        <div>
          <label class="dt-label">Motivo</label>
          <textarea v-model="form.reason" rows="2" class="dt-input" required></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" @click="showForm = false" class="dt-btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving" class="dt-btn-primary">Guardar</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { inventoryAPI, productsAPI } from '../../api';
import InventoryTabs from '../../components/inventory/InventoryTabs.vue';
import DataTable from '../../components/shared/DataTable.vue';
import Modal from '../../components/shared/Modal.vue';

const adjustments = ref([]);
const products = ref([]);
const showForm = ref(false);
const saving = ref(false);
const form = reactive({ product_id: '', adjustment_type: 'increase', quantity: 1, reason: '' });

const columns = [
  { key: 'product_name', label: 'Producto' },
  { key: 'adjustment_type', label: 'Tipo', type: 'custom' },
  { key: 'quantity', label: 'Cantidad', type: 'number' },
  { key: 'reason', label: 'Motivo' },
  { key: 'created_at', label: 'Fecha', type: 'datetime' }
];

const fetchData = async () => {
  try {
    const [adjRes, prodRes] = await Promise.all([
      inventoryAPI.getMovements({ type: 'adjustment' }),
      productsAPI.getAll()
    ]);
    adjustments.value = adjRes.data || [];
    products.value = prodRes.data || [];
  } catch (e) { /* ignore */ }
};

const handleSubmit = async () => {
  saving.value = true;
  try {
    await inventoryAPI.createAdjustment(form);
    showForm.value = false;
    form.product_id = ''; form.quantity = 1; form.reason = '';
    await fetchData();
  } catch (e) { /* ignore */ }
  finally { saving.value = false; }
};

onMounted(fetchData);
</script>

<template>
  <div>
    <InventoryTabs />
    <div class="flex justify-between items-center mb-4">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Transferencias</h3>
      <button @click="showForm = true" class="dt-btn-primary">Nueva Transferencia</button>
    </div>

    <DataTable :columns="columns" :data="transfers" searchable />

    <Modal :show="showForm" title="Nueva Transferencia" @close="showForm = false">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="dt-label">Producto</label>
          <select v-model="form.product_id" class="dt-input" required>
            <option value="">Seleccionar...</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="dt-label">Ubicación Origen</label>
          <input v-model="form.from_location" class="dt-input" required />
        </div>
        <div>
          <label class="dt-label">Ubicación Destino</label>
          <input v-model="form.to_location" class="dt-input" required />
        </div>
        <div>
          <label class="dt-label">Cantidad</label>
          <input v-model.number="form.quantity" type="number" min="1" class="dt-input" required />
        </div>
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" @click="showForm = false" class="dt-btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving" class="dt-btn-primary">Transferir</button>
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

const transfers = ref([]);
const products = ref([]);
const showForm = ref(false);
const saving = ref(false);
const form = reactive({ product_id: '', from_location: '', to_location: '', quantity: 1 });

const columns = [
  { key: 'product_name', label: 'Producto' },
  { key: 'from_location', label: 'Origen' },
  { key: 'to_location', label: 'Destino' },
  { key: 'quantity', label: 'Cantidad', type: 'number' },
  { key: 'created_at', label: 'Fecha', type: 'datetime' }
];

const fetchData = async () => {
  try {
    const [tRes, pRes] = await Promise.all([
      inventoryAPI.getMovements({ type: 'transfer' }),
      productsAPI.getAll()
    ]);
    transfers.value = tRes.data || [];
    products.value = pRes.data || [];
  } catch (e) { /* ignore */ }
};

const handleSubmit = async () => {
  saving.value = true;
  try {
    await inventoryAPI.createTransfer(form);
    showForm.value = false;
    await fetchData();
  } catch (e) { /* ignore */ }
  finally { saving.value = false; }
};

onMounted(fetchData);
</script>

<template>
  <div>
    <InventoryTabs />
    <div class="flex justify-between items-center mb-4">
      <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Ajustes de Inventario</h2>
      <button @click="showForm = true"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
        style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">Nuevo Ajuste</button>
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
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Producto <span style="color: #ba1a1a;">*</span></label>
          <select v-model="form.product_id" required
            class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
            :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: '#ffffff', border: '1.5px solid #E5E7EB' }"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
            <option value="">Seleccionar...</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Tipo <span style="color: #ba1a1a;">*</span></label>
          <select v-model="form.adjustment_type" required
            class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
            :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: '#ffffff', border: '1.5px solid #E5E7EB' }"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
            <option value="increase">Incrementar Stock</option>
            <option value="decrease">Disminuir Stock</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Cantidad <span style="color: #ba1a1a;">*</span></label>
          <input v-model.number="form.quantity" type="number" min="1" required
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Motivo <span style="color: #ba1a1a;">*</span></label>
          <textarea v-model="form.reason" rows="2" required
            class="w-full rounded-lg px-3 py-2.5 transition-all resize-none"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }"></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" @click="showForm = false"
            class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
            style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
            @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
            @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Cancelar</button>
          <button type="submit" :disabled="saving"
            class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
            style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
            <span class="material-icons-outlined" style="font-size: 1.125rem;">check</span>
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
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

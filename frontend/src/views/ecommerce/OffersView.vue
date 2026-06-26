<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Ofertas</h3>
      <button @click="showForm = true" class="btn btn-primary btn-sm">Nueva Oferta</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="o in offers" :key="o.id" class="card p-4">
        <h4 class="font-medium text-gray-900 dark:text-white">{{ o.title }}</h4>
        <p class="text-sm text-gray-500">{{ o.description || '' }}</p>
        <div class="flex items-center gap-2 mt-2 text-sm">
          <span v-if="o.discount_percent" class="font-bold text-red-500">{{ o.discount_percent }}% OFF</span>
          <span class="badge" :class="o.is_active ? 'badge-green' : 'badge-gray'">{{ o.is_active ? 'Activa' : 'Inactiva' }}</span>
        </div>
        <p class="text-xs text-gray-400 mt-1">{{ formatDate(o.start_date) }} - {{ formatDate(o.end_date) }}</p>
        <div class="flex gap-2 mt-3">
          <button @click="editOffer(o)" class="btn btn-sm btn-secondary">Editar</button>
          <button @click="deleteOffer(o)" class="btn btn-sm btn-danger">Eliminar</button>
        </div>
      </div>
    </div>

    <Modal :show="showForm" :title="editing ? 'Editar Oferta' : 'Nueva Oferta'" @close="showForm = false">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div><label class="form-label">Título</label><input v-model="form.title" class="form-input" required /></div>
        <div><label class="form-label">Descripción</label><textarea v-model="form.description" class="form-input" rows="2"></textarea></div>
        <div><label class="form-label">% Descuento</label><input v-model.number="form.discount_percent" type="number" min="0" max="100" class="form-input" /></div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="form-label">Inicio</label><input v-model="form.start_date" type="date" class="form-input" /></div>
          <div><label class="form-label">Fin</label><input v-model="form.end_date" type="date" class="form-input" /></div>
        </div>
        <div class="flex items-center gap-2"><input type="checkbox" v-model="form.is_active" id="o_active" /><label for="o_active">Activa</label></div>
        <div class="flex justify-end gap-3"><button type="button" @click="showForm = false" class="btn btn-secondary">Cancelar</button><button type="submit" :disabled="saving" class="btn btn-primary">Guardar</button></div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';
import Modal from '../../components/shared/Modal.vue';
import { formatDate } from '../../utils';
import Swal from 'sweetalert2';

const offers = ref([]);
const showForm = ref(false);
const editing = ref(null);
const saving = ref(false);
const form = ref({ title: '', description: '', discount_percent: 0, start_date: '', end_date: '', is_active: true });

const fetchOffers = async () => { try { const res = await ecommerceAPI.getOffers(); offers.value = res.data || []; } catch (e) { /* ignore */ } };

const editOffer = (o) => { editing.value = o; form.value = { ...o }; showForm.value = true; };

const handleSave = async () => {
  saving.value = true;
  try { editing.value ? await ecommerceAPI.updateOffer(editing.value.id, form.value) : await ecommerceAPI.createOffer(form.value); showForm.value = false; editing.value = null; await fetchOffers(); }
  catch (e) { /* ignore */ } finally { saving.value = false; }
};

const deleteOffer = async (o) => {
  const r = await Swal.fire({ title: '¿Eliminar oferta?', icon: 'warning', showCancelButton: true });
  if (r.isConfirmed) { try { await ecommerceAPI.deleteOffer(o.id); await fetchOffers(); } catch (e) { /* ignore */ } }
};

onMounted(fetchOffers);
</script>

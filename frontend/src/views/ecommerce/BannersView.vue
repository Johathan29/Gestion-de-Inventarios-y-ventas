<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Banners</h3>
      <button @click="openModal(null)" class="btn btn-primary btn-sm">Nuevo Banner</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="b in banners" :key="b.id" class="card p-4">
        <img v-if="b.image_url" :src="b.image_url" class="w-full h-40 object-cover rounded-lg mb-3" />
        <h4 class="font-medium text-gray-900 dark:text-white">{{ b.title }}</h4>
        <p class="text-sm text-gray-500">{{ b.subtitle || '' }}</p>
        <div class="flex items-center gap-2 mt-2">
          <span class="badge" :class="b.is_active ? 'badge-green' : 'badge-gray'">{{ b.is_active ? 'Activo' : 'Inactivo' }}</span>
          <span class="text-xs text-gray-500">Orden: {{ b.sort_order }}</span>
        </div>
        <div class="flex gap-2 mt-3">
          <button @click="openModal(b)" class="btn btn-sm btn-secondary">Editar</button>
          <button @click="confirmDelete(b)" class="btn btn-sm btn-danger">Eliminar</button>
        </div>
      </div>
    </div>

    <Modal :show="showModal" :title="editing ? 'Editar Banner' : 'Nuevo Banner'" @close="closeModal">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div><label class="form-label">Título</label><input v-model="form.title" class="form-input" required /></div>
        <div><label class="form-label">Subtítulo</label><input v-model="form.subtitle" class="form-input" /></div>
        <div><label class="form-label">URL de Imagen</label><input v-model="form.image_url" class="form-input" /></div>
        <div><label class="form-label">URL de Destino</label><input v-model="form.link_url" class="form-input" /></div>
        <div><label class="form-label">Orden</label><input v-model.number="form.sort_order" type="number" class="form-input" /></div>
        <div class="flex items-center gap-2"><input type="checkbox" v-model="form.is_active" id="b_active" /><label for="b_active">Activo</label></div>
        <div class="flex justify-end gap-3"><button type="button" @click="closeModal" class="btn btn-secondary">Cancelar</button><button type="submit" :disabled="saving" class="btn btn-primary">Guardar</button></div>
      </form>
    </Modal>

    <ConfirmDialog :show="showDelete" @confirm="handleDelete" @cancel="showDelete = false" :loading="saving" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';
import Modal from '../../components/shared/Modal.vue';
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue';

const banners = ref([]);
const showModal = ref(false);
const showDelete = ref(false);
const editing = ref(null);
const deleting = ref(null);
const saving = ref(false);
const form = ref({ title: '', subtitle: '', image_url: '', link_url: '', sort_order: 0, is_active: true });

const fetchBanners = async () => { try { const res = await ecommerceAPI.getBanners(); banners.value = res.data || []; } catch (e) { /* ignore */ } };

const openModal = (b) => { editing.value = b; form.value = b ? { ...b } : { title: '', subtitle: '', image_url: '', link_url: '', sort_order: 0, is_active: true }; showModal.value = true; };
const closeModal = () => { showModal.value = false; editing.value = null; };

const handleSave = async () => { saving.value = true; try { editing.value ? await ecommerceAPI.updateBanner(editing.value.id, form.value) : await ecommerceAPI.createBanner(form.value); closeModal(); await fetchBanners(); } catch (e) { /* ignore */ } finally { saving.value = false; } };
const confirmDelete = (b) => { deleting.value = b; showDelete.value = true; };
const handleDelete = async () => { saving.value = true; try { await ecommerceAPI.deleteBanner(deleting.value.id); showDelete.value = false; await fetchBanners(); } catch (e) { /* ignore */ } finally { saving.value = false; } };

onMounted(fetchBanners);
</script>

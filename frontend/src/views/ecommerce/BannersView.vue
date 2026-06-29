<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Banners</h3>
      <button @click="openModal(null)" class="dt-btn-primary">Nuevo Banner</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="b in banners" :key="b.id" class="dt-card p-4">
        <img v-if="b.image_url" :src="b.image_url" class="w-full h-40 object-cover rounded-lg mb-3" />
        <h4 class="font-medium" style="color: #0b1c30;">{{ b.title }}</h4>
        <p class="text-sm text-gray-500">{{ b.subtitle || '' }}</p>
        <div class="flex items-center gap-2 mt-2">
          <span class="dt-badge" :class="b.is_active ? 'dt-badge-success' : 'dt-badge-disabled'">{{ b.is_active ? 'Activo' : 'Inactivo' }}</span>
          <span class="text-xs text-gray-500">Orden: {{ b.sort_order }}</span>
        </div>
        <div class="flex gap-2 mt-3">
          <button @click="openModal(b)" class="dt-btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">Editar</button>
          <button @click="confirmDelete(b)" class="dt-btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem; border-color: #ef4444; color: #ef4444;">Eliminar</button>
        </div>
      </div>
    </div>

    <Modal :show="showModal" :title="editing ? 'Editar Banner' : 'Nuevo Banner'" @close="closeModal">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div><label class="dt-label">Título</label><input v-model="form.title" class="dt-input" required /></div>
        <div><label class="dt-label">Subtítulo</label><input v-model="form.subtitle" class="dt-input" /></div>
        <div><label class="dt-label">URL de Imagen</label><input v-model="form.image_url" class="dt-input" /></div>
        <div><label class="dt-label">URL de Destino</label><input v-model="form.link_url" class="dt-input" /></div>
        <div><label class="dt-label">Orden</label><input v-model.number="form.sort_order" type="number" class="dt-input" /></div>
        <div class="flex items-center gap-2"><input type="checkbox" v-model="form.is_active" id="b_active" /><label for="b_active">Activo</label></div>
        <div class="flex justify-end gap-3"><button type="button" @click="closeModal" class="dt-btn-secondary">Cancelar</button><button type="submit" :disabled="saving" class="dt-btn-primary">Guardar</button></div>
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

<template>
  <div>
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> view_carousel </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Banners"
            description="Gestiona los banners promocionales"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <button @click="openModal(null)" class="aurora-header-button aurora-header-button-primary">
            <span class="material-symbols-outlined"> add </span>
            Nuevo Banner
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
      <div v-for="b in banners" :key="b.id" class="aurora-raised-card">
        <img v-if="b.image_url" :src="b.image_url" class="w-full h-40 object-cover rounded-lg mb-3" />
        <h4 class="font-medium text-on-surface">{{ b.title }}</h4>
        <p class="text-sm text-on-surface-variant">{{ b.subtitle || '' }}</p>
        <div class="flex items-center gap-2 mt-2">
          <span v-if="b.is_active" class="aurora-badge aurora-badge-success">{{ b.is_active ? 'Activo' : 'Inactivo' }}</span>
          <span v-else class="aurora-badge aurora-badge-secondary">{{ b.is_active ? 'Activo' : 'Inactivo' }}</span>
          <span class="text-xs text-on-surface-variant">Orden: {{ b.sort_order }}</span>
        </div>
        <div class="flex gap-2 mt-3">
          <button @click="openModal(b)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">Editar</button>
          <button @click="confirmDelete(b)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; color: var(--aurora-error); border-color: var(--aurora-error);">Eliminar</button>
        </div>
      </div>
    </div>

    <Modal :show="showModal" :title="editing ? 'Editar Banner' : 'Nuevo Banner'" @close="closeModal">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Título <span style="color: var(--aurora-error);">*</span></label>
          <input v-model="form.title" required class="aurora-input" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Subtítulo</label>
          <input v-model="form.subtitle" class="aurora-input" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">URL de Imagen</label>
          <input v-model="form.image_url" class="aurora-input" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">URL de Destino</label>
          <input v-model="form.link_url" class="aurora-input" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Orden</label>
          <input v-model.number="form.sort_order" type="number" class="aurora-input" style="font-family: 'JetBrains Mono', monospace;" />
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="form.is_active" id="b_active" class="w-4 h-4 rounded" style="accent-color: var(--aurora-primary);" />
          <label for="b_active" class="text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Activo</label>
        </div>
        <div class="flex justify-end gap-3" style="padding-top: 0.75rem;">
          <button type="button" @click="closeModal" class="aurora-btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving" class="aurora-btn-primary">
            <span class="material-symbols-outlined" style="font-size: 1.125rem;">campaign</span>
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog :show="showDelete" @confirm="handleDelete" @cancel="showDelete = false" :loading="saving" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';
import PageHeader from '../../components/shared/PageHeader.vue';
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

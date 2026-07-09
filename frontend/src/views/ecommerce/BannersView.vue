<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Banners</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
          Gestiona los banners promocionales
        </p>
      </div>
      <button @click="openModal(null)" class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border" style="background: #624200; color: white; border-color: rgba(139,94,0,0.2); font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5;">
        <span class="material-icons-outlined" style="font-size: 1.25rem;">add</span>
        Nuevo Banner
      </button>
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
          <button @click="openModal(b)"
            class="shrink-0 flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 border-2"
            style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.8rem;"
            @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
            @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Editar</button>
          <button @click="confirmDelete(b)"
            class="shrink-0 flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 border-2"
            style="border-color: #ef4444; color: #ef4444; font-family: Inter, sans-serif; font-size: 0.8rem;"
            @mouseenter="e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#dc2626'; }"
            @mouseleave="e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = '#ef4444'; }">Eliminar</button>
        </div>
      </div>
    </div>

    <Modal :show="showModal" :title="editing ? 'Editar Banner' : 'Nuevo Banner'" @close="closeModal">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Título <span style="color: #ba1a1a;">*</span></label>
          <input v-model="form.title" required
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Subtítulo</label>
          <input v-model="form.subtitle"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">URL de Imagen</label>
          <input v-model="form.image_url"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">URL de Destino</label>
          <input v-model="form.link_url"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Orden</label>
          <input v-model.number="form.sort_order" type="number"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="form.is_active" id="b_active" class="w-4 h-4 rounded" style="accent-color: #624200;" />
          <label for="b_active" style="font-family: 'Inter', sans-serif; color: #0b1c30; font-size: 0.875rem;">Activo</label>
        </div>
        <div class="flex justify-end gap-3" style="padding-top: 0.75rem;">
          <button type="button" @click="closeModal"
            class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
            style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
            @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
            @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Cancelar</button>
          <button type="submit" :disabled="saving"
            class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
            style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
            <span class="material-icons-outlined" style="font-size: 1.125rem;">campaign</span>
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

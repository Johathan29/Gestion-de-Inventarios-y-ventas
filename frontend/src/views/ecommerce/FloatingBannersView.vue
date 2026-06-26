<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Banners Flotantes</h3>
      <button @click="openModal(null)" class="btn btn-primary btn-sm">
        <span class="material-symbols-outlined text-sm mr-1" data-icon="add">add</span>
        Nuevo Banner Flotante
      </button>
    </div>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />
    <Loading v-if="loading" />

    <div v-else-if="banners.length === 0" class="text-sm text-gray-500 text-center py-8">No hay banners flotantes configurados.</div>

    <div v-else class="space-y-4">
      <div v-for="banner in banners" :key="banner.id"
        class="card p-4 flex items-start gap-4"
        :class="{ 'border-primary/50': banner.is_active }"
      >
        <!-- Preview -->
        <div class="w-full md:w-48 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
          <img v-if="banner.image_url" :src="banner.image_url" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-500 text-xs">Sin imagen</div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="text-xs font-medium text-gray-400">#{{ banner.sort_order }}</span>
            <span :class="banner.is_active ? 'badge badge-green' : 'badge badge-gray'" class="text-xs">{{ banner.is_active ? 'Activo' : 'Inactivo' }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-white/10">
              {{ banner.position === 'top' ? 'Superior' : 'Inferior' }}
            </span>
            <span v-if="banner.is_sticky" class="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Sticky</span>
          </div>
          <h4 class="font-medium text-gray-900 dark:text-white">{{ banner.title || 'Sin título' }}</h4>
          <p class="text-sm text-gray-500 truncate">{{ banner.subtitle || '' }}</p>
          <p v-if="banner.start_date || banner.end_date" class="text-xs text-gray-400 mt-1">
            {{ banner.start_date ? 'Desde: ' + new Date(banner.start_date).toLocaleDateString() : '' }}
            {{ banner.end_date ? ' Hasta: ' + new Date(banner.end_date).toLocaleDateString() : '' }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 flex-shrink-0">
          <button @click="openModal(banner)" class="btn btn-sm btn-secondary">Editar</button>
          <button @click="confirmDelete(banner)" class="btn btn-sm btn-danger">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="editing ? 'Editar Banner Flotante' : 'Nuevo Banner Flotante'" @close="closeModal" size="lg">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Título</label>
            <input v-model="form.title" class="form-input" placeholder="Envío gratis" />
          </div>
          <div>
            <label class="form-label">Orden</label>
            <input v-model.number="form.sort_order" type="number" min="0" class="form-input" />
          </div>
        </div>
        <div>
          <label class="form-label">Subtítulo</label>
          <input v-model="form.subtitle" class="form-input" placeholder="En compras mayores a $50" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">URL de Imagen</label>
            <input v-model="form.image_url" class="form-input" placeholder="https://ejemplo.com/banner.jpg" />
          </div>
          <div>
            <label class="form-label">URL de Destino (link)</label>
            <input v-model="form.link_url" class="form-input" placeholder="#products" />
          </div>
        </div>
        <img v-if="form.image_url" :src="form.image_url" class="w-full h-32 object-cover rounded-lg" @error="e => e.target.style.display = 'none'" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Color de Fondo</label>
            <div class="flex gap-2">
              <input v-model="form.background_color" class="form-input flex-1" placeholder="#1a1a2e" />
              <input type="color" v-model="form.background_color" class="w-10 h-10 rounded cursor-pointer" />
            </div>
          </div>
          <div>
            <label class="form-label">Color de Texto</label>
            <div class="flex gap-2">
              <input v-model="form.text_color" class="form-input flex-1" placeholder="#ffffff" />
              <input type="color" v-model="form.text_color" class="w-10 h-10 rounded cursor-pointer" />
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Posición</label>
            <select v-model="form.position" class="form-input">
              <option value="top">Superior (top)</option>
              <option value="bottom">Inferior (bottom)</option>
            </select>
          </div>
          <div>
            <label class="form-label">Fecha Inicio</label>
            <input v-model="form.start_date" type="date" class="form-input" />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Fecha Fin</label>
            <input v-model="form.end_date" type="date" class="form-input" />
          </div>
          <div class="flex items-center gap-6 pt-6">
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="form.is_active" id="fb_active" class="w-4 h-4 rounded border-white/20" />
              <label for="fb_active" class="text-sm text-gray-700 dark:text-gray-300">Activo</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="form.is_sticky" id="fb_sticky" class="w-4 h-4 rounded border-white/20" />
              <label for="fb_sticky" class="text-sm text-gray-700 dark:text-gray-300">Sticky (fijo al hacer scroll)</label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button type="button" @click="closeModal" class="btn btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving" class="btn btn-primary">
            <span v-if="saving" class="material-symbols-outlined animate-spin inline-block mr-2" data-icon="refresh">refresh</span>
            {{ editing ? 'Actualizar Banner' : 'Crear Banner' }}
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
import Alert from '../../components/shared/Alert.vue';
import Loading from '../../components/shared/Loading.vue';

const banners = ref([]);
const loading = ref(true);
const saving = ref(false);
const showModal = ref(false);
const showDelete = ref(false);
const editing = ref(null);
const deleting = ref(null);
const successMsg = ref('');
const errorMsg = ref('');

const form = ref({
  title: '',
  subtitle: '',
  image_url: '',
  link_url: '',
  background_color: '#1a1a2e',
  text_color: '#ffffff',
  position: 'top',
  is_sticky: true,
  sort_order: 0,
  is_active: true,
  start_date: '',
  end_date: ''
});

async function fetchBanners() {
  try {
    const res = await ecommerceAPI.getAllFloatingBanners();
    banners.value = (res.data || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  } catch {
    errorMsg.value = 'Error al cargar banners';
  } finally {
    loading.value = false;
  }
}

function openModal(banner) {
  editing.value = banner;
  form.value = banner ? { ...banner, start_date: banner.start_date ? banner.start_date.slice(0, 10) : '', end_date: banner.end_date ? banner.end_date.slice(0, 10) : '' } : {
    title: '', subtitle: '', image_url: '', link_url: '', background_color: '#1a1a2e', text_color: '#ffffff',
    position: 'top', is_sticky: true, sort_order: banners.value.length, is_active: true, start_date: '', end_date: ''
  };
  showModal.value = true;
}

function closeModal() { showModal.value = false; editing.value = null; }

async function handleSave() {
  saving.value = true;
  errorMsg.value = '';
  try {
    const payload = { ...form.value };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;

    if (editing.value) {
      await ecommerceAPI.updateFloatingBanner(editing.value.id, payload);
      successMsg.value = 'Banner actualizado';
    } else {
      await ecommerceAPI.createFloatingBanner(payload);
      successMsg.value = 'Banner creado';
    }
    closeModal();
    await fetchBanners();
  } catch {
    errorMsg.value = 'Error al guardar banner';
  } finally {
    saving.value = false;
  }
}

function confirmDelete(banner) { deleting.value = banner; showDelete.value = true; }

async function handleDelete() {
  saving.value = true;
  try {
    await ecommerceAPI.deleteFloatingBanner(deleting.value.id);
    showDelete.value = false;
    successMsg.value = 'Banner eliminado';
    await fetchBanners();
  } catch {
    errorMsg.value = 'Error al eliminar banner';
  } finally {
    saving.value = false;
  }
}

onMounted(fetchBanners);
</script>

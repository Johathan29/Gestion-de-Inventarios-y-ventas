<template>
  <div>
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> picture_in_picture </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Banners Flotantes"
            description="Gestiona los banners flotantes"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <button @click="openModal(null)" class="aurora-header-button aurora-header-button-primary">
            <span class="material-symbols-outlined"> add </span>
            Nuevo Banner Flotante
          </button>
        </div>
      </div>
    </div>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" class="mb-md" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-md" />
    <CardGridSkeleton v-if="loading" />

    <div v-else-if="banners.length === 0" class="text-on-surface-variant text-center py-8">No hay banners flotantes configurados.</div>

    <div v-else class="space-y-4">
      <div v-for="banner in banners" :key="banner.id"
        class="aurora-raised-card flex items-start gap-4"
        :style="{ borderLeft: banner.is_active ? '4px solid var(--aurora-primary)' : '' }"
      >
        <!-- Preview -->
        <div class="w-full md:w-48 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
          <img v-if="banner.image_url" :src="banner.image_url" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-on-surface-variant text-xs">Sin imagen</div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="text-xs font-medium text-on-surface-variant">#{{ banner.sort_order }}</span>
            <span :class="banner.is_active ? 'aurora-badge aurora-badge-success' : 'aurora-badge aurora-badge-secondary'" style="font-size: 0.75rem;">{{ banner.is_active ? 'Activo' : 'Inactivo' }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full aurora-badge-secondary">
              {{ banner.position === 'top' ? 'Superior' : 'Inferior' }}
            </span>
            <span v-if="banner.is_sticky" class="text-xs px-2 py-0.5 rounded-full aurora-badge-primary">Sticky</span>
          </div>
          <h4 class="font-medium text-on-surface">{{ banner.title || 'Sin título' }}</h4>
          <p class="text-sm text-on-surface-variant truncate">{{ banner.subtitle || '' }}</p>
          <p v-if="banner.start_date || banner.end_date" class="text-xs text-on-surface-variant mt-1">
            {{ banner.start_date ? 'Desde: ' + new Date(banner.start_date).toLocaleDateString() : '' }}
            {{ banner.end_date ? ' Hasta: ' + new Date(banner.end_date).toLocaleDateString() : '' }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 flex-shrink-0">
          <button @click="openModal(banner)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">Editar</button>
          <button @click="confirmDelete(banner)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; color: var(--aurora-error); border-color: var(--aurora-error);">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="editing ? 'Editar Banner Flotante' : 'Nuevo Banner Flotante'" @close="closeModal" size="lg">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Título</label>
            <input v-model="form.title" class="aurora-input" placeholder="Envío gratis" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Orden</label>
            <input v-model.number="form.sort_order" type="number" min="0" class="aurora-input" style="font-family: 'JetBrains Mono', monospace;" />
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Subtítulo</label>
          <input v-model="form.subtitle" class="aurora-input" placeholder="En compras mayores a $50" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Imagen del Banner</label>
            <!-- Upload zone -->
            <div
              @click="triggerUpload"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="onDrop"
              class="relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300"
              :class="dragOver ? 'aurora-pressed' : 'aurora-raised'"
            >
              <input type="file" ref="fileInputRef" accept="image/*" class="hidden" @change="onFileSelected" />

              <div v-if="uploading" class="flex flex-col items-center gap-2 py-4">
                <span class="material-symbols-outlined animate-spin text-3xl" style="color: var(--aurora-primary);">refresh</span>
                <span class="text-sm text-on-surface-variant">Subiendo imagen...</span>
              </div>

              <div v-else-if="previewFile || form.image_url" class="flex flex-col items-center gap-2">
                <img :src="previewFile || form.image_url" class="max-h-28 rounded-lg object-contain" @error="e => e.target.style.display = 'none'" />
                <span class="text-xs text-on-surface-variant mt-1">Click para cambiar imagen</span>
              </div>

              <div v-else class="flex flex-col items-center gap-2 py-6">
                <span class="material-symbols-outlined text-3xl text-on-surface-variant">image</span>
                <span class="text-sm text-on-surface-variant">Arrastra una imagen o click para subir</span>
                <span class="text-xs text-on-surface-variant">JPG, PNG, WebP, GIF — Máx 10MB</span>
              </div>
            </div>
            <div v-if="form.image_url && !uploading" class="mt-2 flex items-center gap-2">
              <span class="text-xs text-on-surface-variant truncate flex-1">{{ form.image_url }}</span>
              <button type="button" @click="clearImage" class="aurora-btn-icon danger" style="width: auto; height: auto; padding: 4px 8px; border-radius: var(--aurora-radius); gap: 4px;">
                <span class="material-symbols-outlined text-sm">delete</span>
                Quitar
              </button>
            </div>
            <div class="mt-2">
              <label class="text-xs text-on-surface-variant">O ingresa una URL manualmente:</label>
              <input v-model="form.image_url" class="aurora-input mt-1" style="font-size: 0.75rem;" placeholder="https://ejemplo.com/banner.jpg" />
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">URL de Destino (link)</label>
            <input v-model="form.link_url" class="aurora-input" placeholder="#products" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Color de Fondo</label>
            <div class="flex gap-2">
              <input v-model="form.background_color" class="aurora-input flex-1" style="font-family: 'JetBrains Mono', monospace;" placeholder="#1a1a2e" />
              <input type="color" v-model="form.background_color" class="w-10 h-10 rounded cursor-pointer aurora-raised" style="border: none;" />
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Color de Texto</label>
            <div class="flex gap-2">
              <input v-model="form.text_color" class="aurora-input flex-1" style="font-family: 'JetBrains Mono', monospace;" placeholder="#ffffff" />
              <input type="color" v-model="form.text_color" class="w-10 h-10 rounded cursor-pointer aurora-raised" style="border: none;" />
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Posición</label>
            <select v-model="form.position" class="aurora-select">
              <option value="top">Superior (top)</option>
              <option value="bottom">Inferior (bottom)</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Fecha Inicio</label>
            <input v-model="form.start_date" type="date" class="aurora-input" />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Fecha Fin</label>
            <input v-model="form.end_date" type="date" class="aurora-input" />
          </div>
          <div class="flex items-center gap-6 pt-6">
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="form.is_active" id="fb_active" class="w-4 h-4 rounded" style="accent-color: var(--aurora-primary);" />
              <label for="fb_active" class="text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Activo</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="form.is_sticky" id="fb_sticky" class="w-4 h-4 rounded" style="accent-color: var(--aurora-primary);" />
              <label for="fb_sticky" class="text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Sticky (fijo al hacer scroll)</label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button type="button" @click="closeModal" class="aurora-btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving" class="aurora-btn-primary">
            <span v-if="saving" class="material-symbols-outlined animate-spin">refresh</span>
            <span v-else class="material-symbols-outlined" style="font-size: 1.125rem;">flag</span>
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
import { supabase } from '../../api/supabase';
import PageHeader from '../../components/shared/PageHeader.vue';
import Modal from '../../components/shared/Modal.vue';
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue';
import Alert from '../../components/shared/Alert.vue';
import CardGridSkeleton from '../../components/skeletons/CardGridSkeleton.vue';
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

// Upload state
const uploading = ref(false);
const dragOver = ref(false);
const previewFile = ref('');
const fileInputRef = ref(null);
const pendingUpload = ref(null);
const STORAGE_BUCKET = 'floating-banners';

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
  previewFile.value = '';
  pendingUpload.value = null;
  form.value = banner ? { ...banner, start_date: banner.start_date ? banner.start_date.slice(0, 10) : '', end_date: banner.end_date ? banner.end_date.slice(0, 10) : '' } : {
    title: '', subtitle: '', image_url: '', link_url: '', background_color: '#1a1a2e', text_color: '#ffffff',
    position: 'top', is_sticky: true, sort_order: banners.value.length, is_active: true, start_date: '', end_date: ''
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editing.value = null;
  previewFile.value = '';
  pendingUpload.value = null;
}

function triggerUpload() { fileInputRef.value?.click(); }

function onDrop(e) {
  dragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) uploadFile(files[0]);
}

function onFileSelected(e) {
  const files = e.target.files;
  if (files && files.length > 0) uploadFile(files[0]);
}

async function uploadFile(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowed.includes(file.type)) {
    errorMsg.value = 'Formato no soportado. Usa JPG, PNG, WebP, GIF o AVIF.';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    errorMsg.value = 'La imagen es demasiado grande. Máximo 10MB.';
    return;
  }

  uploading.value = true;
  errorMsg.value = '';
  previewFile.value = URL.createObjectURL(file);
  pendingUpload.value = file;
  uploading.value = false;
}

function clearImage() {
  form.value.image_url = '';
  previewFile.value = '';
  pendingUpload.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
}

async function uploadToSupabase(bannerId) {
  if (!pendingUpload.value) return form.value.image_url;

  const file = pendingUpload.value;
  const ext = file.name.split('.').pop();
  const fileName = `floating-banners/${bannerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  form.value.image_url = publicUrl;
  pendingUpload.value = null;
  return publicUrl;
}

async function handleSave() {
  saving.value = true;
  errorMsg.value = '';
  try {
    const payload = { ...form.value };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;

    let bannerId = editing.value?.id;

    // If there's a pending upload but no banner exists yet, create it first
    if (pendingUpload.value && !bannerId) {
      const createPayload = { ...payload, image_url: '' };
      const res = await ecommerceAPI.createFloatingBanner(createPayload);
      bannerId = res.data?.id || res.data?.[0]?.id;
      if (!bannerId) throw new Error('No se pudo crear el banner');
      editing.value = { id: bannerId };
      form.value.id = bannerId;
      successMsg.value = 'Banner creado. Subiendo imagen...';
    }

    // Upload image if pending
    if (pendingUpload.value && bannerId) {
      await uploadToSupabase(bannerId);
      payload.image_url = form.value.image_url;
    }

    if (editing.value) {
      await ecommerceAPI.updateFloatingBanner(editing.value.id, payload);
      successMsg.value = 'Banner actualizado';
    } else {
      await ecommerceAPI.createFloatingBanner(payload);
      successMsg.value = 'Banner creado';
    }
    closeModal();
    await fetchBanners();
  } catch (err) {
    console.error('Error saving banner:', err);
    if (err.message?.includes('row-level security')) {
      errorMsg.value = 'Error de permisos: Crea el bucket "floating-banners" en Supabase Storage y configura las políticas RLS.';
    } else if (err.message?.includes('bucket')) {
      errorMsg.value = 'El bucket "floating-banners" no existe. Créalo en Supabase Dashboard → Storage.';
    } else {
      errorMsg.value = err.message || 'Error al guardar banner';
    }
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

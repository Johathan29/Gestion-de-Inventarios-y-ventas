<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Banners Flotantes</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
          Gestiona los banners flotantes
        </p>
      </div>
      <button @click="openModal(null)" class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border" style="background: #624200; color: white; border-color: rgba(139,94,0,0.2); font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5;">
        <span class="material-icons-outlined" style="font-size: 1.25rem;">add</span>
        Nuevo Banner Flotante
      </button>
    </div>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />
    <Loading v-if="loading" />

    <div v-else-if="banners.length === 0" class="text-sm text-gray-500 text-center py-8">No hay banners flotantes configurados.</div>

    <div v-else class="space-y-4">
      <div v-for="banner in banners" :key="banner.id"
        class="dt-card p-4 flex items-start gap-4"
        :style="{ borderColor: banner.is_active ? '#624200' : '' }"
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
            <span :class="banner.is_active ? 'dt-badge dt-badge-success' : 'dt-badge dt-badge-disabled'" style="font-size: 0.75rem;">{{ banner.is_active ? 'Activo' : 'Inactivo' }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-white/10">
              {{ banner.position === 'top' ? 'Superior' : 'Inferior' }}
            </span>
            <span v-if="banner.is_sticky" class="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Sticky</span>
          </div>
          <h4 class="font-medium" style="color: #0b1c30;">{{ banner.title || 'Sin título' }}</h4>
          <p class="text-sm text-gray-500 truncate">{{ banner.subtitle || '' }}</p>
          <p v-if="banner.start_date || banner.end_date" class="text-xs text-gray-400 mt-1">
            {{ banner.start_date ? 'Desde: ' + new Date(banner.start_date).toLocaleDateString() : '' }}
            {{ banner.end_date ? ' Hasta: ' + new Date(banner.end_date).toLocaleDateString() : '' }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 flex-shrink-0">
          <button @click="openModal(banner)"
            class="shrink-0 flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 border-2"
            style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.8rem;"
            @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
            @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Editar</button>
          <button @click="confirmDelete(banner)"
            class="shrink-0 flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 border-2"
            style="border-color: #ef4444; color: #ef4444; font-family: Inter, sans-serif; font-size: 0.8rem;"
            @mouseenter="e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#dc2626'; }"
            @mouseleave="e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = '#ef4444'; }">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="editing ? 'Editar Banner Flotante' : 'Nuevo Banner Flotante'" @close="closeModal" size="lg">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Título</label>
            <input v-model="form.title"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="Envío gratis"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Orden</label>
            <input v-model.number="form.sort_order" type="number" min="0"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Subtítulo</label>
          <input v-model="form.subtitle"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            placeholder="En compras mayores a $50"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Imagen del Banner</label>
            <!-- Upload zone -->
            <div
              @click="triggerUpload"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="onDrop"
              class="relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 hover:border-primary/50"
              :class="dragOver ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-white/20 bg-white/5'"
            >
              <input type="file" ref="fileInputRef" accept="image/*" class="hidden" @change="onFileSelected" />

              <div v-if="uploading" class="flex flex-col items-center gap-2 py-4">
                <span class="material-symbols-outlined animate-spin text-3xl text-primary" data-icon="refresh">refresh</span>
                <span class="text-sm text-gray-400">Subiendo imagen...</span>
              </div>

              <div v-else-if="previewFile || form.image_url" class="flex flex-col items-center gap-2">
                <img :src="previewFile || form.image_url" class="max-h-28 rounded-lg object-contain" @error="e => e.target.style.display = 'none'" />
                <span class="text-xs text-gray-500 mt-1">Click para cambiar imagen</span>
              </div>

              <div v-else class="flex flex-col items-center gap-2 py-6">
                <span class="material-symbols-outlined text-3xl text-gray-500" data-icon="image">image</span>
                <span class="text-sm text-gray-400">Arrastra una imagen o click para subir</span>
                <span class="text-xs text-gray-500">JPG, PNG, WebP, GIF — Máx 10MB</span>
              </div>
            </div>
            <div v-if="form.image_url && !uploading" class="mt-2 flex items-center gap-2">
              <span class="text-xs text-gray-400 truncate flex-1">{{ form.image_url }}</span>
              <button type="button" @click="clearImage" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-400/10 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm" data-icon="delete">delete</span>
                Quitar
              </button>
            </div>
            <div class="mt-2">
              <label class="text-xs text-gray-500">O ingresa una URL manualmente:</label>
              <input v-model="form.image_url"
                class="w-full rounded-lg px-3 py-2 transition-all text-xs mt-1"
                style="font-family: 'Inter', sans-serif; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="https://ejemplo.com/banner.jpg"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">URL de Destino (link)</label>
            <input v-model="form.link_url"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="#products"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Color de Fondo</label>
            <div class="flex gap-2">
              <input v-model="form.background_color"
                class="w-full rounded-lg px-3 py-2.5 transition-all flex-1"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="#1a1a2e"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              <input type="color" v-model="form.background_color" class="w-10 h-10 rounded cursor-pointer" style="border: 1.5px solid #E5E7EB;" />
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Color de Texto</label>
            <div class="flex gap-2">
              <input v-model="form.text_color"
                class="w-full rounded-lg px-3 py-2.5 transition-all flex-1"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="#ffffff"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              <input type="color" v-model="form.text_color" class="w-10 h-10 rounded cursor-pointer" style="border: 1.5px solid #E5E7EB;" />
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Posición</label>
            <select v-model="form.position"
              class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
              :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: '#ffffff', border: '1.5px solid #E5E7EB' }"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="top">Superior (top)</option>
              <option value="bottom">Inferior (bottom)</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Fecha Inicio</label>
            <input v-model="form.start_date" type="date"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Fecha Fin</label>
            <input v-model="form.end_date" type="date"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
          <div class="flex items-center gap-6 pt-6">
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="form.is_active" id="fb_active" class="w-4 h-4 rounded" style="accent-color: #624200;" />
              <label for="fb_active" style="font-family: 'Inter', sans-serif; color: #0b1c30; font-size: 0.875rem;">Activo</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" v-model="form.is_sticky" id="fb_sticky" class="w-4 h-4 rounded" style="accent-color: #624200;" />
              <label for="fb_sticky" style="font-family: 'Inter', sans-serif; color: #0b1c30; font-size: 0.875rem;">Sticky (fijo al hacer scroll)</label>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button type="button" @click="closeModal"
            class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
            style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
            @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
            @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Cancelar</button>
          <button type="submit" :disabled="saving"
            class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
            style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
            <span v-if="saving" class="material-symbols-outlined animate-spin" data-icon="refresh">refresh</span>
            <span v-else class="material-icons-outlined" style="font-size: 1.125rem;">flag</span>
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

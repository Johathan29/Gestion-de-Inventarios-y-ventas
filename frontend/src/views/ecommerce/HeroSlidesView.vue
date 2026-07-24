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
            title="Slides del Carrusel"
            description="Slides del carrusel principal (Hero)"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <button @click="openModal(null)" class="aurora-header-button aurora-header-button-primary">
            <span class="material-symbols-outlined"> add </span>
            Nuevo Slide
          </button>
        </div>
      </div>
    </div>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" class="mb-md" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-md" />
    <CardGridSkeleton v-if="loading" />

    <div v-else-if="slides.length === 0" class="text-on-surface-variant text-center py-8">No hay slides configurados. ¡Crea el primero!</div>

    <div v-else class="space-y-4">
      <div v-for="(slide, index) in slides" :key="slide.id"
        class="aurora-raised-card flex flex-col md:flex-row gap-4 items-start"
        :style="{ borderLeft: slide.is_active ? '4px solid var(--aurora-primary)' : '' }"
      >
        <!-- Imagen preview -->
        <div class="w-full md:w-48 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
          <img v-if="slide.image_url" :src="slide.image_url" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-on-surface-variant text-xs">Sin imagen</div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-medium text-on-surface-variant">#{{ index + 1 }}</span>
            <span v-if="slide.is_active" class="aurora-badge aurora-badge-success" style="font-size: 0.75rem;">Activo</span>
            <span v-else class="aurora-badge aurora-badge-secondary" style="font-size: 0.75rem;">Inactivo</span>
          </div>
          <h4 class="font-medium truncate text-on-surface">{{ slide.badge || 'Sin badge' }}</h4>
          <p class="text-sm text-on-surface-variant truncate">{{ slide.title_line1 }} {{ slide.title_line2 }}</p>
          <p class="text-xs text-on-surface-variant mt-1 truncate">{{ slide.description }}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 flex-shrink-0">
          <button @click="openModal(slide)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">Editar</button>
          <button @click="confirmDelete(slide)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; color: var(--aurora-error); border-color: var(--aurora-error);">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal Slide -->
    <Modal :show="showModal" :title="editing ? 'Editar Slide' : 'Nuevo Slide'" @close="closeModal" size="lg">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Badge (etiqueta)</label>
            <input v-model="form.badge" class="aurora-input" placeholder="Elite Animal Companionship" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Orden</label>
            <input v-model.number="form.sort_order" type="number" min="0" class="aurora-input" style="font-family: 'JetBrains Mono', monospace;" />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Título Línea 1</label>
            <input v-model="form.title_line1" class="aurora-input" placeholder="The Luxury" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Título Línea 2</label>
            <input v-model="form.title_line2" class="aurora-input" placeholder="Pet Atelier." />
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Estilo Línea 2</label>
          <select v-model="form.title_line2_style" class="aurora-select">
            <option value="italic">Cursiva (italic)</option>
            <option value="normal">Normal</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Descripción</label>
          <textarea v-model="form.description" class="aurora-textarea" rows="2" placeholder="Descripción del slide"></textarea>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Texto Botón 1</label>
            <input v-model="form.button1_text" class="aurora-input" placeholder="Explore Collection" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">URL Botón 1</label>
            <input v-model="form.button1_url" class="aurora-input" placeholder="#products" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Texto Botón 2</label>
            <input v-model="form.button2_text" class="aurora-input" placeholder="Our Story" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">URL Botón 2</label>
            <input v-model="form.button2_url" class="aurora-input" placeholder="#story" />
          </div>
        </div>

        <!-- Imagen: Upload a Storage -->
        <div class="border-t pt-4" style="border-color: var(--aurora-outline-variant);">
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Imagen del Slide</label>
          <div class="mt-2 flex flex-col md:flex-row gap-4 items-start">
            <!-- Upload area -->
            <div
              class="relative w-full md:w-64 h-40 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden aurora-raised"
              @click="triggerUpload"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="onDrop"
              :class="{ 'aurora-pressed': uploading || dragOver }"
            >
              <!-- Preview si ya hay imagen -->
              <img v-if="form.image_url && !previewFile" :src="form.image_url" class="absolute inset-0 w-full h-full object-cover" />
              <!-- Preview local mientras se sube -->
              <img v-if="previewFile" :src="previewFile" class="absolute inset-0 w-full h-full object-cover" />

              <!-- Overlay con icono si hay imagen -->
              <div v-if="form.image_url || previewFile" class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-3xl text-white">cloud_upload</span>
              </div>

              <!-- Placeholder si no hay imagen -->
              <div v-if="!form.image_url && !previewFile" class="text-center p-4">
                <span class="material-symbols-outlined text-3xl text-on-surface-variant mb-2">add_photo_alternate</span>
                <p class="text-xs text-on-surface-variant">Click o arrastra una imagen aquí</p>
                <p class="text-xs text-on-surface-variant mt-1">PNG, JPG, WebP • Max 10MB</p>
              </div>

              <!-- Spinner de carga -->
              <div v-if="uploading" class="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span class="material-symbols-outlined animate-spin text-3xl text-white">refresh</span>
              </div>

              <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" class="hidden" @change="onFileSelected" />
            </div>

            <!-- Info / URL actual -->
            <div class="flex-1 min-w-0">
              <div v-if="form.image_url" class="mb-2">
                <label class="text-xs text-on-surface-variant mb-1 block">URL actual:</label>
                <div class="flex gap-2">
                  <input :value="form.image_url" class="aurora-input text-xs flex-1" style="font-family: 'JetBrains Mono', monospace;" readonly @focus="$event.target.select()" />
                  <button type="button" @click="clearImage" class="aurora-btn-icon danger" style="width: auto; height: auto; padding: 4px 8px; border-radius: var(--aurora-radius); gap: 4px;">
                    <span class="material-symbols-outlined text-sm">delete</span>
                    Quitar
                  </button>
                </div>
              </div>
              <div class="flex gap-2 items-center">
                <span class="text-xs text-on-surface-variant">O ingresa una URL manualmente:</span>
                <input v-model="form.image_url" class="aurora-input flex-1 text-xs" placeholder="https://ejemplo.com/imagen.jpg" />
              </div>
              <p class="text-xs mt-2 flex items-center gap-1" style="color: var(--aurora-tertiary);">
                <span class="material-symbols-outlined text-sm">info</span>
                Al subir una imagen se guarda en Supabase Storage y el trigger actualiza automáticamente la URL.
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="form.is_active" id="slide_active" class="w-4 h-4 rounded" style="accent-color: var(--aurora-primary);" />
          <label for="slide_active" class="text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Slide activo</label>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t" style="border-color: var(--aurora-outline-variant);">
          <button type="button" @click="closeModal" class="aurora-btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving || uploading" class="aurora-btn-primary">
            <span v-if="saving" class="material-symbols-outlined animate-spin">refresh</span>
            <span v-else class="material-symbols-outlined" style="font-size: 1.125rem;">slideshow</span>
            {{ editing ? 'Actualizar Slide' : 'Crear Slide' }}
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

const slides = ref([]);
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
const STORAGE_BUCKET = 'hero-slides';

const form = ref({
  badge: '',
  title_line1: '',
  title_line2: '',
  title_line2_style: 'italic',
  description: '',
  button1_text: '',
  button1_url: '',
  button2_text: '',
  button2_url: '',
  image_url: '',
  sort_order: 0,
  is_active: true
});

async function fetchSlides() {
  try {
    const res = await ecommerceAPI.getAllHeroSlides();
    slides.value = (res.data || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  } catch {
    errorMsg.value = 'Error al cargar slides';
  } finally {
    loading.value = false;
  }
}

function openModal(slide) {
  editing.value = slide;
  previewFile.value = '';
  form.value = slide ? { ...slide } : {
    badge: '', title_line1: '', title_line2: '', title_line2_style: 'italic',
    description: '', button1_text: '', button1_url: '', button2_text: '', button2_url: '',
    image_url: '', sort_order: slides.value.length, is_active: true
  };
  showModal.value = true;
}

function closeModal() { showModal.value = false; editing.value = null; previewFile.value = ''; }

function triggerUpload() {
  fileInputRef.value?.click();
}

function onDrop(e) {
  dragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    uploadFile(files[0]);
  }
}

function onFileSelected(e) {
  const files = e.target.files;
  if (files && files.length > 0) {
    uploadFile(files[0]);
  }
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

  try {
    let slideId = editing.value?.id;

    if (!slideId) {
      const createRes = await ecommerceAPI.createHeroSlide({ ...form.value, image_url: '' });
      slideId = createRes.data?.id || createRes.data?.[0]?.id;
      if (!slideId) throw new Error('No se pudo crear el slide');
      await fetchSlides();
      editing.value = { id: slideId };
      form.value.id = slideId;
      successMsg.value = 'Slide creado. Subiendo imagen...';
    }

    const ext = file.name.split('.').pop();
    const fileName = `hero-slides/${slideId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      if (uploadError.message?.includes('bucket') || uploadError.statusCode === 404) {
        throw new Error('El bucket "hero-slides" no existe. Ejecuta la migración 007_hero_slides_storage_trigger.sql en Supabase.');
      }
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    form.value.image_url = publicUrl;
    previewFile.value = '';

    if (editing.value?.id) {
      await ecommerceAPI.updateHeroSlide(editing.value.id, { image_url: publicUrl });
    }

    successMsg.value = 'Imagen subida exitosamente (trigger también actualizará la URL)';
  } catch (err) {
    console.error('Error uploading image:', err);
    errorMsg.value = err.message || 'Error al subir imagen';
    previewFile.value = '';
  } finally {
    uploading.value = false;
    if (fileInputRef.value) fileInputRef.value.value = '';
  }
}

function clearImage() {
  form.value.image_url = '';
  previewFile.value = '';
}

async function handleSave() {
  saving.value = true;
  errorMsg.value = '';
  try {
    if (editing.value) {
      await ecommerceAPI.updateHeroSlide(editing.value.id, form.value);
      successMsg.value = 'Slide actualizado';
    } else {
      await ecommerceAPI.createHeroSlide(form.value);
      successMsg.value = 'Slide creado';
    }
    closeModal();
    await fetchSlides();
  } catch {
    errorMsg.value = 'Error al guardar slide';
  } finally {
    saving.value = false;
  }
}

function confirmDelete(slide) { deleting.value = slide; showDelete.value = true; }

async function handleDelete() {
  saving.value = true;
  try {
    const slide = deleting.value;
    if (slide.image_url && slide.image_url.includes('/hero-slides/')) {
      try {
        const pathMatch = slide.image_url.match(/\/hero-slides\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from(STORAGE_BUCKET).remove([pathMatch[1]]);
        }
      } catch (storageErr) {
        console.warn('Could not delete image from storage:', storageErr);
      }
    }
    await ecommerceAPI.deleteHeroSlide(deleting.value.id);
    showDelete.value = false;
    successMsg.value = 'Slide eliminado';
    await fetchSlides();
  } catch {
    errorMsg.value = 'Error al eliminar slide';
  } finally {
    saving.value = false;
  }
}

onMounted(fetchSlides);
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Slides del Carrusel (Hero)</h3>
      <button @click="openModal(null)" class="dt-btn-primary">
        <span class="material-symbols-outlined text-sm mr-1" data-icon="add">add</span>
        Nuevo Slide
      </button>
    </div>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />
    <Loading v-if="loading" />

    <div v-else-if="slides.length === 0" class="text-sm text-gray-500 text-center py-8">No hay slides configurados. ¡Crea el primero!</div>

    <div v-else class="space-y-4">
      <div v-for="(slide, index) in slides" :key="slide.id"
        class="dt-card p-4 flex flex-col md:flex-row gap-4 items-start"
        :style="{ borderColor: slide.is_active ? '#624200' : '' }"
      >
        <!-- Imagen preview -->
        <div class="w-full md:w-48 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
          <img v-if="slide.image_url" :src="slide.image_url" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-500 text-xs">Sin imagen</div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-medium text-gray-400">#{{ index + 1 }}</span>
            <span v-if="slide.is_active" class="dt-badge dt-badge-success" style="font-size: 0.75rem;">Activo</span>
            <span v-else class="dt-badge dt-badge-disabled" style="font-size: 0.75rem;">Inactivo</span>
          </div>
          <h4 class="font-medium truncate" style="color: #0b1c30;">{{ slide.badge || 'Sin badge' }}</h4>
          <p class="text-sm text-gray-500 truncate">{{ slide.title_line1 }} {{ slide.title_line2 }}</p>
          <p class="text-xs text-gray-400 mt-1 truncate">{{ slide.description }}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 flex-shrink-0">
          <button @click="openModal(slide)" class="dt-btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">Editar</button>
          <button @click="confirmDelete(slide)" class="dt-btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem; border-color: #ef4444; color: #ef4444;">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal Slide -->
    <Modal :show="showModal" :title="editing ? 'Editar Slide' : 'Nuevo Slide'" @close="closeModal" size="lg">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Badge (etiqueta)</label>
            <input v-model="form.badge" class="form-input" placeholder="Elite Animal Companionship" />
          </div>
          <div>
            <label class="form-label">Orden</label>
            <input v-model.number="form.sort_order" type="number" min="0" class="form-input" />
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Título Línea 1</label>
            <input v-model="form.title_line1" class="form-input" placeholder="The Luxury" />
          </div>
          <div>
            <label class="form-label">Título Línea 2</label>
            <input v-model="form.title_line2" class="form-input" placeholder="Pet Atelier." />
          </div>
        </div>
        <div>
          <label class="form-label">Estilo Línea 2</label>
          <select v-model="form.title_line2_style" class="form-input">
            <option value="italic">Cursiva (italic)</option>
            <option value="normal">Normal</option>
          </select>
        </div>
        <div>
          <label class="form-label">Descripción</label>
          <textarea v-model="form.description" class="form-input" rows="2" placeholder="Descripción del slide"></textarea>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Texto Botón 1</label>
            <input v-model="form.button1_text" class="form-input" placeholder="Explore Collection" />
          </div>
          <div>
            <label class="form-label">URL Botón 1</label>
            <input v-model="form.button1_url" class="form-input" placeholder="#products" />
          </div>
          <div>
            <label class="form-label">Texto Botón 2</label>
            <input v-model="form.button2_text" class="form-input" placeholder="Our Story" />
          </div>
          <div>
            <label class="form-label">URL Botón 2</label>
            <input v-model="form.button2_url" class="form-input" placeholder="#story" />
          </div>
        </div>

        <!-- Imagen: Upload a Storage -->
        <div class="border-t border-white/10 pt-4">
          <label class="form-label">Imagen del Slide</label>
          <div class="mt-2 flex flex-col md:flex-row gap-4 items-start">
            <!-- Upload area -->
            <div
              class="relative w-full md:w-64 h-40 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 transition-all flex flex-col items-center justify-center cursor-pointer bg-white/5 hover:bg-white/10 overflow-hidden"
              @click="triggerUpload"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="onDrop"
              :class="{ 'bg-primary/10 border-primary': uploading, 'border-primary/50': dragOver }"
            >
              <!-- Preview si ya hay imagen -->
              <img v-if="form.image_url && !previewFile" :src="form.image_url" class="absolute inset-0 w-full h-full object-cover" />
              <!-- Preview local mientras se sube -->
              <img v-if="previewFile" :src="previewFile" class="absolute inset-0 w-full h-full object-cover" />

              <!-- Overlay con icono si hay imagen -->
              <div v-if="form.image_url || previewFile" class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-3xl text-white" data-icon="cloud_upload">cloud_upload</span>
              </div>

              <!-- Placeholder si no hay imagen -->
              <div v-if="!form.image_url && !previewFile" class="text-center p-4">
                <span class="material-symbols-outlined text-3xl text-gray-400 mb-2" data-icon="add_photo_alternate">add_photo_alternate</span>
                <p class="text-xs text-gray-400">Click o arrastra una imagen aquí</p>
                <p class="text-xs text-gray-500 mt-1">PNG, JPG, WebP • Max 10MB</p>
              </div>

              <!-- Spinner de carga -->
              <div v-if="uploading" class="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span class="material-symbols-outlined animate-spin text-3xl text-white" data-icon="refresh">refresh</span>
              </div>

              <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" class="hidden" @change="onFileSelected" />
            </div>

            <!-- Info / URL actual -->
            <div class="flex-1 min-w-0">
              <div v-if="form.image_url" class="mb-2">
                <label class="text-xs text-gray-400 mb-1 block">URL actual:</label>
                <div class="flex gap-2">
                  <input :value="form.image_url" class="form-input text-xs flex-1" readonly @focus="$event.target.select()" />
                  <button type="button" @click="clearImage" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-400/10 flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm" data-icon="delete">delete</span>
                    Quitar
                  </button>
                </div>
              </div>
              <div class="flex gap-2 items-center">
                <span class="text-xs text-gray-500">O ingresa una URL manualmente:</span>
                <input v-model="form.image_url" class="form-input flex-1 text-xs" placeholder="https://ejemplo.com/imagen.jpg" />
              </div>
              <p class="text-xs text-amber-400/80 mt-2 flex items-center gap-1">
                <span class="material-symbols-outlined text-sm" data-icon="info">info</span>
                Al subir una imagen se guarda en Supabase Storage y el trigger actualiza automáticamente la URL.
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="form.is_active" id="slide_active" class="w-4 h-4 rounded border-white/20" />
          <label for="slide_active" class="text-sm" style="color: #4f4539;">Slide activo</label>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button type="button" @click="closeModal" class="dt-btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving || uploading" class="dt-btn-primary">
            <span v-if="saving" class="material-symbols-outlined animate-spin inline-block mr-2" data-icon="refresh">refresh</span>
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
import Modal from '../../components/shared/Modal.vue';
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue';
import Alert from '../../components/shared/Alert.vue';
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

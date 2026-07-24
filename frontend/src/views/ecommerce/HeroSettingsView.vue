<template>
  <div>
    <!-- Page Header -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> panorama </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Configuración de Hero"
            description="Personaliza el Hero de la Landing Page"
            tag="h1"
          />
        </div>
        <div class="header-actions"></div>
      </div>
    </div>
    <div class="max-w-4xl mx-auto aurora-raised-card">

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" class="mb-md" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-md" />

    <FormSkeleton v-if="loading" />

    <form v-else @submit.prevent="handleSave" class="flex flex-col gap-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Badge (etiqueta superior)</label>
          <input v-model="form.badge" class="aurora-input" placeholder="Elite Animal Companionship" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Título - Línea 1</label>
          <input v-model="form.title_line1" class="aurora-input" placeholder="The Luxury" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Título - Línea 2</label>
          <input v-model="form.title_line2" class="aurora-input" placeholder="Pet Atelier." />
        </div>
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Estilo línea 2</label>
          <select v-model="form.title_line2_style" class="aurora-select">
            <option value="italic">Cursiva</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Descripción</label>
        <textarea v-model="form.description" class="aurora-textarea" rows="3" placeholder="Descripción principal del hero"></textarea>
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

      <div class="pt-6" style="border-top: 1px solid var(--aurora-outline-variant);">
        <div class="flex items-center gap-2 pb-2 mb-4" style="border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary); font-size: 1.25rem;">image</span>
          <h4 class="text-on-surface" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600;">Imágenes</h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Imagen Principal</label>
            <input v-model="form.image_main_url" class="aurora-input" placeholder="URL de imagen principal" />
            <img v-if="form.image_main_url" :src="form.image_main_url" class="mt-2 w-full h-32 object-cover rounded-lg" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Imagen Superior Izquierda</label>
            <input v-model="form.image_top_url" class="aurora-input" placeholder="URL" />
            <img v-if="form.image_top_url" :src="form.image_top_url" class="mt-2 w-full h-32 object-cover rounded-lg" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Imagen Inferior Derecha</label>
            <input v-model="form.image_bottom_url" class="aurora-input" placeholder="URL" />
            <img v-if="form.image_bottom_url" :src="form.image_bottom_url" class="mt-2 w-full h-32 object-cover rounded-lg" />
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="pt-6" style="border-top: 1px solid var(--aurora-outline-variant);">
        <div class="flex items-center gap-2 pb-2 mb-4" style="border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary); font-size: 1.25rem;">visibility</span>
          <h4 class="text-on-surface" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600;">Vista Previa</h4>
        </div>
        <div class="aurora-raised-card" style="background: #151215;">
          <span class="text-xs uppercase tracking-widest mb-3 block" style="color: #e9b3fc;">{{ form.badge }}</span>
          <h2 class="text-3xl mb-2" style="color: #e8e0e4;">
            {{ form.title_line1 }} <span style="color: #ebb5ea;" :class="form.title_line2_style === 'italic' ? 'italic' : ''">{{ form.title_line2 }}</span>
          </h2>
          <p class="max-w-lg mb-4" style="color: #988d99;">{{ form.description }}</p>
          <div class="flex gap-3">
            <span class="px-5 py-2 rounded-full text-sm" style="background: #ebb5ea; color: #151215;">{{ form.button1_text }}</span>
            <span class="px-5 py-2 border border-white/20 rounded-full text-sm" style="color: #e8e0e4;">{{ form.button2_text }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <button type="submit" :disabled="saving" class="aurora-btn-primary">
          <span v-if="saving" class="material-symbols-outlined animate-spin">refresh</span>
          <span v-else class="material-symbols-outlined" style="font-size: 1.125rem;">save</span>
          Guardar Cambios
        </button>
      </div>
    </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';
import PageHeader from '../../components/shared/PageHeader.vue';
import Alert from '../../components/shared/Alert.vue';
import FormSkeleton from '../../components/skeletons/FormSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';

const loading = ref(true);
const saving = ref(false);
const successMsg = ref('');
const errorMsg = ref('');

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
  image_main_url: '',
  image_top_url: '',
  image_bottom_url: ''
});

onMounted(async () => {
  try {
    const res = await ecommerceAPI.getHero();
    if (res.data && typeof res.data === 'object') {
      form.value = { ...form.value, ...res.data };
    }
  } catch (e) {
    console.warn('Error loading hero settings:', e);
  } finally {
    loading.value = false;
  }
});

const handleSave = async () => {
  saving.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await ecommerceAPI.updateHero(form.value);
    successMsg.value = 'Configuración del Hero guardada exitosamente';
  } catch (e) {
    errorMsg.value = e.response?.data?.error?.message || 'Error al guardar';
  } finally {
    saving.value = false;
    setTimeout(() => successMsg.value = '', 3000);
  }
};
</script>

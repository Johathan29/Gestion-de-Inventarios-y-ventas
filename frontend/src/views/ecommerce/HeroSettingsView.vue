<template>
  <div class="card p-6 max-w-4xl mx-auto">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Configuración de Hero (Landing Page)</h3>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <Loading v-if="loading" />

    <form v-else @submit.prevent="handleSave" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Badge (etiqueta superior)</label>
          <input v-model="form.badge" class="form-input" placeholder="Elite Animal Companionship" />
        </div>
        <div>
          <label class="form-label">Título - Línea 1</label>
          <input v-model="form.title_line1" class="form-input" placeholder="The Luxury" />
        </div>
        <div>
          <label class="form-label">Título - Línea 2</label>
          <input v-model="form.title_line2" class="form-input" placeholder="Pet Atelier." />
        </div>
        <div>
          <label class="form-label">Estilo línea 2</label>
          <select v-model="form.title_line2_style" class="form-input">
            <option value="italic">Cursiva</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      <div>
        <label class="form-label">Descripción</label>
        <textarea v-model="form.description" class="form-input" rows="3" placeholder="Descripción principal del hero"></textarea>
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

      <div class="border-t border-white/10 pt-6">
        <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-4">Imágenes</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="form-label">Imagen Principal</label>
            <input v-model="form.image_main_url" class="form-input text-xs" placeholder="URL de imagen principal" />
            <img v-if="form.image_main_url" :src="form.image_main_url" class="mt-2 w-full h-32 object-cover rounded-lg" />
          </div>
          <div>
            <label class="form-label">Imagen Superior Izquierda</label>
            <input v-model="form.image_top_url" class="form-input text-xs" placeholder="URL" />
            <img v-if="form.image_top_url" :src="form.image_top_url" class="mt-2 w-full h-32 object-cover rounded-lg" />
          </div>
          <div>
            <label class="form-label">Imagen Inferior Derecha</label>
            <input v-model="form.image_bottom_url" class="form-input text-xs" placeholder="URL" />
            <img v-if="form.image_bottom_url" :src="form.image_bottom_url" class="mt-2 w-full h-32 object-cover rounded-lg" />
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="border-t border-white/10 pt-6">
        <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-4">Vista Previa</h4>
        <div class="bg-[#151215] rounded-2xl p-8 border border-white/10">
          <span class="text-xs uppercase tracking-widest text-[#e9b3fc] mb-3 block">{{ form.badge }}</span>
          <h2 class="text-3xl text-[#e8e0e4] mb-2">
            {{ form.title_line1 }} <span class="text-[#ebb5ea]" :class="form.title_line2_style === 'italic' ? 'italic' : ''">{{ form.title_line2 }}</span>
          </h2>
          <p class="text-[#988d99] max-w-lg mb-4">{{ form.description }}</p>
          <div class="flex gap-3">
            <span class="px-5 py-2 bg-[#ebb5ea] text-[#151215] rounded-full text-sm">{{ form.button1_text }}</span>
            <span class="px-5 py-2 border border-white/20 rounded-full text-sm text-[#e8e0e4]">{{ form.button2_text }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <button type="submit" :disabled="saving" class="btn btn-primary">
          <span v-if="saving" class="material-symbols-outlined animate-spin inline-block mr-2" data-icon="refresh">refresh</span>
          Guardar Cambios
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';
import Alert from '../../components/shared/Alert.vue';
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

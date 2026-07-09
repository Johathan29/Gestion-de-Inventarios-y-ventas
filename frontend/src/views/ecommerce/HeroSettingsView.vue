<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Configuración de Hero</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">Personaliza el Hero de la Landing Page</p>
      </div>
    </div>
    <div class="max-w-4xl mx-auto bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <Loading v-if="loading" />

    <form v-else @submit.prevent="handleSave" class="flex flex-col gap-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Badge (etiqueta superior)</label>
          <input v-model="form.badge"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            placeholder="Elite Animal Companionship"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Título - Línea 1</label>
          <input v-model="form.title_line1"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            placeholder="The Luxury"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Título - Línea 2</label>
          <input v-model="form.title_line2"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            placeholder="Pet Atelier."
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Estilo línea 2</label>
          <select v-model="form.title_line2_style"
            class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
            :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: '#ffffff', border: '1.5px solid #E5E7EB' }"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
            <option value="italic">Cursiva</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Descripción</label>
        <textarea v-model="form.description" class="w-full rounded-lg px-3 py-2.5 transition-all resize-none" rows="3"
          style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
          placeholder="Descripción principal del hero"
          @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
          @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }"></textarea>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Texto Botón 1</label>
          <input v-model="form.button1_text"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            placeholder="Explore Collection"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">URL Botón 1</label>
          <input v-model="form.button1_url"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            placeholder="#products"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Texto Botón 2</label>
          <input v-model="form.button2_text"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            placeholder="Our Story"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">URL Botón 2</label>
          <input v-model="form.button2_url"
            class="w-full rounded-lg px-3 py-2.5 transition-all"
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            placeholder="#story"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
      </div>

      <div class="pt-6" style="border-top: 1px solid #d2c4b4;">
        <div class="flex items-center gap-2 pb-2 mb-4" style="border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200; font-size: 1.25rem;">image</span>
          <h4 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: #0b1c30;">Imágenes</h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Imagen Principal</label>
            <input v-model="form.image_main_url"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="URL de imagen principal"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            <img v-if="form.image_main_url" :src="form.image_main_url" class="mt-2 w-full h-32 object-cover rounded-lg" />
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Imagen Superior Izquierda</label>
            <input v-model="form.image_top_url"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="URL"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            <img v-if="form.image_top_url" :src="form.image_top_url" class="mt-2 w-full h-32 object-cover rounded-lg" />
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Imagen Inferior Derecha</label>
            <input v-model="form.image_bottom_url"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="URL"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            <img v-if="form.image_bottom_url" :src="form.image_bottom_url" class="mt-2 w-full h-32 object-cover rounded-lg" />
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="pt-6" style="border-top: 1px solid #d2c4b4;">
        <div class="flex items-center gap-2 pb-2 mb-4" style="border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200; font-size: 1.25rem;">visibility</span>
          <h4 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: #0b1c30;">Vista Previa</h4>
        </div>
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
        <button type="submit" :disabled="saving"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
          style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
          <span v-if="saving" class="material-symbols-outlined animate-spin" data-icon="refresh">refresh</span>
          <span v-else class="material-icons-outlined" style="font-size: 1.125rem;">save</span>
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

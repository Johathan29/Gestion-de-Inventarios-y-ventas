<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);"
    @click.self="close">
    <div class="bg-white rounded-[20px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      style="animation: modalIn 0.2s ease-out;">
      <div class="p-6 border-b border-[#d2c4b4]/20">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold" style="color: #0b1c30; font-family: 'Plus Jakarta Sans', sans-serif;">
            {{ isEditing ? 'Editar Cliente' : 'Nuevo Cliente' }}
          </h3>
          <button @click="close" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <span class="material-icons-outlined" style="font-size: 1.25rem;">close</span>
          </button>
        </div>
      </div>
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <!-- Name -->
        <div>
          <label class="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style="color: #4f4539;">Nombre *</label>
          <input v-model="form.name" required type="text" placeholder="Nombre completo"
            class="w-full rounded-lg px-3 py-2.5 text-sm bg-white transition-all" style="border: 1.5px solid #E5E7EB; color: #0b1c30; font-family: 'Inter', sans-serif;" />
        </div>

        <!-- Email -->
        <div>
          <label class="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style="color: #4f4539;">Email *</label>
          <input v-model="form.email" required type="email" placeholder="cliente@ejemplo.com"
            class="w-full rounded-lg px-3 py-2.5 text-sm bg-white transition-all" style="border: 1.5px solid #E5E7EB; color: #0b1c30; font-family: 'Inter', sans-serif;" />
        </div>

        <!-- Phone & Document side by side -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style="color: #4f4539;">Teléfono</label>
            <input v-model="form.phone" type="text" placeholder="+57 300... "
              class="w-full rounded-lg px-3 py-2.5 text-sm bg-white transition-all" style="border: 1.5px solid #E5E7EB; color: #0b1c30; font-family: 'Inter', sans-serif;" />
          </div>
          <div>
            <label class="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style="color: #4f4539;">Documento</label>
            <input v-model="form.document_id" type="text" placeholder="CC 123456789"
              class="w-full rounded-lg px-3 py-2.5 text-sm bg-white transition-all" style="border: 1.5px solid #E5E7EB; color: #0b1c30; font-family: 'Inter', sans-serif;" />
          </div>
        </div>

        <!-- Password (only when creating) -->
        <div v-if="!isEditing">
          <label class="block mb-1.5 text-xs font-semibold uppercase tracking-wider" style="color: #4f4539;">Contraseña *</label>
          <input v-model="form.password" type="password" placeholder="Mínimo 8 caracteres" :required="!isEditing" minlength="8"
            class="w-full rounded-lg px-3 py-2.5 text-sm bg-white transition-all" style="border: 1.5px solid #E5E7EB; color: #0b1c30; font-family: 'Inter', sans-serif;" />
          <p class="text-xs mt-1" style="color: #94a3b8;">Se creará una cuenta de acceso para el cliente</p>
        </div>

        <!-- Active toggle -->
        <div class="flex items-center gap-3 py-2">
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="form.is_active" class="sr-only peer" />
            <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"
              :class="form.is_active !== false ? 'peer-checked:bg-green-500' : ''"></div>
          </label>
          <span class="text-sm font-medium" style="color: #0b1c30;">Cliente activo</span>
        </div>

        <!-- Error -->
        <div v-if="error" class="p-3 rounded-lg text-sm" style="background: #fef2f2; color: #dc2626;">
          {{ error }}
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-[#d2c4b4]/20">
          <button type="button" @click="close"
            class="px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 border-2"
            style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif;">
            Cancelar
          </button>
          <button type="submit" :disabled="saving"
            class="px-5 py-2.5 text-sm font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center gap-2"
            style="background: #624200; color: white; font-family: Inter, sans-serif; min-width: 120px; justify-content: center;"
            :style="saving ? { opacity: 0.7 } : {}">
            <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Cliente') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { clientsAPI } from '../../api';

const props = defineProps({
  visible: { type: Boolean, default: false },
  client: { type: Object, default: null }
});

const emit = defineEmits(['close', 'saved']);

const isEditing = ref(false);
const saving = ref(false);
const error = ref(null);
const form = reactive({
  name: '',
  email: '',
  phone: '',
  document_id: '',
  password: '',
  is_active: true
});

function resetForm() {
  form.name = '';
  form.email = '';
  form.phone = '';
  form.document_id = '';
  form.password = '';
  form.is_active = true;
  error.value = null;
}

watch(() => props.client, (val) => {
  if (val) {
    isEditing.value = true;
    form.name = val.name || '';
    form.email = val.email || '';
    form.phone = val.phone || '';
    form.document_id = val.document_id || '';
    form.password = '';
    form.is_active = val.is_active !== false;
  } else {
    isEditing.value = false;
    resetForm();
  }
}, { immediate: true });

watch(() => props.visible, (val) => {
  if (val && !props.client) {
    resetForm();
  }
});

const close = () => {
  if (saving.value) return;
  emit('close');
};

const handleSubmit = async () => {
  saving.value = true;
  error.value = null;
  try {
    if (isEditing.value) {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        document_id: form.document_id,
        is_active: form.is_active
      };
      if (form.password) payload.password = form.password;
      await clientsAPI.update(props.client.id, payload);
    } else {
      await clientsAPI.create({
        name: form.name,
        email: form.email,
        phone: form.phone,
        document_id: form.document_id,
        password: form.password,
        is_active: true
      });
    }
    emit('saved');
    close();
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Error al guardar el cliente';
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
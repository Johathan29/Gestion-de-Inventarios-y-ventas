<template>
  <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 md:p-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h2>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <span class="material-symbols-outlined text-5xl text-red-400 mb-3">error</span>
      <p class="text-red-500">{{ error }}</p>
      <button @click="fetchProfile" class="mt-4 text-primary hover:underline text-sm">Reintentar</button>
    </div>

    <!-- Perfil -->
    <div v-else class="space-y-6">
      <!-- Avatar -->
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <span class="material-symbols-outlined text-4xl text-primary">account_circle</span>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-900">{{ profile.name || 'Sin nombre' }}</h3>
          <p class="text-sm text-gray-500">{{ profile.email }}</p>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Nombre Completo</label>
          <p class="text-gray-900 font-medium mt-1">{{ profile.name || '—' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Correo Electrónico</label>
          <p class="text-gray-900 font-medium mt-1">{{ profile.email || '—' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Teléfono</label>
          <p class="text-gray-900 font-medium mt-1">{{ profile.phone || '—' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Tipo de Documento</label>
          <p class="text-gray-900 font-medium mt-1">{{ profile.document_type || '—' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Número de Documento</label>
          <p class="text-gray-900 font-medium mt-1">{{ profile.document_number || '—' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Dirección</label>
          <p class="text-gray-900 font-medium mt-1">{{ profile.address || '—' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Ciudad</label>
          <p class="text-gray-900 font-medium mt-1">{{ profile.city || '—' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Estado / Provincia</label>
          <p class="text-gray-900 font-medium mt-1">{{ profile.state || '—' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Código Postal</label>
          <p class="text-gray-900 font-medium mt-1">{{ profile.postal_code || '—' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Miembro desde</label>
          <p class="text-gray-900 font-medium mt-1">{{ formatDate(profile.created_at) }}</p>
        </div>
      </div>

      <!-- Botón editar (placeholder) -->
      <div class="pt-4 flex justify-end">
        <button
          @click="editing = !editing"
          class="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-md"
        >
          <span class="material-symbols-outlined text-lg">{{ editing ? 'close' : 'edit' }}</span>
          {{ editing ? 'Cancelar' : 'Editar Perfil' }}
        </button>
      </div>

      <!-- Formulario de edición -->
      <transition name="fade">
        <div v-if="editing" class="border-t pt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Editar Información</h3>
          <form @submit.prevent="updateProfile" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input v-model="form.name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input v-model="form.phone" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
              <select v-model="form.document_type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">Seleccionar</option>
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="NIT">NIT</option>
                <option value="RUC">RUC</option>
                <option value="DNI">DNI</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Número de Documento</label>
              <input v-model="form.document_number" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input v-model="form.address" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input v-model="form.city" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado / Provincia</label>
              <input v-model="form.state" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
              <input v-model="form.postal_code" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div class="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" :disabled="saving" class="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-md disabled:opacity-50">
                <span v-if="saving" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
          <p v-if="successMsg" class="mt-4 text-green-600 text-sm flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">check_circle</span>
            {{ successMsg }}
          </p>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { clientsAPI } from '../../api';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();

const loading = ref(true);
const error = ref(null);
const editing = ref(false);
const saving = ref(false);
const successMsg = ref('');
const profile = ref({});

const form = reactive({
  name: '',
  phone: '',
  document_type: '',
  document_number: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
});

async function fetchProfile() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await clientsAPI.getByUserId(authStore.user.id);
    profile.value = data || {};
    // Llenar formulario
    form.name = data?.name || '';
    form.phone = data?.phone || '';
    form.document_type = data?.document_type || '';
    form.document_number = data?.document_number || '';
    form.address = data?.address || '';
    form.city = data?.city || '';
    form.state = data?.state || '';
    form.postal_code = data?.postal_code || '';
  } catch (e) {
    if (e.response?.status === 404) {
      // Si no existe el cliente, crear uno con datos del user
      profile.value = {
        name: authStore.user?.name || '',
        email: authStore.user?.email || '',
      };
    } else {
      error.value = 'Error al cargar el perfil';
    }
  } finally {
    loading.value = false;
  }
}

async function updateProfile() {
  saving.value = true;
  successMsg.value = '';
  try {
    const payload = {
      name: form.name,
      phone: form.phone,
      document_type: form.document_type,
      document_number: form.document_number,
      address: form.address,
      city: form.city,
      state: form.state,
      postal_code: form.postal_code,
    };

    if (profile.value.id) {
      await clientsAPI.update(profile.value.id, payload);
    } else {
      const { data } = await clientsAPI.create({ ...payload, user_id: authStore.user.id, email: authStore.user.email });
      profile.value.id = data.id;
    }

    // Actualizar también el nombre en authStore
    authStore.updateProfile({ name: form.name });

    successMsg.value = 'Perfil actualizado correctamente';
    setTimeout(() => { successMsg.value = ''; }, 3000);
  } catch (e) {
    error.value = 'Error al guardar los cambios';
  } finally {
    saving.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

onMounted(fetchProfile);
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

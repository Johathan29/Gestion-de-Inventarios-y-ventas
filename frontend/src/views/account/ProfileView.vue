<template>
  <div class="glass-card rounded-[24px] p-6 md:p-8">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-8">
      <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
        <span class="material-symbols-outlined text-primary text-xl">person</span>
      </div>
      <div>
        <h2 class="font-headline-sm text-headline-sm text-on-surface">Mi Perfil</h2>
        <p class="text-sm text-on-surface-variant/60">Gestiona tu información personal</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center py-16">
      <span class="material-symbols-outlined text-5xl text-red-400 mb-3">error</span>
      <p class="text-red-400 text-sm">{{ error }}</p>
      <button @click="fetchProfile" class="mt-4 text-primary hover:underline text-sm font-medium">Reintentar</button>
    </div>

    <!-- Perfil -->
    <div v-else class="space-y-8">
      <!-- Avatar + Info principal -->
      <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-white/10">
        <div class="relative">
          <div class="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30 ring-offset-2 ring-offset-[#151215]">
            <span class="material-symbols-outlined text-5xl text-primary">account_circle</span>
          </div>
        </div>
        <div class="text-center sm:text-left">
          <h3 class="font-headline-sm text-headline-sm text-on-surface">{{ profile.name || 'Sin nombre' }}</h3>
          <p class="text-on-surface-variant/60 text-sm mt-0.5">{{ profile.email }}</p>
          <span class="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
            <span class="material-symbols-outlined text-xs">verified</span>
            Cliente verificad{{ profile.document_type === 'CC' ? 'o' : 'a' }}
          </span>
        </div>
      </div>

      <!-- Info Grid -->
      <div>
        <h4 class="font-label-md text-label-md text-on-surface mb-4">Información Personal</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="(field, idx) in infoFields" :key="idx" class="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <label class="text-[10px] text-on-surface-variant/40 uppercase tracking-widest font-medium">{{ field.label }}</label>
            <p class="text-on-surface font-medium mt-0.5 truncate">{{ field.value }}</p>
          </div>
        </div>
      </div>

      <!-- Botón editar -->
      <div class="flex justify-end pt-2">
        <button
          @click="editing = !editing"
          class="btn-primary flex items-center gap-2 px-6 py-2.5"
        >
          <span class="material-symbols-outlined text-lg">{{ editing ? 'close' : 'edit' }}</span>
          {{ editing ? 'Cancelar' : 'Editar Perfil' }}
        </button>
      </div>

      <!-- Formulario de edición -->
      <transition name="fade">
        <div v-if="editing" class="border-t border-white/10 pt-6">
          <h4 class="font-label-md text-label-md text-on-surface mb-4">Editar Información</h4>
          <form @submit.prevent="updateProfile" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Nombre</label>
              <input v-model="form.name" type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Teléfono</label>
              <input v-model="form.phone" type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Tipo de Documento</label>
              <select v-model="form.document_type" class="input-field">
                <option value="" class="bg-[#1e191e]">Seleccionar</option>
                <option value="CC" class="bg-[#1e191e]">Cédula de Ciudadanía</option>
                <option value="CE" class="bg-[#1e191e]">Cédula de Extranjería</option>
                <option value="NIT" class="bg-[#1e191e]">NIT</option>
                <option value="RUC" class="bg-[#1e191e]">RUC</option>
                <option value="DNI" class="bg-[#1e191e]">DNI</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Número de Documento</label>
              <input v-model="form.document_number" type="text" class="input-field" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Dirección</label>
              <input v-model="form.address" type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Ciudad</label>
              <input v-model="form.city" type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Estado / Provincia</label>
              <input v-model="form.state" type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Código Postal</label>
              <input v-model="form.postal_code" type="text" class="input-field" />
            </div>
            <div class="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" :disabled="saving" class="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50">
                <span v-if="saving" class="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
          <p v-if="successMsg" class="mt-4 text-green-400 text-sm flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">check_circle</span>
            {{ successMsg }}
          </p>
          <p v-if="errorMsg" class="mt-4 text-red-400 text-sm flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">error</span>
            {{ errorMsg }}
          </p>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { clientsAPI } from '../../api';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();

const loading = ref(true);
const error = ref(null);
const editing = ref(false);
const saving = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
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

const infoFields = computed(() => [
  { label: 'Nombre Completo', value: profile.value.name || '—' },
  { label: 'Correo Electrónico', value: profile.value.email || '—' },
  { label: 'Teléfono', value: profile.value.phone || '—' },
  { label: 'Tipo de Documento', value: profile.value.document_type || '—' },
  { label: 'Número de Documento', value: profile.value.document_number || '—' },
  { label: 'Dirección', value: profile.value.address || '—' },
  { label: 'Ciudad', value: profile.value.city || '—' },
  { label: 'Estado / Provincia', value: profile.value.state || '—' },
  { label: 'Código Postal', value: profile.value.postal_code || '—' },
  { label: 'Miembro desde', value: formatDate(profile.value.created_at) },
]);

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
  errorMsg.value = '';
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
    errorMsg.value = 'Error al guardar los cambios';
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

.input-field {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(233, 179, 252, 0.15);
  border-radius: 12px;
  color: #e8e0e4;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

.input-field:focus {
  border-color: rgba(233, 179, 252, 0.5);
  box-shadow: 0 0 0 3px rgba(233, 179, 252, 0.1);
}

.input-field::placeholder {
  color: rgba(232, 224, 228, 0.3);
}

select.input-field option {
  background: #1e191e;
  color: #e8e0e4;
}
</style>

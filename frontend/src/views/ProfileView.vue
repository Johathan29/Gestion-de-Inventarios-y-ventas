<template>
  <div class="max-w-3xl mx-auto">
    <!-- Profile Header -->
    <div class="relative mb-8">
      <!-- Cover -->
      <div class="h-48 rounded-2xl bg-gradient-to-r from-purple-600 via-primary-600 to-fuchsia-600 relative overflow-hidden">
        <div class="absolute inset-0 opacity-20">
          <div class="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div class="absolute -bottom-10 -left-10 w-60 h-60 bg-white rounded-full blur-3xl"></div>
        </div>
      </div>
      <!-- Avatar -->
      <div class="absolute -bottom-16 left-8">
        <div class="relative group cursor-pointer" @click="triggerAvatarUpload">
          <div class="w-32 h-32 rounded-2xl border-4 border-white dark:border-gray-800 bg-gradient-to-br from-purple-500 to-primary-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl transition-transform duration-300 group-hover:scale-105">
            {{ userInitials }}
          </div>
          <div class="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span class="material-icons-outlined text-white text-3xl">camera_alt</span>
          </div>
          <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
        </div>
      </div>
      <!-- Edit Button -->
      <div class="absolute bottom-4 right-8">
        <button @click="editing = !editing"
          class="px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shadow-lg"
          :class="editing
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30'">
          <span class="flex items-center gap-2">
            <span class="material-icons-outlined text-lg">{{ editing ? 'close' : 'edit' }}</span>
            {{ editing ? 'Cancelar' : 'Editar Perfil' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Profile Info -->
    <div class="mt-20">
      <div class="card p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ user?.name }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <span class="material-icons-outlined text-base">email</span>
              {{ user?.email }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {{ user?.role_name || user?.roles?.name || 'Usuario' }}
            </span>
            <span v-if="user?.is_active"
              class="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              Activo
            </span>
          </div>
        </div>

        <!-- Edit Form -->
        <form v-if="editing" @submit.prevent="saveProfile" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre Completo</label>
              <input v-model="form.name" type="text"
                class="input w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Tu nombre" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teléfono</label>
              <input v-model="form.phone" type="tel"
                class="input w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="+58 412 123 4567" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avatar URL</label>
              <input v-model="form.avatar_url" type="url"
                class="input w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="https://..." />
            </div>
          </div>

          <div class="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="submit" :disabled="saving"
              class="btn-primary px-8 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-primary-600 text-white font-medium hover:from-purple-700 hover:to-primary-700 disabled:opacity-50 transition-all duration-300 shadow-lg shadow-purple-600/20">
              <span class="flex items-center gap-2">
                <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span class="material-icons-outlined text-lg" v-else>save</span>
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </span>
            </button>
            <button type="button" @click="editing = false"
              class="px-6 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              Cancelar
            </button>
          </div>
        </form>

        <!-- View Mode -->
        <div v-else class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Teléfono</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white mt-1">{{ user?.phone || 'No registrado' }}</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Último Acceso</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white mt-1">{{ formatDate(user?.last_login) }}</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Miembro Desde</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white mt-1">{{ formatDate(user?.created_at) }}</p>
            </div>
            <div class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Rol</p>
              <p class="text-sm font-medium text-gray-900 dark:text-white mt-1 capitalize">{{ user?.role_name || user?.roles?.name || 'Usuario' }}</p>
            </div>
          </div>

          <!-- Security Section -->
          <div class="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span class="material-icons-outlined text-primary-500">security</span>
              Seguridad
            </h3>
            <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Contraseña</p>
                <p class="text-xs text-gray-500 mt-1">Último cambio: —</p>
              </div>
              <button class="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                Cambiar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { usersAPI } from '../api';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const userInitials = computed(() => {
  if (!user.value?.name) return '??';
  return user.value.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

const editing = ref(false);
const saving = ref(false);
const avatarInput = ref(null);

const form = ref({
  name: '',
  phone: '',
  avatar_url: ''
});

const populateForm = () => {
  if (user.value) {
    form.value.name = user.value.name || '';
    form.value.phone = user.value.phone || '';
    form.value.avatar_url = user.value.avatar_url || '';
  }
};

onMounted(populateForm);

// Watch for edit mode to populate form fresh
watch(editing, (isEditing) => {
  if (isEditing) populateForm();
});

const triggerAvatarUpload = () => {
  avatarInput.value?.click();
};

const handleAvatarChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  // For now just show the file name — real upload would go to server
  form.value.avatar_url = URL.createObjectURL(file);
};

const saveProfile = async () => {
  if (!user.value?.id) return;
  saving.value = true;
  try {
    await usersAPI.updateProfile({
      name: form.value.name,
      phone: form.value.phone,
      avatar_url: form.value.avatar_url
    });
    // Update local store
    authStore.updateProfile(form.value);
    editing.value = false;
  } catch (err) {
    console.error('Error saving profile:', err);
  } finally {
    saving.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};
</script>

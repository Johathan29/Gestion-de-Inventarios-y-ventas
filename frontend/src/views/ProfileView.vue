<template>
  <div class="max-w-3xl mx-auto">
    <!-- Profile Header -->
    <div class="relative mb-8">
      <!-- Cover -->
      <div class="h-48 rounded-2xl" style="background: linear-gradient(135deg, #624200, #795900, #a17808); position: relative; overflow: hidden;">
        <div class="absolute inset-0 opacity-20">
          <div class="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div class="absolute -bottom-10 -left-10 w-60 h-60 bg-white rounded-full blur-3xl"></div>
        </div>
      </div>
      <!-- Avatar -->
      <div class="absolute -bottom-16 left-8">
        <div class="relative group cursor-pointer" @click="triggerAvatarUpload">
          <div class="w-32 h-32 rounded-2xl border-4 border-white" style="background: linear-gradient(135deg, #624200, #795900); display: flex; align-items: center; justify-content: center; color: white; font-size: 2.25rem; font-weight: bold; box-shadow: 0 10px 15px -3px rgba(98,66,0,0.2); transition: transform 0.3s;" @mouseenter="e => e.currentTarget.style.transform = 'scale(1.05)'" @mouseleave="e => e.currentTarget.style.transform = ''">
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
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
      <div class="dt-card p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="dt-headline" style="margin-bottom: 0;">{{ user?.name }}</h2>
            <p class="dt-body-sm" style="color: #4f4539; display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-icons-outlined text-base">email</span>
              {{ user?.email }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="dt-badge dt-badge-info">
              {{ user?.role_name || user?.roles?.name || 'Usuario' }}
            </span>
            <span v-if="user?.is_active" class="dt-badge dt-badge-success">
              Activo
            </span>
          </div>
        </div>

        <!-- Edit Form -->
        <form v-if="editing" @submit.prevent="saveProfile" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="dt-label">Nombre Completo</label>
              <input v-model="form.name" type="text"
                class="dt-input"
                placeholder="Tu nombre" />
            </div>
            <div>
              <label class="dt-label">Teléfono</label>
              <input v-model="form.phone" type="tel"
                class="dt-input"
                placeholder="+58 412 123 4567" />
            </div>
            <div class="md:col-span-2">
              <label class="dt-label">Avatar URL</label>
              <input v-model="form.avatar_url" type="url"
                class="dt-input"
                placeholder="https://..." />
            </div>
          </div>

          <div class="flex items-center gap-3 pt-4" style="border-top: 1px solid #e2d6c8;">
            <button type="submit" :disabled="saving"
              class="dt-btn-primary">
              <span class="flex items-center gap-2">
                <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span class="material-icons-outlined text-lg" v-else>save</span>
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </span>
            </button>
            <button type="button" @click="editing = false"
              class="dt-btn-secondary">
              Cancelar
            </button>
          </div>
        </form>

        <!-- View Mode -->
        <div v-else class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-4 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <p class="dt-caption" style="text-transform: uppercase;">Teléfono</p>
              <p class="text-sm font-medium" style="color: #0b1c30; margin-top: 0.25rem;">{{ user?.phone || 'No registrado' }}</p>
            </div>
            <div class="p-4 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <p class="dt-caption" style="text-transform: uppercase;">Último Acceso</p>
              <p class="text-sm font-medium" style="color: #0b1c30; margin-top: 0.25rem;">{{ formatDate(user?.last_login) }}</p>
            </div>
            <div class="p-4 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <p class="dt-caption" style="text-transform: uppercase;">Miembro Desde</p>
              <p class="text-sm font-medium" style="color: #0b1c30; margin-top: 0.25rem;">{{ formatDate(user?.created_at) }}</p>
            </div>
            <div class="p-4 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <p class="dt-caption" style="text-transform: uppercase;">Rol</p>
              <p class="text-sm font-medium" style="color: #0b1c30; margin-top: 0.25rem; text-transform: capitalize;">{{ user?.role_name || user?.roles?.name || 'Usuario' }}</p>
            </div>
          </div>

          <!-- Security Section -->
          <div class="pt-6" style="border-top: 1px solid #e2d6c8;">
            <h3 class="dt-headline-sm" style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-icons-outlined" style="color: #624200;">security</span>
              Seguridad
            </h3>
            <div class="flex items-center justify-between p-4 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <div>
                <p class="text-sm font-medium" style="color: #0b1c30;">Contraseña</p>
                <p class="dt-caption">Último cambio: —</p>
              </div>
              <button class="dt-btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
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

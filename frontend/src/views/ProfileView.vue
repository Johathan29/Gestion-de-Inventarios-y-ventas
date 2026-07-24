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
          <div v-if="form.avatar_url" class="w-32 h-32 rounded-2xl border-4 border-white overflow-hidden" style="box-shadow: 0 10px 15px -3px rgba(98,66,0,0.2); transition: transform 0.3s;" @mouseenter="e => e.currentTarget.style.transform = 'scale(1.05)'" @mouseleave="e => e.currentTarget.style.transform = ''">
            <img :src="form.avatar_url" alt="Avatar" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-32 h-32 rounded-2xl border-4 border-white" style="background: linear-gradient(135deg, #624200, #795900); display: flex; align-items: center; justify-content: center; color: white; font-size: 2.25rem; font-weight: bold; box-shadow: 0 10px 15px -3px rgba(98,66,0,0.2); transition: transform 0.3s;" @mouseenter="e => e.currentTarget.style.transform = 'scale(1.05)'" @mouseleave="e => e.currentTarget.style.transform = ''">
            {{ userInitials }}
          </div>
          <div v-if="editing" class="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span v-if="uploading" class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else class="material-icons-outlined text-white text-3xl">camera_alt</span>
          </div>
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
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem; font-weight: 700; color: #0b1c30; margin: 0;">{{ user?.name }}</h2>
            <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; margin-top: 2px;">
              <span class="material-icons-outlined" style="font-size: 1rem;">email</span>
              {{ user?.email }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-medium" style="background: rgba(98,66,0,0.1); color: #624200;">
              {{ user?.role || user?.role_name || user?.roles?.name || 'Usuario' }}
            </span>
            <span v-if="user?.is_active" class="px-3 py-1 rounded-full text-xs font-medium" style="background: rgba(34,197,94,0.1); color: #166534;">
              Activo
            </span>
          </div>
        </div>

        <!-- Edit Form -->
        <form v-if="editing" @submit.prevent="saveProfile" class="flex flex-col gap-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Nombre Completo</label>
              <input v-model="form.name" type="text"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="Tu nombre"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Teléfono</label>
              <input v-model="form.phone" type="tel"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="+58 412 123 4567"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
            <div class="md:col-span-2">
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Avatar URL</label>
              <input v-model="form.avatar_url" type="url"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="https://..."
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>

          <div class="flex items-center gap-3 pt-4" style="border-top: 1px solid #d2c4b4;">
            <button type="submit" :disabled="saving"
              class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
              style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
              <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span class="material-icons-outlined" style="font-size: 1.125rem;" v-else>save</span>
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
            <button type="button" @click="editing = false"
              class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
              style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
              @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
              @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
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
              <p class="text-sm font-medium" style="color: #0b1c30; margin-top: 0.25rem; text-transform: capitalize;">{{ user?.role || user?.role_name || user?.roles?.name || 'Usuario' }}</p>
            </div>
          </div>

          <!-- Security Section -->
          <div class="pt-6" style="border-top: 1px solid #d2c4b4;">
            <div class="flex items-center gap-2 pb-2 mb-4" style="border-bottom: 1px solid #d2c4b4;">
              <span class="material-icons-outlined" style="color: #624200; font-size: 1.25rem;">security</span>
              <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: #0b1c30;">Seguridad</h3>
            </div>
            <div class="flex items-center justify-between p-4 rounded-xl" style="background: rgba(98,66,0,0.03);">
              <div>
                <p class="text-sm font-medium" style="color: #0b1c30; font-family: 'Inter', sans-serif;">Contraseña</p>
                <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 0.75rem;">Último cambio: —</p>
              </div>
              <button
                class="px-4 py-2 rounded-lg border-2 font-semibold transition-colors"
                style="border-color: #d2c4b4; color: #624200; font-family: 'Inter', sans-serif; font-size: 0.875rem;"
                @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
                @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
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
import { supabase } from '../api/supabase';

const AVATAR_BUCKET = 'avatars';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const userInitials = computed(() => {
  if (!user.value?.name) return '??';
  return user.value.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

const editing = ref(false);
const saving = ref(false);
const uploading = ref(false);
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
  if (!editing.value) return;
  avatarInput.value?.click();
};

const handleAvatarChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    const userId = user.value?.id;
    if (!userId) throw new Error('Usuario no autenticado');

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      // If bucket doesn't exist, create it and retry
      if (uploadError.message?.includes('bucket')) {
        await supabase.storage.createBucket(AVATAR_BUCKET, { public: true });
        const { error: retryError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(filePath, file, { upsert: true });
        if (retryError) throw retryError;
      } else {
        throw uploadError;
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    form.value.avatar_url = urlData?.publicUrl || '';
  } catch (err) {
    console.error('[Profile] Error uploading avatar:', err);
    // Fallback: keep local preview
    form.value.avatar_url = URL.createObjectURL(file);
  } finally {
    uploading.value = false;
  }
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

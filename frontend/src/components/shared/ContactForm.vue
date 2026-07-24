<template>
  <section id="contact" class="w-full py-20 px-4 md:px-8 relative overflow-hidden bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent">
    <!-- Decorative bg -->
    <div class="absolute inset-0 -z-10 opacity-10">
      <div class="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-pulse" />
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-[100px] animate-pulse" style="animation-delay: 2s" />
    </div>

    <div class="max-w-3xl mx-auto">
      <div class="text-center mb-14 entrance-reveal">
        <span class="inline-block px-4 py-1.5 text-sm font-semibold bg-primary/20 text-primary rounded-full border border-primary/30 mb-4">
          Contacto
        </span>
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Contáctanos</h2>
        <p class="text-white/60">Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos a la brevedad.</p>
      </div>

      <!-- Success Alert -->
      <div v-if="success" class="mb-8 p-6 bg-green-500/10 border border-green-500/30 rounded-2xl text-center entrance-reveal">
        <span class="material-symbols-outlined text-5xl text-green-400 mb-3">check_circle</span>
        <h3 class="text-xl font-semibold text-white mb-2">¡Mensaje enviado!</h3>
        <p class="text-white/60">Gracias por contactarnos. Te responderemos pronto.</p>
      </div>

      <!-- Error Alert -->
      <div v-if="submitError" class="mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center entrance-reveal">
        <span class="material-symbols-outlined text-5xl text-red-400 mb-3">error</span>
        <h3 class="text-xl font-semibold text-white mb-2">No se pudo enviar el mensaje</h3>
        <p class="text-white/60">Lo sentimos, no pudimos enviar tu mensaje. Por favor intenta más tarde.</p>
      </div>

      <!-- Form -->
      <form v-if="!success" @submit.prevent="handleSubmit" class="space-y-6 entrance-reveal bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-10">
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-white/80 italic mb-2">Nombre *</label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-5 py-3.5 bg-transparent border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary focus:bg-white/[0.05] transition-all"
              :class="{ 'border-red-500/50': fieldErrors.name }"
              placeholder="Tu nombre"
              @input="clearError('name')"
            />
            <p v-if="fieldErrors.name" class="mt-1.5 text-sm text-red-400">{{ fieldErrors.name }}</p>
          </div>
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-white/80 italic mb-2">Email *</label>
            <input
              v-model="form.email"
              type="email"
              class="w-full px-5 py-3.5 bg-transparent border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary focus:bg-white/[0.05] transition-all"
              :class="{ 'border-red-500/50': fieldErrors.email }"
              placeholder="tu@email.com"
              @input="clearError('email')"
            />
            <p v-if="fieldErrors.email" class="mt-1.5 text-sm text-red-400">{{ fieldErrors.email }}</p>
          </div>
        </div>

        <!-- Phone -->
        <div>
          <label class="block text-sm font-medium text-white/80 italic mb-2">Teléfono</label>
          <input
            v-model="form.phone"
            type="tel"
            class="w-full px-5 py-3.5 bg-transparent border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary focus:bg-white/[0.05] transition-all"
            placeholder="+52 555 123 4567"
          />
        </div>

        <!-- Message -->
        <div>
          <label class="block text-sm font-medium text-white/80 italic mb-2">Mensaje *</label>
          <textarea
            v-model="form.message"
            rows="5"
            class="w-full px-5 py-3.5 bg-transparent border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary focus:bg-white/[0.05] transition-all resize-none"
            :class="{ 'border-red-500/50': fieldErrors.message }"
            placeholder="Escribe tu mensaje aquí..."
            @input="clearError('message')"
          />
          <p v-if="fieldErrors.message" class="mt-1.5 text-sm text-red-400">{{ fieldErrors.message }}</p>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-4 bg-primary text-white rounded-full font-bold text-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <span v-if="submitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span v-else class="material-symbols-outlined">send</span>
          {{ submitting ? 'Enviando...' : 'Enviar mensaje' }}
        </button>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ecommerceAPI } from '../../api';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  name: '',
  email: '',
  phone: '',
  message: ''
});

const fieldErrors = reactive({
  name: '',
  email: '',
  message: ''
});

const submitting = ref(false);
const success = ref(false);
const submitError = ref(null);

onMounted(() => {
  // Auto-fill from auth if available
  if (authStore.isAuthenticated && authStore.user) {
    form.name = authStore.user.name || '';
    form.email = authStore.user.email || '';
  }
});

function clearError(field) {
  fieldErrors[field] = '';
  submitError.value = null;
}

function validate() {
  let valid = true;
  if (!form.name.trim()) {
    fieldErrors.name = 'El nombre es requerido';
    valid = false;
  }
  if (!form.email.trim()) {
    fieldErrors.email = 'El email es requerido';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    fieldErrors.email = 'Email inválido';
    valid = false;
  }
  if (!form.message.trim()) {
    fieldErrors.message = 'El mensaje es requerido';
    valid = false;
  }
  return valid;
}

async function handleSubmit() {
  // Verificar si el usuario está autenticado
  const token = sessionStorage.getItem('accessToken');
  if (!token) {
    router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  if (!validate()) return;
  submitting.value = true;
  submitError.value = null;
  try {
    await ecommerceAPI.createContactMessage({
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: form.message
    });
    success.value = true;
  } catch (err) {
    // Log detallado solo para admin (consola)
    console.error('[ContactForm] Error detallado al enviar mensaje:', err.response?.data || err.message);
    // Mensaje amigable para el usuario
    submitError.value = 'error';
  } finally {
    submitting.value = false;
  }
}
</script>

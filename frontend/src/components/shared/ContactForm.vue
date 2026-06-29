<template>
  <div class="max-w-7xl mx-auto">
<div 
  class="glass-card contact-aurora rounded-[48px] p-10 md:p-20 relative overflow-hidden entrance-reveal visible"
  data-tilt
>      <!-- Aurora -->
<div class="aurora-bg"></div>

<!-- Grid Glow -->
<div class="grid-glow"></div>

<!-- Partículas -->
<div class="particles">
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
</div>

<!-- Spotlight -->
<div class="mouse-light"></div>
      <!-- Contact Form Section -->
       <div class="w-full mb-8  flex flex-col items-center text-center">
         <h2 class="font-headline-lg text-headline-lg text-primary mb-md">¿Tienes preguntas?</h2>
          <p class="font-body-lg mx-auto w-lg text-body-lg text-on-surface-variant mb-lg">
            Estamos aquí para asesorarte en la mejor elección para tu mascota. Nuestro equipo de expertos te responderá en menos de 24 horas.
          </p>
       </div>
      <div class="flex flex-col md:flex-row gap-8 items-START  relative z-10">
        <!-- Left: Info -->
        <div class="flex-1 text-left space-y-6">
         
          <div v-if="companyInfo" class="space-y-5">
            <div v-if="companyInfo.address" class="flex items-center gap-4">
              <span class="material-symbols-outlined text-secondary">location_on</span>
              <span class="font-body-md text-body-md text-on-surface-variant">{{ companyInfo.address }}</span>
            </div>
            <div v-if="companyInfo.contact_email" class="flex items-center gap-4">
              <span class="material-symbols-outlined text-secondary">mail</span>
              <span class="font-body-md text-body-md text-on-surface-variant">{{ companyInfo.contact_email }}</span>
            </div>
            <div v-if="companyInfo.phone || companyInfo.whatsapp_number" class="flex items-center gap-4">
              <span class="material-symbols-outlined text-secondary">phone</span>
              <span class="font-body-md text-body-md text-on-surface-variant">{{ companyInfo.phone || companyInfo.whatsapp_number }}</span>
            </div>
          </div>
          <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d334.5459428138918!2d-70.03252133008934!3d18.4403396447643!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ea560638d98a3cb%3A0x8f670da4579a413a!2sAv.%20Florencio%20de%20Leon%2C%2091000!5e0!3m2!1ses!2sdo!4v1782588207513!5m2!1ses!2sdo" width="600"  style="border:0;" allowfullscreen="" class="h-[22rem] rounded-xl " loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>

       <form @submit.prevent="handleSubmit" class="max-w-2xl mx-auto text-left relative z-10 space-y-6">
        <!-- Success Message -->
        <div v-if="success"
          class="p-4 rounded-xl bg-[var(--success-bg)]/20 border border-[var(--success-text)]/30 text-[var(--success-text)] text-sm flex items-center gap-3">
          <span class="material-symbols-outlined text-lg" data-icon="check_circle">check_circle</span>
          <span>{{ successMsg }}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-2 text-left">Nombre</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full bg-black/30 border border-white/10 rounded-xl !px-5 !py-3.5 text-on-surface placeholder-[#988d99] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="Tu nombre"
            />
          </div>
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-2 text-left">Correo Electrónico</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="w-full bg-black/30 border border-white/10 rounded-xl !px-5 !py-3.5 text-on-surface placeholder-[#988d99] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>

        <!-- Subject -->
        <div>
          <label class="block text-sm font-medium text-on-surface-variant mb-2 text-left">Asunto</label>
          <input
            v-model="form.subject"
            type="text"
            required
            class="w-full bg-black/30 border border-white/10 rounded-xl !px-5 !py-3.5 text-on-surface placeholder-[#988d99] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            placeholder="¿Sobre qué deseas contactarnos?"
          />
        </div>

        <!-- Message -->
        <div>
          <label class="block text-sm font-medium text-on-surface-variant mb-2 text-left">Mensaje</label>
          <textarea
            v-model="form.message"
            required
            rows="5"
            class="w-full bg-black/30 border border-white/10 rounded-xl !px-5 !py-3.5 text-on-surface placeholder-[#988d99] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
            placeholder="Escribe tu mensaje aquí..."
          ></textarea>
        </div>

        <!-- Submit -->
        <div class="text-center">
          <button
            type="submit"
            :disabled="loading"
            class="magnetic-btn hover:cursor-pointer px-10 py-4 bg-secondary text-on-secondary rounded-full font-label-sm text-label-sm uppercase tracking-widest font-bold transition-all duration-300 hover:shadow-lg hover:shadow-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="material-symbols-outlined animate-spin inline-block" data-icon="refresh">refresh</span>
            <span v-else>Enviar Mensaje</span>
          </button>
        </div>
      </form>
          
        </div>
    
      </div>
    </div>

</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useEcommerceSettings } from '../../composables/useEcommerceSettings';

const { settings, fetchSettings } = useEcommerceSettings();

const companyInfo = computed(() => {
  if (!settings.value) return null;
  return {
    store_name: settings.value.store_name,
    contact_email: settings.value.contact_email,
    phone: settings.value.phone,
    whatsapp_number: settings.value.whatsapp_number,
    address: settings.value.address
  };
});

const form = reactive({
  name: '',
  email: '',
  message: '',
});

const loading = ref(false);
const success = ref(false);
const successMsg = ref('');

onMounted(() => {
  fetchSettings();
});

function handleSubmit() {
  loading.value = true;
  success.value = false;

  // Simulate sending (replace with actual API call)
  setTimeout(() => {
    loading.value = false;
    success.value = true;
    successMsg.value = 'Mensaje enviado con éxito. Te contactaremos pronto.';
    form.name = '';
    form.email = '';
    form.message = '';
  }, 1000);
}
</script>
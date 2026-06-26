<template>
  <div class="max-w-7xl mx-auto">
<div 
  class="glass-card contact-aurora rounded-[48px] p-10 md:p-20 text-center relative overflow-hidden entrance-reveal visible"
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
      <h2 class="font-headline-lg text-headline-lg text-on-surface mb-4 relative z-10">Contáctanos</h2>
      <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 relative z-10">
        Déjanos tu mensaje y te responderemos a la brevedad.
      </p>

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
            class="magnetic-btn px-10 py-4 bg-secondary text-on-secondary rounded-full font-label-sm text-label-sm uppercase tracking-widest font-bold transition-all duration-300 hover:shadow-lg hover:shadow-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="material-symbols-outlined animate-spin inline-block" data-icon="refresh">refresh</span>
            <span v-else>Enviar Mensaje</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
});

const loading = ref(false);
const success = ref(false);
const successMsg = ref('');

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
    form.subject = '';
    form.message = '';
  }, 1000);
}
document.querySelectorAll(".contact-aurora").forEach(card=>{

const light=card.querySelector(".mouse-light");

card.addEventListener("mousemove",e=>{

const rect=card.getBoundingClientRect();

const x=e.clientX-rect.left;
const y=e.clientY-rect.top;

card.style.setProperty("--x",x+"px");
card.style.setProperty("--y",y+"px");

const rotateY=((x-rect.width/2)/rect.width)*12;
const rotateX=((y-rect.height/2)/rect.height)*-12;

card.style.transform=`
perspective(1200px)
rotateX(${rotateX}deg)
rotateY(${rotateY}deg)
translateY(-8px)
scale(1.015)
`;

});

card.addEventListener("mouseleave",()=>{

card.style.transform=`
perspective(1200px)
rotateX(0)
rotateY(0)
translateY(0)
scale(1)
`;

});

});
</script>
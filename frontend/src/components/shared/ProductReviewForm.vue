<template>
  <div class="glass-card rounded-3xl p-8">
    <h3 class="font-headline-md text-headline-md text-on-surface mb-6">Deja tu Reseña</h3>

    <!-- Mensaje de éxito -->
    <div v-if="success"
      class="p-4 rounded-xl bg-[var(--success-bg)]/20 border border-[var(--success-text)]/30 text-[var(--success-text)] text-sm flex items-center gap-3 mb-6">
      <span class="material-symbols-outlined text-lg" data-icon="check_circle">check_circle</span>
      <span>{{ successMsg }}</span>
    </div>

    <!-- Error -->
    <div v-if="errorMsg"
      class="p-4 rounded-xl bg-[var(--error-bg)]/20 border border-[var(--error-text)]/30 text-[var(--error-text)] text-sm flex items-center gap-3 mb-6">
      <span class="material-symbols-outlined text-lg" data-icon="error">error</span>
      <span>{{ errorMsg }}</span>
    </div>

    <form v-if="!success" @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Rating estrellas -->
      <div>
        <label class="block text-sm font-medium text-on-surface-variant mb-3">Tu calificación</label>
        <div class="flex gap-2">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            @click="form.rating = star"
            @mouseenter="hoverRating = star"
            @mouseleave="hoverRating = 0"
            class="text-3xl transition-all duration-150"
            :class="star <= (hoverRating || form.rating) ? 'text-secondary scale-110' : 'text-white/20'"
          >
            <span class="material-symbols-outlined" :data-icon="star <= (hoverRating || form.rating) ? 'star' : 'star'" :style="getStarFill(star, hoverRating || form.rating)">star</span>
          </button>
        </div>
      </div>

      <!-- Nombre -->
      <div>
        <label class="block text-sm font-medium text-on-surface-variant mb-2">Nombre</label>
        <input
          v-model="form.client_name"
          type="text"
          required
          class="w-full bg-black/30 border border-white/10 rounded-xl !px-5 !py-3.5 text-on-surface placeholder-[#988d99] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          placeholder="Tu nombre"
        />
      </div>

      <!-- Título profesional (opcional) -->
      <div>
        <label class="block text-sm font-medium text-on-surface-variant mb-2">Título / Profesión (opcional)</label>
        <input
          v-model="form.client_title"
          type="text"
          class="w-full bg-black/30 border border-white/10 rounded-xl !px-5 !py-3.5 text-on-surface placeholder-[#988d99] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          placeholder="Ej: Diseñadora de Interiores"
        />
      </div>

      <!-- Título reseña -->
      <div>
        <label class="block text-sm font-medium text-on-surface-variant mb-2">Título de la reseña</label>
        <input
          v-model="form.title"
          type="text"
          class="w-full bg-black/30 border border-white/10 rounded-xl !px-5 !py-3.5 text-on-surface placeholder-[#988d99] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          placeholder="Un título breve para tu reseña"
        />
      </div>

      <!-- Comentario -->
      <div>
        <label class="block text-sm font-medium text-on-surface-variant mb-2">Comentario</label>
        <textarea
          v-model="form.comment"
          required
          rows="4"
          class="w-full bg-black/30 border border-white/10 rounded-xl !px-5 !py-3.5 text-on-surface placeholder-[#988d99] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
          placeholder="Comparte tu experiencia con este producto..."
        ></textarea>
      </div>

      <!-- Submit -->
      <div class="text-right">
        <button
          type="submit"
          :disabled="loading"
          class="magnetic-btn px-8 py-3.5 bg-secondary text-on-secondary rounded-full font-label-sm text-label-sm uppercase tracking-widest font-bold transition-all duration-300 hover:shadow-lg hover:shadow-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading" class="material-symbols-outlined animate-spin inline-block" data-icon="refresh">refresh</span>
          <span v-else>Enviar Reseña</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ecommerceAPI } from '../../api';

const props = defineProps({
  productId: { type: String, required: true }
});

const emit = defineEmits(['review-submitted']);

const loading = ref(false);
const success = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const hoverRating = ref(0);

const getStarFill = (starIndex, rating) => {
  if (starIndex <= rating) {
    return { 'font-variation-settings': '"FILL" 1' };
  }
  return {};
};

const form = reactive({
  product_id: props.productId,
  client_name: '',
  client_title: '',
  client_avatar_url: '',
  rating: 0,
  title: '',
  comment: ''
});

const handleSubmit = async () => {
  if (form.rating === 0) {
    errorMsg.value = 'Por favor selecciona una calificación';
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  success.value = false;

  try {
    const res = await ecommerceAPI.createReview({
      product_id: props.productId,
      client_name: form.client_name,
      client_title: form.client_title,
      rating: form.rating,
      title: form.title,
      comment: form.comment
    });

    if (res.data) {
      success.value = true;
      successMsg.value = res.message || 'Gracias por tu reseña. Será visible una vez aprobada.';
      // Reset form
      form.client_name = '';
      form.client_title = '';
      form.rating = 0;
      form.title = '';
      form.comment = '';
      emit('review-submitted', res.data);
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.error?.message || 'Error al enviar la reseña. Intenta de nuevo.';
  } finally {
    loading.value = false;
  }
};
</script>

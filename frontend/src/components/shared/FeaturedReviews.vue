<template>
  <section id="reviews" class="w-full py-20 px-4 md:px-8 relative overflow-hidden">
    <!-- Section bg -->
    <div class="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 entrance-reveal">
        <span class="inline-block px-4 py-1.5 text-sm font-semibold bg-primary/20 text-primary rounded-full border border-primary/30 mb-4">
          Reseñas
        </span>
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Lo que dicen nuestros clientes</h2>
        <p class="text-white/60 max-w-xl mx-auto">Opiniones reales de clientes satisfechos con nuestros productos premium.</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid md:grid-cols-3 gap-8">
        <div v-for="n in 3" :key="n" class="bg-white/5 backdrop-blur-sm rounded-2xl p-8 space-y-4 animate-pulse border border-white/5">
          <div class="flex gap-1">
            <div v-for="s in 5" :key="s" class="w-5 h-5 bg-white/10 rounded" />
          </div>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-white/10" />
            <div class="space-y-2">
              <div class="h-4 w-24 bg-white/10 rounded" />
              <div class="h-3 w-16 bg-white/10 rounded" />
            </div>
          </div>
          <div class="h-16 w-full bg-white/10 rounded-lg" />
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <span class="material-symbols-outlined text-5xl text-red-400 mb-4">star_half</span>
        <p class="text-white/60 mb-6">{{ error }}</p>
        <button @click="fetchReviews" class="px-6 py-2.5 bg-primary text-white rounded-full font-semibold hover:brightness-110 transition-all">
          Reintentar
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="reviews.length === 0" class="text-center py-12">
        <span class="material-symbols-outlined text-5xl text-white/20 mb-4">reviews</span>
        <p class="text-white/60">No hay reseñas destacadas aún.</p>
      </div>

      <!-- ========================================== -->
      <!-- SUCCESS – Timeline Layout                  -->
      <!-- ========================================== -->
      <div v-else class="timeline">
        <!-- Vertical center line -->
        <div class="timeline-line"></div>

        <div
          v-for="(review, idx) in reviews"
          :key="review.id"
          class="timeline-container"
          :class="idx % 2 === 0 ? 'timeline-left' : 'timeline-right'"
        >
          <!-- Circle marker -->
          <div class="timeline-marker"></div>

          <!-- Card -->
          <div class="timeline-card bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 hover:border-primary/30 transition-all duration-500">
            <!-- Stars -->
            <div class="flex gap-1 mb-5">
              <span v-for="s in 5" :key="s"
                class="material-symbols-outlined text-lg"
                :class="s <= review.rating ? 'text-yellow-400' : 'text-white/15'">
                {{ s <= review.rating ? 'star' : 'star' }}
              </span>
            </div>
            <!-- Comment -->
            <p class="text-white/70 mb-6 leading-relaxed italic text-sm md:text-base">"{{ review.comment }}"</p>
            <!-- Author -->
            <div class="flex items-center gap-4 pt-4 border-t border-white/10">
              <div class="w-11 h-11 rounded-full overflow-hidden bg-primary/30 flex items-center justify-center shrink-0">
                <img v-if="review.avatar_url" :src="review.avatar_url" :alt="review.client_name" class="w-full h-full object-cover" />
                <span v-else class="material-symbols-outlined text-white text-lg">person</span>
              </div>
              <div>
                <p class="font-semibold text-white text-sm">{{ review.client_name }}</p>
                <p class="text-xs text-white/40">Cliente verificado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';

const reviews = ref([]);
const loading = ref(true);
const error = ref(null);

async function fetchReviews() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await ecommerceAPI.getFeaturedReviews();
    reviews.value = data?.data || data || [];
  } catch (err) {
    error.value = err.message || 'Error al cargar reseñas';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchReviews();
});
</script>

<style scoped>
/* ==========================================
   TIMELINE – Barista-inspired
   ========================================== */
.timeline {
  position: relative;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px 0;
}

.timeline-line {
  content: '';
  position: absolute;
  width: 3px;
  background: linear-gradient(to bottom, transparent, rgba(180, 80, 200, 0.4), transparent);
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}

.timeline-container {
  padding: 10px 40px;
  position: relative;
  width: 50%;
}

.timeline-left {
  left: 0;
  padding-right: 60px;
}

.timeline-right {
  left: 50%;
  padding-left: 60px;
}

.timeline-marker {
  position: absolute;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  top: 28px;
  z-index: 2;
  box-shadow: 0 0 16px rgba(124, 58, 237, 0.4);
}

.timeline-left .timeline-marker {
  right: -9px;
}

.timeline-right .timeline-marker {
  left: -9px;
}

.timeline-card {
  position: relative;
}

/* Arrow pointer */
.timeline-left .timeline-card::after {
  content: '';
  position: absolute;
  top: 22px;
  right: -10px;
  width: 0;
  height: 0;
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
  border-left: 12px solid rgba(255, 255, 255, 0.08);
}

.timeline-right .timeline-card::after {
  content: '';
  position: absolute;
  top: 22px;
  left: -10px;
  width: 0;
  height: 0;
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
  border-right: 12px solid rgba(255, 255, 255, 0.08);
}

@media screen and (max-width: 768px) {
  .timeline-line {
    left: 24px;
  }

  .timeline-container {
    width: 100%;
    padding-left: 60px;
    padding-right: 0;
  }

  .timeline-left,
  .timeline-right {
    left: 0;
  }

  .timeline-marker {
    left: 15px !important;
    right: auto !important;
  }

  .timeline-left .timeline-card::after,
  .timeline-right .timeline-card::after {
    left: -10px;
    right: auto;
    border-right: 12px solid rgba(255, 255, 255, 0.08);
    border-left: none;
  }
}
</style>

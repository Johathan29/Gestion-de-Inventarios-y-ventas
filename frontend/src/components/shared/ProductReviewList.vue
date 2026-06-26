<template>
  <div>
    <h3 class="font-headline-md text-headline-md text-on-surface mb-6">
      Reseñas ({{ total }})
    </h3>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="material-symbols-outlined animate-spin text-primary text-4xl" data-icon="refresh">refresh</span>
    </div>

    <!-- Sin reseñas -->
    <div v-else-if="reviews.length === 0" class="text-center py-12 glass-card rounded-3xl">
      <span class="material-symbols-outlined text-5xl text-white/20 mb-4" data-icon="reviews">reviews</span>
      <p class="text-on-surface-variant">No hay reseñas aún para este producto. ¡Sé el primero en comentar!</p>
    </div>

    <!-- Lista de reseñas -->
    <div v-else class="space-y-4">
      <div
        v-for="review in reviews"
        :key="review.id"
        class="glass-card rounded-2xl border border-[#e9b3fc] p-6 transition-all duration-300 hover:border-primary/20"
      >
        <div class="flex items-start gap-4">
          <!-- Avatar -->
          <div class="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high shrink-0">
            <img
              v-if="review.client_avatar_url"
              :src="review.client_avatar_url"
              class="w-full h-full object-cover"
              :alt="review.client_name"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-lg font-bold text-primary bg-primary/10">
              {{ review.client_name.charAt(0).toUpperCase() }}
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <!-- Estrellas -->
            <div class="flex gap-1 mb-2 text-secondary">
              <span
                v-for="s in 5"
                :key="s"
                class="material-symbols-outlined text-sm"
                :data-icon="s <= review.rating ? 'star' : 'star'"
                :style="getStarFill(s, review.rating)"
              >star</span>
            </div>

            <!-- Título -->
            <h4 v-if="review.title" class="font-headline-md text-[16px] text-on-surface mb-1">{{ review.title }}</h4>

            <!-- Comentario -->
            <p class="font-body-md text-body-md text-on-surface-variant mb-3 italic">{{ review.comment }}</p>

            <!-- Info usuario -->
            <div class="flex items-center gap-2 text-sm text-on-surface-variant">
              <span class="font-medium text-on-surface">{{ review.client_name }}</span>
              <span v-if="review.client_title" class="text-white/40">·</span>
              <span v-if="review.client_title" class="text-white/50">{{ review.client_title }}</span>
              <span class="text-white/40">·</span>
              <span class="text-white/40">{{ formatDate(review.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-8">
      <button
        v-for="p in totalPages"
        :key="p"
        @click="changePage(p)"
        class="w-10 h-10 rounded-full font-label-sm transition-all"
        :class="p === page ? 'bg-secondary text-on-secondary' : 'glass-card text-on-surface-variant hover:text-on-surface'"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { ecommerceAPI } from '../../api';

const props = defineProps({
  productId: { type: String, required: true }
});

const reviews = ref([]);
const loading = ref(true);
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const limit = 10;

const fetchReviews = async () => {
  loading.value = true;
  try {
    const res = await ecommerceAPI.getProductReviews(props.productId, { page: page.value, limit });
    if (Array.isArray(res.data)) {
      reviews.value = res.data;
      total.value = res.pagination?.total || 0;
      totalPages.value = res.pagination?.totalPages || 1;
    }
  } catch (err) {
    console.warn('[ProductReviewList] Error:', err.message);
    reviews.value = [];
  } finally {
    loading.value = false;
  }
};

const changePage = (p) => {
  page.value = p;
  fetchReviews();
};

const getStarFill = (starIndex, rating) => {
  if (starIndex <= rating) {
    return { 'font-variation-settings': '"FILL" 1' };
  }
  return {};
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
};

onMounted(fetchReviews);

watch(() => props.productId, () => {
  page.value = 1;
  fetchReviews();
});
</script>

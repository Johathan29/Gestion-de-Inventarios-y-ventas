<template>
  <section id="reviews" class="py-8 px-4 overflow-hidden">
    <div class="max-w-7xl mx-auto text-center mb-24 entrance-reveal">
      <h2 class="font-display-xl text-display-xl text-on-surface mb-6">
        Shared Experiences
      </h2>
      <div class="h-1 w-24 bg-primary mx-auto rounded-full"></div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <span
        class="material-symbols-outlined animate-spin text-primary text-4xl"
        data-icon="refresh"
        >refresh</span
      >
    </div>

    <!-- Reviews -->
    <div v-else class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-gutter gap-4">
        <div
          v-for="(review, index) in reviews"
          :key="review.id"
          class="entrance-reveal"
          :style="{ transitionDelay: `${100 + index * 100}ms` }"
        >
          <div
            :class="
              index === 1
                ? 'glass-card p-10 border border-[#e9b3fc] rounded-3xl h-full flex flex-col text-left'
                : 'glass-card p-10 border border-[#e9b3fc] rounded-3xl h-full flex flex-col text-left translate-y-0 md:-translate-y-24'
            "
          >
            <!-- Estrellas -->
            <div class="flex gap-1 mb-8 text-secondary">
              <span
                v-for="s in 5"
                :key="s"
                class="material-symbols-outlined text-sm"
                data-icon="star"
                :style="getStarStyle(s, review.rating)"
                >star</span
              >
            </div>

            <!-- Comentario -->
            <p class="font-body-lg text-body-lg text-on-surface mb-10 italic">
              {{ review.comment }}
            </p>

            <!-- Info autor -->
            <div class="flex items-center gap-4 mt-auto">
              <div
                class="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high"
              >
                <img
                  v-if="review.client_avatar_url"
                  class="w-full h-full object-cover"
                  :src="review.client_avatar_url"
                  :alt="review.client_name"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-lg font-bold text-primary bg-primary/20"
                >
                  {{ review.client_name.charAt(0).toUpperCase() }}
                </div>
              </div>
              <div>
                <h4 class="font-headline-md text-[16px] text-on-surface">
                  {{ review.client_name }}
                </h4>
                <p
                  v-if="review.client_title"
                  class="font-label-sm text-label-sm text-on-surface-variant"
                >
                  {{ review.client_title }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ecommerceAPI } from "../../api";

const reviews = ref([]);
const loading = ref(true);

const getStarStyle = (starIndex, rating) => {
  if (starIndex <= rating) {
    return { "font-variation-settings": '"FILL" 1' };
  }
  return {};
};

onMounted(async () => {
  try {
    const res = await ecommerceAPI.getFeaturedReviews();
    if (Array.isArray(res.data)) {
      reviews.value = res.data;
    }
  } catch (err) {
    console.warn("[FeaturedReviews] Error:", err.message);
  } finally {
    loading.value = false;
  }
});
</script>

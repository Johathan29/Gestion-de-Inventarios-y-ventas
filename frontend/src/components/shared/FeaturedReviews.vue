<template>
  <section id="reviews" class="py-8 px-4 overflow-hidden">
    <div class="max-w-7xl mx-auto text-center mb-24" data-gsap="section-title">
      <h2 class="font-display-xl text-display-xl text-on-surface mb-6">
        Shared Experiences
      </h2>
      <div class="h-1 w-24 bg-primary mx-auto rounded-full"></div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-gutter gap-4">
        <div
          v-for="n in 3"
          :key="'skeleton-review-' + n"
          class="glass-card p-10 border border-white/5 rounded-3xl h-full flex flex-col text-left animate-pulse"
          :class="n === 2 ? 'translate-y-0 md:-translate-y-24' : ''"
        >
          <!-- Stars skeleton -->
          <div class="flex gap-1 mb-8">
            <div v-for="s in 5" :key="s" class="w-4 h-4 rounded bg-white/10"></div>
          </div>
          <!-- Comment skeleton -->
          <div class="space-y-3 mb-10">
            <div class="h-4 bg-white/10 rounded w-full"></div>
            <div class="h-4 bg-white/10 rounded w-5/6"></div>
            <div class="h-4 bg-white/10 rounded w-4/6"></div>
            <div class="h-4 bg-white/10 rounded w-3/4"></div>
          </div>
          <!-- Author skeleton -->
          <div class="flex items-center gap-4 mt-auto">
            <div class="w-12 h-12 rounded-full bg-white/10 flex-shrink-0"></div>
            <div class="space-y-2 flex-1">
              <div class="h-4 bg-white/10 rounded w-1/2"></div>
              <div class="h-3 bg-white/10 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reviews -->
    <div v-else class="max-w-7xl mx-auto">
      <div data-gsap="stagger" class="grid grid-cols-1 md:grid-cols-3 gap-gutter gap-4">
        <div
          v-for="(review, index) in reviews"
          :key="review.id"
          data-gsap="item"
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

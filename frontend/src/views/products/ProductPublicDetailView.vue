<template>
  <div class="min-h-screen bg-[#151215] text-[#e8e0e4] selection:bg-primary selection:text-on-primary overflow-x-hidden landing-scope">
    <!-- Background -->
    <div class="fixed inset-0 w-full h-full -z-10 opacity-30 pointer-events-none">
      <canvas id="shader-canvas" style="display:block;width:100%;height:100%"></canvas>
    </div>

    <!-- Navbar -->
    <AppNavBar />
<FloatingBanner />
    <main class="relative z-10 pt-28 pb-20 px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-20">
          <div class="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-20">
          <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">error_outline</span>
          <h2 class="font-headline-md text-headline-md text-on-surface mb-2">Product not found</h2>
          <p class="font-body-md text-body-md text-on-surface-variant mb-6">{{ error }}</p>
          <router-link
            :to="{ name: 'ProductsCatalog' }"
            class="inline-flex px-6 py-3 bg-primary text-on-primary rounded-full font-label-sm text-label-sm"
          >
            Back to catalog
          </router-link>
        </div>

        <!-- Product Detail -->
        <template v-else-if="product">
          <!-- Back button -->
          <button
            @click="$router.push({ name: 'ProductsCatalog' })"
            class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-8 font-body-md text-body-md !cursor-pointer"
          >
            <span class="material-symbols-outlined">arrow_back</span>
            Back to catalog
          </button>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <!-- Image Gallery -->
            <div>
              <div class="glass-card rounded-[32px] overflow-hidden">
                <div class="aspect-square bg-white/5 flex items-center justify-center relative">
                  <img
                    v-if="currentImage"
                    :src="currentImage"
                    :alt="product.name"
                    class="w-full h-full object-contain p-8 transition-opacity duration-300"
                    @error="imageErrors[currentImage] = true"
                  />
                  <div v-else class="text-center p-8">
                    <span class="material-symbols-outlined text-6xl text-on-surface-variant block mb-2">inventory_2</span>
                    <p class="text-on-surface-variant">No image</p>
                  </div>
                  <!-- Badge -->
                  <div
                    v-if="product.featured"
                    class="absolute top-4 left-4 glass-card px-4 py-2 rounded-full font-label-sm text-label-sm text-xs"
                  >
                    Featured
                  </div>
                  <div
                    v-if="discountPercent > 0"
                    class="absolute top-4 right-4 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-sm text-label-sm text-xs"
                  >
                    -{{ discountPercent }}% OFF
                  </div>
                </div>
                <!-- Thumbnails -->
                <div
                  v-if="thumbnailImages.length > 1"
                  class="flex gap-3 p-4 border-t border-white/5 overflow-x-auto"
                >
                  <div
                    v-for="(img, idx) in thumbnailImages"
                    :key="idx"
                    @click="currentImageIndex = idx"
                    class="w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-all !cursor-pointer"
                    :class="idx === currentImageIndex
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-white/10 hover:border-white/30'"
                  >
                    <img :src="img" class="w-full h-full object-cover" @error="imageErrors[img] = true" />
                  </div>
                </div>
                <!-- Variant image identifier -->
                <div v-if="selectedVariant?.images?.length" class="hidden px-4 pb-3">
                  <span class="inline-flex items-center gap-1.5 text-xs text-primary/60 bg-primary/5 px-3 py-1 rounded-full">
                    <span class="material-symbols-outlined text-xs">photo_library</span>
                    Imágenes de: <strong class="text-primary/80">{{ selectedVariant.name }}</strong>
                  </span>
                </div>
              </div>
            </div>

            <!-- Product Info -->
            <div>
              <div class="glass-card rounded-[32px] p-8">
                <!-- Category & Brand -->
                <div class="flex items-center gap-3 mb-4">
                  <span class="text-xs text-primary/70 uppercase tracking-wider font-medium">
                    {{ product.categories?.name || product.category_name || 'General' }}
                  </span>
                  <span v-if="product.brand" class="w-1 h-1 rounded-full bg-on-surface-variant/30"></span>
                  <span v-if="product.brand" class="text-xs text-on-surface-variant/70">{{ product.brand }}</span>
                </div>

                <!-- Name -->
                <h1 class="font-headline-lg text-headline-lg text-on-surface mb-4">{{ product.name }}</h1>

                <!-- Price -->
                <div class="flex items-baseline gap-3 mb-6">
                  <span class="font-headline-xl text-headline-xl text-secondary">${{ formatPrice(displayPrice) }}</span>
                  <span
                    v-if="displayComparePrice && displayComparePrice > displayPrice"
                    class="font-headline-md text-headline-md text-on-surface-variant/50 line-through"
                  >
                    ${{ formatPrice(displayComparePrice) }}
                  </span>
                  <span
                    v-if="displayDiscountPercent > 0"
                    class="px-3 py-1 bg-secondary/20 text-secondary rounded-full font-label-sm text-label-sm text-xs"
                  >
                    Save {{ displayDiscountPercent }}%
                  </span>
                </div>

                <!-- Description -->
                <p v-if="product.description" class="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-8">
                  {{ product.description }}
                </p>

                <!-- SKU & Stock -->
                <div class="grid grid-cols-1 md:grid-cols-2   gap-4 mb-8">
                  <div class="bg-white/5 rounded-2xl p-4">
                    <p class="text-xs text-on-surface-variant/60 uppercase tracking-wider mb-1">SKU</p>
                    <p class="font-label-md text-label-md text-on-surface font-mono">{{ displaySku }}</p>
                  </div>
                  <div class="bg-white/5 rounded-2xl p-4">
                    <p class="text-xs text-on-surface-variant/60 uppercase tracking-wider mb-1">Availability</p>
                    <p class="font-label-md text-label-md" :class="displayStockColor">
                      <span v-if="displayStock > 0">{{ displayStock }} in stock</span>
                      <span v-else>Out of stock</span>
                    </p>
                  </div>
                </div>

                <!-- Variant Selector -->
                <div v-if="variantGroups.length > 0" class="mb-6 space-y-4">
                  <div v-for="group in variantGroups" :key="group.attr">
                    <p class="text-xs text-on-surface-variant/60 uppercase tracking-wider mb-2 font-label-sm text-label-sm">{{ group.attr }}</p>
                    <div class="flex flex-wrap gap-2">
                      <template v-if="group.attr === 'color' || group.attr === 'Color' || group.attr === 'COLOR'">
                        <!-- Color swatches -->
                        <button
                          v-for="opt in group.options" :key="opt.value"
                          @click="selectVariantAttribute(group.attr, opt.value)"
                          class="w-10 h-10 rounded-full border-2 transition-all !cursor-pointer"
                          :style="{
                            background: opt.value.toLowerCase(),
                            borderColor: selectedAttributes[group.attr] === opt.value ? '#624200' : 'rgba(255,255,255,0.2)',
                            transform: selectedAttributes[group.attr] === opt.value ? 'scale(1.15)' : 'scale(1)'
                          }"
                          :title="opt.label"
                        >
                        </button>
                      </template>
                      <template v-else>
                        <!-- Text/button options -->
                        <button
                          v-for="opt in group.options" :key="opt.value"
                          @click="selectVariantAttribute(group.attr, opt.value)"
                          class="px-4 py-2 rounded-xl border text-sm font-medium transition-all !cursor-pointer"
                          :class="selectedAttributes[group.attr] === opt.value
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-white/5 text-on-surface-variant border-white/10 hover:border-white/30 hover:text-on-surface'"
                        >
                          {{ opt.label }}
                        </button>
                      </template>
                    </div>
                  </div>
                  <!-- Selected variant info -->
                  <div v-if="selectedVariant" class="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-label-sm text-label-sm text-on-surface">{{ selectedVariant.name }}</span>
                      <span v-if="selectedVariant.sku !== product.sku" class="text-xs text-on-surface-variant/60 font-mono">SKU: {{ selectedVariant.sku }}</span>
                    </div>
                    <div class="flex items-baseline gap-3">
                      <span class="font-headline-md text-headline-md text-secondary">
                        ${{ formatPrice(activeOffer ? (Number(selectedVariant.price || product.price) * (1 - (Number(activeOffer.discount_percent) || 0) / 100)) : (selectedVariant.price || product.price)) }}
                      </span>
                      <span v-if="activeOffer || (selectedVariant.compare_price && selectedVariant.compare_price > (selectedVariant.price || product.price))"
                        class="font-label-md text-label-md text-on-surface-variant/50 line-through">
                        ${{ formatPrice(activeOffer ? (selectedVariant.price || product.price) : selectedVariant.compare_price) }}
                      </span>
                    </div>
                    <div class="flex items-center gap-4 mt-2 text-sm">
                      <span v-if="selectedVariant.stock !== undefined" :class="selectedVariant.stock > 0 ? 'text-green-400' : 'text-red-400'">
                        {{ selectedVariant.stock > 0 ? selectedVariant.stock + ' in stock' : 'Out of stock' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Quantity Selector -->
                <div class="flex items-center gap-4 mb-4" v-if="displayStock > 0">
                  <span class="text-sm text-on-surface-variant/70 font-label-sm text-label-sm">Cantidad:</span>
                  <div class="flex items-center bg-white/5 rounded-xl border border-white/10">
                    <button
                      @click="quantity = Math.max(1, quantity - 1)"
                      class="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-l-xl transition-all !cursor-pointer"
                      :disabled="quantity <= 1"
                    >
                      <span class="material-symbols-outlined text-lg">remove</span>
                    </button>
                    <input
                      v-model.number="quantity"
                      type="number"
                      min="1"
                      :max="displayStock"
                      class="w-16 h-10 bg-transparent text-center text-on-surface font-label-md text-label-md border-x border-white/10 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      @click="quantity = Math.min(displayStock, quantity + 1)"
                      class="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-r-xl transition-all !cursor-pointer"
                      :disabled="quantity >= displayStock"
                    >
                      <span class="material-symbols-outlined text-lg">add</span>
                    </button>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-3 flex-col sm:flex-row ">
                  <button
                    @click="addToCart"
                    :disabled="addingToCart || displayStock <= 0"
                    class="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-on-surface font-label-sm text-label-sm hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 !cursor-pointer"
                  >
                    <template v-if="addingToCart">
                      <span class="material-symbols-outlined animate-spin">progress_activity</span>
                      Agregando...
                    </template>
                    <template v-else>
                      <span class="material-symbols-outlined">shopping_bag</span>
                      Carrito
                    </template>
                  </button>
                  <button
                    @click="buyNow"
                    :disabled="buyingNow || displayStock <= 0"
                    class="flex-1 py-4 rounded-2xl bg-primary text-on-primary font-label-sm text-label-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 !cursor-pointer"
                  >
                    <template v-if="buyingNow">
                      <span class="material-symbols-outlined animate-spin">progress_activity</span>
                      Procesando...
                    </template>
                    <template v-else>
                      <span class="material-symbols-outlined">flash_on</span>
                      Comprar ahora
                    </template>
                  </button>
                </div>

                <!-- Extra info -->
                <div class="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-3 text-sm">
                  <div v-if="product.unit">
                    <span class="text-on-surface-variant/60">Unit: </span>
                    <span class="text-on-surface">{{ product.unit }}</span>
                  </div>
                  <div v-if="product.min_stock">
                    <span class="text-on-surface-variant/60">Min. Stock: </span>
                    <span class="text-on-surface">{{ product.min_stock }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Offers Section at bottom of detail -->
        <div class="mt-16 hidden">
          <OfferShowcase
            title="También en Oferta"
            subtitle="Descubre otros productos con descuentos exclusivos por tiempo limitado."
            :limit="3"
            :show-view-all="true"
            @view-all="router.push({ name: 'ProductsCatalog' })"
            @error="(msg) => console.warn('Offers error:', msg)"
          />
        </div>

        <!-- ========== REVIEWS SECTION ========== -->
        <div class="mt-20">
          <div class="glass-card rounded-[32px] p-8 md:p-10">
            <!-- Section Header -->
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-headline-lg text-headline-lg text-on-surface">Reseñas de Clientes</h2>
              <span class="text-on-surface-variant/60 font-body-md text-body-md">
                {{ reviews.length }} {{ reviews.length === 1 ? 'opinión' : 'opiniones' }}
              </span>
            </div>

            <!-- Average Rating Bar -->
            <div v-if="reviews.length > 0" class="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-white/5">
              <div class="text-center">
                <p class="font-headline-2xl text-headline-2xl text-secondary">{{ averageRating.toFixed(1) }}</p>
                <div class="flex items-center justify-center gap-0.5 mt-1">
                  <span v-for="i in 5" :key="'avg-'+i" class="material-symbols-outlined text-sm"
                    :class="i <= Math.round(averageRating) ? 'text-secondary' : 'text-on-surface-variant/20'">
                    {{ i <= Math.round(averageRating) ? 'star' : 'star' }}
                  </span>
                </div>
                <p class="text-xs text-on-surface-variant/60 mt-1">Promedio</p>
              </div>
              <div class="flex-1 space-y-1">
                <div v-for="star in [5,4,3,2,1]" :key="'bar-'+star" class="flex items-center gap-2 text-xs">
                  <span class="text-on-surface-variant/60 w-3 text-right">{{ star }}</span>
                  <span class="material-symbols-outlined text-xs text-secondary">star</span>
                  <div class="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div class="h-full rounded-full bg-secondary transition-all duration-500"
                      :style="{ width: ratingBarPercent(star) + '%' }"></div>
                  </div>
                  <span class="text-on-surface-variant/60 w-6 text-right">{{ ratingCount(star) }}</span>
                </div>
              </div>
            </div>

            <!-- Review Form -->
            <div class="mb-10 p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 class="font-label-lg text-label-lg text-on-surface mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-secondary">rate_review</span>
                Escribe una reseña
              </h3>
              <form @submit.prevent="submitReview" class="space-y-4">
                <!-- Star Rating Selector -->
                <div>
                  <p class="text-xs text-on-surface-variant/60 uppercase tracking-wider mb-2">Tu calificación</p>
                  <div class="flex items-center gap-1">
                    <button v-for="i in 5" :key="'sel-'+i" type="button" @click="newReview.rating = i"
                      class="!cursor-pointer transition-all duration-150 !p-1 !rounded-lg hover:scale-110"
                      :class="i <= newReview.rating ? 'text-secondary' : 'text-on-surface-variant/20'"
                      @mouseenter="$event.currentTarget.style.transform = 'scale(1.2)'"
                      @mouseleave="$event.currentTarget.style.transform = 'scale(1)'">
                      <span class="material-symbols-outlined text-2xl"
                        :class="i <= newReview.rating ? 'text-secondary' : ''">
                        {{ i <= newReview.rating ? 'star' : 'star' }}
                      </span>
                    </button>
                    <span v-if="newReview.rating > 0" class="ml-2 text-sm text-on-surface-variant">
                      {{ ['', 'Pésimo', 'Malo', 'Regular', 'Bueno', 'Excelente'][newReview.rating] }}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-on-surface-variant/60 uppercase tracking-wider mb-1.5">Tu nombre</label>
                    <input v-model="newReview.client_name" type="text" required
                      placeholder="Ej: María García"
                      class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md" />
                  </div>
                  <div>
                    <label class="block text-xs text-on-surface-variant/60 uppercase tracking-wider mb-1.5">Título (opcional)</label>
                    <input v-model="newReview.title" type="text"
                      placeholder="Ej: Excelente calidad"
                      class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md" />
                  </div>
                </div>

                <div>
                  <label class="block text-xs text-on-surface-variant/60 uppercase tracking-wider mb-1.5">Tu comentario</label>
                  <textarea v-model="newReview.comment" required rows="4"
                    placeholder="Comparte tu experiencia con este producto..."
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md resize-none"></textarea>
                </div>

                <div class="flex items-center justify-between">
                  <p class="text-xs text-on-surface-variant/40">
                    <span class="material-symbols-outlined text-xs align-text-bottom">info</span>
                    Tu reseña será publicada después de ser aprobada por un administrador.
                  </p>
                  <button type="submit" :disabled="submittingReview || !newReview.rating || !newReview.comment.trim()"
                    class="px-6 py-3 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 !cursor-pointer">
                    <template v-if="submittingReview">
                      <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      Enviando...
                    </template>
                    <template v-else>
                      <span class="material-symbols-outlined text-sm">send</span>
                      Enviar reseña
                    </template>
                  </button>
                </div>

                <!-- Success message -->
                <div v-if="reviewSubmitted"
                  class="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  ¡Gracias! Tu reseña ha sido enviada y será publicada tras la aprobación de un administrador.
                </div>
              </form>
            </div>

            <!-- Reviews List -->
            <div v-if="reviews.length > 0" class="space-y-5">
              <div v-for="review in reviews" :key="review.id"
                class="p-5 rounded-2xl bg-white/5 border border-white/5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.07]">
                <div class="flex items-start gap-4">
                  <!-- Avatar -->
                  <div class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-primary/20 text-primary font-label-sm text-label-sm">
                    {{ (review.client_name || 'A')[0].toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <!-- Header -->
                    <div class="flex items-center justify-between gap-3 mb-1">
                      <div>
                        <p class="font-label-md text-label-md text-on-surface">{{ review.client_name }}</p>
                        <p v-if="review.client_title" class="text-xs text-on-surface-variant/50">{{ review.client_title }}</p>
                      </div>
                      <div class="flex items-center gap-0.5 shrink-0">
                        <span v-for="i in 5" :key="'r-'+review.id+'-'+i"
                          class="material-symbols-outlined text-sm"
                          :class="i <= review.rating ? 'text-secondary' : 'text-on-surface-variant/20'">
                          star
                        </span>
                      </div>
                    </div>
                    <!-- Title -->
                    <p v-if="review.title" class="font-label-md text-label-md text-on-surface/80 mt-1">{{ review.title }}</p>
                    <!-- Comment -->
                    <p class="font-body-md text-body-md text-on-surface-variant mt-1.5 leading-relaxed">{{ review.comment }}</p>
                    <!-- Date -->
                    <p class="text-xs text-on-surface-variant/40 mt-2">{{ formatReviewDate(review.created_at) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div v-else-if="!loadingReviews" class="text-center py-12">
              <span class="material-symbols-outlined text-5xl text-on-surface-variant/20 block mb-3">reviews</span>
              <p class="font-body-md text-body-md text-on-surface-variant/60">No hay reseñas aún. ¡Sé el primero en opinar!</p>
            </div>

            <!-- Loading skeleton -->
            <div v-if="loadingReviews" class="space-y-4">
              <div v-for="n in 3" :key="'skeleton-review-'+n" class="p-5 rounded-2xl bg-white/5 animate-pulse">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full bg-white/5"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-4 bg-white/5 rounded w-1/3"></div>
                    <div class="h-3 bg-white/5 rounded w-1/4"></div>
                    <div class="h-3 bg-white/5 rounded w-full"></div>
                    <div class="h-3 bg-white/5 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- ========== END REVIEWS SECTION ========== -->

      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productsAPI, cartAPI, ecommerceAPI } from '../../api/index.js';
import OfferShowcase from '../../components/shared/OfferShowcase.vue';
import AppNavBar from '../../components/layout/AppNavBar.vue';
import FloatingBanner from '../../components/shared/FloatingBanner.vue';
import AppFooter from '../../components/layout/AppFooter.vue';

const route = useRoute();
const router = useRouter();

const product = ref(null);
const loading = ref(true);
const error = ref(null);
const addingToCart = ref(false);
const buyingNow = ref(false);
const activeOffer = ref(null);
const quantity = ref(1);
const currentImageIndex = ref(0);
const imageErrors = reactive({});

// ========== VARIANT STATE ==========
const variants = ref([]);
const selectedAttributes = reactive({});

// Build variant groups from attributes (e.g., { attr: 'color', options: [{value:'rojo',label:'Rojo'}] })
const variantGroups = computed(() => {
  if (variants.value.length === 0) return [];
  const attrMap = {};
  for (const v of variants.value) {
    if (!v.attributes || typeof v.attributes !== 'object') continue;
    for (const [key, value] of Object.entries(v.attributes)) {
      if (!value) continue;
      if (!attrMap[key]) attrMap[key] = new Set();
      attrMap[key].add(String(value));
    }
  }
  return Object.entries(attrMap).map(([attr, values]) => ({
    attr,
    options: Array.from(values).map(v => ({
      value: v,
      label: v.charAt(0).toUpperCase() + v.slice(1)
    }))
  }));
});

// Find the selected variant based on attribute selections
const selectedVariant = computed(() => {
  const selectedKeys = Object.keys(selectedAttributes);
  if (selectedKeys.length === 0 || variants.value.length === 0) return null;
  // Try to find an exact match
  return variants.value.find(v => {
    if (!v.attributes) return false;
    return selectedKeys.every(key =>
      v.attributes[key] && String(v.attributes[key]).toLowerCase() === (selectedAttributes[key] || '').toLowerCase()
    );
  }) || null;
});

function selectVariantAttribute(attr, value) {
  selectedAttributes[attr] = value;
}

// Reset image index when variant changes
watch(selectedVariant, () => {
  currentImageIndex.value = 0;
});

// ========== REVIEWS STATE ==========
const reviews = ref([]);
const loadingReviews = ref(true);
const submittingReview = ref(false);
const reviewSubmitted = ref(false);

const newReview = reactive({
  client_name: '',
  title: '',
  comment: '',
  rating: 0
});

// Average rating computed
const averageRating = computed(() => {
  if (reviews.value.length === 0) return 0;
  const sum = reviews.value.reduce((acc, r) => acc + r.rating, 0);
  return sum / reviews.value.length;
});

// Rating bar helper: % of reviews with this star
function ratingBarPercent(star) {
  if (reviews.value.length === 0) return 0;
  const count = reviews.value.filter(r => r.rating === star).length;
  return (count / reviews.value.length) * 100;
}

// Count of reviews with specific star rating
function ratingCount(star) {
  return reviews.value.filter(r => r.rating === star).length;
}

// Format review date
function formatReviewDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Fetch approved reviews for this product
async function fetchReviews() {
  loadingReviews.value = true;
  try {
    const res = await ecommerceAPI.getProductReviews(route.params.id, { approved: true });
    reviews.value = res.data || [];
  } catch (e) {
    console.warn('[Reviews] Error fetching reviews:', e);
    reviews.value = [];
  } finally {
    loadingReviews.value = false;
  }
}

// Submit a new review
async function submitReview() {
  if (!newReview.rating || !newReview.comment.trim()) return;
  submittingReview.value = true;
  reviewSubmitted.value = false;
  try {
    await ecommerceAPI.createReview({
      product_id: route.params.id,
      client_name: newReview.client_name.trim(),
      title: newReview.title.trim(),
      comment: newReview.comment.trim(),
      rating: newReview.rating
    });
    reviewSubmitted.value = true;
    // Reset form
    newReview.client_name = '';
    newReview.title = '';
    newReview.comment = '';
    newReview.rating = 0;
  } catch (e) {
    console.error('[Reviews] Error submitting review:', e);
    // Show error feedback
    reviewSubmitted.value = false;
  } finally {
    submittingReview.value = false;
  }
}

const currentImage = computed(() => {
  // Use variant images first if a variant is selected and has images
  const sv = selectedVariant.value;
  if (sv?.images && Array.isArray(sv.images) && sv.images.length > 0) {
    const url = sv.images[currentImageIndex.value] || sv.images[0];
    if (imageErrors[url]) return null;
    return url;
  }
  const images = product.value?.images;
  if (!images || !Array.isArray(images) || images.length === 0) return null;
  const url = images[currentImageIndex.value] || images[0];
  if (imageErrors[url]) return null;
  return url;
});

// Thumbnails use variant images when a variant with images is selected
const thumbnailImages = computed(() => {
  const sv = selectedVariant.value;
  if (sv?.images && Array.isArray(sv.images) && sv.images.length > 0) {
    return sv.images;
  }
  return product.value?.images || [];
});

// Variant-aware display values (with offer discount applied)
const displayPrice = computed(() => {
  const basePrice = (() => {
    const sv = selectedVariant.value;
    if (sv?.price !== undefined && sv.price !== null) return Number(sv.price);
    return Number(product.value?.price ?? 0);
  })();
  // Aplicar descuento de oferta activa si existe
  if (activeOffer.value) {
    const disc = Number(activeOffer.value.discount_percent) || 0;
    return basePrice * (1 - disc / 100);
  }
  return basePrice;
});

const displayComparePrice = computed(() => {
  const sv = selectedVariant.value;
  if (sv?.compare_price !== undefined && sv.compare_price !== null) return Number(sv.compare_price);
  // Si hay oferta activa, mostrar el precio original como comparación
  if (activeOffer.value) {
    const sv2 = selectedVariant.value;
    if (sv2?.price !== undefined && sv2.price !== null) return Number(sv2.price);
    return Number(product.value?.price ?? 0);
  }
  return Number(product.value?.compare_price ?? 0);
});

const displayStock = computed(() => {
  const sv = selectedVariant.value;
  if (sv?.stock !== undefined && sv.stock !== null) return sv.stock;
  return product.value?.stock ?? 0;
});

const displaySku = computed(() => {
  const sv = selectedVariant.value;
  if (sv?.sku) return sv.sku;
  return product.value?.sku ?? '';
});

const displayDiscountPercent = computed(() => {
  // Si hay oferta activa, usar su porcentaje directamente
  if (activeOffer.value) {
    return Number(activeOffer.value.discount_percent) || 0;
  }
  // Calcular descuento por compare_price
  if (!displayComparePrice.value || displayComparePrice.value <= displayPrice.value) return 0;
  return Math.round((1 - displayPrice.value / displayComparePrice.value) * 100);
});

const displayStockColor = computed(() => {
  if (displayStock.value <= 0) return 'text-red-400';
  return 'text-green-400';
});

// Keep discountPercent and stockColor for backward compatibility
const discountPercent = displayDiscountPercent;
const stockColor = displayStockColor;

function formatPrice(price) {
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

async function addToCart() {
  const token = sessionStorage.getItem('accessToken');
  if (!token) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } });
    return;
  }

  addingToCart.value = true;
  try {
    const payload = { productId: product.value.id, quantity: quantity.value };
    if (selectedVariant.value?.id) {
      payload.variantId = selectedVariant.value.id;
    }
    await cartAPI.addItem(payload);
    quantity.value = 1;
  } catch (err) {
    console.error('[ProductDetail] Error adding to cart:', err);
  } finally {
    addingToCart.value = false;
  }
}

async function buyNow() {
  const token = sessionStorage.getItem('accessToken');
  if (!token) {
    router.push({ name: 'Login', query: { redirect: route.fullPath } });
    return;
  }

  buyingNow.value = true;
  try {
    const payload = { productId: product.value.id, quantity: quantity.value };
    if (selectedVariant.value?.id) {
      payload.variantId = selectedVariant.value.id;
    }
    await cartAPI.addItem(payload);
    quantity.value = 1;
    router.push({ name: 'Cart' });
  } catch (err) {
    console.error('[ProductDetail] Error buying now:', err);
    buyingNow.value = false;
  }
}

// Shader
function initShader() {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  function syncSize() {
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 720;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncSize).observe(canvas);
  }
  syncSize();

  const vs = `attribute vec2 a_position;varying vec2 v_texCoord;void main(){v_texCoord=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
  const fs = `precision highp float;varying vec2 v_texCoord;uniform float u_time;uniform vec2 u_resolution;void main(){vec2 uv=v_texCoord;vec2 p=uv*2.0-1.0;p.x*=u_resolution.x/u_resolution.y;float t1=u_time*0.12;float wave1=sin(p.x*0.5+t1)*0.5+cos(p.y*0.8+t1)*0.5;float wave2=sin(p.y*0.3-u_time*0.08)*0.4+cos(p.x*0.6+u_time*0.08)*0.6;vec3 primary=vec3(0.216,0.039,0.29);vec3 secondary=vec3(0.482,0.31,0.49);vec3 color=mix(primary,secondary,wave1*0.5+0.5);color=mix(color,primary,wave2*0.5+0.5);float glow=0.05/length(p-vec2(sin(t1),cos(u_time*0.08))*0.5);color+=secondary*glow;gl_FragColor=vec4(color*0.6,1.0);}`;

  const prog = gl.createProgram();
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  let animId;

  function render(t) {
    syncSize();
    gl.viewport(0,0,canvas.width,canvas.height);
    if(uTime) gl.uniform1f(uTime,t*0.001);
    if(uRes) gl.uniform2f(uRes,canvas.width,canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    animId = requestAnimationFrame(render);
  }
  animId = requestAnimationFrame(render);

  window.__shaderCleanup = () => {
    cancelAnimationFrame(animId);
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  };
}

onMounted(async () => {
  initShader();
  try {
    const res = await productsAPI.getById(route.params.id);
    if (res.data && res.data.id) {
      product.value = res.data;
      // Extract variants from embedded product_variants
      if (Array.isArray(res.data.product_variants) && res.data.product_variants.length > 0) {
        variants.value = res.data.product_variants.map(v => ({
          ...v,
          attributes: typeof v.attributes === 'object' && v.attributes ? v.attributes : {}
        }));
        // Read variant from URL query param first
        const urlVariantId = route.query.variant;
        if (urlVariantId) {
          const foundVariant = variants.value.find(v => v.id === urlVariantId);
          if (foundVariant?.attributes && typeof foundVariant.attributes === 'object') {
            for (const [key, value] of Object.entries(foundVariant.attributes)) {
              selectedAttributes[key] = String(value);
            }
          }
        }

        // Auto-select first option of each attribute group (only for unselected)
        if (variantGroups.value.length > 0) {
          for (const group of variantGroups.value) {
            if (group.options.length > 0 && !selectedAttributes[group.attr]) {
              selectedAttributes[group.attr] = group.options[0].value;
            }
          }
        }
      }
    } else {
      error.value = 'Product not found';
    }
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Error loading product';
    console.error('[ProductDetail] Error:', err);
  } finally {
    loading.value = false;
  }

  // Buscar oferta activa para este producto
  if (product.value?.id) {
    try {
      const { data } = await ecommerceAPI.getOffers({ limit: 50 });
      const offers = Array.isArray(data) ? data : (data?.data || []);
      const found = offers.find(o =>
        Number(o.product_id) === Number(product.value.id) &&
        o.active !== false
      );
      if (found) {
        activeOffer.value = found;
      }
    } catch (e) {
      console.warn('[ProductDetail] Error fetching offers:', e);
    }
  }

  fetchReviews();
});

onUnmounted(() => {
  if (window.__shaderCleanup) {
    window.__shaderCleanup();
  }
});
</script>

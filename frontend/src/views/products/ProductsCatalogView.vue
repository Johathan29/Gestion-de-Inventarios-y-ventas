<template>
  <div class="min-h-screen bg-[#151215] text-[#e8e0e4] selection:bg-primary selection:text-on-primary overflow-x-hidden">
    <!-- Background Shader -->
    <div class="fixed inset-0 w-full h-full -z-10 opacity-30 pointer-events-none">
      <canvas id="shader-canvas" style="display:block;width:100%;height:100%"></canvas>
    </div>

    <!-- Navbar -->
    <AppNavBar />

    <main class="relative z-10">
      <!-- Header -->
      <div class="pt-32 pb-12 px-4">
        <div class="max-w-7xl mx-auto">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 entrance-reveal">
            <div>
              <p class="text-primary font-label-sm text-label-sm uppercase tracking-[0.2em] mb-3">Our Collection</p>
              <h1 class="font-headline-lg text-headline-lg text-on-surface">All Products</h1>
              <p class="font-body-md text-body-md text-on-surface-variant mt-3 max-w-2xl">
                Discover our curated selection of premium products, each thoughtfully designed to elevate your experience.
              </p>
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto">
              <!-- Search -->
              <div class="relative flex-1 md:w-72">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search products..."
                  class="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-5 py-3.5 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md"
                  @input="debouncedSearch"
                />
              </div>
            </div>
          </div>

          <!-- Category Pills -->
          <div class="flex flex-wrap gap-3 mt-10 entrance-reveal">
            <button
              @click="selectedCategory = null; currentPage = 1; syncUrlQuery(); fetchProducts()"
              class="px-6 py-2.5 rounded-full font-label-sm text-label-sm transition-all duration-300 !cursor-pointer"
              :class="!selectedCategory
                ? 'bg-primary text-on-primary'
                : 'bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10'"
            >
              All
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              @click="selectedCategory = cat.id; currentPage = 1; syncUrlQuery(); fetchProducts()"
              class="px-6 py-2.5 rounded-full font-label-sm text-label-sm transition-all duration-300 !cursor-pointer"
              :class="selectedCategory === cat.id
                ? 'bg-primary text-on-primary'
                : 'bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10'"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Products Section -->
      <div class="px-4 pb-20">
        <div class="max-w-7xl mx-auto">
          <!-- Loading -->
          <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="n in 8" :key="'skel-'+n" class="glass-card rounded-[32px] p-6 h-full animate-pulse">
              <div class="aspect-square mb-6 overflow-hidden rounded-2xl bg-white/5"></div>
              <div class="h-5 bg-white/5 rounded w-3/4 mb-3"></div>
              <div class="h-4 bg-white/5 rounded w-1/3 mb-3"></div>
              <div class="h-4 bg-white/5 rounded w-full mb-2"></div>
              <div class="h-4 bg-white/5 rounded w-2/3 mb-6"></div>
              <div class="h-11 bg-white/5 rounded-xl w-full"></div>
            </div>
          </div>

          <!-- Empty -->
          <div v-else-if="products.length === 0" class="text-center py-24">
            <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">inventory_2</span>
            <h3 class="font-headline-md text-headline-md text-on-surface mb-2">No products found</h3>
            <p class="font-body-md text-body-md text-on-surface-variant mb-6">
              {{ searchQuery ? 'Try a different search term.' : 'Check back later for new arrivals.' }}
            </p>
            <button
              v-if="searchQuery"
              @click="searchQuery = ''; fetchProducts()"
              class="px-6 py-3 bg-primary text-on-primary rounded-full font-label-sm text-label-sm !cursor-pointer"
            >
              Clear search
            </button>
          </div>

          <!-- Products Grid -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div
              v-for="product in products"
              :key="product.id"
              class="perspective"
            >
              <div
                class="glass-card rounded-[32px] p-5 h-full flex flex-col group cursor-pointer overflow-hidden product-card hover:shadow-2xl hover:shadow-primary/20 transition-shadow duration-500"
                @click="goToDetail(product)"
                @mousemove="handleMouseMove"
                @mouseleave="resetCard"
              >
                <!-- Image -->
                <div class="relative aspect-square mb-5 overflow-hidden rounded-2xl bg-white/5">
                  <img
                    v-if="product.images && product.images.length > 0 && !brokenImages[product.id]"
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    :src="product.images[0]"
                    :alt="product.name"
                    loading="lazy"
                    @error="brokenImages[product.id] = true"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center bg-white/5"
                  >
                    <span class="material-symbols-outlined text-6xl text-on-surface-variant/20">inventory_2</span>
                  </div>
                  <div
                    v-if="productBadge(product)"
                    class="absolute top-3 right-3 glass-card px-3 py-1.5 rounded-full font-label-sm text-label-sm text-on-surface text-xs"
                  >
                    {{ productBadge(product) }}
                  </div>
                  <div
                    v-if="product.discountPercent > 0"
                    class="absolute top-3 left-3 bg-secondary text-on-secondary px-3 py-1.5 rounded-full font-label-sm text-label-sm text-xs"
                  >
                    -{{ product.discountPercent }}%
                  </div>
                </div>

                <!-- Info -->
                <div class="flex-1 flex flex-col">
                  <div class="flex justify-between items-start mb-2 gap-2">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface line-clamp-1">{{ product.name }}</h3>
                    <span class="font-headline-sm text-headline-sm text-secondary shrink-0">${{ formatPrice(product.price) }}</span>
                  </div>
                  <p v-if="product.brand" class="font-body-sm text-body-sm text-primary/70 mb-1.5">{{ product.brand }}</p>
                  <p class="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-4 text-sm">
                    {{ product.description || '' }}
                  </p>
                  <div class="mt-auto flex items-center gap-2">
                    <span class="text-xs text-on-surface-variant/60">
                      <span v-if="product.stock > 0">{{ product.stock }} in stock</span>
                      <span v-else class="text-red-400/70">Out of stock</span>
                    </span>
                    <div class="flex-1"></div>
                    <button
                      @click.stop="addToCart(product)"
                      :disabled="addingToCart === product.id || product.stock <= 0"
                      class="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-primary hover:text-on-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center !cursor-pointer"
                    >
                      <template v-if="addingToCart === product.id">
                        <span class="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      </template>
                      <template v-else>
                        <span class="material-symbols-outlined text-lg">shopping_bag</span>
                      </template>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center items-center gap-3 mt-14">
            <button
              @click="changePage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-on-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all !cursor-pointer"
            >
              <span class="material-symbols-outlined">chevron_left</span>
            </button>

            <button
              v-for="p in visiblePages"
              :key="p"
              @click="changePage(p)"
              class="min-w-[44px] h-11 rounded-full font-label-sm text-label-sm transition-all !cursor-pointer"
              :class="p === currentPage
                ? 'bg-primary text-on-primary'
                : 'bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10'"
              :disabled="p === '...'"
            >
              {{ p }}
            </button>

            <button
              @click="changePage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-on-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all !cursor-pointer"
            >
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
      <!-- Offers Section -->
      <div class="mt-16">
        <OfferShowcase
          title="Ofertas Especiales"
          subtitle="Aprovecha descuentos exclusivos por tiempo limitado en productos seleccionados."
          :limit="3"
          :show-view-all="false"
          @error="(msg) => console.warn('Offers error:', msg)"
        />
      </div>
    </main>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { productsAPI, categoriesAPI, cartAPI } from '../../api/index.js';
import OfferShowcase from '../../components/shared/OfferShowcase.vue';
import AppNavBar from '../../components/layout/AppNavBar.vue';
import AppFooter from '../../components/layout/AppFooter.vue';

const router = useRouter();
const route = useRoute();

// Track broken images per product
const brokenImages = reactive({});

// State — inicializado desde query params para URLs compartibles
const products = ref([]);
const categories = ref([]);
const loading = ref(true);
const searchQuery = ref(route.query.search || '');
const selectedCategory = ref(route.query.category || null);
const currentPage = ref(parseInt(route.query.page) || 1);
const perPage = 16;
const totalProducts = ref(0);
const addingToCart = ref(null);

// Computed
const totalPages = computed(() => Math.ceil(totalProducts.value / perPage));

const visiblePages = computed(() => {
  const pages = [];
  const tp = totalPages.value;
  const cp = currentPage.value;

  if (tp <= 7) {
    for (let i = 1; i <= tp; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cp > 3) pages.push('...');
    const start = Math.max(2, cp - 1);
    const end = Math.min(tp - 1, cp + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (cp < tp - 2) pages.push('...');
    pages.push(tp);
  }
  return pages;
});

// Sincronizar estado → URL query params (para compartir)
function syncUrlQuery() {
  const query = {
    ...(searchQuery.value && { search: searchQuery.value }),
    ...(selectedCategory.value && { category: selectedCategory.value }),
    ...(currentPage.value > 1 && { page: String(currentPage.value) })
  };
  router.replace({ query });
}

// Debounce
let searchTimeout = null;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    syncUrlQuery();
    fetchProducts();
  }, 400);
};

// Watcher: cuando el usuario navega atrás/adelante en el historial, sincronizar
watch(() => route.query, (newQuery) => {
  const page = parseInt(newQuery.page) || 1;
  const search = newQuery.search || '';
  const category = newQuery.category || null;

  if (page !== currentPage.value || search !== searchQuery.value || category !== selectedCategory.value) {
    currentPage.value = page;
    searchQuery.value = search;
    selectedCategory.value = category;
    fetchProducts();
  }
});

// Fetch products from API
async function fetchProducts() {
  loading.value = true;
  try {
    const params = {
      status: 'active',
      page: currentPage.value,
      limit: perPage,
      sort_by: 'created_at',
      sort_order: 'desc'
    };

    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    if (selectedCategory.value) {
      params.category_id = selectedCategory.value;
    }

    const res = await productsAPI.getAll(params);
    const result = res.data;

    if (result && Array.isArray(result.data)) {
      products.value = result.data.map(p => ({
        ...p,
        discountPercent: p.compare_price && p.compare_price > p.price
          ? Math.round((1 - p.price / p.compare_price) * 100)
          : 0
      }));
      totalProducts.value = result.pagination?.total || result.data.length;
    } else if (Array.isArray(result)) {
      products.value = result;
      totalProducts.value = result.length;
    } else {
      products.value = [];
      totalProducts.value = 0;
    }
  } catch (err) {
    console.error('[Catalog] Error fetching products:', err);
    products.value = [];
    totalProducts.value = 0;
  } finally {
    loading.value = false;
  }
}

// Fetch categories
async function fetchCategories() {
  try {
    const res = await categoriesAPI.getAll();
    categories.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('[Catalog] Error fetching categories:', err);
  }
}

function changePage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  syncUrlQuery();
  fetchProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function productBadge(product) {
  if (product.featured) return 'Featured';
  return null;
}

function formatPrice(price) {
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function goToDetail(product) {
  router.push({ name: 'ProductPublicDetail', params: { id: product.id } });
}

async function addToCart(product) {
  const token = sessionStorage.getItem('accessToken');
  if (!token) {
    router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  addingToCart.value = product.id;
  try {
    await cartAPI.addItem({ product_id: product.id, quantity: 1 });
  } catch (err) {
    console.error('[Catalog] Error adding to cart:', err);
  } finally {
    addingToCart.value = null;
  }
}

// Mouse effects
function handleMouseMove(e) {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((centerY - y) / centerY) * 8;
  const rotateY = ((x - centerX) / centerX) * 8;
  card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
}

function resetCard(e) {
  e.currentTarget.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)';
  e.currentTarget.style.backgroundImage = 'none';
}

// Shader
function initShader() {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) return;
  // We'll reuse the same shader approach from LandingView
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
  gl.attachShader(prog, (s=>{const s2=gl.createShader(s);gl.shaderSource(s2,fs);gl.compileShader(s2);return s2;})(gl.FRAGMENT_SHADER));
  gl.attachShader(prog, (s=>{const s2=gl.createShader(s);gl.shaderSource(s2,vs);gl.compileShader(s2);return s2;})(gl.VERTEX_SHADER));
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
    const gl2 = canvas.getContext('webgl');
    if (gl2) {
      const ext = gl2.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  };
}

onMounted(() => {
  fetchCategories();
  fetchProducts();
  initShader();
});

onUnmounted(() => {
  if (window.__shaderCleanup) {
    window.__shaderCleanup();
  }
});
</script>

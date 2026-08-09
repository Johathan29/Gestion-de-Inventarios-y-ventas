<template>
  <div class="min-h-screen bg-[#151215] text-[#e8e0e4] selection:bg-primary selection:text-on-primary overflow-x-hidden landing-scope">
    <!-- Background Shader -->
    <div class="fixed inset-0 w-full h-full -z-10 opacity-30 pointer-events-none">
      <canvas id="shader-canvas" style="display:block;width:100%;height:100%"></canvas>
    </div>

    <!-- Navbar -->
    <AppNavBar />

    <main class="relative z-10">
      <!-- Header -->
      <div class="pt-28 pb-12 px-4">
        <div class="max-w-7xl mx-auto">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 entrance-reveal">
            <div>
              <em class="text-secondary font-label-sm text-label-sm not-italic tracking-[0.15em] mb-3 block">Nuestra Colección</em>
              <h1 class="font-headline-lg text-headline-lg text-white">Todos los Productos</h1>
              <p class="font-body-md text-body-md text-white/60 mt-3 max-w-2xl">
                Descubre nuestra selección de productos premium, cuidadosamente diseñados para elevar tu experiencia.
              </p>
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto">
              <!-- Filter Toggle Button -->
              <button
                @click="showFilters = !showFilters"
                class="flex items-center gap-2 px-5 py-3.5 rounded-full border border-white/20 text-white/70 hover:text-primary hover:border-primary transition-all font-body-md text-body-md !cursor-pointer"
                :class="{ 'bg-primary/10 border-primary text-primary': showFilters }"
              >
                <span class="material-symbols-outlined text-lg">filter_list</span>
                <span class="hidden sm:inline">Filtros</span>
              </button>
              <!-- Search -->
              <div class="relative flex-1 md:w-72">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-xl">search</span>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Buscar productos..."
                  class="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-full pl-12 pr-5 py-3.5 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md"
                  @input="debouncedSearch"
                />
              </div>
            </div>
          </div>

          <!-- Filter Panel -->
          <transition name="fade">
            <div v-if="showFilters" class="mt-6 p-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl entrance-reveal">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <!-- Category Filter -->
                <div>
                  <label class="block text-sm font-medium text-white/80 mb-2">Categoría</label>
                  <select
                    v-model="filterCategory"
                    class="w-full px-4 py-2.5 bg-white/[0.08] border border-white/20 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-all"
                  >
                    <option value="">Todas las categorías</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>

                <!-- Price Range (min & max) -->
                <div>
                  <label class="block text-sm font-medium text-white/80 mb-2">Precio mín.</label>
                  <input
                    v-model="filterPriceMin"
                    type="number"
                    min="0"
                    placeholder="$0"
                    class="w-full px-4 py-2.5 bg-white/[0.08] border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-white/80 mb-2">Precio máx.</label>
                  <input
                    v-model="filterPriceMax"
                    type="number"
                    min="0"
                    placeholder="$999,999"
                    class="w-full px-4 py-2.5 bg-white/[0.08] border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <!-- Supplier / Brand -->
                <div>
                  <label class="block text-sm font-medium text-white/80 mb-2">Marca / Proveedor</label>
                  <input
                    v-model="filterBrand"
                    type="text"
                    placeholder="Marca o proveedor..."
                    class="w-full px-4 py-2.5 bg-white/[0.08] border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div class="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
                <button
                  v-if="hasActiveFilters"
                  @click="clearFilters"
                  class="px-6 py-2.5 border border-white/20 text-white/70 rounded-full font-label-sm text-label-sm hover:bg-white/5 transition-all !cursor-pointer"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </transition>

          <!-- Category Pills (quick filters) -->
          <div class="flex flex-wrap gap-3 mt-10 entrance-reveal">
            <button
              @click="selectedCategory = null; currentPage = 1; syncUrlQuery(); fetchProducts()"
              class="px-6 py-2.5 rounded-full font-label-sm text-label-sm transition-all duration-300 !cursor-pointer"
              :class="!selectedCategory
                ? 'bg-primary text-white'
                : 'bg-black/40 border border-white/10 text-white/70 hover:bg-white/10'"
            >
              Todos
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              @click="selectedCategory = cat.id; currentPage = 1; syncUrlQuery(); fetchProducts()"
              class="px-6 py-2.5 rounded-full font-label-sm text-label-sm transition-all duration-300 !cursor-pointer"
              :class="selectedCategory === cat.id
                ? 'bg-primary text-white'
                : 'bg-black/40 border border-white/10 text-white/70 hover:bg-white/10'"
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
            <div v-for="n in 8" :key="'skel-'+n" class="bg-black/40 border border-white/10 rounded-[20px] overflow-hidden animate-pulse">
              <div class="aspect-[3/4] bg-white/5"></div>
              <div class="p-3 space-y-2">
                <div class="h-4 bg-white/10 rounded w-3/4"></div>
                <div class="h-3 bg-white/10 rounded w-1/3"></div>
              </div>
            </div>
          </div>

          <!-- Empty -->
          <div v-else-if="products.length === 0" class="text-center py-24">
            <span class="material-symbols-outlined text-6xl text-white/20 mb-4">inventory_2</span>
            <h3 class="font-headline-md text-headline-md text-white mb-2">No se encontraron productos</h3>
            <p class="font-body-md text-body-md text-white/60 mb-6">
              {{ searchQuery ? 'Intenta con otro término de búsqueda.' : 'Vuelve pronto para ver nuevos productos.' }}
            </p>
            <button
              v-if="searchQuery"
              @click="searchQuery = ''; fetchProducts()"
              class="px-6 py-3 bg-primary text-white rounded-full font-label-sm text-label-sm !cursor-pointer hover:brightness-110 transition-all"
            >
              Limpiar búsqueda
            </button>
          </div>

          <!-- Products Grid -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div
              v-for="product in products"
              :key="product.id"
              class="group"
            >
              <div
                class="relative overflow-hidden rounded-[20px] cursor-pointer bg-black/40 border border-white/10 hover:border-primary/40 transition-all duration-500 product-card-overlay"
                @click="goToDetail(product)"
              >
                <!-- Image 100% container -->
                <div class="aspect-[3/4] w-full overflow-hidden">
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
                    class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10"
                  >
                    <span class="material-symbols-outlined text-7xl text-white/15">inventory_2</span>
                  </div>
                </div>

                <!-- Gradient overlay (like team-block-info) -->
                <div class="absolute inset-0 bg-gradient-to-t from-[#151215] via-[#151215]/60 to-transparent pointer-events-none z-10"></div>

                <!-- Badges (arrow-tail style) -->
                <div class="absolute top-4 left-4 z-20 flex flex-col gap-2">
                  <span v-if="productBadge(product)"
                    class="product-badge inline-block bg-primary text-white text-[11px] font-extrabold px-3.5 py-1.5 rounded-full relative">
                    {{ productBadge(product) }}
                  </span>
                  <span v-if="product.discountPercent > 0"
                    class="product-badge inline-block bg-secondary text-white text-[11px] font-extrabold px-3.5 py-1.5 rounded-full relative">
                    -{{ product.discountPercent }}%
                  </span>
                </div>

                <!-- Info overlaid at bottom -->
                <div class="absolute bottom-0 left-0 right-0 p-4 z-20">
                  <div class="flex justify-between items-start gap-2 mb-1">
                    <h3 class="font-bold text-sm md:text-xl text-white leading-tight line-clamp-1">{{ product.name }}</h3>
                  </div>
                 <div class="flex md:flex-row flex-col gap-2 justify-between items-start md:items-center">
                    <span class="font-bold text-sm md:text-base text-secondary shrink-0">${{ formatPrice(product.price) }}</span>
                    <p v-if="product.brand" class="text-[11px] bg-secondary text-white rounded-md p-[4px] uppercase tracking-wider mb-1">{{ product.brand }}</p>

                </div>

                  <!-- Actions - appear on hover -->
                  <div class="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <button
                      @click.stop="buyNow(product)"
                      :disabled="product.stock <= 0"
                      class="flex-1 py-2.5 rounded-full bg-primary text-white font-bold text-xs hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all !cursor-pointer"
                    >
                      Comprar
                    </button>
                    <button
                      @click.stop="addToCart(product)"
                      :disabled="addingToCart === product.id || product.stock <= 0"
                      class="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-primary hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center !cursor-pointer"
                    >
                      <template v-if="addingToCart === product.id">
                        <span class="material-symbols-outlined text-base animate-spin text-white">progress_activity</span>
                      </template>
                      <template v-else>
                        <span class="material-symbols-outlined text-base text-white">shopping_bag</span>
                      </template>
                    </button>
                  </div>

                  <!-- Stock indicator always visible -->
                  <div class="mt-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-75">
                    <span v-if="product.stock > 0" class="text-[10px] text-white/40">En stock ({{ product.stock }})</span>
                    <span v-else class="text-[10px] text-red-400/70">Sin stock</span>
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
              class="w-11 h-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all !cursor-pointer"
            >
              <span class="material-symbols-outlined text-white">chevron_left</span>
            </button>

            <button
              v-for="p in visiblePages"
              :key="p"
              @click="changePage(p)"
              class="min-w-[44px] h-11 rounded-full font-label-sm text-label-sm transition-all !cursor-pointer"
              :class="p === currentPage
                ? 'bg-primary text-white'
                : 'bg-black/40 border border-white/10 text-white/70 hover:bg-white/10'"
              :disabled="p === '...'"
            >
              {{ p }}
            </button>

            <button
              @click="changePage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="w-11 h-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all !cursor-pointer"
            >
              <span class="material-symbols-outlined text-white">chevron_right</span>
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
import { useToast } from '../../composables/useToast';

const router = useRouter();
const route = useRoute();
const toast = useToast();

// Track broken images per product
const brokenImages = reactive({});

// State — inicializado desde query params para URLs compartibles
const products = ref([]);
const categories = ref([]);
const loading = ref(true);
const searchQuery = ref(route.query.search || '');
const selectedCategory = ref(route.query.category || null);
const currentPage = ref(parseInt(route.query.page) || 1);
const perPage = 10;
const totalProducts = ref(0);
const addingToCart = ref(null);

// Filter state
const showFilters = ref(false);
const filterCategory = ref('');
const filterPriceMin = ref('');
const filterPriceMax = ref('');
const filterBrand = ref('');

// Computed
const totalPages = computed(() => Math.ceil(totalProducts.value / perPage));

const hasActiveFilters = computed(() => {
  return filterCategory.value || filterPriceMin.value || filterPriceMax.value || filterBrand.value;
});

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
    ...(currentPage.value > 1 && { page: String(currentPage.value) }),
    ...(filterBrand.value && { brand: filterBrand.value }),
    ...(filterPriceMin.value && { price_min: filterPriceMin.value }),
    ...(filterPriceMax.value && { price_max: filterPriceMax.value })
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

// Watchers: auto-aplicar filtros cuando cambien
watch([filterCategory, filterPriceMin, filterPriceMax, filterBrand], () => {
  currentPage.value = 1;
  syncUrlQuery();
  fetchProducts();
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

    if (filterBrand.value) {
      params.brand = filterBrand.value;
    }
    if (filterPriceMin.value) {
      params.price_min = filterPriceMin.value;
    }
    if (filterPriceMax.value) {
      params.price_max = filterPriceMax.value;
    }

    const res = await productsAPI.getAll(params);
    const result = res.data;

    if (Array.isArray(result)) {
      products.value = result.map(p => ({
        ...p,
        discountPercent: p.compare_price && p.compare_price > p.price
          ? Math.round((1 - p.price / p.compare_price) * 100)
          : 0
      }));
      totalProducts.value = res.pagination?.total || result.length;
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

function clearFilters() {
  filterCategory.value = '';
  filterPriceMin.value = '';
  filterPriceMax.value = '';
  filterBrand.value = '';
  selectedCategory.value = null;
  currentPage.value = 1;
  syncUrlQuery();
  // fetchProducts() se llama automáticamente via el watcher de filtros
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
    await cartAPI.addItem({ productId: product.id, quantity: 1 });
    toast.success(`${product.name} agregado al carrito`);
  } catch (err) {
    console.error('[Catalog] Error adding to cart:', err);
    toast.error(err.response?.data?.error?.message || 'Error al agregar al carrito');
  } finally {
    addingToCart.value = null;
  }
}

async function buyNow(product) {
  const token = sessionStorage.getItem('accessToken');
  if (!token) {
    router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } });
    return;
  }

  addingToCart.value = product.id;
  try {
    await cartAPI.addItem({ productId: product.id, quantity: 1 });
    router.push({ name: 'Cart' });
  } catch (err) {
    console.error('[Catalog] Error buying now:', err);
    toast.error(err.response?.data?.error?.message || 'Error al agregar al carrito');
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

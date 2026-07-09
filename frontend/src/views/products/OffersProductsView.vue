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
              <p class="text-white font-label-sm text-label-sm uppercase tracking-[0.2em] mb-3">Hot Deals</p>
              <h1 class="font-headline-lg text-headline-lg text-on-surface">Ofertas Especiales</h1>
              <p class="font-body-md text-body-md text-on-surface-variant mt-3 max-w-2xl">
                Aprovecha descuentos exclusivos por tiempo limitado en productos seleccionados.
                ¡No dejes pasar estas oportunidades!
              </p>
            </div>
            <div class="flex items-center gap-3 w-full md:w-auto">
              <!-- Search -->
              <div class="relative flex-1 md:w-72">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Buscar ofertas..."
                  class="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-5 py-3.5 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md"
                  @input="debouncedSearch"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Products Section -->
      <div class="px-4 pb-20">
        <div class="max-w-7xl mx-auto">
          <!-- Loading State -->
          <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="n in 6" :key="'skeleton-' + n" class="glass-card rounded-[32px] p-6 h-full animate-pulse">
              <div class="aspect-square mb-8 overflow-hidden rounded-2xl bg-white/5"></div>
              <div class="h-6 bg-white/5 rounded w-3/4 mb-4"></div>
              <div class="h-4 bg-white/5 rounded w-1/4 mb-4"></div>
              <div class="h-4 bg-white/5 rounded w-full mb-2"></div>
              <div class="h-4 bg-white/5 rounded w-2/3 mb-8"></div>
              <div class="h-12 bg-white/5 rounded-xl w-full"></div>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="text-center py-24">
            <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">error_outline</span>
            <h3 class="font-headline-md text-headline-md text-on-surface mb-2">Error al cargar ofertas</h3>
            <p class="font-body-md text-body-md text-on-surface-variant mb-6">{{ error }}</p>
            <button
              @click="fetchOffers"
              class="px-6 py-3 bg-primary text-on-primary rounded-full font-label-sm text-label-sm !cursor-pointer"
            >
              Reintentar
            </button>
          </div>

          <!-- Empty State -->
          <div v-else-if="products.length === 0" class="text-center py-24">
            <span class="material-symbols-outlined text-6xl text-on-surface-variant mb-4">local_offer</span>
            <h3 class="font-headline-md text-headline-md text-on-surface mb-2">No hay ofertas disponibles</h3>
            <p class="font-body-md text-body-md text-on-surface-variant mb-6">
              {{ searchQuery ? 'No se encontraron ofertas con ese término.' : 'Actualmente no hay ofertas especiales. ¡Vuelve pronto!' }}
            </p>
            <button
              v-if="searchQuery"
              @click="searchQuery = ''; fetchOffers()"
              class="px-6 py-3 bg-primary text-on-primary rounded-full font-label-sm text-label-sm !cursor-pointer"
            >
              Limpiar búsqueda
            </button>
            <router-link
              v-else
              to="/products"
              class="inline-block px-6 py-3 bg-primary text-on-primary rounded-full font-label-sm text-label-sm !cursor-pointer"
            >
              Ver catálogo completo
            </router-link>
          </div>

          <!-- Offer Products Grid -->
          <div v-else data-gsap="stagger" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="product in products"
              :key="product.id"
              class="perspective"
              data-gsap="item"
            >
              <div
                class="glass-card rounded-[32px] p-6 h-full flex flex-col group cursor-pointer overflow-hidden product-card offer-card"
                @click="goToDetail(product)"
                @mousemove="handleMouseMove"
                @mouseleave="resetCard"
              >
                <!-- Image with badges -->
                <div class="relative aspect-square mb-8 overflow-hidden rounded-2xl bg-white/5">
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
                    class="w-full h-full flex items-center justify-center"
                  >
                    <span class="material-symbols-outlined text-6xl text-on-surface-variant/20">inventory_2</span>
                  </div>

                  <!-- Discount Badge -->
                  <div
                    v-if="product.discountPercent > 0"
                    class="absolute top-4 left-4 bg-secondary text-on-secondary px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-secondary/30 animate-pulse-discount"
                  >
                    -{{ product.discountPercent }}% OFF
                  </div>

                  <!-- Expiration countdown -->
                  <div
                    v-if="product.offer_end_date"
                    class="absolute bottom-4 right-4 glass-card px-3 py-1.5 rounded-full font-label-sm text-xs text-on-surface-variant"
                  >
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs" data-icon="schedule">schedule</span>
                      {{ getRemainingDays(product.offer_end_date) }}
                    </span>
                  </div>
                </div>

                <!-- Product Info -->
                <div class="flex justify-between items-start mb-4">
                  <div class="flex-1 min-w-0 mr-2">
                    <h3 class="font-headline-md text-headline-md text-on-surface truncate">{{ product.name }}</h3>
                    <p v-if="product.brand" class="font-body-sm text-body-sm text-primary/70 mt-1">{{ product.brand }}</p>
                    <p v-if="product.sku" class="font-body-sm text-body-sm text-on-surface-variant/40 mt-0.5">SKU: {{ product.sku }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <span class="font-headline-md text-headline-md text-secondary">${{ formatPrice(product.price) }}</span>
                    <p v-if="product.compare_price && product.compare_price > product.price" class="font-body-sm text-body-sm text-on-surface-variant/50 line-through">
                      ${{ formatPrice(product.compare_price) }}
                    </p>
                  </div>
                </div>

                <!-- Description -->
                <p class="font-body-md text-body-md text-on-surface-variant mb-6 line-clamp-2 flex-1">{{ product.description || 'Sin descripción' }}</p>

                <!-- Price & discount detail -->
                <div v-if="product.discountPercent > 0 && product.compare_price && product.compare_price > product.price" class="mb-6 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-on-surface-variant/70">Precio original:</span>
                    <span class="text-on-surface-variant/50 line-through">${{ formatPrice(product.compare_price) }}</span>
                  </div>
                  <div class="flex justify-between items-center text-sm mt-1">
                    <span class="text-on-surface-variant/70">Descuento:</span>
                    <span class="text-secondary font-bold">-{{ product.discountPercent }}%</span>
                  </div>
                  <div class="flex justify-between items-center text-sm mt-1 pt-1 border-t border-primary/10">
                    <span class="text-on-surface-variant/70">Ahorras:</span>
                    <span class="text-green-400 font-bold">${{ formatPrice(product.compare_price - product.price) }}</span>
                  </div>
                </div>

                <!-- Stock info -->
                <div class="mb-4">
                  <div v-if="product.stock !== undefined" class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" :class="product.stock > 0 ? 'bg-green-400' : 'bg-red-400'"></span>
                    <span class="font-body-sm text-body-sm" :class="product.stock > 0 ? 'text-green-400/70' : 'text-red-400/70'">
                      {{ product.stock > 0 ? `${product.stock} en stock` : 'Agotado' }}
                    </span>
                  </div>
                </div>

                <!-- CTA Button -->
                <button
                  @click.stop="goToDetail(product)"
                  class="mt-auto w-full py-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary hover:text-on-primary transition-all duration-300 font-label-sm text-label-sm flex items-center justify-center gap-2 group/btn"
                >
                  <span>Ver Oferta</span>
                  <span class="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
                </button>
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
            <span class="font-body-md text-body-md text-on-surface-variant">
              Página {{ currentPage }} de {{ totalPages }}
            </span>
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
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- WhatsApp Widget flotante -->
    <WhatsAppWidget />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ecommerceAPI, productsAPI } from '../../api/index.js';
import AppNavBar from '../../components/layout/AppNavBar.vue';
import AppFooter from '../../components/layout/AppFooter.vue';
import WhatsAppWidget from '../../components/shared/WhatsAppWidget.vue';

const router = useRouter();

// Track broken images
const brokenImages = reactive({});

const products = ref([]);
const loading = ref(true);
const error = ref(null);
const searchQuery = ref('');
const currentPage = ref(1);
const perPage = 9;
const totalProducts = ref(0);

// Computed
const totalPages = computed(() => Math.ceil(totalProducts.value / perPage));

// Debounce search
let searchTimeout = null;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchOffers();
  }, 400);
};

onMounted(() => {
  initShader();
  fetchOffers();
});

async function fetchOffers() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await ecommerceAPI.getOffers();
    const offers = Array.isArray(data) ? data : (data?.data || []);

    const search = searchQuery.value.toLowerCase().trim();

    // Filter & map offers to products with discount info
    let mapped = offers
      .filter(o => o.products && o.active !== false)
      .map(o => ({
        ...o.products,
        discountPercent: o.discount_percent
          ? Number(o.discount_percent)
          : (o.products?.compare_price && o.products?.price
            ? Math.round((1 - o.products.price / o.products.compare_price) * 100)
            : 0),
        compare_price: o.products?.compare_price || null,
        offer_end_date: o.end_date,
        offer_id: o.id
      }));

    // Apply search filter
    if (search) {
      mapped = mapped.filter(p =>
        p.name?.toLowerCase().includes(search) ||
        p.brand?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
      );
    }

    totalProducts.value = mapped.length;

    // Paginate
    const from = (currentPage.value - 1) * perPage;
    const to = from + perPage;
    products.value = mapped.slice(from, to);

  } catch (err) {
    console.error('[OffersProducts] Error fetching offers:', err);
    // Fallback: get featured products as offers
    try {
      const res = await productsAPI.getAll({ status: 'active', featured: true, limit: 50 });
      const result = res.data;
      const items = Array.isArray(result) ? result : (result?.data || []);
      let mapped = items.map(p => ({
        ...p,
        discountPercent: p.compare_price && p.compare_price > p.price
          ? Math.round((1 - p.price / p.compare_price) * 100)
          : 0
      }));

      const search = searchQuery.value.toLowerCase().trim();
      if (search) {
        mapped = mapped.filter(p =>
          p.name?.toLowerCase().includes(search) ||
          p.brand?.toLowerCase().includes(search) ||
          p.sku?.toLowerCase().includes(search)
        );
      }

      totalProducts.value = mapped.length;
      const from = (currentPage.value - 1) * perPage;
      const to = from + perPage;
      products.value = mapped.slice(from, to);
    } catch (fallbackErr) {
      error.value = fallbackErr.response?.data?.error?.message || 'Error al cargar las ofertas';
    }
  } finally {
    loading.value = false;
  }
}

function changePage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  fetchOffers();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatPrice(price) {
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getRemainingDays(dateStr) {
  if (!dateStr) return '';
  const end = new Date(dateStr);
  const now = new Date();
  const diff = end - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Finaliza pronto';
  if (days === 1) return '1 día restante';
  return `${days} días restantes`;
}

function goToDetail(product) {
  router.push({ name: 'ProductPublicDetail', params: { id: product.id } });
}

// 3D Tilt hover effect
function handleMouseMove(e) {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((centerY - y) / centerY) * 10;
  const rotateY = ((x - centerX) / centerX) * 10;
  card.style.transform = `
    perspective(1200px)
    rotateX(${rotateX}deg)
    rotateY(${rotateY}deg)
    translateY(-8px)
    scale(1.03)
  `;
}

function resetCard(e) {
  e.currentTarget.style.transform = `
    perspective(1200px)
    rotateX(0deg)
    rotateY(0deg)
    translateY(0px)
    scale(1)
  `;
}

// WebGL Shader
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
  gl.attachShader(prog, (s=>{const s2=gl.createShader(s);gl.shaderSource(s2,fs);gl.compileShader(s2);return s2;})(gl.FRAGMENT_SHADER));
  gl.attachShader(prog, (s=>{const s2=gl.createShader(s);gl.shaderSource(s2,vs);gl.compileShader(s2);return s2;})(gl.VERTEX_SHADER));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const timeLoc = gl.getUniformLocation(prog, 'u_time');
  const resLoc = gl.getUniformLocation(prog, 'u_resolution');
  gl.uniform2f(resLoc, canvas.width, canvas.height);

  let start = performance.now();
  function loop() {
    gl.uniform1f(timeLoc, (performance.now() - start) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(loop);
  }
  loop();
}
</script>

<style scoped>
.perspective {
  perspective: 1400px;
}

.product-card {
  transform-style: preserve-3d;
  transition: transform .18s ease-out, box-shadow .35s ease;
  will-change: transform;
}

.glass-card {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), border 0.3s ease;
}

.glass-card:hover {
  border-color: rgba(233, 179, 252, 0.4);
  transform: translateY(-8px) scale(1.02);
}

.product-card:hover {
  box-shadow:
    0 25px 60px rgba(0,0,0,.35),
    0 10px 30px rgba(138,92,246,.20);
}

/* Offer card extra glow */
.offer-card {
  position: relative;
}

.offer-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 33px;
  background: linear-gradient(135deg, rgba(233,179,252,0.3), rgba(138,92,246,0.1), rgba(233,179,252,0.2));
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.offer-card:hover::before {
  opacity: 1;
}

/* Discount pulse animation */
@keyframes pulse-discount {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(138,92,246,0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 20px 5px rgba(138,92,246,0.2);
  }
}

.animate-pulse-discount {
  animation: pulse-discount 2s ease-in-out infinite;
}

/* Entrance animation */
.entrance-reveal {
  animation: entranceReveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes entranceReveal {
  from {
    opacity: 0;
    transform: translateY(30px);
    filter: blur(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}
</style>

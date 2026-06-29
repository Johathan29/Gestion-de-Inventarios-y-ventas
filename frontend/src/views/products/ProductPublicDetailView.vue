<template>
  <div class="min-h-screen bg-[#151215] text-[#e8e0e4] selection:bg-primary selection:text-on-primary overflow-x-hidden">
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
                  v-if="product.images && product.images.length > 1"
                  class="flex gap-3 p-4 border-t border-white/5 overflow-x-auto"
                >
                  <div
                    v-for="(img, idx) in product.images"
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
                  <span class="font-headline-xl text-headline-xl text-secondary">${{ formatPrice(product.price) }}</span>
                  <span
                    v-if="product.compare_price && product.compare_price > product.price"
                    class="font-headline-md text-headline-md text-on-surface-variant/50 line-through"
                  >
                    ${{ formatPrice(product.compare_price) }}
                  </span>
                  <span
                    v-if="discountPercent > 0"
                    class="px-3 py-1 bg-secondary/20 text-secondary rounded-full font-label-sm text-label-sm text-xs"
                  >
                    Save {{ discountPercent }}%
                  </span>
                </div>

                <!-- Description -->
                <p v-if="product.description" class="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-8">
                  {{ product.description }}
                </p>

                <!-- SKU & Stock -->
                <div class="grid grid-cols-2 gap-4 mb-8">
                  <div class="bg-white/5 rounded-2xl p-4">
                    <p class="text-xs text-on-surface-variant/60 uppercase tracking-wider mb-1">SKU</p>
                    <p class="font-label-md text-label-md text-on-surface font-mono">{{ product.sku }}</p>
                  </div>
                  <div class="bg-white/5 rounded-2xl p-4">
                    <p class="text-xs text-on-surface-variant/60 uppercase tracking-wider mb-1">Availability</p>
                    <p class="font-label-md text-label-md" :class="stockColor">
                      <span v-if="product.stock > 0">{{ product.stock }} in stock</span>
                      <span v-else>Out of stock</span>
                    </p>
                  </div>
                </div>

                <!-- Add to Cart Button -->
                <button
                  @click="addToCart"
                  :disabled="addingToCart || product.stock <= 0"
                  class="w-full py-4 rounded-2xl bg-primary text-on-primary font-label-sm text-label-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 !cursor-pointer"
                >
                  <template v-if="addingToCart">
                    <span class="material-symbols-outlined animate-spin">progress_activity</span>
                    Adding...
                  </template>
                  <template v-else>
                    <span class="material-symbols-outlined">shopping_bag</span>
                    Add to Collection
                  </template>
                </button>

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
        <div class="mt-16">
          <OfferShowcase
            title="También en Oferta"
            subtitle="Descubre otros productos con descuentos exclusivos por tiempo limitado."
            :limit="3"
            :show-view-all="true"
            @view-all="router.push({ name: 'ProductsCatalog' })"
            @error="(msg) => console.warn('Offers error:', msg)"
          />
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productsAPI, cartAPI } from '../../api/index.js';
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
const currentImageIndex = ref(0);
const imageErrors = reactive({});

const currentImage = computed(() => {
  const images = product.value?.images;
  if (!images || !Array.isArray(images) || images.length === 0) return null;
  const url = images[currentImageIndex.value] || images[0];
  if (imageErrors[url]) return null;
  return url;
});

const discountPercent = computed(() => {
  if (!product.value) return 0;
  const { compare_price, price } = product.value;
  if (!compare_price || compare_price <= price) return 0;
  return Math.round((1 - price / compare_price) * 100);
});

const stockColor = computed(() => {
  const stock = product.value?.stock ?? 0;
  if (stock <= 0) return 'text-red-400';
  return 'text-green-400';
});

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
    await cartAPI.addItem({ product_id: product.value.id, quantity: 1 });
  } catch (err) {
    console.error('[ProductDetail] Error adding to cart:', err);
  } finally {
    addingToCart.value = false;
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
    } else {
      error.value = 'Product not found';
    }
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Error loading product';
    console.error('[ProductDetail] Error:', err);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  if (window.__shaderCleanup) {
    window.__shaderCleanup();
  }
});
</script>

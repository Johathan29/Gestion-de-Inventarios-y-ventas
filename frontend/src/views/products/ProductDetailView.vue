<template>
  <DetailSkeleton v-if="loading" />
  <div v-else class="max-w-6xl mx-auto">
    <!-- Action Header -->
    <div style="display: flex; flex-wrap: wrap; gap: var(--aurora-base); align-items: center; justify-content: space-between; margin-bottom: var(--aurora-md);">
      <button @click="$router.push('/app/products')"
        class="aurora-btn-secondary">
        <span class="material-symbols-outlined">arrow_back</span>
        Volver
      </button>
      <button @click="$router.push(`/app/products/${product.id}/edit`)"
        class="aurora-btn-primary">
        <span class="material-symbols-outlined" style="font-size: 1.25rem;">edit</span>
        Editar Producto
      </button>
    </div>

    <!-- 2-Column Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12" style="gap: var(--aurora-gutter);">
      <!-- Left Column: Gallery (5/12) -->
      <div class="lg:col-span-5 flex flex-col" style="gap: var(--aurora-base);">
        <!-- Main Image -->
        <div class="aurora-raised-card" style="aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: var(--aurora-base);">
          <img v-if="currentImage"
            :src="currentImage" :alt="product.name"
            class="w-full h-full object-contain transition-opacity duration-300"
            @error="currentImage && (imageErrors[currentImage] = true)" />
          <div v-else class="text-center p-8">
            <span class="material-symbols-outlined" style="font-size: 4rem; color: var(--aurora-outline); display: block; margin-bottom: 0.5rem;">inventory_2</span>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Sin imagen</p>
          </div>
        </div>
        <!-- Thumbnails -->
        <div v-if="thumbnailImages.length > 1"
          class="flex" style="gap: var(--aurora-base); overflow-x: auto; padding-bottom: 0.5rem;">
          <div v-for="(img, idx) in thumbnailImages" :key="idx"
            @click="currentImageIndex = idx"
            class="aurora-raised-card" style="width: 5rem; height: 5rem; flex-shrink: 0; padding: 0; overflow: hidden; cursor: pointer;"
            :class="idx === currentImageIndex
              ? 'aurora-pressed'
              : ''">
            <img :src="img" class="w-full h-full object-cover" @error="imageErrors[img] = true" />
          </div>
        </div>
        <!-- Variant image identifier -->
        <div v-if="selectedVariant?.images?.length">
          <span class="aurora-badge aurora-badge-primary">
            <span class="material-symbols-outlined" style="font-size: 14px;">photo_library</span>
            Imágenes de: <strong>{{ selectedVariant.name }}</strong>
          </span>
        </div>
      </div>

      <!-- Right Column: Details (7/12) -->
      <div class="lg:col-span-7 flex flex-col" style="gap: var(--aurora-gutter);">
        <!-- Title & Badges -->
        <div class="flex flex-col" style="gap: 0.5rem;">
          <div class="flex items-start justify-between" style="gap: var(--aurora-base);">
            <h2 style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: var(--aurora-on-surface); letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">{{ product.name }}</h2>
          </div>
          <div class="flex flex-wrap gap-2 items-center mt-2">
            <span v-if="product.status === 'active' || product.is_active" class="aurora-badge aurora-badge-success">
              <span class="w-2 h-2 rounded-full" style="background: #16a34a; display: inline-block; margin-right: 0.375rem;"></span> Activo
            </span>
            <span v-else class="aurora-badge aurora-badge-secondary">
              <span class="w-2 h-2 rounded-full" style="background: #9ca3af; display: inline-block; margin-right: 0.375rem;"></span> Inactivo
            </span>
            <span v-if="product.featured" class="aurora-badge" style="background: rgba(253,202,92,0.3); color: #735500;">
              <span class="material-symbols-outlined" style="font-size: 14px;">star</span> Destacado
            </span>
          </div>
          <div class="flex flex-wrap" style="gap: var(--aurora-base); margin-top: var(--aurora-base);">
            <div class="flex items-center gap-2">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">SKU:</span>
              <span class="aurora-pressed" style="padding: 0.25rem 0.5rem; border-radius: var(--aurora-radius-sm); font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; font-weight: 500; color: var(--aurora-on-surface-variant);">{{ displaySku }}</span>
            </div>
            <div v-if="displayBarcode" class="flex items-center gap-2">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">BARCODE:</span>
              <span class="aurora-pressed" style="padding: 0.25rem 0.5rem; border-radius: var(--aurora-radius-sm); font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; font-weight: 500; color: var(--aurora-on-surface-variant);">{{ displayBarcode }}</span>
            </div>
          </div>
        </div>

        <!-- Variant Selector -->
        <div v-if="variantGroups.length > 0" class="aurora-raised-card">
          <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1rem; font-weight: 600; color: var(--aurora-on-surface); margin-bottom: 0.75rem;">Variantes</h3>
          <div style="display: flex; flex-direction: column; gap: var(--aurora-sm);">
            <div v-for="group in variantGroups" :key="group.attr">
              <p style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--aurora-on-surface-variant); margin-bottom: 0.5rem;">{{ group.attr }}</p>
              <div class="flex flex-wrap gap-2">
                <template v-if="group.attr === 'color' || group.attr === 'Color' || group.attr === 'COLOR'">
                  <button
                    v-for="opt in group.options" :key="opt.value"
                    @click="selectVariantAttribute(group.attr, opt.value)"
                    class="w-9 h-9 rounded-full border-2 transition-all !cursor-pointer"
                    :style="{
                      background: opt.value.toLowerCase(),
                      borderColor: selectedAttributes[group.attr] === opt.value ? 'var(--aurora-primary)' : 'rgba(206,195,213,0.3)',
                      transform: selectedAttributes[group.attr] === opt.value ? 'scale(1.15)' : 'scale(1)'
                    }"
                    :title="opt.label"
                  ></button>
                </template>
                <template v-else>
                  <button
                    v-for="opt in group.options" :key="opt.value"
                    @click="selectVariantAttribute(group.attr, opt.value)"
                    class="aurora-btn-secondary"
                    :style="{
                      background: selectedAttributes[group.attr] === opt.value ? 'var(--aurora-primary)' : '',
                      color: selectedAttributes[group.attr] === opt.value ? 'white' : '',
                      borderColor: selectedAttributes[group.attr] === opt.value ? 'var(--aurora-primary)' : ''
                    }"
                  >
                    {{ opt.label }}
                  </button>
                </template>
              </div>
            </div>
          </div>
          <!-- Selected variant info -->
          <div v-if="selectedVariant" class="aurora-pressed" style="margin-top: 1rem; padding: 0.75rem; border-radius: var(--aurora-radius-lg);">
            <div class="flex items-center justify-between" style="margin-bottom: 0.25rem;">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; color: var(--aurora-on-surface);">{{ selectedVariant.name }}</span>
              <span v-if="selectedVariant.sku !== product.sku" style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--aurora-on-surface-variant);">SKU: {{ selectedVariant.sku }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 700; color: var(--aurora-primary);">${{ formatPrice(displayPrice) }}</span>
              <span v-if="selectedVariant.stock !== undefined" style="font-family: 'Inter', sans-serif; font-size: 0.8rem; font-weight: 500;" :style="{ color: selectedVariant.stock > 0 ? '#16a34a' : '#991b1b' }">
                {{ selectedVariant.stock > 0 ? selectedVariant.stock + ' en stock' : 'Sin stock' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2" style="gap: var(--aurora-sm);">
          <div class="aurora-stat-card">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Precio de Venta</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem; line-height: 1.3; font-weight: 700; color: var(--aurora-primary);">{{ formatTable(displayPrice) }}</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant); margin-top: 0.25rem;">COP</p>
          </div>
          <div class="aurora-stat-card">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Costo</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; line-height: 1.4; font-weight: 600; color: var(--aurora-on-surface);">{{ formatTable(displayCostPrice) }}</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant); margin-top: 0.25rem;">COP</p>
          </div>
          <div class="aurora-stat-card" :style="{ borderLeft: `4px solid ${stockColorHex(displayStock, product.min_stock ?? 5)}` }">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Stock Actual</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem; line-height: 1.3; font-weight: 700; color: var(--aurora-on-surface);">{{ displayStock }}</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; margin-top: 0.25rem;" :style="{ color: stockColorHex(displayStock, product.min_stock ?? 5) }">
              {{ stockLabel(displayStock, product.min_stock ?? 5) }}
            </p>
          </div>
          <div class="aurora-stat-card">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Margen</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; line-height: 1.4; font-weight: 600; color: var(--aurora-on-surface);">{{ displayMarginPercent }}%</p>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; margin-top: 0.25rem;" :style="{ color: displayMarginPercent >= 30 ? '#166534' : 'var(--aurora-on-surface-variant)' }">{{ displayMarginPercent >= 30 ? 'Rentable' : '-' }}</p>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="aurora-raised-card">
          <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; line-height: 1.4; font-weight: 600; color: var(--aurora-on-surface); margin-bottom: 1rem;">Detalles Generales</h3>
          <div class="grid grid-cols-1 md:grid-cols-2" style="gap: var(--aurora-sm) 2rem;">
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant);">Categoría</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: var(--aurora-on-surface);">{{ product.categories?.name || product.category_name || 'Sin categoría' }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant);">Marca</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: var(--aurora-on-surface);">{{ product.brand || '-' }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant);">Stock Mínimo</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: var(--aurora-on-surface);">{{ product.min_stock ?? 0 }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant);">Unidad</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: var(--aurora-on-surface);">{{ product.unit || 'unidad' }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant);">Creado</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: var(--aurora-on-surface);">{{ formatDate(product.created_at) }}</span>
            </div>
            <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant);">Última Act.</span>
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; font-weight: 600; color: var(--aurora-on-surface);">{{ formatDate(product.updated_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div v-if="product.description" class="aurora-raised-card">
          <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; line-height: 1.4; font-weight: 600; color: var(--aurora-on-surface); margin-bottom: 0.5rem;">Descripción</h3>
          <p style="font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.6; color: var(--aurora-on-surface-variant);">{{ product.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { productsAPI } from '../../api';
import DetailSkeleton from '../../components/skeletons/DetailSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';
import { useCurrency } from '../../composables/useCurrency';
import { formatDate } from '../../utils';

const { formatTable } = useCurrency();

const route = useRoute();
const product = ref({});
const loading = ref(true);
const currentImageIndex = ref(0);
const imageErrors = reactive({});

// ========== VARIANT STATE ==========
const variants = ref([]);
const selectedAttributes = reactive({});

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

const selectedVariant = computed(() => {
  const selectedKeys = Object.keys(selectedAttributes);
  if (selectedKeys.length === 0 || variants.value.length === 0) return null;
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

watch(selectedVariant, () => {
  currentImageIndex.value = 0;
});

// ========== DISPLAY COMPUTED (variant-aware) ==========

const thumbnailImages = computed(() => {
  const sv = selectedVariant.value;
  if (sv?.images && Array.isArray(sv.images) && sv.images.length > 0) {
    return sv.images;
  }
  return product.value?.images || [];
});

const currentImage = computed(() => {
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

const displayPrice = computed(() => {
  const sv = selectedVariant.value;
  if (sv?.price !== undefined && sv.price !== null) return sv.price;
  return product.value?.price ?? 0;
});

const displayCostPrice = computed(() => {
  const sv = selectedVariant.value;
  if (sv?.cost_price !== undefined && sv.cost_price !== null) return sv.cost_price;
  return product.value?.cost_price ?? 0;
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

const displayBarcode = computed(() => {
  const sv = selectedVariant.value;
  if (sv?.barcode) return sv.barcode;
  return product.value?.barcode ?? '';
});

const displayMarginPercent = computed(() => {
  const price = displayPrice.value;
  if (price === 0) return 0;
  return Math.round(((price - displayCostPrice.value) / price) * 100);
});

// Helper to format price numbers
function formatPrice(price) {
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const profit = computed(() => {
  return (displayPrice.value) - (displayCostPrice.value);
});

const stockColorHex = (stock, min) => {
  if (stock <= 0) return '#991b1b';
  if (stock <= min) return '#b45309';
  return '#16a34a';
};

const stockLabel = (stock, min) => {
  if (stock <= 0) return 'Sin stock';
  if (stock <= min) return 'Bajo';
  return 'Suficiente';
};

onMounted(async () => {
  try {
    const res = await productsAPI.getById(route.params.id);
    if (res.data && res.data.id) {
      product.value = res.data;
      // Load variants
      if (Array.isArray(res.data.product_variants) && res.data.product_variants.length > 0) {
        variants.value = res.data.product_variants.map(v => ({
          ...v,
          attributes: typeof v.attributes === 'object' && v.attributes ? v.attributes : {}
        }));
      } else {
        // Try fetching variants separately
        try {
          const vRes = await productsAPI.getVariants(route.params.id);
          if (Array.isArray(vRes.data) && vRes.data.length > 0) {
            variants.value = vRes.data.map(v => ({
              ...v,
              attributes: typeof v.attributes === 'object' && v.attributes ? v.attributes : {}
            }));
          }
        } catch (e) {
          // No variants endpoint or no variants
        }
      }
      // Auto-select first option of each attribute group
      if (variantGroups.value.length > 0) {
        for (const group of variantGroups.value) {
          if (group.options.length > 0 && !selectedAttributes[group.attr]) {
            selectedAttributes[group.attr] = group.options[0].value;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error fetching product:', e);
  } finally {
    loading.value = false;
  }
});
</script>

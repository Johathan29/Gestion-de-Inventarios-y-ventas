<template>
  <DetailSkeleton v-if="loading" />
  <div v-else class="max-w-6xl mx-auto">
    <!-- Action Header -->
    <div class="flex flex-wrap items-center justify-between" style="gap: var(--aurora-base); margin-bottom: var(--aurora-md);">
      <button @click="goBack"
        class="aurora-btn-secondary">
        <span class="material-symbols-outlined">arrow_back</span>
        Volver
      </button>
      <div class="flex items-center gap-2">
        <button @click="viewKardex"
          class="aurora-btn-secondary">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">history</span>
          Ver Kardex
        </button>
        <button @click="toggleProductActive"
          class="aurora-btn-secondary"
          :style="{
            background: product.is_active ? '#fef2f2' : '#dcfce7',
            color: product.is_active ? '#dc2626' : '#16a34a',
            borderColor: product.is_active ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'
          }">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">
            {{ product.is_active ? 'visibility_off' : 'visibility' }}
          </span>
          {{ product.is_active ? 'Desactivar' : 'Activar' }}
        </button>
      </div>
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
            @error="currentImageIndex = -1" />
          <div v-else class="text-center p-8">
            <span class="material-symbols-outlined" style="font-size: 4rem; color: var(--aurora-outline); display: block; margin-bottom: 0.5rem;">inventory_2</span>
            <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Sin imagen</p>
          </div>
        </div>
        <!-- Thumbnails -->
        <div v-if="allImages.length > 1" class="flex" style="gap: var(--aurora-base); overflow-x: auto; padding-bottom: 0.5rem;">
          <div v-for="(img, idx) in allImages" :key="idx"
            @click="currentImageIndex = idx"
            class="aurora-raised-card" style="width: 5rem; height: 5rem; flex-shrink: 0; padding: 0; overflow: hidden; cursor: pointer;"
            :class="idx === currentImageIndex
              ? 'aurora-pressed'
              : ''">
            <img :src="img" class="w-full h-full object-cover" />
          </div>
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
            <!-- Product status -->
            <span v-if="product.is_active" class="aurora-badge aurora-badge-success">
              <span class="w-2 h-2 rounded-full" style="background: #16a34a; display: inline-block; margin-right: 0.375rem;"></span> Activo
            </span>
            <span v-else class="aurora-badge aurora-badge-secondary">
              <span class="w-2 h-2 rounded-full" style="background: #9ca3af; display: inline-block; margin-right: 0.375rem;"></span> Inactivo
            </span>
            <!-- Inventory status -->
            <span class="aurora-badge" :class="{
              'aurora-badge-success': inventoryStatus === 'available',
              'aurora-badge-warning': inventoryStatus === 'pending',
              'aurora-badge-danger': inventoryStatus === 'blocked' || inventoryStatus === 'not_available'
            }">
              <span class="w-1.5 h-1.5 rounded-full" style="display: inline-block; margin-right: 0.375rem;"
                :style="{
                  background: inventoryStatus === 'available' ? '#16a34a' : inventoryStatus === 'pending' ? '#eab308' : '#ef4444'
                }"></span>
              {{ inventoryStatus === 'available' ? 'Disponible' : inventoryStatus === 'pending' ? 'Pendiente' : inventoryStatus === 'not_available' ? 'No Disponible' : 'Bloqueado' }}
            </span>
          </div>
          <div class="flex flex-wrap" style="gap: var(--aurora-base); margin-top: var(--aurora-base);">
            <div class="flex items-center gap-2">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">SKU:</span>
              <span class="aurora-pressed" style="padding: 0.25rem 0.5rem; border-radius: var(--aurora-radius-sm); font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; font-weight: 500; color: var(--aurora-on-surface-variant);">{{ product.sku || '—' }}</span>
            </div>
            <div v-if="product.barcode" class="flex items-center gap-2">
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">BARCODE:</span>
              <span class="aurora-pressed" style="padding: 0.25rem 0.5rem; border-radius: var(--aurora-radius-sm); font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; font-weight: 500; color: var(--aurora-on-surface-variant);">{{ product.barcode }}</span>
            </div>
          </div>
        </div>

        <!-- Stock Summary by Status -->
        <div class="grid grid-cols-1 md:grid-cols-2" style="gap: var(--aurora-sm);">
          <div class="aurora-stat-card">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Stock Total</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--aurora-on-surface);">{{ totalStock }}</p>
          </div>
          <div class="aurora-stat-card">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Precio Venta</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 600; color: var(--aurora-primary);">{{ formatTable(displayPrice) }}</p>
          </div>
          <div class="aurora-stat-card">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Costo Compra</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 600; color: var(--aurora-on-surface);">{{ formatTable(product.cost_price || 0) }}</p>
          </div>
          <div class="aurora-stat-card">
            <p style="font-family: 'Inter', sans-serif; font-size: 0.75rem; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Valor Total</p>
            <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 600; color: var(--aurora-on-surface);">{{ formatTable(totalStock * displayPrice) }}</p>
          </div>
        </div>

        <!-- Variants Section -->
        <div v-if="variants.length > 0" class="aurora-raised-card" style="overflow: hidden; padding: 0;">
          <div style="padding: 1.25rem 1.25rem 0.75rem;">
            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface);">
              Variantes
              <span style="font-size: 0.875rem; font-weight: 400; color: var(--aurora-on-surface-variant); margin-left: 0.5rem;">({{ variants.length }})</span>
            </h3>
          </div>
          <div style="border-top: 1px solid var(--aurora-outline-variant);">
            <div v-for="variant in variants" :key="variant.id"
              class="p-4 transition-colors cursor-pointer"
              style="border-bottom: 1px solid var(--aurora-outline-variant);"
              @click="toggleVariantExpand(variant.id)">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 flex-1">
                  <div class="w-10 h-10 rounded-lg overflow-hidden shrink-0" style="background: var(--aurora-surface-container);">
                    <img v-if="variant.images?.[0]" :src="variant.images[0]" class="w-full h-full object-cover" />
                    <span v-else class="flex items-center justify-center h-full" style="color: var(--aurora-outline);">
                      <span class="material-symbols-outlined text-lg">inventory_2</span>
                    </span>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm" style="color: var(--aurora-on-surface);">{{ variant.name }}</span>
                      <span v-if="variant.sku" style="font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; color: var(--aurora-outline);">SKU: {{ variant.sku }}</span>
                    </div>
                    <div class="flex items-center gap-3 mt-0.5">
                      <span class="text-sm font-semibold" :class="variant.stock > 0 ? 'text-green-600' : 'text-red-600'">
                        {{ variant.stock || 0 }} uds
                      </span>
                      <span class="text-sm" style="color: var(--aurora-primary);">{{ formatTable(variant.price || product.price || 0) }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined transition-transform" style="color: var(--aurora-outline);" :class="{ 'rotate-180': expandedVariants[variant.id] }">
                    expand_more
                  </span>
                </div>
              </div>

              <!-- Expanded variant details -->
              <div v-if="expandedVariants[variant.id]" class="mt-3 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3" style="border-top: 1px solid var(--aurora-outline-variant);">
                <div>
                  <p style="font-size: 0.75rem; color: var(--aurora-on-surface-variant);">Stock</p>
                  <p class="text-sm font-semibold" :class="variant.stock > 0 ? 'text-green-600' : 'text-red-600'">{{ variant.stock || 0 }}</p>
                </div>
                <div>
                  <p style="font-size: 0.75rem; color: var(--aurora-on-surface-variant);">Precio</p>
                  <p class="text-sm font-semibold" style="color: var(--aurora-primary);">{{ formatTable(variant.price || product.price || 0) }}</p>
                </div>
                <div>
                  <p style="font-size: 0.75rem; color: var(--aurora-on-surface-variant);">Costo</p>
                  <p class="text-sm font-semibold" style="color: var(--aurora-on-surface);">{{ formatTable(variant.cost_price || product.cost_price || 0) }}</p>
                </div>
                <div>
                  <p style="font-size: 0.75rem; color: var(--aurora-on-surface-variant);">Margen</p>
                  <p class="text-sm font-semibold" :class="variantMarginPercent(variant) >= 30 ? 'text-green-600' : 'text-gray-500'">
                    {{ variantMarginPercent(variant) }}%
                  </p>
                </div>
                <div v-if="variant.attributes && Object.keys(variant.attributes).length > 0" class="col-span-2">
                  <p style="font-size: 0.75rem; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Atributos</p>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="(val, key) in variant.attributes" :key="key"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style="background: var(--aurora-surface-container);">
                      <span style="font-weight: 500; color: var(--aurora-on-surface-variant);">{{ key }}:</span>
                      <span style="color: var(--aurora-on-surface);">{{ val }}</span>
                    </span>
                  </div>
                </div>
                <div v-if="variant.compare_price" class="col-span-1">
                  <p style="font-size: 0.75rem; color: var(--aurora-on-surface-variant);">Precio Comparativa</p>
                  <p style="font-size: 0.875rem; color: var(--aurora-on-surface-variant); text-decoration: line-through;">{{ formatTable(variant.compare_price) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No variants message -->
        <div v-else class="aurora-raised-card text-center">
          <span class="material-symbols-outlined" style="font-size: 2rem; color: var(--aurora-outline); margin-bottom: 0.5rem; display: block;">layers_clear</span>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Este producto no tiene variantes</p>
        </div>

        <!-- Details Grid (collapsible) -->
        <div class="aurora-raised-card" style="padding: 0;">
          <button @click="showDetails = !showDetails"
            class="w-full flex items-center justify-between p-5 text-left transition-colors rounded-xl"
            style="background: transparent; border: none; cursor: pointer;">
            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface);">Detalles Generales</h3>
            <span class="material-symbols-outlined transition-transform" style="color: var(--aurora-outline);" :class="{ 'rotate-180': showDetails }">expand_more</span>
          </button>
          <transition name="slide-fade">
            <div v-if="showDetails" style="padding: 0 1.25rem 1.25rem;">
              <div class="grid grid-cols-1 md:grid-cols-2" style="gap: var(--aurora-sm) 2rem; padding-top: 0.5rem; border-top: 1px solid var(--aurora-outline-variant);">
                <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Categoría</span>
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; color: var(--aurora-on-surface);">{{ product.categories?.name || product.category_name || 'Sin categoría' }}</span>
                </div>
                <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Marca</span>
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; color: var(--aurora-on-surface);">{{ product.brand || '-' }}</span>
                </div>
                <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Stock Mínimo</span>
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; color: var(--aurora-on-surface);">{{ product.min_stock ?? 0 }}</span>
                </div>
                <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Unidad</span>
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; color: var(--aurora-on-surface);">{{ product.unit || 'unidad' }}</span>
                </div>
                <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Creado</span>
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; color: var(--aurora-on-surface);">{{ formatDate(product.created_at) }}</span>
                </div>
                <div class="flex justify-between pb-2" style="border-bottom: 1px solid var(--aurora-outline-variant);">
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Última Actualización</span>
                  <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; color: var(--aurora-on-surface);">{{ formatDate(product.updated_at) }}</span>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- Inventory by Warehouse (collapsible) -->
        <div v-if="warehouseData.length > 0" class="aurora-raised-card" style="padding: 0;">
          <button @click="showWarehouses = !showWarehouses"
            class="w-full flex items-center justify-between p-5 text-left transition-colors rounded-xl"
            style="background: transparent; border: none; cursor: pointer;">
            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface);">
              Inventario por Almacén
              <span style="font-size: 0.875rem; font-weight: 400; color: var(--aurora-on-surface-variant); margin-left: 0.5rem;">({{ warehouseData.length }})</span>
            </h3>
            <span class="material-symbols-outlined transition-transform" style="color: var(--aurora-outline);" :class="{ 'rotate-180': showWarehouses }">expand_more</span>
          </button>
          <transition name="slide-fade">
            <div v-if="showWarehouses" style="padding: 0 1.25rem 1.25rem;">
              <div style="display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--aurora-outline-variant);">
                <div v-for="wh in warehouseData" :key="wh.warehouse || 'default'"
                  class="flex items-center justify-between p-3 rounded-lg"
                  :style="{ background: wh.stock > 0 ? 'var(--aurora-surface-container)' : '#fef2f2' }">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined" style="font-size: 0.875rem; color: var(--aurora-on-surface-variant);">warehouse</span>
                    <span class="text-sm font-medium" style="color: var(--aurora-on-surface);">{{ wh.warehouse || 'Principal' }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-semibold" :class="wh.stock > 0 ? 'text-green-600' : 'text-red-600'">{{ wh.stock || 0 }}</span>
                    <span class="aurora-badge" :class="{
                      'aurora-badge-success': (wh.status || 'available') === 'available',
                      'aurora-badge-warning': wh.status === 'pending',
                      'aurora-badge-danger': wh.status === 'blocked' || wh.status === 'not_available'
                    }">
                      {{ wh.status === 'available' ? 'Disponible' : wh.status === 'pending' ? 'Pendiente' : wh.status === 'not_available' ? 'No Disponible' : 'Bloqueado' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- Description -->
        <div v-if="product.description" class="aurora-raised-card" style="padding: 0;">
          <button @click="showDescription = !showDescription"
            class="w-full flex items-center justify-between p-5 text-left transition-colors rounded-xl"
            style="background: transparent; border: none; cursor: pointer;">
            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface);">Descripción</h3>
            <span class="material-symbols-outlined transition-transform" style="color: var(--aurora-outline);" :class="{ 'rotate-180': showDescription }">expand_more</span>
          </button>
          <transition name="slide-fade">
            <div v-if="showDescription" style="padding: 0 1.25rem 1.25rem;">
              <p style="padding-top: 0.5rem; border-top: 1px solid var(--aurora-outline-variant); font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.6; color: var(--aurora-on-surface-variant);">{{ product.description }}</p>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productsAPI, inventoryAPI } from '../../api';
import DetailSkeleton from '../../components/skeletons/DetailSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';
import { useCurrency } from '../../composables/useCurrency';
import { formatDate } from '../../utils';
import Swal from 'sweetalert2';

const { formatTable } = useCurrency();
const route = useRoute();
const router = useRouter();

const productId = computed(() => route.params.id);

const loading = ref(true);
const product = ref({});
const variants = ref([]);
const warehouseData = ref([]);
const currentImageIndex = ref(0);
const showDetails = ref(true);
const showWarehouses = ref(true);
const showDescription = ref(false);
const expandedVariants = reactive({});

const allImages = computed(() => {
  return product.value?.images || [];
});

const currentImage = computed(() => {
  const images = allImages.value;
  if (images.length === 0 || currentImageIndex.value < 0) return null;
  return images[currentImageIndex.value] || images[0];
});

const totalStock = computed(() => {
  if (warehouseData.value.length > 0) {
    return warehouseData.value.reduce((sum, w) => sum + (w.stock || 0), 0);
  }
  return 0;
});

const inventoryStatus = computed(() => {
  // Return the most restrictive status
  const statuses = warehouseData.value.map(w => w.status || 'available');
  if (statuses.some(s => s === 'blocked')) return 'blocked';
  if (statuses.some(s => s === 'not_available')) return 'not_available';
  if (statuses.some(s => s === 'pending')) return 'pending';
  return 'available';
});

const displayPrice = computed(() => {
  return product.value?.price || 0;
});

const toggleVariantExpand = (id) => {
  expandedVariants[id] = !expandedVariants[id];
};

const variantMarginPercent = (variant) => {
  const price = variant.price || product.value?.price || 0;
  const cost = variant.cost_price || product.value?.cost_price || 0;
  if (price === 0) return 0;
  return Math.round(((price - cost) / price) * 100);
};

const goBack = () => {
  router.push('/app/inventory');
};

const viewKardex = () => {
  router.push(`/app/inventory/kardex/${productId.value}`);
};

const toggleProductActive = async () => {
  try {
    const newStatus = !product.value.is_active;
    await productsAPI.update(productId.value, { is_active: newStatus });
    product.value.is_active = newStatus;
    await Swal.fire({
      icon: 'success',
      title: newStatus ? 'Producto Activado' : 'Producto Desactivado',
      text: `El producto ha sido ${newStatus ? 'activado' : 'desactivado'} correctamente`,
      timer: 2000,
      showConfirmButton: false
    });
  } catch (e) {
    Swal.fire('Error', 'No se pudo cambiar el estado del producto', 'error');
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    // Load product data (with variants)
    const prodRes = await productsAPI.getById(productId.value);
    product.value = prodRes.data || {};

    // Extract variants
    if (Array.isArray(prodRes.data?.product_variants)) {
      variants.value = prodRes.data.product_variants.map(v => ({
        ...v,
        attributes: typeof v.attributes === 'object' && v.attributes ? v.attributes : {}
      }));
    }

    // Try loading variants separately
    if (variants.value.length === 0) {
      try {
        const vRes = await productsAPI.getVariants(productId.value);
        if (Array.isArray(vRes.data) && vRes.data.length > 0) {
          variants.value = vRes.data.map(v => ({
            ...v,
            attributes: typeof v.attributes === 'object' && v.attributes ? v.attributes : {}
          }));
        }
      } catch (e) { /* no variants endpoint */ }
    }

    // Load inventory data (warehouse stock info)
    const invRes = await inventoryAPI.getByProduct(productId.value);
    if (invRes.data?.warehouses) {
      warehouseData.value = invRes.data.warehouses;
    } else if (Array.isArray(invRes.data)) {
      warehouseData.value = invRes.data;
    }
  } catch (e) {
    console.error('Error loading inventory detail:', e);
    Swal.fire('Error', 'No se pudo cargar el detalle del producto', 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);
</script>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-fade-enter-to,
.slide-fade-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>

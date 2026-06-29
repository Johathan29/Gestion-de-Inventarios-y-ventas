<template>
  <div class="max-w-5xl mx-auto">
    <!-- Form Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div class="flex items-start gap-3">
        <button @click="$router.push('/app/products')"
          class="p-2 rounded-xl transition-all duration-200 active:scale-95" style="color: #624200;"
          @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.05)'"
          @mouseleave="e => e.currentTarget.style.background = 'transparent'">
          <span class="material-icons-outlined">arrow_back</span>
        </button>
        <div>
          <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(1.25rem, 3vw, 1.5rem); line-height: 1.3; font-weight: 700; color: #0b1c30;">{{ isEdit ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539; margin-top: 0.25rem;">
            {{ isEdit ? 'Modifica los datos del producto' : 'Completa la información para registrar un nuevo artículo en el inventario.' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <router-link to="/app/products"
          class="px-4 py-2 rounded-lg border-2 font-semibold transition-colors"
          style="border-color: #d2c4b4; color: #624200; font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5;"
          @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
          @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">
          Cancelar
        </router-link>
        <button type="submit" form="product-form" :disabled="saving"
          class="flex items-center gap-2 font-semibold px-5 py-2 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95"
          style="background: #624200; color: white; font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5;">
          <span class="material-icons-outlined" style="font-size: 1.125rem;">{{ isEdit ? 'save' : 'add' }}</span>
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar Producto' : 'Guardar') }}
        </button>
      </div>
    </div>

    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <form id="product-form" @submit.prevent="handleSubmit" class="flex flex-col gap-5">
      <!-- Información Básica -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <h3 class="font-semibold pb-2 mb-4 flex items-center gap-2" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; color: #0b1c30; border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200;">info</span>
          Información Básica
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Nombre del Producto <span style="color: #ba1a1a;">*</span></label>
            <input v-model="form.name" required placeholder="Ej. Alimento Premium Gatos 2kg"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">SKU (Código Interno) <span style="color: #ba1a1a;">*</span></label>
            <input v-model="form.sku" required placeholder="PROD-001"
              class="w-full rounded-lg px-3 py-2.5 uppercase transition-all"
              style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            <p style="font-size: 0.75rem; color: #4f4539; margin-top: 0.25rem; font-family: 'Inter', sans-serif;">Identificador único del inventario.</p>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Código de Barras</label>
            <div class="relative">
              <input v-model="form.barcode" placeholder="0000000000000"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              <span class="material-icons-outlined absolute right-3 top-2.5" style="color: #d2c4b4; font-size: 1.25rem;">barcode_scanner</span>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Categoría</label>
            <select v-model="form.category_id" required
              class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
              :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: `#ffffff url(${selectBgSvg}) no-repeat right 0.75rem center`, border: '1.5px solid #E5E7EB', paddingRight: '2.5rem' }"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="">Selecciona una categoría</option>
              <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id"
                :style="{ paddingLeft: (cat.level * 16 + 8) + 'px' }">
                {{ '—'.repeat(cat.level) + ' ' + cat.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Marca</label>
            <input v-model="form.brand" placeholder="Ej. Royal Canin"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
        </div>
      </div>

      <!-- Precios y Stock -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <h3 class="font-semibold pb-2 mb-4 flex items-center gap-2" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; color: #0b1c30; border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200;">payments</span>
          Precio y Existencias
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <!-- Costo -->
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Costo (COP)</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 font-medium" style="font-family: 'JetBrains Mono', monospace; color: #4f4539;">$</span>
              <input v-model.number="form.cost_price" type="number" step="0.01" min="0" placeholder="0.00"
                class="w-full rounded-lg pl-8 pr-3 py-2.5 transition-all text-right"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <!-- Precio Venta -->
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Precio de Venta (COP) <span style="color: #ba1a1a;">*</span></label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 font-medium" style="font-family: 'JetBrains Mono', monospace; color: #4f4539;">$</span>
              <input v-model.number="form.price" type="number" step="0.01" min="0" placeholder="0.00" required
                class="w-full rounded-lg pl-8 pr-3 py-2.5 transition-all text-right font-bold"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #624200; background: #ffffff; border: 1.5px solid #E5E7EB;"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <!-- Precio Comparativa -->
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Precio Comparativa</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 font-medium" style="font-family: 'JetBrains Mono', monospace; color: #4f4539;">$</span>
              <input v-model.number="form.compare_price" type="number" step="0.01" min="0" placeholder="0.00"
                class="w-full rounded-lg pl-8 pr-3 py-2.5 transition-all text-right"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <!-- Estimated Gain (Read Only) -->
          <div class="sm:col-span-2 lg:col-span-1 rounded-lg p-3 flex justify-between items-center border" style="background: #eff4ff; border-color: rgba(210,196,180,0.3);">
            <div>
              <span class="block mb-1" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Ganancia Estimada</span>
              <span class="font-semibold" style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #795900;" id="ganancia-calc">{{ formatCurrency(Math.max(0, form.price - form.cost_price)) }} ({{ marginPercent }}%)</span>
            </div>
            <span class="material-icons-outlined opacity-50" style="font-size: 2rem; color: #795900;">trending_up</span>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <!-- Stock Inicial -->
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Stock Inicial</label>
            <input v-model.number="form.stock" type="number" min="0" placeholder="0" :disabled="isEdit"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            <p v-if="!isEdit" style="font-size: 0.75rem; color: #4f4539; margin-top: 0.25rem; font-family: 'Inter', sans-serif;">Se creará un movimiento de inventario inicial</p>
          </div>
          <!-- Stock Mínimo -->
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Stock Mínimo (Alerta)</label>
            <div class="relative">
              <input v-model.number="form.min_stock" type="number" min="0" placeholder="5"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB; border-left: 4px solid #ba1a1a;"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              <span class="material-icons-outlined absolute right-3 top-2.5" style="color: #ba1a1a; font-size: 1rem;">warning</span>
            </div>
          </div>
          <!-- Unidad -->
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Unidad</label>
            <select v-model="form.unit"
              class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
              :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: `#ffffff url(${selectBgSvg}) no-repeat right 0.75rem center`, border: '1.5px solid #E5E7EB', paddingRight: '2.5rem' }"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="unidad">Unidad (Ud)</option>
              <option value="kilogramo">Kilogramo (Kg)</option>
              <option value="litro">Litro (L)</option>
              <option value="metro">Metro (m)</option>
              <option value="caja">Caja (Cja)</option>
              <option value="par">Par</option>
              <option value="pack">Pack</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Descripción -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <h3 class="font-semibold pb-2 mb-4 flex items-center gap-2" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; color: #0b1c30; border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200;">description</span>
          Descripción
        </h3>
        <textarea v-model="form.description" rows="4"
          placeholder="Descripción del producto, características, especificaciones..."
          class="w-full rounded-lg px-3 py-2.5 transition-all resize-y"
          style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB; min-height: 100px;"
          @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
          @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }"></textarea>
        <div class="flex items-center gap-6 mt-4">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" v-model="form.featured"
              class="w-4 h-4 rounded transition-all"
              style="color: #624200; border-color: #d2c4b4; accent-color: #624200;" />
            <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Producto Destacado</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" v-model="form.is_active"
              class="w-4 h-4 rounded transition-all"
              style="color: #624200; border-color: #d2c4b4; accent-color: #624200;" />
            <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Producto Activo</span>
          </label>
        </div>
      </div>

      <!-- Imágenes -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <h3 class="font-semibold pb-2 mb-4 flex items-center gap-2" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; color: #0b1c30; border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200;">image</span>
          Imágenes del Producto
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          <div v-for="(img, idx) in form.images" :key="idx"
            class="relative group aspect-square rounded-xl overflow-hidden border-2 transition-all"
            style="border-color: #d2c4b4; background: #eff4ff;">
            <img :src="img" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
              <button type="button" @click="removeImage(idx)"
                class="p-2 rounded-full transition-all hover:scale-110 active:scale-95"
                style="background: #ba1a1a; color: white;">
                <span class="material-icons-outlined" style="font-size: 1.125rem;">delete</span>
              </button>
            </div>
          </div>
          <!-- Upload Button -->
          <div @click="triggerUpload"
            class="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all"
            style="border-color: #d2c4b4; background: #eff4ff;"
            @mouseenter="e => { e.currentTarget.style.background = '#e5eeff'; e.currentTarget.style.borderColor = '#624200'; }"
            @mouseleave="e => { e.currentTarget.style.background = '#eff4ff'; e.currentTarget.style.borderColor = '#d2c4b4'; }">
            <span v-if="uploading" class="w-8 h-8 border-2 rounded-full animate-spin" style="border-color: #624200; border-top-color: transparent;"></span>
            <template v-else>
              <span class="material-icons-outlined" style="font-size: 2rem; color: #d2c4b4;">add_photo_alternate</span>
              <span style="font-size: 0.75rem; color: #4f4539; margin-top: 0.25rem; font-family: 'Inter', sans-serif;">Agregar imagen</span>
            </template>
          </div>
          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleUpload" />
        </div>
        <div class="flex items-center gap-2">
          <input v-model="imageUrlInput" type="url"
            class="flex-1 rounded-lg px-3 py-2.5 transition-all"
            placeholder="O pega una URL de imagen aquí..."
            style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          <button type="button" @click="addImageUrl"
            class="px-4 py-2.5 rounded-lg font-medium transition-all border"
            style="background: #ffffff; color: #4f4539; border-color: #d2c4b4; font-family: 'Inter', sans-serif; font-size: 0.875rem;"
            @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.color = '#624200'; }"
            @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.color = '#4f4539'; }">
            Agregar URL
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productsAPI, categoriesAPI } from '../../api';
import { supabase } from '../../api/supabase';
import { formatCurrency } from '../../utils';
import Alert from '../../components/shared/Alert.vue';

const selectBgSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234f4539' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E";

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => !!route.params.id);
const categories = ref([]);
const saving = ref(false);
const uploading = ref(false);
const errorMsg = ref('');
const fileInput = ref(null);
const imageUrlInput = ref('');

const form = reactive({
  name: '',
  sku: '',
  barcode: '',
  category_id: '',
  brand: '',
  price: 0,
  cost_price: 0,
  compare_price: 0,
  stock: 0,
  min_stock: 5,
  unit: 'unidad',
  description: '',
  featured: false,
  is_active: true,
  images: []
});

// Aplanar categorías para el select
const flatCategories = computed(() => {
  const flatten = (items, level = 0) => {
    let result = [];
    for (const item of items) {
      result.push({ ...item, level });
      if (item.children && item.children.length > 0) {
        result = result.concat(flatten(item.children, level + 1));
      }
    }
    return result;
  };
  return flatten(categories.value);
});

// Margen de ganancia estimado
const marginPercent = computed(() => {
  if (form.cost_price <= 0) return 0;
  return Math.round(((form.price - form.cost_price) / form.cost_price) * 100);
});

onMounted(async () => {
  try {
    const catRes = await categoriesAPI.getAll();
    categories.value = Array.isArray(catRes.data) ? catRes.data : [];
  } catch (e) {
    console.error('Error fetching categories:', e);
  }
  if (isEdit.value) {
    try {
      const res = await productsAPI.getById(route.params.id);
      const prod = res.data || {};
      form.name = prod.name || '';
      form.sku = prod.sku || '';
      form.barcode = prod.barcode || '';
      form.category_id = prod.category_id || '';
      form.brand = prod.brand || '';
      form.price = prod.price ?? 0;
      form.cost_price = prod.cost_price ?? 0;
      form.compare_price = prod.compare_price ?? 0;
      form.stock = prod.stock ?? 0;
      form.min_stock = prod.min_stock ?? 5;
      form.unit = prod.unit || 'unidad';
      form.description = prod.description || '';
      form.featured = prod.featured ?? false;
      form.is_active = prod.status === 'active' || prod.is_active;
      form.images = Array.isArray(prod.images) ? [...prod.images] : [];
    } catch (e) {
      errorMsg.value = 'Error al cargar producto';
      console.error(e);
    }
  }
});

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleUpload = async (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  uploading.value = true;
  try {
    for (const file of files) {
      // Intentar subir a través del backend (product-service)
      // que almacena en Supabase Storage y guarda la URL en la BD
      if (isEdit.value) {
        try {
          const res = await productsAPI.uploadImage(route.params.id, file);
          const { images, publicUrl } = res.data;
          form.images = images || [...form.images, publicUrl];
          continue;
        } catch (backendErr) {
          console.warn('Backend upload failed, trying direct Supabase upload:', backendErr);
          // Fallback: subir directamente a Supabase Storage
        }
      }

      // Upload directo a Supabase Storage (fallback o para nuevos productos)
      // Incluimos el product ID en la ruta para que el trigger de Storage
      // pueda emparejar el archivo con el producto correspondiente
      const productId = route.params.id || 'new';
      const ext = file.name.split('.').pop();
      const fileName = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) {
        console.error('Upload error:', error);
        if (error.message?.includes('bucket') || error.statusCode === 404) {
          errorMsg.value = 'El bucket de almacenamiento no existe. Crea el bucket "product-images" (público) en Supabase Dashboard > Storage.';
        } else {
          throw error;
        }
        break;
      }
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);
      form.images.push(publicUrl);
    }
  } catch (err) {
    console.error('Error uploading image:', err);
    errorMsg.value = 'Error al subir imagen';
  } finally {
    uploading.value = false;
    // Reset file input
    if (fileInput.value) fileInput.value.value = '';
  }
};

const addImageUrl = () => {
  const url = imageUrlInput.value?.trim();
  if (!url) return;
  // Si estamos editando, podemos usar el backend para descargar y almacenar la imagen
  if (isEdit.value) {
    productsAPI.uploadImageByUrl(route.params.id, url)
      .then(res => {
        form.images = res.data.images || [...form.images, res.data.publicUrl];
      })
      .catch(err => {
        console.warn('Backend URL upload failed, adding URL directly:', err);
        form.images.push(url);
      });
  } else {
    form.images.push(url);
  }
  imageUrlInput.value = '';
};

const removeImage = async (idx) => {
  const removedUrl = form.images[idx];
  form.images.splice(idx, 1);
  // Si estamos editando, eliminar también del backend storage
  if (isEdit.value && removedUrl) {
    try {
      await productsAPI.deleteImage(route.params.id, removedUrl);
    } catch (err) {
      console.warn('Could not delete image from storage:', err);
    }
  }
};

const handleSubmit = async () => {
  saving.value = true;
  errorMsg.value = '';
  try {
    // Prepare data for backend
    const productData = {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode || undefined,
      category_id: form.category_id || null,
      brand: form.brand || undefined,
      price: form.price,
      cost_price: form.cost_price > 0 ? form.cost_price : undefined,
      compare_price: form.compare_price > 0 ? form.compare_price : undefined,
      min_stock: form.min_stock,
      unit: form.unit,
      description: form.description || undefined,
      featured: form.featured,
      status: form.is_active ? 'active' : 'inactive',
      images: form.images
    };
    if (!isEdit.value && form.stock > 0) {
      productData.stock = form.stock;
    }
    if (isEdit.value) {
      await productsAPI.update(route.params.id, productData);
    } else {
      await productsAPI.create(productData);
    }
    router.push('/app/products');
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Error al guardar producto';
    errorMsg.value = msg;
  } finally {
    saving.value = false;
  }
};
</script>

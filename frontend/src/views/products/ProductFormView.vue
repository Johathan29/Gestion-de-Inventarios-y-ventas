<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button @click="$router.push('/app/products')"
        class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
        <span class="material-icons-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
      </button>
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ isEdit ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {{ isEdit ? 'Modifica los datos del producto' : 'Completa los campos para registrar un nuevo producto' }}
        </p>
      </div>
    </div>

    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Información Básica -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="material-icons-outlined text-primary-500">info</span>
          Información Básica
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="form-label">Nombre del Producto <span class="text-red-500">*</span></label>
            <input v-model="form.name" class="form-input" required placeholder="Ej: Smartphone Galaxy X" />
          </div>
          <div>
            <label class="form-label">SKU <span class="text-red-500">*</span></label>
            <input v-model="form.sku" class="form-input" required placeholder="Ej: SAMS-GX-001" />
          </div>
          <div>
            <label class="form-label">Código de Barras</label>
            <input v-model="form.barcode" class="form-input" placeholder="Ej: 1234567890123" />
          </div>
          <div>
            <label class="form-label">Categoría <span class="text-red-500">*</span></label>
            <select v-model="form.category_id" class="form-input" required>
              <option value="">Seleccionar categoría...</option>
              <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id"
                :style="{ paddingLeft: (cat.level * 16 + 8) + 'px' }">
                {{ '—'.repeat(cat.level) + ' ' + cat.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="form-label">Marca</label>
            <input v-model="form.brand" class="form-input" placeholder="Ej: Samsung, Nike, etc." />
          </div>
        </div>
      </div>

      <!-- Precios y Stock -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="material-icons-outlined text-primary-500">payments</span>
          Precios y Stock
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="form-label">Precio de Venta <span class="text-red-500">*</span></label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input v-model.number="form.price" type="number" step="0.01" min="0" class="form-input pl-8" required />
            </div>
          </div>
          <div>
            <label class="form-label">Precio de Costo</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input v-model.number="form.cost_price" type="number" step="0.01" min="0" class="form-input pl-8" />
            </div>
          </div>
          <div>
            <label class="form-label">Precio Comparativa</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input v-model.number="form.compare_price" type="number" step="0.01" min="0" class="form-input pl-8" />
            </div>
          </div>
          <div>
            <label class="form-label">Stock Inicial</label>
            <input v-model.number="form.stock" type="number" min="0" class="form-input" :disabled="isEdit" placeholder="0" />
            <p v-if="!isEdit" class="text-xs text-gray-400 mt-1">Se creará un movimiento de inventario inicial</p>
          </div>
          <div>
            <label class="form-label">Stock Mínimo</label>
            <input v-model.number="form.min_stock" type="number" min="0" class="form-input" placeholder="5" />
          </div>
          <div>
            <label class="form-label">Unidad</label>
            <select v-model="form.unit" class="form-input">
              <option value="unidad">Unidad</option>
              <option value="kilogramo">Kilogramo</option>
              <option value="litro">Litro</option>
              <option value="metro">Metro</option>
              <option value="caja">Caja</option>
              <option value="par">Par</option>
              <option value="pack">Pack</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Descripción -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="material-icons-outlined text-primary-500">description</span>
          Descripción
        </h3>
        <textarea v-model="form.description" rows="4" class="form-input"
          placeholder="Descripción del producto, características, especificaciones..."></textarea>
        <div class="flex items-center gap-6 mt-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.featured" class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
            <span class="text-sm text-gray-700 dark:text-gray-300">Producto Destacado</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_active" class="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
            <span class="text-sm text-gray-700 dark:text-gray-300">Producto Activo</span>
          </label>
        </div>
      </div>

      <!-- Imágenes -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="material-icons-outlined text-primary-500">image</span>
          Imágenes del Producto
        </h3>

        <!-- Image Upload Area -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          <!-- Existing Images -->
          <div v-for="(img, idx) in form.images" :key="idx"
            class="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <img :src="img" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" @click="removeImage(idx)"
                class="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all">
                <span class="material-icons-outlined text-lg">delete</span>
              </button>
            </div>
          </div>

          <!-- Upload Button -->
          <div @click="triggerUpload"
            class="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-700">
            <span v-if="uploading" class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
            <template v-else>
              <span class="material-icons-outlined text-3xl text-gray-400">add_photo_alternate</span>
              <span class="text-xs text-gray-500 mt-1">Agregar imagen</span>
            </template>
          </div>
          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleUpload" />
        </div>

        <!-- URL Manual -->
        <div class="flex items-center gap-2">
          <input v-model="imageUrlInput" type="url"
            class="form-input flex-1" placeholder="O pega una URL de imagen aquí..." />
          <button type="button" @click="addImageUrl"
            class="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
            Agregar URL
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-2 pb-8">
        <router-link to="/app/products"
          class="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
          Cancelar
        </router-link>
        <button type="submit" :disabled="saving"
          class="btn-primary px-8 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-primary-600 text-white font-medium text-sm hover:from-purple-700 hover:to-primary-700 disabled:opacity-50 transition-all duration-300 shadow-lg shadow-purple-600/20 flex items-center gap-2">
          <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span v-else class="material-icons-outlined text-lg">{{ isEdit ? 'save' : 'add' }}</span>
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar Producto' : 'Crear Producto') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productsAPI, categoriesAPI } from '../../api';
import { supabase } from '../../api/supabase';
import Alert from '../../components/shared/Alert.vue';

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

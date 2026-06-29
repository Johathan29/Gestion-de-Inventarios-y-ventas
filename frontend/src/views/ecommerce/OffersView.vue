<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Ofertas</h3>
      <button @click="openForm(null)" class="dt-btn-primary">Nueva Oferta</button>
    </div>

    <!-- Alert messages -->
    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <div v-if="offers.length === 0" class="text-sm text-gray-500 text-center py-8">No hay ofertas configuradas. ¡Crea la primera!</div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="o in offers" :key="o.id" class="dt-card p-4 relative overflow-hidden">
        <!-- Product image preview -->
        <div v-if="o.products?.images?.[0]" class="w-full h-36 rounded-xl overflow-hidden mb-3 bg-white/5">
          <img :src="o.products.images[0]" :alt="o.products.name" class="w-full h-full object-cover"
               @error="$event.target.style.display='none'" />
        </div>
        <!-- Linked Product -->
        <div v-if="o.products" class="flex items-center gap-2 mb-2">
          <span class="material-symbols-outlined text-sm" style="color: #624200;">inventory_2</span>
          <span class="text-sm font-medium truncate" style="color: #0b1c30;">{{ o.products.name }}</span>
        </div>
        <div v-else class="text-sm text-gray-400 mb-2 italic">Sin producto vinculado</div>
        <!-- Discount & Status -->
        <div class="flex items-center gap-2 mt-2 text-sm">
          <span v-if="o.discount_percent" class="font-bold px-2 py-0.5 rounded" style="background: #fef2f2; color: #ef4444;">{{ o.discount_percent }}% OFF</span>
          <span class="dt-badge" :class="o.active !== false ? 'dt-badge-success' : 'dt-badge-disabled'">{{ o.active !== false ? 'Activa' : 'Inactiva' }}</span>
        </div>
        <p class="dt-caption mt-1">{{ formatDate(o.start_date) }} - {{ formatDate(o.end_date) }}</p>
        <div class="flex gap-2 mt-3">
          <button @click="editOffer(o)" class="dt-btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">Editar</button>
          <button @click="deleteOffer(o)" class="dt-btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem; border-color: #ef4444; color: #ef4444;">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Offer Form Modal -->
    <Modal :show="showForm" :title="editing ? 'Editar Oferta' : 'Nueva Oferta'" @close="closeForm" size="lg">
      <form @submit.prevent="handleSave" class="space-y-4">
        <!-- Product Selector -->
        <div>
          <label class="dt-label">Producto en Oferta <span class="text-red-500">*</span></label>
          <div class="relative">
            <select v-model="form.product_id" class="dt-input w-full" required>
              <option value="" disabled>Seleccionar producto...</option>
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }} {{ p.sku ? '(' + p.sku + ')' : '' }}
              </option>
            </select>
            <div v-if="selectedProductPreview" class="mt-2 flex items-center gap-2 p-2 rounded-lg" style="background: #f5f0eb;">
              <img v-if="selectedProductPreview.images?.[0]" :src="selectedProductPreview.images[0]"
                   class="w-10 h-10 rounded-lg object-cover" />
              <div class="text-sm">
                <span class="font-medium" style="color: #0b1c30;">{{ selectedProductPreview.name }}</span>
                <span v-if="selectedProductPreview.price" class="ml-2" style="color: #624200;">
                  ${{ Number(selectedProductPreview.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="dt-label">% Descuento <span class="text-red-500">*</span></label>
            <div class="relative">
              <input v-model.number="form.discount_percent" type="number" min="0" max="100" step="0.01" class="dt-input w-full pr-8" required />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style="color: #4f4539;">%</span>
            </div>
          </div>
          <div>
            <label class="dt-label">Estado</label>
            <div class="flex items-center gap-2 h-10">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="form.active" class="sr-only peer" />
                <div class="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                     style="background: form.active ? '#624200' : '#d2c4b4';"></div>
                <span class="ml-3 text-sm" style="color: #4f4539;">{{ form.active ? 'Activa' : 'Inactiva' }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="dt-label">Fecha de Inicio</label>
            <input v-model="form.start_date" type="date" class="dt-input w-full" />
          </div>
          <div>
            <label class="dt-label">Fecha de Fin</label>
            <input v-model="form.end_date" type="date" class="dt-input w-full" />
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-[#d2c4b4]/30">
          <button type="button" @click="closeForm" class="dt-btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving" class="dt-btn-primary flex items-center gap-2">
            <span v-if="saving" class="material-symbols-outlined text-sm animate-spin" data-icon="progress_activity">progress_activity</span>
            {{ editing ? 'Actualizar' : 'Guardar' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ecommerceAPI, productsAPI } from '../../api';
import Modal from '../../components/shared/Modal.vue';
import Alert from '../../components/shared/Alert.vue';
import { formatDate } from '../../utils';
import Swal from 'sweetalert2';

const offers = ref([]);
const products = ref([]);
const showForm = ref(false);
const editing = ref(null);
const saving = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const form = ref({
  product_id: '',
  discount_percent: 0,
  start_date: '',
  end_date: '',
  active: true
});

const selectedProductPreview = computed(() => {
  if (!form.value.product_id) return null;
  return products.value.find(p => p.id === form.value.product_id);
});

const fetchOffers = async () => {
  try {
    const res = await ecommerceAPI.getOffers();
    offers.value = res.data || [];
  } catch (e) {
    console.error('Error fetching offers:', e);
  }
};

const fetchProducts = async () => {
  try {
    const res = await productsAPI.getAll({ status: 'active', limit: 200 });
    const data = res.data;
    products.value = (data?.data || data || []);
  } catch (e) {
    console.error('Error fetching products:', e);
  }
};

const openForm = (offer) => {
  editing.value = null;
  form.value = { product_id: '', discount_percent: 0, start_date: '', end_date: '', active: true };
  showForm.value = true;
  successMsg.value = '';
  errorMsg.value = '';
};

const editOffer = (o) => {
  editing.value = o;
  form.value = {
    product_id: o.product_id || '',
    discount_percent: o.discount_percent || 0,
    start_date: o.start_date ? o.start_date.split('T')[0] : '',
    end_date: o.end_date ? o.end_date.split('T')[0] : '',
    active: o.active !== false
  };
  showForm.value = true;
  successMsg.value = '';
  errorMsg.value = '';
};

const closeForm = () => {
  showForm.value = false;
  editing.value = null;
};

const handleSave = async () => {
  saving.value = true;
  successMsg.value = '';
  errorMsg.value = '';
  try {
    const payload = {
      product_id: form.value.product_id,
      discount_percent: form.value.discount_percent,
      start_date: form.value.start_date || undefined,
      end_date: form.value.end_date || undefined,
      active: form.value.active
    };

    if (editing.value) {
      await ecommerceAPI.updateOffer(editing.value.id, payload);
      successMsg.value = 'Oferta actualizada correctamente';
    } else {
      await ecommerceAPI.createOffer(payload);
      successMsg.value = 'Oferta creada correctamente';
    }
    closeForm();
    await fetchOffers();
  } catch (e) {
    errorMsg.value = e.response?.data?.error?.message || 'Error al guardar la oferta';
  } finally {
    saving.value = false;
  }
};

const deleteOffer = async (o) => {
  const r = await Swal.fire({
    title: '¿Eliminar oferta?',
    text: `Se eliminará la oferta de ${o.products?.name || 'producto'}`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });
  if (r.isConfirmed) {
    try {
      await ecommerceAPI.deleteOffer(o.id);
      successMsg.value = 'Oferta eliminada correctamente';
      await fetchOffers();
    } catch (e) {
      errorMsg.value = 'Error al eliminar la oferta';
    }
  }
};

onMounted(() => {
  fetchOffers();
  fetchProducts();
});
</script>

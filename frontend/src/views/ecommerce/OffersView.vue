<template>
  <div>
    <!-- Page Header -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> local_offer </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Ofertas"
            description="Gestiona los descuentos y promociones"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <button @click="openForm(null)" class="aurora-header-button aurora-header-button-primary">
            <span class="material-symbols-outlined"> add </span>
            Nueva Oferta
          </button>
        </div>
      </div>
    </div>

    <!-- Alert messages -->
    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" class="mb-md" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-md" />

    <div v-if="offers.length === 0" class="text-on-surface-variant text-center py-8">No hay ofertas configuradas. ¡Crea la primera!</div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
      <div v-for="o in offers" :key="o.id" class="aurora-raised-card relative overflow-hidden">
        <!-- Product image preview -->
        <div v-if="o.products?.images?.[0]" class="w-full h-36 rounded-xl overflow-hidden mb-3 bg-white/5">
          <img :src="o.products.images[0]" :alt="o.products.name" class="w-full h-full object-cover"
               @error="$event.target.style.display='none'" />
        </div>
        <!-- Linked Product -->
        <div v-if="o.products" class="flex items-center gap-2 mb-2">
          <span class="material-symbols-outlined text-sm" style="color: var(--aurora-tertiary);">inventory_2</span>
          <span class="text-sm font-medium truncate text-on-surface">{{ o.products.name }}</span>
        </div>
        <div v-else class="text-sm text-on-surface-variant mb-2 italic">Sin producto vinculado</div>
        <!-- Discount & Status -->
        <div class="flex items-center gap-2 mt-2 text-sm">
          <span v-if="o.discount_percent" class="font-bold px-2 py-0.5 rounded aurora-badge-danger">{{ o.discount_percent }}% OFF</span>
          <span class="aurora-badge" :class="o.active !== false ? 'aurora-badge-success' : 'aurora-badge-secondary'">{{ o.active !== false ? 'Activa' : 'Inactiva' }}</span>
        </div>
        <p class="text-on-surface-variant mt-1">{{ formatDate(o.start_date) }} - {{ formatDate(o.end_date) }}</p>
        <div class="flex gap-2 mt-3">
          <button @click="editOffer(o)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">Editar</button>
          <button @click="deleteOffer(o)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; color: var(--aurora-error); border-color: var(--aurora-error);">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div class="aurora-pagination" v-if="total > limit">
      <button :disabled="page <= 1" @click="changePage(page - 1)" class="aurora-page-btn">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <span class="aurora-page-btn active">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button :disabled="page >= Math.ceil(total / limit)" @click="changePage(page + 1)" class="aurora-page-btn">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>

    <!-- Offer Form Modal -->
    <Modal :show="showForm" :title="editing ? 'Editar Oferta' : 'Nueva Oferta'" @close="closeForm" size="lg">
      <form @submit.prevent="handleSave" class="space-y-4">
        <!-- Product Selector -->
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Producto en Oferta <span style="color: var(--aurora-error);">*</span></label>
          <div class="relative">
            <select v-model="form.product_id" required class="aurora-select">
              <option value="" disabled>Seleccionar producto...</option>
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }} {{ p.sku ? '(' + p.sku + ')' : '' }}
              </option>
            </select>
            <div v-if="selectedProductPreview" class="mt-2 flex items-center gap-2 p-2 rounded-lg" style="background: var(--aurora-surface-container);">
              <img v-if="selectedProductPreview.images?.[0]" :src="selectedProductPreview.images[0]"
                   class="w-10 h-10 rounded-lg object-cover" />
              <div class="text-sm">
                <span class="font-medium text-on-surface">{{ selectedProductPreview.name }}</span>
                <span v-if="selectedProductPreview.price" class="ml-2" style="color: var(--aurora-tertiary);">
                  ${{ Number(selectedProductPreview.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">% Descuento <span style="color: var(--aurora-error);">*</span></label>
            <div class="relative">
              <input v-model.number="form.discount_percent" type="number" min="0" max="100" step="0.01" required
                class="aurora-input" style="font-family: 'JetBrains Mono', monospace; padding-right: 2rem;" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">%</span>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Estado</label>
            <div class="flex items-center gap-2 h-10">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="form.active" class="sr-only peer" />
                <div class="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                     :style="{ background: form.active ? 'var(--aurora-primary)' : 'var(--aurora-outline-variant)' }"></div>
                <span class="ml-3 text-sm text-on-surface-variant">{{ form.active ? 'Activa' : 'Inactiva' }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Fecha de Inicio</label>
            <input v-model="form.start_date" type="date" class="aurora-input" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Fecha de Fin</label>
            <input v-model="form.end_date" type="date" class="aurora-input" />
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t" style="border-color: var(--aurora-outline-variant);">
          <button type="button" @click="closeForm" class="aurora-btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving" class="aurora-btn-primary">
            <span v-if="saving" class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            <span v-else class="material-symbols-outlined" style="font-size: 1.125rem;">local_offer</span>
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
import PageHeader from '../../components/shared/PageHeader.vue';
import Modal from '../../components/shared/Modal.vue';
import Alert from '../../components/shared/Alert.vue';
import { formatDate } from '../../utils';
import Swal from 'sweetalert2';

const offers = ref([]);
const products = ref([]);
const page = ref(1);
const limit = 12;
const total = ref(0);
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

const changePage = (newPage) => {
  page.value = newPage;
  fetchOffers();
};

const fetchOffers = async () => {
  try {
    // all=true trae TODAS las ofertas (incluso inactivas y vencidas) para el panel admin
    const res = await ecommerceAPI.getOffers({ page: page.value, limit, all: true });
    // El interceptor unwrap automáticamente { success: true, data: ... }
    // res.data puede ser el array directamente o un objeto con data
    console.log('Fetched offers response:', res.data);
    let offersData = res.data;
    if (Array.isArray(offersData)) {
      offers.value = offersData;
      total.value = res.pagination?.total || offersData.length;
    } else if (offersData?.data) {
      offers.value = offersData.data;
      total.value = offersData.pagination?.total || res.pagination?.total || offersData.data.length;
    } else {
      offers.value = [];
      total.value = 0;
    }
  } catch (e) {
    console.error('Error fetching offers:', e);
    offers.value = [];
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
    page.value = 1;
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
      page.value = 1;
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

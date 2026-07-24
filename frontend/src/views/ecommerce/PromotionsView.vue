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
        <span class="material-symbols-outlined animate-header-icon"> redeem </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Promociones"
            description="Gestiona promociones: 2x1, combos, descuentos por volumen y más"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <button @click="openForm(null)" class="aurora-header-button aurora-header-button-primary">
            <span class="material-symbols-outlined"> add </span>
            Nueva Promoción
          </button>
        </div>
      </div>
    </div>

    <!-- Alert messages -->
    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" class="mb-md" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-md" />

    <!-- Type Filter -->
    <div class="flex flex-wrap gap-gutter mb-md">
      <select v-model="filter.type" @change="loadPromotions" class="aurora-select" style="min-width: 160px;">
        <option value="">Todos los tipos</option>
        <option value="buy_x_get_y">2x1 / Lleva X paga Y</option>
        <option value="bundle">Combo / Paquete</option>
        <option value="volume_discount">Descuento por Volumen</option>
        <option value="flash_sale">Flash Sale</option>
        <option value="seasonal">Temporada</option>
      </select>
      <select v-model="filter.status" @change="loadPromotions" class="aurora-select" style="min-width: 140px;">
        <option value="">Todos los estados</option>
        <option value="active">Activas</option>
        <option value="inactive">Inactivas</option>
        <option value="expired">Expiradas</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2" style="border-color: var(--aurora-primary);"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="!promotions.length" class="text-on-surface-variant text-center py-8">
      No hay promociones configuradas. ¡Crea la primera!
    </div>

    <!-- Promotions Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
      <div v-for="p in promotions" :key="p.id" class="aurora-raised-card">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span v-if="p.type === 'flash_sale'" class="material-symbols-outlined" style="color: var(--aurora-error);">bolt</span>
              <span v-else-if="p.type === 'bundle'" class="material-symbols-outlined" style="color: var(--aurora-tertiary);">inventory_2</span>
              <span v-else class="material-symbols-outlined" style="color: var(--aurora-primary);">local_offer</span>
              <h3 class="font-semibold text-on-surface truncate">{{ p.name }}</h3>
            </div>
            <p v-if="p.description" class="text-sm text-on-surface-variant mt-1 line-clamp-2">{{ p.description }}</p>
          </div>
          <span class="aurora-badge shrink-0 ml-2" :class="getStatusClass(p)">{{ getStatusText(p) }}</span>
        </div>

        <!-- Promotion Type Badge -->
        <div class="mb-3">
          <span class="inline-block text-xs font-medium px-2 py-0.5 rounded-full" style="background: var(--aurora-secondary-container); color: var(--aurora-on-secondary-container);">
            {{ getTypeLabel(p.type) }}
          </span>
        </div>

        <!-- Discount Info -->
        <div class="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
          <span class="material-symbols-outlined text-sm">calendar_today</span>
          {{ formatDate(p.start_date) }} - {{ formatDate(p.end_date) }}
        </div>
        <div v-if="p.discount_percent" class="text-lg font-bold" style="color: var(--aurora-error);">{{ p.discount_percent }}% OFF</div>

        <!-- Actions -->
        <div class="flex gap-2 mt-4 pt-3" style="border-top: 1px solid var(--aurora-outline-variant);">
          <button @click="editPromotion(p)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">
            Editar
          </button>
          <button @click="confirmDelete(p)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; color: var(--aurora-error); border-color: var(--aurora-error);">
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="aurora-pagination" v-if="total > limit">
      <button :disabled="page <= 1" @click="changePage(page - 1)" class="aurora-page-btn">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <span class="aurora-page-btn active">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button :disabled="page >= Math.ceil(total / limit)" @click="changePage(page + 1)" class="aurora-page-btn">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>

    <!-- Promotion Form Modal -->
    <Modal :show="showForm" :title="editing ? 'Editar Promoción' : 'Nueva Promoción'" @close="closeForm" size="lg">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Nombre <span style="color: var(--aurora-error);">*</span></label>
            <input v-model="form.name" required class="aurora-input w-full" placeholder="Ej: Combo de Verano" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Tipo <span style="color: var(--aurora-error);">*</span></label>
            <select v-model="form.type" required class="aurora-select w-full">
              <option value="buy_x_get_y">2x1 / Lleva X paga Y</option>
              <option value="bundle">Combo / Paquete</option>
              <option value="volume_discount">Descuento por Volumen</option>
              <option value="flash_sale">Flash Sale</option>
              <option value="seasonal">Temporada</option>
            </select>
          </div>
          <div v-if="form.type === 'buy_x_get_y'">
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Compra X</label>
            <input v-model.number="form.buy_quantity" type="number" min="1" class="aurora-input w-full" placeholder="Ej: 2" />
          </div>
          <div v-if="form.type === 'buy_x_get_y'">
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Paga Y (0 = gratis)</label>
            <input v-model.number="form.pay_quantity" type="number" min="0" class="aurora-input w-full" placeholder="Ej: 1" />
          </div>
          <div v-if="form.type === 'volume_discount'">
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Cantidad Mínima</label>
            <input v-model.number="form.min_quantity" type="number" min="1" class="aurora-input w-full" placeholder="Ej: 5" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">% Descuento</label>
            <input v-model.number="form.discount_percent" type="number" min="0" max="100" class="aurora-input w-full" placeholder="Ej: 20" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Fecha Inicio <span style="color: var(--aurora-error);">*</span></label>
            <input v-model="form.start_date" type="date" required class="aurora-input w-full" />
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Fecha Fin <span style="color: var(--aurora-error);">*</span></label>
            <input v-model="form.end_date" type="date" required class="aurora-input w-full" />
          </div>
        </div>

        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Descripción</label>
          <textarea v-model="form.description" rows="2" class="aurora-input w-full" placeholder="Descripción..."></textarea>
        </div>

        <div class="flex items-center gap-2">
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="form.is_active" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                 :style="{ background: form.is_active ? 'var(--aurora-primary)' : 'var(--aurora-outline-variant)' }"></div>
            <span class="ml-3 text-sm text-on-surface-variant">{{ form.is_active ? 'Activa' : 'Inactiva' }}</span>
          </label>
        </div>

        <div v-if="formError" class="text-sm" style="color: var(--aurora-error); background: var(--aurora-error-container); padding: 0.75rem; border-radius: 0.75rem;">{{ formError }}</div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="closeForm" class="aurora-btn-secondary">Cancelar</button>
          <button type="submit" class="aurora-btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear') }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation -->
    <Modal :show="showDelete" title="Confirmar Eliminación" @close="showDelete = false" size="sm">
      <p class="text-on-surface-variant mb-6">
        ¿Estás seguro de eliminar la promoción <strong class="text-on-surface">{{ deleting?.name }}</strong>?
      </p>
      <div class="flex justify-end gap-3">
        <button @click="showDelete = false" class="aurora-btn-secondary">Cancelar</button>
        <button @click="handleDelete" class="aurora-btn-primary" :disabled="saving" style="background: var(--aurora-error);">Eliminar</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCouponStore } from '../../stores/coupons';

const couponStore = useCouponStore();

const promotions = ref([]);
const loading = ref(false);
const saving = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const formError = ref('');
const editing = ref(false);
const showForm = ref(false);
const showDelete = ref(false);
const deleting = ref(null);
const page = ref(1);
const total = ref(0);
const limit = 12;
const filter = ref({ type: '', status: '' });

const defaultForm = () => ({
  name: '',
  description: '',
  type: 'seasonal',
  discount_percent: 0,
  buy_quantity: 2,
  pay_quantity: 1,
  min_quantity: 3,
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  is_active: true
});

const form = ref(defaultForm());

const getTypeLabel = (type) => {
  const labels = { buy_x_get_y: '2x1', bundle: 'Combo', volume_discount: 'Volumen', flash_sale: 'Flash Sale', seasonal: 'Temporada' };
  return labels[type] || type;
};
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '-';

const getStatusClass = (p) => {
  if (!p.is_active) return 'aurora-badge-secondary';
  if (new Date(p.end_date) < new Date()) return 'aurora-badge-warning';
  return 'aurora-badge-success';
};
const getStatusText = (p) => {
  if (!p.is_active) return 'Inactiva';
  if (new Date(p.end_date) < new Date()) return 'Expirada';
  return 'Activa';
};

const loadPromotions = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, limit, ...filter.value };
    Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
    await couponStore.fetchPromotions(params);
    promotions.value = couponStore.promotions;
  } finally {
    loading.value = false;
  }
};

const changePage = (p) => { page.value = p; loadPromotions(); };

const openForm = (promo) => {
  editing.value = !!promo;
  form.value = promo ? { ...promo } : defaultForm();
  showForm.value = true;
  formError.value = '';
};

const closeForm = () => {
  showForm.value = false;
  form.value = defaultForm();
  editing.value = false;
  formError.value = '';
};

const handleSave = async () => {
  saving.value = true;
  formError.value = '';
  try {
    if (editing.value) {
      await couponStore.updatePromotion(form.value.id, form.value);
      successMsg.value = 'Promoción actualizada correctamente';
    } else {
      await couponStore.createPromotion(form.value);
      successMsg.value = 'Promoción creada correctamente';
    }
    closeForm();
    await loadPromotions();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Error al guardar promoción';
  } finally {
    saving.value = false;
  }
};

const editPromotion = (p) => openForm(p);

const confirmDelete = (p) => {
  deleting.value = p;
  showDelete.value = true;
};

const handleDelete = async () => {
  saving.value = true;
  try {
    await couponStore.deletePromotion(deleting.value.id);
    successMsg.value = 'Promoción eliminada correctamente';
    showDelete.value = false;
    await loadPromotions();
  } catch (err) {
    errorMsg.value = 'Error al eliminar promoción';
  } finally {
    saving.value = false;
  }
};

onMounted(loadPromotions);
</script>

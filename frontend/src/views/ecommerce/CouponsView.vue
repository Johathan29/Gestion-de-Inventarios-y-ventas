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
        <span class="material-symbols-outlined animate-header-icon"> confirmation_number </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Cupones"
            description="Gestiona los cupones de descuento"
            tag="h1"
          />
        </div>
        <div class="header-actions">
          <button @click="openForm(null)" class="aurora-header-button aurora-header-button-primary">
            <span class="material-symbols-outlined"> add </span>
            Nuevo Cupón
          </button>
        </div>
      </div>
    </div>

    <!-- Alert messages -->
    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" class="mb-md" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-md" />

    <!-- Filters -->
    <div class="flex flex-wrap gap-gutter mb-md">
      <select v-model="filter.status" @change="loadCoupons" class="aurora-select" style="min-width: 140px;">
        <option value="">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="expired">Expirados</option>
      </select>
      <input v-model="filter.search" @input="onSearchInput" placeholder="Buscar código..."
        class="aurora-input" style="min-width: 200px;" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2" style="border-color: var(--aurora-primary);"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="!coupons.length" class="text-on-surface-variant text-center py-8">
      No hay cupones configurados. ¡Crea el primero!
    </div>

    <!-- Coupons Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
      <div v-for="c in coupons" :key="c.id" class="aurora-raised-card">
        <!-- Coupon Header -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-mono font-bold text-lg text-on-surface truncate">{{ c.code }}</h3>
            <p v-if="c.description" class="text-sm text-on-surface-variant mt-0.5 truncate">{{ c.description }}</p>
          </div>
          <span class="aurora-badge shrink-0 ml-2" :class="getStatusClass(c)">{{ getStatusText(c) }}</span>
        </div>

        <!-- Discount Info -->
        <div class="flex items-center gap-2 mb-3">
          <span v-if="c.discount_type === 'percentage'"
            class="text-lg font-bold" style="color: var(--aurora-tertiary);">{{ c.discount_value }}%</span>
          <span v-else class="text-lg font-bold" style="color: var(--aurora-tertiary);">${{ formatPrice(c.discount_value) }}</span>
          <span v-if="c.discount_type === 'percentage'" class="text-xs text-on-surface-variant">OFF</span>
          <span v-if="c.discount_type === 'free_shipping'" class="aurora-badge aurora-badge-info">Envío Gratis</span>
        </div>

        <!-- Constraints -->
        <div class="space-y-1 text-xs text-on-surface-variant">
          <div v-if="c.minimum_order_amount" class="flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">shopping_cart</span>
            Mín. ${{ formatPrice(c.minimum_order_amount) }}
          </div>
          <div v-if="c.usage_limit" class="flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">repeat</span>
            {{ c.used_count || 0 }}/{{ c.usage_limit }} usos
          </div>
          <div class="flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">calendar_today</span>
            {{ formatDate(c.start_date) }} - {{ formatDate(c.end_date) }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 mt-4 pt-3" style="border-top: 1px solid var(--aurora-outline-variant);">
          <button @click="editCoupon(c)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">
            Editar
          </button>
          <button @click="viewUsage(c)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">
            Usos
          </button>
          <button @click="confirmDelete(c)" class="aurora-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; color: var(--aurora-error); border-color: var(--aurora-error);">
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

    <!-- Coupon Form Modal -->
    <Modal :show="showForm" :title="editing ? 'Editar Cupón' : 'Nuevo Cupón'" @close="closeForm" size="lg">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <!-- Code -->
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Código <span style="color: var(--aurora-error);">*</span></label>
            <input v-model="form.code" required
              class="aurora-input w-full" placeholder="Ej: BIENVENIDO10"
              :disabled="editing" />
          </div>
          <!-- Discount Type -->
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Tipo de Descuento <span style="color: var(--aurora-error);">*</span></label>
            <select v-model="form.discount_type" required class="aurora-select w-full">
              <option value="percentage">Porcentaje (%)</option>
              <option value="fixed_amount">Monto Fijo ($)</option>
              <option value="free_shipping">Envío Gratis</option>
            </select>
          </div>
          <!-- Discount Value -->
          <div v-if="form.discount_type !== 'free_shipping'">
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">
              {{ form.discount_type === 'percentage' ? 'Porcentaje' : 'Monto' }} <span style="color: var(--aurora-error);">*</span>
            </label>
            <input v-model.number="form.discount_value" type="number" min="0" required
              class="aurora-input w-full" :placeholder="form.discount_type === 'percentage' ? 'Ej: 10' : 'Ej: 5000'" />
          </div>
          <!-- Min Order Amount -->
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Monto Mínimo de Pedido</label>
            <input v-model.number="form.minimum_order_amount" type="number" min="0"
              class="aurora-input w-full" placeholder="0 = sin mínimo" />
          </div>
          <!-- Usage Limit -->
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Límite de Usos</label>
            <input v-model.number="form.usage_limit" type="number" min="0"
              class="aurora-input w-full" placeholder="0 = sin límite" />
          </div>
          <!-- Per User Limit -->
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Usos por Usuario</label>
            <input v-model.number="form.per_user_limit" type="number" min="1"
              class="aurora-input w-full" placeholder="Ej: 1" />
          </div>
          <!-- Start Date -->
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Fecha Inicio <span style="color: var(--aurora-error);">*</span></label>
            <input v-model="form.start_date" type="date" required class="aurora-input w-full" />
          </div>
          <!-- End Date -->
          <div>
            <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Fecha Fin <span style="color: var(--aurora-error);">*</span></label>
            <input v-model="form.end_date" type="date" required class="aurora-input w-full" />
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block mb-1 font-medium text-on-surface" style="font-family: 'Inter', sans-serif; font-size: 0.875rem;">Descripción</label>
          <textarea v-model="form.description" rows="2"
            class="aurora-input w-full" placeholder="Descripción del cupón..."></textarea>
        </div>

        <!-- Active -->
        <div class="flex items-center gap-2">
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="form.is_active" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                 :style="{ background: form.is_active ? 'var(--aurora-primary)' : 'var(--aurora-outline-variant)' }"></div>
            <span class="ml-3 text-sm text-on-surface-variant">{{ form.is_active ? 'Activo' : 'Inactivo' }}</span>
          </label>
        </div>

        <!-- Form Errors -->
        <div v-if="formError" class="text-sm" style="color: var(--aurora-error); background: var(--aurora-error-container); padding: 0.75rem; border-radius: 0.75rem;">
          {{ formError }}
        </div>

        <!-- Submit -->
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="closeForm" class="aurora-btn-secondary">Cancelar</button>
          <button type="submit" class="aurora-btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear') }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Usage Modal -->
    <Modal :show="showUsage" title="Uso del Cupón" @close="showUsage = false" size="md">
      <div v-if="usageLoading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2" style="border-color: var(--aurora-primary);"></div>
      </div>
      <div v-else-if="!usageData?.length" class="text-center py-8 text-on-surface-variant text-sm">
        Este cupón aún no ha sido utilizado.
      </div>
      <div v-else class="space-y-3">
        <div v-for="u in usageData" :key="u.id"
          class="flex items-center justify-between p-3 text-sm" style="background: var(--aurora-surface-container); border-radius: 0.75rem;">
          <div>
            <p class="font-medium text-on-surface">{{ u.user_name || u.user_email || 'Usuario #' + u.user_id }}</p>
            <p class="text-xs text-on-surface-variant">{{ formatDateTime(u.used_at) }}</p>
          </div>
          <div v-if="u.order_id" class="text-right">
            <router-link :to="`/app/sales/${u.order_id}`" class="text-xs font-medium" style="color: var(--aurora-primary);">
              Ver venta #{{ u.order_id }}
            </router-link>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Delete Confirmation -->
    <Modal :show="showDelete" title="Confirmar Eliminación" @close="showDelete = false" size="sm">
      <p class="text-on-surface-variant mb-6">
        ¿Estás seguro de eliminar el cupón <strong class="text-on-surface">{{ deleting?.code }}</strong>? Esta acción no se puede deshacer.
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
import { useCurrencyStore } from '../../stores/currency';
import { couponsAPI } from '../../api';

const couponStore = useCouponStore();
const currencyStore = useCurrencyStore();

const coupons = ref([]);
const loading = ref(false);
const saving = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const formError = ref('');
const editing = ref(false);
const showForm = ref(false);
const showUsage = ref(false);
const showDelete = ref(false);
const deleting = ref(null);
const usageData = ref([]);
const usageLoading = ref(false);
const page = ref(1);
const total = ref(0);
const limit = 12;
const filter = ref({ status: '', search: '' });

const defaultForm = () => ({
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  minimum_order_amount: 0,
  usage_limit: 0,
  per_user_limit: 1,
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  is_active: true,
  applies_to: 'all',
  product_ids: [],
  category_ids: []
});

const form = ref(defaultForm());

const formatPrice = (v) => currencyStore.format(v);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('es-CO') : '-';

const getStatusClass = (c) => {
  if (!c.is_active) return 'aurora-badge-secondary';
  if (new Date(c.end_date) < new Date()) return 'aurora-badge-warning';
  if (c.usage_limit && (c.used_count || 0) >= c.usage_limit) return 'aurora-badge-warning';
  return 'aurora-badge-success';
};
const getStatusText = (c) => {
  if (!c.is_active) return 'Inactivo';
  if (new Date(c.end_date) < new Date()) return 'Expirado';
  if (c.usage_limit && (c.used_count || 0) >= c.usage_limit) return 'Agotado';
  return 'Activo';
};

let searchTimer = null;
const onSearchInput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadCoupons, 300);
};

const loadCoupons = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, limit, ...filter.value };
    if (!params.status) delete params.status;
    const res = await couponStore.fetchCoupons(params);
    coupons.value = couponStore.coupons;
    total.value = res?.pagination?.total || couponStore.coupons.length;
  } finally {
    loading.value = false;
  }
};

const changePage = (p) => { page.value = p; loadCoupons(); };

const openForm = (coupon) => {
  editing.value = !!coupon;
  form.value = coupon ? { ...coupon } : defaultForm();
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
      await couponStore.updateCoupon(form.value.id, form.value);
      successMsg.value = 'Cupón actualizado correctamente';
    } else {
      await couponStore.createCoupon(form.value);
      successMsg.value = 'Cupón creado correctamente';
    }
    closeForm();
    await loadCoupons();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Error al guardar cupón';
  } finally {
    saving.value = false;
  }
};

const editCoupon = (c) => openForm(c);

const viewUsage = async (c) => {
  showUsage.value = true;
  usageLoading.value = true;
  try {
    const res = await couponsAPI.getUsage(c.id);
    usageData.value = res.data || [];
  } catch (err) {
    usageData.value = [];
  } finally {
    usageLoading.value = false;
  }
};

const confirmDelete = (c) => {
  deleting.value = c;
  showDelete.value = true;
};

const handleDelete = async () => {
  saving.value = true;
  try {
    await couponStore.deleteCoupon(deleting.value.id);
    successMsg.value = 'Cupón eliminado correctamente';
    showDelete.value = false;
    await loadCoupons();
  } catch (err) {
    errorMsg.value = 'Error al eliminar cupón';
  } finally {
    saving.value = false;
  }
};

onMounted(loadCoupons);
</script>

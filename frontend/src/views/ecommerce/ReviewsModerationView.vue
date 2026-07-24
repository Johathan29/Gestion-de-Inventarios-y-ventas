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
        <span class="material-symbols-outlined animate-header-icon"> rate_review </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Moderación de Reseñas"
            :description="`${total} reseña${total !== 1 ? 's' : ''} registrada${total !== 1 ? 's' : ''}`"
            tag="h1"
          />
        </div>
        <div class="header-actions"></div>
      </div>
    </div>

    <!-- Filter/Sort Bar -->
    <div class="aurora-raised-card mb-md overflow-hidden">
      <div class="flex justify-between items-center p-md">
        <div class="flex gap-2">
          <button @click="showFilters = !showFilters"
            class="aurora-btn-secondary"
            :class="{ 'aurora-pressed': showFilters }"
            style="padding: 8px 12px; font-size: 0.8rem;">
            <span class="material-symbols-outlined" style="font-size: 1rem;">filter_list</span>
            Filtrar
          </button>
          <button v-if="filter.status || filter.rating" @click="resetFilters"
            class="aurora-btn-secondary"
            style="padding: 8px 12px; font-size: 0.8rem;">
            <span class="material-symbols-outlined" style="font-size: 1rem;">clear</span>
            Limpiar
          </button>
        </div>
      </div>

      <!-- Filter Panel (inside same card) -->
      <div v-if="showFilters" class="px-md pb-md pt-0">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter pt-3" style="border-top: 1px solid var(--aurora-outline-variant);">
          <div>
            <label class="block mb-1 font-medium text-on-surface-variant" style="font-family: 'Inter', sans-serif; font-size: 0.75rem;">Estado</label>
            <select v-model="filter.status" @change="fetchReviews" class="aurora-select">
              <option value="">Todas</option>
              <option value="false">Pendientes</option>
              <option value="true">Aprobadas</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium text-on-surface-variant" style="font-family: 'Inter', sans-serif; font-size: 0.75rem;">Rating</label>
            <select v-model="filter.rating" @change="fetchReviews" class="aurora-select">
              <option value="">Todas las estrellas</option>
              <option v-for="r in 5" :key="r" :value="r">{{ r }} estrellas</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" class="mb-md" />
    <DataTableSkeleton v-if="loading" />

    <!-- Tabla -->
    <DataTable v-else :columns="reviewColumns" :data="reviews" :server-pagination="true" :total="total" :current-page-prop="page" :per-page="20" empty-message="No se encontraron reseñas" @page-change="changePage">
      <template #cell-client="{ row }">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full aurora-raised flex items-center justify-center text-xs font-bold text-on-surface-variant">
            {{ row.client_name?.charAt(0) || '?' }}
          </div>
          <div>
            <p class="font-medium text-on-surface">{{ row.client_name }}</p>
            <p v-if="row.client_title" class="text-xs text-on-surface-variant">{{ row.client_title }}</p>
          </div>
        </div>
      </template>
      <template #cell-product="{ row }">
        <span class="text-on-surface-variant line-clamp-1">{{ row.products?.name || '—' }}</span>
      </template>
      <template #cell-rating="{ row }">
        <div class="flex gap-0.5 text-amber-400">
          <span v-for="s in 5" :key="s" class="material-symbols-outlined text-sm"
            :style="getStarFill(s, row.rating)">star</span>
        </div>
      </template>
      <template #cell-comment="{ row }">
        <div class="max-w-[250px]">
          <p class="text-on-surface-variant overflow-hidden text-ellipsis whitespace-nowrap" :title="row.comment">{{ row.comment }}</p>
          <p v-if="row.title" class="text-xs text-on-surface-variant font-medium mt-0.5">{{ row.title }}</p>
        </div>
      </template>
      <template #cell-date="{ row }">
        <span class="text-xs text-on-surface-variant">{{ formatDate(row.created_at) }}</span>
      </template>
      <template #cell-status="{ row }">
        <span v-if="row.is_approved" class="aurora-badge aurora-badge-success">Aprobada</span>
        <span v-else class="aurora-badge aurora-badge-warning">Pendiente</span>
      </template>
      <template #actions="{ row }">
        <button v-if="!row.is_approved" @click="approveReview(row)" class="aurora-btn-icon" title="Aprobar" style="color: #059669;">
          <span class="material-symbols-outlined" style="font-size: 1.25rem;">check</span>
        </button>
        <button @click="toggleFeatured(row)" class="aurora-btn-icon" :title="row.is_featured ? 'Quitar destacado' : 'Destacar'" :style="{ color: row.is_featured ? 'var(--aurora-primary)' : 'var(--aurora-on-surface-variant)' }">
          <span class="material-symbols-outlined" style="font-size: 1.25rem;">star</span>
        </button>
        <button @click="confirmDelete(row)" class="aurora-btn-icon" title="Eliminar" style="color: var(--aurora-error);">
          <span class="material-symbols-outlined" style="font-size: 1.25rem;">delete</span>
        </button>
      </template>
    </DataTable>

    <!-- Mobile Cards -->
    <div v-if="!loading" class="md:hidden space-y-4 mt-4">
      <div v-for="review in reviews" :key="review.id"
           class="aurora-raised-card">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full aurora-raised flex items-center justify-center text-xs font-bold shrink-0 text-on-surface-variant">
              {{ review.client_name?.charAt(0) || '?' }}
            </div>
            <div>
              <p class="text-sm font-medium text-on-surface">{{ review.client_name }}</p>
              <p class="text-xs text-on-surface-variant">{{ review.products?.name || '—' }}</p>
            </div>
          </div>
          <span v-if="review.is_approved" class="aurora-badge aurora-badge-success">Aprobada</span>
          <span v-else class="aurora-badge aurora-badge-warning">Pendiente</span>
        </div>
        <div class="flex gap-0.5 text-amber-400 mb-1">
          <span v-for="s in 5" :key="s" class="material-symbols-outlined text-sm"
            :style="getStarFill(s, review.rating)">star</span>
        </div>
        <p class="text-sm mb-2 line-clamp-2 text-on-surface-variant">{{ review.comment }}</p>
        <div class="flex items-center justify-between pt-2" style="border-top: 1px solid var(--aurora-outline-variant);">
          <span class="text-xs text-on-surface-variant">{{ formatDate(review.created_at) }}</span>
          <div class="flex gap-1">
            <button v-if="!review.is_approved" @click="approveReview(review)" class="aurora-btn-primary" style="padding: 4px 10px; font-size: 0.7rem; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 0.75rem;">check</span>
              Aprobar
            </button>
            <button @click="confirmDelete(review)" class="aurora-btn-secondary" style="padding: 4px 10px; font-size: 0.7rem; color: var(--aurora-error); border-color: var(--aurora-error);">
              <span class="material-symbols-outlined" style="font-size: 0.75rem;">delete</span>
            </button>
          </div>
        </div>
      </div>
      <div v-if="reviews.length === 0" class="aurora-raised-card py-8 text-center">
        <span class="material-symbols-outlined text-3xl text-on-surface-variant mb-2">rate_review</span>
        <p class="text-on-surface-variant">No se encontraron reseñas</p>
      </div>
    </div>

    <!-- Modal de confirmación -->
    <ConfirmDialog
      :show="showDelete"
      title="Eliminar Reseña"
      message="¿Estás seguro de eliminar esta reseña? Esta acción no se puede deshacer."
      @confirm="handleDelete"
      @cancel="showDelete = false"
      :loading="saving"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';
import PageHeader from '../../components/shared/PageHeader.vue';
import Alert from '../../components/shared/Alert.vue';
import DataTableSkeleton from '../../components/skeletons/DataTableSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue';
import DataTable from '../../components/shared/DataTable.vue';

const loading = ref(true);
const saving = ref(false);
const successMsg = ref('');
const reviews = ref([]);
const page = ref(1);
const totalPages = ref(1);
const total = ref(0);
const showDelete = ref(false);
const showFilters = ref(false);
const deletingReview = ref(null);

const reviewColumns = [
  { key: 'client', label: 'Cliente' },
  { key: 'product', label: 'Producto' },
  { key: 'rating', label: 'Rating' },
  { key: 'comment', label: 'Comentario' },
  { key: 'date', label: 'Fecha' },
  { key: 'status', label: 'Estado' }
];

const getStarFill = (starIndex, rating) => {
  if (starIndex <= rating) {
    return { 'font-variation-settings': '"FILL" 1' };
  }
  return {};
};

const filter = reactive({
  status: '',
  rating: ''
});

const resetFilters = () => {
  filter.status = '';
  filter.rating = '';
  page.value = 1;
  fetchReviews();
};

const fetchReviews = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, limit: 20 };
    if (filter.status !== '') params.is_approved = filter.status;
    if (filter.rating !== '') params.rating = filter.rating;

    const res = await ecommerceAPI.getAllReviews(params);
    if (Array.isArray(res.data)) {
      reviews.value = res.data;
      total.value = res.pagination?.total || 0;
      totalPages.value = res.pagination?.totalPages || 1;
    }
  } catch (e) {
    console.warn('Error fetching reviews:', e);
  } finally {
    loading.value = false;
  }
};

const approveReview = async (review) => {
  saving.value = true;
  try {
    await ecommerceAPI.moderateReview(review.id, { is_approved: true });
    successMsg.value = 'Reseña aprobada correctamente';
    await fetchReviews();
  } catch (e) {
    console.warn('Error approving review:', e);
  } finally {
    saving.value = false;
    setTimeout(() => successMsg.value = '', 3000);
  }
};

const toggleFeatured = async (review) => {
  saving.value = true;
  try {
    await ecommerceAPI.moderateReview(review.id, {
      is_featured: !review.is_featured,
      is_approved: review.is_approved || true
    });
    successMsg.value = review.is_featured ? 'Reseña quitada de destacadas' : 'Reseña destacada';
    await fetchReviews();
  } catch (e) {
    console.warn('Error toggling featured:', e);
  } finally {
    saving.value = false;
    setTimeout(() => successMsg.value = '', 3000);
  }
};

const confirmDelete = (review) => {
  deletingReview.value = review;
  showDelete.value = true;
};

const handleDelete = async () => {
  saving.value = true;
  try {
    await ecommerceAPI.deleteReview(deletingReview.value.id);
    successMsg.value = 'Reseña eliminada';
    showDelete.value = false;
    await fetchReviews();
  } catch (e) {
    console.warn('Error deleting review:', e);
  } finally {
    saving.value = false;
    setTimeout(() => successMsg.value = '', 3000);
  }
};

const changePage = (p) => {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  fetchReviews();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
};

onMounted(fetchReviews);
</script>

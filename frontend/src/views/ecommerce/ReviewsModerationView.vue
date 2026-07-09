<template>
  <div class="dt-card p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Moderación de Reseñas</h2>

      <!-- Filter/Sort Bar -->
      <div class="filter-bar-container p-4 border-b border-[#d2c4b4]/30 flex justify-between items-center" style="background: #ffffff; border-radius: 12px 12px 0 0; width: 100%; margin-bottom: 0;">
        <div class="flex gap-2">
          <button @click="showFilters = !showFilters"
            class="px-3 py-1.5 text-sm font-medium border border-[#d2c4b4] rounded-md flex items-center gap-1 hover:bg-[#eff4ff] transition-colors bg-white relative"
            :class="{ 'ring-2 ring-[rgba(98,66,0,0.2)] border-[#624200]': showFilters }"
            style="font-family: 'Inter', sans-serif; color: #4f4539;">
            <span class="material-icons-outlined" style="font-size: 1rem;">filter_list</span>
            Filtrar
          </button>
        </div>
      </div>

      <!-- Filter Panel -->
      <div v-if="showFilters" class="filter-panel-container px-4 py-4 border-b border-[#d2c4b4]/30" style="background: #faf9f6;">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Estado</label>
            <select v-model="filter.status" @change="fetchReviews" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all" style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;">
              <option value="">Todas</option>
              <option value="false">Pendientes</option>
              <option value="true">Aprobadas</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Rating</label>
            <select v-model="filter.rating" @change="fetchReviews" class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all" style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;">
              <option value="">Todas las estrellas</option>
              <option v-for="r in 5" :key="r" :value="r">{{ r }} estrellas</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Loading v-if="loading" />

    <!-- Tabla -->
    <DataTable v-else :columns="reviewColumns" :data="reviews" :server-pagination="true" :total="totalPages * 20" :current-page-prop="page" :per-page="20" empty-message="No se encontraron reseñas" @page-change="changePage">
      <template #cell-client="{ row }">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold" style="color: #4f4539;">
            {{ row.client_name?.charAt(0) || '?' }}
          </div>
          <div>
            <p class="font-medium" style="color: #0b1c30;">{{ row.client_name }}</p>
            <p v-if="row.client_title" class="text-xs text-gray-500">{{ row.client_title }}</p>
          </div>
        </div>
      </template>
      <template #cell-product="{ row }">
        <span style="color: #4f4539;" class="line-clamp-1">{{ row.products?.name || '—' }}</span>
      </template>
      <template #cell-rating="{ row }">
        <div class="flex gap-0.5 text-amber-400">
          <span v-for="s in 5" :key="s" class="material-symbols-outlined text-sm"
            :style="getStarFill(s, row.rating)">star</span>
        </div>
      </template>
      <template #cell-comment="{ row }">
        <div class="max-w-[250px]">
          <p style="color: #4f4539; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="row.comment">{{ row.comment }}</p>
          <p v-if="row.title" class="text-xs text-gray-500 font-medium mt-0.5">{{ row.title }}</p>
        </div>
      </template>
      <template #cell-date="{ row }">
        <span class="text-xs" style="color: #4f4539;">{{ formatDate(row.created_at) }}</span>
      </template>
      <template #cell-status="{ row }">
        <span v-if="row.is_approved" class="dt-badge dt-badge-success">Aprobada</span>
        <span v-else class="dt-badge dt-badge-warning">Pendiente</span>
      </template>
      <template #actions="{ row }">
        <button v-if="!row.is_approved" @click="approveReview(row)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Aprobar" style="color: #059669; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#047857'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#059669'; }">
          <span class="material-symbols-outlined" style="font-size: 1.25rem;">check</span>
        </button>
        <button @click="toggleFeatured(row)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" :title="row.is_featured ? 'Quitar destacado' : 'Destacar'" :style="{ color: row.is_featured ? '#624200' : '#4f4539', background: 'transparent', border: 'none', cursor: 'pointer' }" @mouseenter="e => { e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; }">
          <span class="material-symbols-outlined" style="font-size: 1.25rem;">star</span>
        </button>
        <button @click="confirmDelete(row)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Eliminar" style="color: #dc2626; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#dc2626'; }">
          <span class="material-symbols-outlined" style="font-size: 1.25rem;">delete</span>
        </button>
      </template>
    </DataTable>

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
import Alert from '../../components/shared/Alert.vue';
import Loading from '../../components/shared/Loading.vue';
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue';
import DataTable from '../../components/shared/DataTable.vue';

const loading = ref(true);
const saving = ref(false);
const successMsg = ref('');
const reviews = ref([]);
const page = ref(1);
const totalPages = ref(1);
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

const fetchReviews = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, limit: 20 };
    if (filter.status !== '') params.is_approved = filter.status;
    if (filter.rating !== '') params.rating = filter.rating;

    const res = await ecommerceAPI.getAllReviews(params);
    if (Array.isArray(res.data)) {
      reviews.value = res.data;
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

<template>
  <div class="dt-card p-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="dt-headline-sm" style="margin-bottom: 0;">Moderación de Reseñas</h3>

      <!-- Filtros -->
      <div class="flex gap-2">
        <select v-model="filter.status" @change="fetchReviews" class="form-input text-sm py-1.5">
          <option value="">Todas</option>
          <option value="false">Pendientes</option>
          <option value="true">Aprobadas</option>
        </select>
        <select v-model="filter.rating" @change="fetchReviews" class="form-input text-sm py-1.5">
          <option value="">Todas las estrellas</option>
          <option v-for="r in 5" :key="r" :value="r">{{ r }} estrellas</option>
        </select>
      </div>
    </div>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Loading v-if="loading" />

    <!-- Tabla -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="dt-table-header-row">
            <th class="dt-table-th text-left">Cliente</th>
            <th class="dt-table-th text-left">Producto</th>
            <th class="dt-table-th text-left">Rating</th>
            <th class="dt-table-th text-left">Comentario</th>
            <th class="dt-table-th text-left">Fecha</th>
            <th class="dt-table-th text-left">Estado</th>
            <th class="dt-table-th text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="review in reviews" :key="review.id" class="border-b hover:bg-gray-50" style="border-color: #d2c4b4;">
            <td class="py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold" style="color: #4f4539;">
                  {{ review.client_name?.charAt(0) || '?' }}
                </div>
                <div>
                  <p class="font-medium" style="color: #0b1c30;">{{ review.client_name }}</p>
                  <p v-if="review.client_title" class="text-xs text-gray-500">{{ review.client_title }}</p>
                </div>
              </div>
            </td>
            <td class="py-3" style="color: #4f4539; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {{ review.products?.name || '—' }}
            </td>
            <td class="py-3">
              <div class="flex gap-0.5 text-amber-400">
                <span v-for="s in 5" :key="s" class="material-symbols-outlined text-sm" :data-icon="s <= review.rating ? 'star' : 'star'"
                  :style="getStarFill(s, review.rating)">star</span>
              </div>
            </td>
            <td class="py-3 max-w-[250px]">
              <p style="color: #4f4539; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="review.comment">{{ review.comment }}</p>
              <p v-if="review.title" class="text-xs text-gray-500 font-medium mt-0.5">{{ review.title }}</p>
            </td>
            <td class="py-3 text-gray-500 text-xs">{{ formatDate(review.created_at) }}</td>
            <td class="py-3">
              <span v-if="review.is_approved" class="dt-badge dt-badge-success">Aprobada</span>
              <span v-else class="dt-badge dt-badge-warning">Pendiente</span>
            </td>
            <td class="py-3">
              <div class="flex gap-1.5">
                <button
                  v-if="!review.is_approved"
                  @click="approveReview(review)"
                  class="dt-btn-secondary"
                  style="padding: 0.25rem 0.75rem; font-size: 0.875rem; border-color: #059669; color: #059669;"
                  title="Aprobar"
                >
                  <span class="material-symbols-outlined text-sm" data-icon="check">check</span>
                </button>
                <button
                  @click="toggleFeatured(review)"
                  class="dt-btn-secondary"
                  :style="{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', borderColor: review.is_featured ? '#624200' : '', color: review.is_featured ? '#624200' : '' }"
                  :title="review.is_featured ? 'Quitar destacado' : 'Destacar'"
                >
                  <span class="material-symbols-outlined text-sm" data-icon="star">star</span>
                </button>
                <button
                  @click="confirmDelete(review)"
                  class="dt-btn-secondary"
                  style="padding: 0.25rem 0.75rem; font-size: 0.875rem; border-color: #ef4444; color: #ef4444;"
                  title="Eliminar"
                >
                  <span class="material-symbols-outlined text-sm" data-icon="delete">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Sin resultados -->
      <div v-if="reviews.length === 0" class="text-center py-12 text-gray-500">
        No se encontraron reseñas
      </div>

      <!-- Paginación -->
      <div v-if="totalPages > 1" class="flex justify-center items-center gap-4 mt-6">
        <button @click="changePage(page - 1)" :disabled="page <= 1" class="dt-btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">Anterior</button>
        <span class="dt-body-sm" style="color: #4f4539;">Página {{ page }} de {{ totalPages }}</span>
        <button @click="changePage(page + 1)" :disabled="page >= totalPages" class="dt-btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">Siguiente</button>
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
import Alert from '../../components/shared/Alert.vue';
import Loading from '../../components/shared/Loading.vue';
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue';

const loading = ref(true);
const saving = ref(false);
const successMsg = ref('');
const reviews = ref([]);
const page = ref(1);
const totalPages = ref(1);
const showDelete = ref(false);
const deletingReview = ref(null);

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

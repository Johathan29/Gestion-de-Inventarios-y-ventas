<template>
  <PurchaseVerificationSkeleton v-if="loading" />
  <div v-else>
    <!-- Header -->
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div
          class="mesh-gradient-header"
          style="
            background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
          "
        >
          <div class="header-icon-container">
            <span class="material-symbols-outlined animate-header-icon"> fact_check </span>
          </div>
          <div class="header-glass">
            <div class="header-information">
              <PageHeader
                title="Verificación de Inventario"
                tag="h1"
                :description="`${pagination.total || purchases.length} compra${(pagination.total || purchases.length) !== 1 ? 's' : ''} pendiente${(pagination.total || purchases.length) !== 1 ? 's' : ''} de verificación`"
              />
            </div>
            <div class="header-actions"></div>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard label="Pendientes de Verificar" :value="summary.pending" icon="fact_check" iconColor="#d97706" variant="dashboard" />
        <StatCard label="En Revisión" :value="summary.inReview" icon="rate_review" iconColor="#7c3aed" variant="dashboard" />
        <StatCard label="Verificadas" :value="summary.verified" icon="verified" iconColor="#16a34a" variant="dashboard" />
      </div>
    </div>

    <!-- Sub-navigation Tabs -->
    <InventoryTabs />

    <!-- Filter Bar -->
    <div class="nexus-card !p-0 overflow-hidden">
      <div class="filter-bar-container p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div class="flex gap-2">
          <select v-model="filterStatus"
            @change="fetchPendingPurchases"
            class="px-3 py-1.5 text-sm border border-gray-200 rounded-md"
            style="font-family: 'Inter', sans-serif; color: #1e293b;">
            <option value="pending">Pendientes</option>
            <option value="in_review">En Revisión</option>
            <option value="verified">Verificadas</option>
            <option value="">Todas</option>
          </select>
        </div>
      </div>

      <!-- Purchases List -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <div v-else-if="purchases.length === 0" class="text-center py-12 text-gray-500">
        <span class="material-icons-outlined text-4xl mb-2" style="color: #94a3b8;">fact_check</span>
        <p>No hay compras pendientes de verificación</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div v-for="purchase in purchases" :key="purchase.id"
          class="p-4 hover:bg-[#7840da0f] transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span class="font-bold text-sm" style="color: #1e293b;">{{ purchase.purchase_number }}</span>
                <span class="px-2 py-0.5 text-xs rounded-full font-medium"
                  :class="getStatusClass(purchase.verification_status)">
                  {{ getStatusLabel(purchase.verification_status) }}
                </span>
                <span class="text-xs text-gray-500">{{ formatDate(purchase.created_at) }}</span>
              </div>
              <div class="text-sm text-gray-600 mb-2">
                <span class="font-medium">Proveedor:</span> {{ purchase.suppliers?.name || 'N/A' }}
              </div>
              <div class="flex flex-wrap gap-2">
                <span v-for="item in purchase.purchase_items" :key="item.id"
                  class="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                  {{ item.product_name }}
                  <span class="font-medium">x{{ item.quantity }}</span>
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 ml-4">
              <button @click="openVerifyModal(purchase)"
                class="btn btn-sm btn-primary"
                :disabled="purchase.verification_status === 'verified'">
                <span class="material-icons-outlined" style="font-size: 1rem;">fact_check</span>
                Verificar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="px-4 py-3 border-t border-gray-100 flex justify-center">
        <div class="flex gap-1">
          <button @click="changePage(pagination.currentPage - 1)" :disabled="pagination.currentPage <= 1"
            class="px-3 py-1 text-sm border rounded-md disabled:opacity-50">
            Anterior
          </button>
          <span class="px-3 py-1 text-sm">
            {{ pagination.currentPage }} / {{ pagination.totalPages }}
          </span>
          <button @click="changePage(pagination.currentPage + 1)" :disabled="pagination.currentPage >= pagination.totalPages"
            class="px-3 py-1 text-sm border rounded-md disabled:opacity-50">
            Siguiente
          </button>
        </div>
      </div>
    </div>

    <!-- Verification Modal -->
    <Teleport to="body">
      <div v-if="selectedPurchase" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="selectedPurchase = null">
        <div class="bg-white rounded-2xl w-full max-w-2xl mx-4 p-6 nexus-card max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold" style="color: #1e293b;">
              Verificar Compra {{ selectedPurchase.purchase_number }}
            </h3>
            <button @click="selectedPurchase = null" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors !cursor-pointer" style="border: none; background: transparent;">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>

          <div class="mb-4">
            <p class="text-sm text-gray-600">
              <span class="font-medium">Proveedor:</span> {{ selectedPurchase.suppliers?.name || 'N/A' }}
            </p>
            <p class="text-sm text-gray-600">
              <span class="font-medium">Fecha:</span> {{ formatDate(selectedPurchase.created_at) }}
            </p>
          </div>

          <div class="space-y-4 mb-6">
            <div v-for="(item, index) in verificationItems" :key="item.item_id"
              class="p-4 rounded-xl border" :class="item.rejected_qty > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <p class="font-medium text-sm" style="color: #1e293b;">{{ item.product_name }}</p>
                  <p class="text-xs text-gray-500">Cantidad recibida: {{ item.quantity }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Cantidad Verificada</label>
                  <input type="number" v-model.number="item.verified_qty" min="0" :max="item.quantity"
                    class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
                    @input="updateRejected(index)" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Cantidad Rechazada</label>
                  <input type="number" v-model.number="item.rejected_qty" min="0" :max="item.quantity"
                    class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md"
                    @input="updateVerified(index)" />
                </div>
              </div>
              <div v-if="item.rejected_qty > 0" class="mt-2">
                <label class="block text-xs font-medium text-gray-600 mb-1">Motivo del Rechazo</label>
                <input type="text" v-model="item.rejected_reason" placeholder="Ej: Producto dañado, cantidad incorrecta..."
                  class="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button @click="selectedPurchase = null" class="btn btn-sm btn-ghost">Cancelar</button>
            <button @click="confirmVerification" :disabled="verifying"
              class="btn btn-sm btn-primary">
              <span v-if="verifying" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              Confirmar Verificación
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { purchasesAPI } from '../../api';
import PageHeader from '../../components/shared/PageHeader.vue';
import StatCard from '../../components/shared/StatCard.vue';
import InventoryTabs from '../../components/inventory/InventoryTabs.vue';
import PurchaseVerificationSkeleton from '../../components/skeletons/PurchaseVerificationSkeleton.vue';
import { useToast } from '../../composables/useToast';

const toast = useToast();
const loading = ref(true);
const verifying = ref(false);
const purchases = ref([]);
const selectedPurchase = ref(null);
const filterStatus = ref('pending');
const verificationItems = ref([]);

const summary = reactive({ pending: 0, inReview: 0, verified: 0 });
const pagination = reactive({
  currentPage: 1,
  totalPages: 1,
  total: 0
});

const getStatusClass = (status) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-purple-100 text-purple-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };
  return map[status] || 'bg-gray-100 text-gray-800';
};

const getStatusLabel = (status) => {
  const map = {
    pending: 'Pendiente',
    in_review: 'En Revisión',
    verified: 'Verificada',
    rejected: 'Rechazada'
  };
  return map[status] || status;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

const updateRejected = (index) => {
  const item = verificationItems.value[index];
  item.rejected_qty = Math.max(0, Math.min(item.quantity - item.verified_qty, item.rejected_qty || 0));
  item.verified_qty = item.quantity - item.rejected_qty;
};

const updateVerified = (index) => {
  const item = verificationItems.value[index];
  item.verified_qty = Math.max(0, Math.min(item.quantity - item.rejected_qty, item.verified_qty || 0));
  item.rejected_qty = item.quantity - item.verified_qty;
};

const changePage = (page) => {
  if (page < 1 || page > pagination.totalPages) return;
  pagination.currentPage = page;
  fetchPendingPurchases();
};

const fetchPendingPurchases = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.currentPage,
      limit: 10,
      verification_status: filterStatus.value || undefined
    };
    const res = await purchasesAPI.getAll(params);
    purchases.value = res.data || [];
    pagination.totalPages = res.pagination?.totalPages || 1;
    pagination.total = res.pagination?.total || 0;
  } catch (err) {
    console.error('Error fetching pending purchases:', err);
  } finally {
    loading.value = false;
  }
};

const fetchSummary = async () => {
  try {
    const res = await purchasesAPI.getAll({ limit: 1, verification_status: 'pending' });
    summary.pending = res.pagination?.total || 0;
    const res2 = await purchasesAPI.getAll({ limit: 1, verification_status: 'in_review' });
    summary.inReview = res2.pagination?.total || 0;
    const res3 = await purchasesAPI.getAll({ limit: 1, verification_status: 'verified' });
    summary.verified = res3.pagination?.total || 0;
  } catch (err) {
    console.error('Error fetching summary:', err);
  }
};

const openVerifyModal = (purchase) => {
  selectedPurchase.value = purchase;
  verificationItems.value = (purchase.purchase_items || []).map(item => ({
    item_id: item.id,
    product_name: item.product_name,
    quantity: item.quantity,
    verified_qty: item.verified_qty || item.quantity,
    rejected_qty: item.rejected_qty || 0,
    rejected_reason: item.rejected_reason || ''
  }));
};

const confirmVerification = async () => {
  verifying.value = true;
  try {
    const items = verificationItems.value.map(item => ({
      item_id: item.item_id,
      verified_qty: item.verified_qty,
      rejected_qty: item.rejected_qty,
      rejected_reason: item.rejected_reason || null
    }));

    // Verificar la compra
    const verifyRes = await purchasesAPI.verify(selectedPurchase.value.id, { items });
    selectedPurchase.value = null;

    // Enviar a inventario: crear productos enlazados desde los items verificados
    try {
      await purchasesAPI.sendToInventory(verifyRes.data?.id || selectedPurchase.value?.id);
    } catch (invErr) {
      console.warn('Error al enviar a inventario automáticamente:', invErr);
      // No bloqueamos el flujo si falla el envío a inventario
    }

    await fetchPendingPurchases();
    await fetchSummary();
    toast.success('Compra verificada y enviada a inventario');
  } catch (err) {
    console.error('Error verifying purchase:', err);
    toast.error('Error al verificar la compra');
  } finally {
    verifying.value = false;
  }
};

onMounted(() => {
  fetchPendingPurchases();
  fetchSummary();
});
</script>

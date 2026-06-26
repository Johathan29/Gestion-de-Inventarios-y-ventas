<template>
  <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 md:p-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-2">Mis Compras</h2>
    <p class="text-gray-500 text-sm mb-6">Historial de tus compras realizadas</p>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <span class="material-symbols-outlined text-5xl text-red-400 mb-3">error</span>
      <p class="text-red-500">{{ error }}</p>
      <button @click="fetchPurchases" class="mt-4 text-primary hover:underline text-sm">Reintentar</button>
    </div>

    <!-- Vacío -->
    <div v-else-if="purchases.length === 0" class="text-center py-16">
      <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">receipt_long</span>
      <h3 class="text-lg font-semibold text-gray-600 mb-1">Aún no tienes compras</h3>
      <p class="text-gray-400 text-sm mb-4">Explora nuestros productos y realiza tu primera compra</p>
      <router-link to="/products" class="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-md">
        <span class="material-symbols-outlined text-lg">store</span>
        Ver Productos
      </router-link>
    </div>

    <!-- Lista de compras -->
    <div v-else class="space-y-4">
      <div
        v-for="sale in purchases"
        :key="sale.id"
        class="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span class="text-sm text-gray-500">#{{ sale.sale_number }}</span>
            <span class="mx-2 text-gray-300">|</span>
            <span class="text-sm text-gray-500">{{ formatDate(sale.created_at) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="px-3 py-1 rounded-full text-xs font-medium"
              :class="statusClass(sale.status)"
            >{{ statusLabel(sale.status) }}</span>
          </div>
        </div>

        <!-- Items de la compra -->
        <div class="space-y-2 mb-3">
          <div v-for="item in sale.items" :key="item.id" class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="text-gray-800 font-medium truncate max-w-[200px]">{{ item.product_name }}</span>
              <span class="text-gray-400">x{{ item.quantity }}</span>
            </div>
            <span class="text-gray-700 font-medium">${{ formatPrice(item.total) }}</span>
          </div>
        </div>

        <!-- Totales -->
        <div class="border-t border-gray-200 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div class="flex items-center gap-3 text-sm">
            <span class="text-gray-500">Subtotal: <strong>${{ formatPrice(sale.subtotal) }}</strong></span>
            <span v-if="sale.discount > 0" class="text-green-600">Descuento: -${{ formatPrice(sale.discount) }}</span>
            <span class="text-gray-500">Impuestos: ${{ formatPrice(sale.tax) }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-lg font-bold text-primary">${{ formatPrice(sale.total) }}</span>
            <button
              @click="buyAgain(sale)"
              class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
            >
              <span class="material-symbols-outlined text-sm">replay</span>
              Comprar de nuevo
            </button>
          </div>
        </div>
      </div>

      <!-- Paginación -->
      <div class="flex items-center justify-between pt-4 border-t border-gray-100">
        <p class="text-sm text-gray-500">
          Mostrando {{ ((page - 1) * perPage) + 1 }}-{{ Math.min(page * perPage, total) }} de {{ total }} compras
        </p>
        <div class="flex items-center gap-2">
          <button
            :disabled="page <= 1"
            @click="page > 1 && changePage(page - 1)"
            class="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <span class="text-sm text-gray-600 px-2">Pág. {{ page }}</span>
          <button
            :disabled="page >= totalPages"
            @click="page < totalPages && changePage(page + 1)"
            class="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { salesAPI, cartAPI } from '../../api';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();

const purchases = ref([]);
const loading = ref(true);
const error = ref(null);
const page = ref(1);
const total = ref(0);
const perPage = 12;

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage)));

async function fetchPurchases() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await salesAPI.getClientSales({
      page: page.value,
      limit: perPage,
    });
    purchases.value = data?.sales || [];
    total.value = data?.total || 0;
  } catch (e) {
    error.value = 'Error al cargar el historial de compras';
  } finally {
    loading.value = false;
  }
}

function changePage(newPage) {
  page.value = newPage;
  fetchPurchases();
}

async function buyAgain(sale) {
  try {
    for (const item of sale.items) {
      await cartAPI.addItem({ product_id: item.product_id, quantity: item.quantity });
    }
    alert('Productos agregados al carrito');
  } catch (e) {
    alert('Error al agregar productos al carrito');
  }
}

function statusClass(status) {
  const map = {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded: 'bg-blue-100 text-blue-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

function statusLabel(status) {
  const map = {
    completed: 'Completada',
    pending: 'Pendiente',
    cancelled: 'Cancelada',
    refunded: 'Reembolsada',
  };
  return map[status] || status;
}

function formatPrice(value) {
  return (parseFloat(value) || 0).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

onMounted(fetchPurchases);
</script>

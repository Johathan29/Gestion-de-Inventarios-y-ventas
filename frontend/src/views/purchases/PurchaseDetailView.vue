<template>
  <Loading v-if="loading" />
  <div v-else class="max-w-5xl mx-auto space-y-6">
    <!-- Cabecera -->
    <div class="card p-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
              Compra #{{ purchase.purchase_number || purchase.id?.substring(0, 8) }}
            </h2>
            <span class="badge text-sm"
              :class="purchase.status === 'received' ? 'badge-green' : purchase.status === 'cancelled' ? 'badge-red' : 'badge-yellow'">
              {{ purchase.status === 'received' ? 'Recibida' : purchase.status === 'cancelled' ? 'Cancelada' : 'Pendiente' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Creada el {{ formatDateTime(purchase.created_at) }}
            <template v-if="purchase.received_at">| Recibida el {{ formatDateTime(purchase.received_at) }}</template>
          </p>
        </div>
      </div>

      <!-- Info del Proveedor COMPLETA desde suppliers -->
      <div v-if="purchase.suppliers" class="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 mb-6">
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Proveedor</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-400 block text-xs">Nombre</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ purchase.suppliers.name || '-' }}</span>
          </div>
          <div>
            <span class="text-gray-400 block text-xs">Contacto</span>
            <span>{{ purchase.suppliers.contact_name || '-' }}</span>
          </div>
          <div>
            <span class="text-gray-400 block text-xs">RUC/CI</span>
            <span class="font-mono">{{ purchase.suppliers.tax_id || '-' }}</span>
          </div>
          <div>
            <span class="text-gray-400 block text-xs">Teléfono</span>
            <span>{{ purchase.suppliers.phone || '-' }}</span>
          </div>
          <div>
            <span class="text-gray-400 block text-xs">Email</span>
            <span>{{ purchase.suppliers.email || '-' }}</span>
          </div>
          <div>
            <span class="text-gray-400 block text-xs">Ciudad</span>
            <span>{{ purchase.suppliers.city || '-' }}</span>
          </div>
          <div class="sm:col-span-2">
            <span class="text-gray-400 block text-xs">Dirección</span>
            <span>{{ purchase.suppliers.address || '-' }}</span>
          </div>
          <div v-if="purchase.suppliers.payment_terms">
            <span class="text-gray-400 block text-xs">Términos de pago</span>
            <span>{{ purchase.suppliers.payment_terms }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="purchase.supplier_name" class="mb-6">
        <p><span class="font-medium text-gray-500">Proveedor:</span> {{ purchase.supplier_name }}</p>
      </div>

      <!-- Notas -->
      <div v-if="purchase.notes" class="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg text-sm text-gray-600 dark:text-gray-400">
        <span class="font-medium">Notas:</span> {{ purchase.notes }}
      </div>

      <!-- Productos -->
      <h3 class="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <span class="material-icons-outlined text-primary-500">inventory_2</span>
        Productos ({{ purchase.purchase_items?.length || 0 }})
      </h3>

      <!-- Desktop -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 dark:bg-gray-700/50 border-y border-gray-200 dark:border-gray-700">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Producto</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">SKU / Barra</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cant.</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Costo U.</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Subtotal</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-20">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="item in purchase.purchase_items || []" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/20">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                    <img v-if="item.product_image" :src="item.product_image" class="w-full h-full object-cover" alt="" />
                    <span v-else class="flex items-center justify-center h-full text-gray-400">
                      <span class="material-icons-outlined text-lg">inventory_2</span>
                    </span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ item.product_name }}</p>
                    <p v-if="item.products?.name && item.products.name !== item.product_name" class="text-xs text-gray-400">
                      {{ item.products.name }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="text-xs font-mono text-gray-500">
                  <div v-if="item.sku">SKU: {{ item.sku }}</div>
                  <div v-if="item.barcode || item.products?.barcode" class="flex items-center gap-1 mt-0.5">
                    <span class="material-icons-outlined text-xs">qr_code_scanner</span>
                    {{ item.barcode || item.products?.barcode }}
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-right font-medium">{{ item.quantity }}</td>
              <td class="px-4 py-3 text-right">{{ formatCurrency(item.unit_price) }}</td>
              <td class="px-4 py-3 text-right font-medium text-primary-600 dark:text-primary-400">
                {{ formatCurrency((item.quantity || 0) * (item.unit_price || 0)) }}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center gap-1 justify-end">
                  <button @click="openEditItem(item)" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 hover:text-primary-600" title="Editar">
                    <span class="material-icons-outlined text-lg">edit</span>
                  </button>
                  <button @click="deleteItem(item)" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 hover:text-red-600" title="Eliminar">
                    <span class="material-icons-outlined text-lg">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="md:hidden space-y-3">
        <div v-for="item in purchase.purchase_items || []" :key="item.id"
          class="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600 shrink-0">
              <img v-if="item.product_image" :src="item.product_image" class="w-full h-full object-cover" alt="" />
              <span v-else class="flex items-center justify-center h-full text-gray-400">
                <span class="material-icons-outlined">inventory_2</span>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 dark:text-white truncate">{{ item.product_name }}</p>
              <div class="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                <span v-if="item.sku" class="font-mono">SKU: {{ item.sku }}</span>
                <span v-if="item.barcode || item.products?.barcode" class="font-mono flex items-center gap-1">
                  <span class="material-icons-outlined text-xs">qr_code_scanner</span>
                  {{ item.barcode || item.products?.barcode }}
                </span>
              </div>
              <div class="flex justify-between items-center mt-2 text-sm">
                <span>{{ item.quantity }} x {{ formatCurrency(item.unit_price) }}</span>
                <span class="font-bold text-primary-600 dark:text-primary-400">
                  {{ formatCurrency((item.quantity || 0) * (item.unit_price || 0)) }}
                </span>
              </div>
              <div class="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button @click="openEditItem(item)" class="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">
                  <span class="material-icons-outlined text-sm">edit</span> Editar
                </button>
                <button @click="deleteItem(item)" class="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                  <span class="material-icons-outlined text-sm">delete</span> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Totales con desglose -->
      <div class="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="text-right space-y-1 w-64">
          <div class="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{{ formatCurrency(purchase.subtotal) }}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-500">
            <span>IVA (19%)</span>
            <span>{{ formatCurrency(purchase.tax) }}</span>
          </div>
          <div v-if="purchase.discount" class="flex justify-between text-sm text-red-500">
            <span>Descuento</span>
            <span>-{{ formatCurrency(purchase.discount) }}</span>
          </div>
          <div class="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
            <span>Total</span>
            <span class="text-primary-600 dark:text-primary-400">{{ formatCurrency(purchase.total) }}</span>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <router-link to="/app/purchases" class="btn btn-secondary btn-sm flex items-center gap-1">
          <span class="material-icons-outlined text-lg">arrow_back</span> Volver
        </router-link>

        <!-- Send to Inventory (solo si está pendiente/aprobada) -->
        <button v-if="purchase.status === 'pending' || purchase.status === 'approved'"
                @click="handleSendToInventory"
                :disabled="sendingToInventory"
                class="btn btn-primary btn-sm flex items-center gap-1">
          <span class="material-icons-outlined text-lg">inventory</span>
          {{ sendingToInventory ? 'Enviando...' : 'Enviar a Inventario' }}
        </button>

        <!-- Botón Cancelar Compra -->
        <button v-if="purchase.status !== 'cancelled' && purchase.status !== 'received'"
                @click="handleCancel"
                class="btn btn-danger btn-sm flex items-center gap-1">
          <span class="material-icons-outlined text-lg">cancel</span> Cancelar Compra
        </button>
      </div>
    </div>

    <!-- Item Edit Modal -->
    <Teleport to="body">
      <div v-if="showItemModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeItemModal">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Editar Item</h3>
          <div class="space-y-4">
            <div>
              <label class="form-label">Nombre del Producto</label>
              <input v-model="editingItem.product_name" class="form-input" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="form-label">Cantidad</label>
                <input v-model.number="editingItem.quantity" type="number" min="1" class="form-input" />
              </div>
              <div>
                <label class="form-label">Costo Unitario</label>
                <input v-model.number="editingItem.unit_price" type="number" step="0.01" min="0" class="form-input" />
              </div>
            </div>
            <div>
              <label class="form-label">Código de Barras</label>
              <input v-model="editingItem.barcode" class="form-input font-mono" />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button @click="closeItemModal" class="btn btn-secondary btn-sm">Cancelar</button>
            <button @click="saveItem" :disabled="savingItem" class="btn btn-primary btn-sm">
              {{ savingItem ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { purchasesAPI } from '../../api';
import Loading from '../../components/shared/Loading.vue';
import { formatCurrency, formatDateTime } from '../../utils';
import Swal from 'sweetalert2';

const route = useRoute();
const router = useRouter();
const purchase = ref({});
const loading = ref(true);
const sendingToInventory = ref(false);

// Modal de edición de items
const showItemModal = ref(false);
const savingItem = ref(false);
const editingItem = reactive({
  id: null,
  product_name: '',
  quantity: 1,
  unit_price: 0,
  barcode: ''
});

const openEditItem = (item) => {
  editingItem.id = item.id;
  editingItem.product_name = item.product_name || '';
  editingItem.quantity = item.quantity || 1;
  editingItem.unit_price = item.unit_price || 0;
  editingItem.barcode = item.barcode || '';
  showItemModal.value = true;
};

const closeItemModal = () => {
  showItemModal.value = false;
  editingItem.id = null;
};

const saveItem = async () => {
  savingItem.value = true;
  try {
    await purchasesAPI.updateItem(route.params.id, editingItem.id, {
      product_name: editingItem.product_name,
      quantity: editingItem.quantity,
      unit_price: editingItem.unit_price,
      barcode: editingItem.barcode
    });
    await Swal.fire('Actualizado', 'Item actualizado correctamente', 'success');
    closeItemModal();
    await loadPurchase();
  } catch (e) {
    Swal.fire('Error', 'No se pudo actualizar el item', 'error');
  } finally {
    savingItem.value = false;
  }
};

const deleteItem = async (item) => {
  const result = await Swal.fire({
    title: '¿Eliminar item?',
    text: `Se eliminará "${item.product_name}" de la compra`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  });
  if (result.isConfirmed) {
    try {
      await purchasesAPI.deleteItem(route.params.id, item.id);
      await Swal.fire('Eliminado', 'Item eliminado correctamente', 'success');
      await loadPurchase();
    } catch (e) {
      Swal.fire('Error', 'No se pudo eliminar el item', 'error');
    }
  }
};

const handleSendToInventory = async () => {
  const result = await Swal.fire({
    title: '¿Enviar a inventario?',
    text: 'Los productos de esta compra serán añadidos al inventario y almacén',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, enviar',
    cancelButtonText: 'Cancelar'
  });
  if (result.isConfirmed) {
    sendingToInventory.value = true;
    try {
      const res = await purchasesAPI.sendToInventory(route.params.id);
      await Swal.fire('Procesado', `${res.data?.processed || 0} productos enviados a inventario`, 'success');
      await loadPurchase();
    } catch (e) {
      Swal.fire('Error', 'No se pudieron enviar los productos a inventario', 'error');
    } finally {
      sendingToInventory.value = false;
    }
  }
};

const handleCancel = async () => {
  const result = await Swal.fire({
    title: '¿Cancelar compra?',
    text: 'Esta acción revertirá el inventario',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No'
  });
  if (result.isConfirmed) {
    try {
      await purchasesAPI.cancel(route.params.id);
      await Swal.fire('Cancelada', 'La compra ha sido cancelada', 'success');
      await loadPurchase();
    } catch (e) {
      Swal.fire('Error', 'No se pudo cancelar la compra', 'error');
    }
  }
};

const loadPurchase = async () => {
  try {
    const res = await purchasesAPI.getById(route.params.id);
    purchase.value = res.data || {};
  } catch (e) {
    console.error('Error loading purchase:', e);
  }
};

onMounted(loadPurchase);
</script>

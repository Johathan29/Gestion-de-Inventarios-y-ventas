<template>
  <DetailSkeleton v-if="loading" />
  <div v-else class="max-w-5xl mx-auto" style="display: flex; flex-direction: column; gap: var(--aurora-gutter);">
    <!-- Cabecera -->
    <div class="aurora-raised-card">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between" style="gap: var(--aurora-base); margin-bottom: var(--aurora-md);">
        <div>
          <div class="flex items-center gap-3">
            <h2 style="margin-bottom: 0; font-size: 1.25rem; font-weight: 700; color: var(--aurora-on-surface);">
              Compra #{{ purchase.purchase_number || purchase.id?.substring(0, 8) }}
            </h2>
            <span class="aurora-badge"
              :class="purchase.status === 'received' ? 'aurora-badge-success' : purchase.status === 'cancelled' ? 'aurora-badge-danger' : 'aurora-badge-warning'">
              {{ purchase.status === 'received' ? 'Recibida' : purchase.status === 'cancelled' ? 'Cancelada' : 'Pendiente' }}
            </span>
            <span v-if="purchase.verification_status" class="aurora-badge"
              :class="{
                'aurora-badge-success': purchase.verification_status === 'verified',
                'aurora-badge-warning': purchase.verification_status === 'pending',
                'aurora-badge-primary': purchase.verification_status === 'in_review',
                'aurora-badge-danger': purchase.verification_status === 'rejected'
              }">
              <span class="w-1.5 h-1.5 rounded-full"
                :class="{
                  'bg-green-500': purchase.verification_status === 'verified',
                  'bg-yellow-500': purchase.verification_status === 'pending',
                  'bg-purple-500': purchase.verification_status === 'in_review',
                  'bg-red-500': purchase.verification_status === 'rejected'
                }" style="display: inline-block; margin-right: 0.375rem;"></span>
              {{ purchase.verification_status === 'verified' ? 'Verificada' : purchase.verification_status === 'pending' ? 'Pendiente' : purchase.verification_status === 'in_review' ? 'En Revisión' : 'Rechazada' }}
            </span>
          </div>
          <p style="color: var(--aurora-on-surface-variant); font-size: 0.875rem; margin-top: 0.25rem;">
            Creada el {{ formatDateTime(purchase.created_at) }}
            <template v-if="purchase.received_at">| Recibida el {{ formatDateTime(purchase.received_at) }}</template>
          </p>
        </div>
      </div>

      <!-- Info del Proveedor COMPLETA desde suppliers -->
      <div v-if="purchase.suppliers" class="aurora-pressed" style="border-radius: var(--aurora-radius-lg); padding: var(--aurora-base) var(--aurora-md); margin-bottom: var(--aurora-md);">
        <h3 style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--aurora-on-surface-variant); margin-bottom: var(--aurora-sm);">Proveedor</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Nombre</span>
            <span class="font-medium" style="color: var(--aurora-on-surface);">{{ purchase.suppliers.name || '-' }}</span>
          </div>
          <div>
            <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Contacto</span>
            <span>{{ purchase.suppliers.contact_name || '-' }}</span>
          </div>
          <div>
            <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">RUC/CI</span>
            <span style="font-family: 'JetBrains Mono', monospace;">{{ purchase.suppliers.tax_id || '-' }}</span>
          </div>
          <div>
            <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Teléfono</span>
            <span>{{ purchase.suppliers.phone || '-' }}</span>
          </div>
          <div>
            <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Email</span>
            <span>{{ purchase.suppliers.email || '-' }}</span>
          </div>
          <div>
            <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Ciudad</span>
            <span>{{ purchase.suppliers.city || '-' }}</span>
          </div>
          <div style="grid-column: span 2;">
            <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Dirección</span>
            <span>{{ purchase.suppliers.address || '-' }}</span>
          </div>
          <div v-if="purchase.suppliers.payment_terms">
            <span style="color: var(--aurora-on-surface-variant); display: block; font-size: 0.75rem;">Términos de pago</span>
            <span>{{ purchase.suppliers.payment_terms }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="purchase.supplier_name" style="margin-bottom: var(--aurora-md);">
        <p><span style="font-weight: 500; color: var(--aurora-on-surface-variant);">Proveedor:</span> {{ purchase.supplier_name }}</p>
      </div>

      <!-- Notas -->
      <div v-if="purchase.notes" class="aurora-pressed" style="border-radius: var(--aurora-radius-lg); padding: var(--aurora-sm); margin-bottom: var(--aurora-md); font-size: 0.875rem; color: var(--aurora-on-surface-variant);">
        <span class="font-medium">Notas:</span> {{ purchase.notes }}
      </div>

      <!-- Productos -->
      <h3 style="font-weight: 600; color: var(--aurora-on-surface); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <span class="material-symbols-outlined" style="color: var(--aurora-primary);">inventory_2</span>
        Productos ({{ purchase.purchase_items?.length || 0 }})
      </h3>

      <!-- Desktop -->
      <div class="hidden md:block overflow-x-auto">
        <table class="aurora-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU / Barra</th>
              <th style="text-align: right;">Cant.</th>
              <th style="text-align: right;">Verif.</th>
              <th style="text-align: right;">Rech.</th>
              <th style="text-align: right;">Costo U.</th>
              <th style="text-align: right;">Subtotal</th>
              <th style="text-align: right;">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in purchase.purchase_items || []" :key="item.id">
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg overflow-hidden" style="background: var(--aurora-surface-container); flex-shrink: 0;">
                    <img v-if="item.product_image" :src="item.product_image" class="w-full h-full object-cover" alt="" />
                    <span v-else class="flex items-center justify-center h-full" style="color: var(--aurora-on-surface-variant);">
                      <span class="material-symbols-outlined text-lg">inventory_2</span>
                    </span>
                  </div>
                  <div>
                    <p class="font-medium" style="color: var(--aurora-on-surface);">{{ item.product_name }}</p>
                    <p v-if="item.products?.name && item.products.name !== item.product_name" style="font-size: 0.75rem; color: var(--aurora-on-surface-variant);">
                      {{ item.products.name }}
                    </p>
                  </div>
                </div>
              </td>
              <td>
                <div style="font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; color: var(--aurora-on-surface-variant);">
                  <div v-if="item.sku">SKU: {{ item.sku }}</div>
                  <div v-if="item.barcode || item.products?.barcode" class="flex items-center gap-1 mt-0.5">
                    <span class="material-symbols-outlined" style="font-size: 0.75rem;">qr_code_scanner</span>
                    {{ item.barcode || item.products?.barcode }}
                  </div>
                </div>
              </td>
              <td style="text-align: right; font-weight: 500;">{{ item.quantity }}</td>
              <td style="text-align: right;">
                <span v-if="item.verified_qty != null" style="color: #16a34a; font-weight: 500;">{{ item.verified_qty }}</span>
                <span v-else style="color: var(--aurora-outline);">—</span>
              </td>
              <td style="text-align: right;">
                <span v-if="item.rejected_qty > 0" style="color: #dc2626; font-weight: 500;">{{ item.rejected_qty }}</span>
                <span v-else style="color: var(--aurora-outline);">—</span>
              </td>
              <td style="text-align: right;">{{ formatTable(item.unit_price) }}</td>
              <td style="text-align: right; font-weight: 500; color: var(--aurora-primary);">
                {{ formatTable((item.quantity || 0) * (item.unit_price || 0)) }}
              </td>
              <td style="text-align: right;">
                <div class="flex items-center gap-1 justify-end">
                  <button @click="openEditItem(item)" class="aurora-btn-icon" title="Editar" style="width: 32px; height: 32px;">
                    <span class="material-symbols-outlined" style="font-size: 1.125rem;">edit</span>
                  </button>
                  <button @click="deleteItem(item)" class="aurora-btn-icon danger" title="Eliminar" style="width: 32px; height: 32px;">
                    <span class="material-symbols-outlined" style="font-size: 1.125rem;">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="md:hidden" style="display: flex; flex-direction: column; gap: var(--aurora-sm);">
        <div v-for="item in purchase.purchase_items || []" :key="item.id"
          class="aurora-raised-card" style="padding: var(--aurora-sm);">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-lg overflow-hidden" style="background: var(--aurora-surface-container); flex-shrink: 0;">
              <img v-if="item.product_image" :src="item.product_image" class="w-full h-full object-cover" alt="" />
              <span v-else class="flex items-center justify-center h-full" style="color: var(--aurora-on-surface-variant);">
                <span class="material-symbols-outlined">inventory_2</span>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold truncate" style="color: var(--aurora-on-surface);">{{ item.product_name }}</p>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem; font-size: 0.75rem; color: var(--aurora-on-surface-variant);">
                <span v-if="item.sku" style="font-family: 'JetBrains Mono', monospace;">SKU: {{ item.sku }}</span>
                <span v-if="item.barcode || item.products?.barcode" style="font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 0.25rem;">
                  <span class="material-symbols-outlined" style="font-size: 0.75rem;">qr_code_scanner</span>
                  {{ item.barcode || item.products?.barcode }}
                </span>
              </div>
              <div class="flex justify-between items-center mt-2 text-sm">
                <span>{{ item.quantity }} x {{ formatTable(item.unit_price) }}</span>
                <span class="font-bold" style="color: var(--aurora-primary);">
                  {{ formatTable((item.quantity || 0) * (item.unit_price || 0)) }}
                </span>
              </div>
              <div v-if="item.verified_qty != null || item.rejected_qty > 0" class="flex gap-3 mt-1 text-xs">
                <span v-if="item.verified_qty != null" style="color: #16a34a;">✓ Verif: {{ item.verified_qty }}</span>
                <span v-if="item.rejected_qty > 0" style="color: #dc2626;">✗ Rech: {{ item.rejected_qty }}</span>
              </div>
              <div class="flex gap-2 mt-2 pt-2" style="border-top: 1px solid var(--aurora-outline-variant);">
                <button @click="openEditItem(item)" class="text-xs flex items-center gap-1" style="color: var(--aurora-primary);">
                  <span class="material-symbols-outlined text-sm">edit</span> Editar
                </button>
                <button @click="deleteItem(item)" class="text-xs flex items-center gap-1" style="color: #dc2626;">
                  <span class="material-symbols-outlined text-sm">delete</span> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Totales con desglose -->
      <div class="flex justify-end" style="margin-top: var(--aurora-md); padding-top: var(--aurora-base); border-top: 1px solid var(--aurora-outline-variant);">
        <div style="text-align: right; display: flex; flex-direction: column; gap: 0.25rem; width: 16rem;">
          <div class="flex justify-between text-sm" style="color: var(--aurora-on-surface-variant);">
            <span>Subtotal</span>
            <span>{{ format(purchase.subtotal) }}</span>
          </div>
          <div class="flex justify-between text-sm" style="color: var(--aurora-on-surface-variant);">
            <span>IVA (19%)</span>
            <span>{{ format(purchase.tax) }}</span>
          </div>
          <div v-if="purchase.discount" class="flex justify-between text-sm" style="color: #dc2626;">
            <span>Descuento</span>
            <span>-{{ format(purchase.discount) }}</span>
          </div>
          <div class="flex justify-between text-lg font-bold pt-1" style="color: var(--aurora-on-surface); border-top: 1px solid var(--aurora-outline-variant);">
            <span>Total</span>
            <span style="color: var(--aurora-primary);">{{ format(purchase.total) }}</span>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div style="display: flex; flex-wrap: wrap; gap: var(--aurora-sm); margin-top: var(--aurora-md); padding-top: var(--aurora-base); border-top: 1px solid var(--aurora-outline-variant);">
        <router-link to="/app/purchases" class="aurora-btn-secondary">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">arrow_back</span> Volver
        </router-link>

        <button v-if="purchase.status === 'pending' || purchase.status === 'approved'"
                @click="handleSendToInventory"
                :disabled="sendingToInventory"
                class="aurora-btn-primary">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">inventory</span>
          {{ sendingToInventory ? 'Enviando...' : 'Enviar a Inventario' }}
        </button>

        <button v-if="purchase.verification_status === 'pending' || purchase.verification_status === 'in_review'"
                @click="openVerifyModal"
                class="aurora-btn-primary" style="background: var(--aurora-tertiary-container); box-shadow: 4px 4px 10px rgba(147,111,0,0.3), inset -2px -2px 4px rgba(0,0,0,0.1);">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">fact_check</span>
          Verificar
        </button>

        <button v-if="purchase.status !== 'cancelled' && purchase.status !== 'received'"
                @click="handleCancel"
                class="aurora-btn-secondary" style="color: #dc2626; border-color: #dc2626;">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">cancel</span> Cancelar Compra
        </button>
      </div>
    </div>

    <!-- Item Edit Modal -->
    <Teleport to="body">
      <div v-if="showItemModal" class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5);" @click.self="closeItemModal">
        <div class="aurora-raised-card" style="width: 100%; max-width: 28rem; margin: 0 var(--aurora-base);">
          <h3 style="font-weight: 600; color: var(--aurora-on-surface); margin-bottom: var(--aurora-base);">Editar Item</h3>
          <div style="display: flex; flex-direction: column; gap: var(--aurora-base);">
            <div>
              <label style="display: block; font-size: 0.875rem; font-weight: 500; color: var(--aurora-on-surface); margin-bottom: 0.25rem;">Nombre del Producto</label>
              <input v-model="editingItem.product_name" class="aurora-input" />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--aurora-base);">
              <div>
                <label style="display: block; font-size: 0.875rem; font-weight: 500; color: var(--aurora-on-surface); margin-bottom: 0.25rem;">Cantidad</label>
                <input v-model.number="editingItem.quantity" type="number" min="1" class="aurora-input" />
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; font-weight: 500; color: var(--aurora-on-surface); margin-bottom: 0.25rem;">Costo Unitario</label>
                <input v-model.number="editingItem.unit_price" type="number" step="0.01" min="0" class="aurora-input" />
              </div>
            </div>
            <div>
              <label style="display: block; font-size: 0.875rem; font-weight: 500; color: var(--aurora-on-surface); margin-bottom: 0.25rem;">Código de Barras</label>
              <input v-model="editingItem.barcode" class="aurora-input" style="font-family: 'JetBrains Mono', monospace;" />
            </div>
          </div>
          <div class="flex justify-end" style="gap: var(--aurora-sm); margin-top: var(--aurora-md); padding-top: var(--aurora-base); border-top: 1px solid var(--aurora-outline-variant);">
            <button @click="closeItemModal" class="aurora-btn-secondary">Cancelar</button>
            <button @click="saveItem" :disabled="savingItem" class="aurora-btn-primary">
              {{ savingItem ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Verification Modal -->
    <Teleport to="body">
      <div v-if="showVerifyModal" class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);" @click.self="showVerifyModal = false">
        <div class="aurora-raised-card" style="width: 100%; max-width: 42rem; margin: 0 var(--aurora-base); max-height: 90vh; overflow-y: auto;">
          <div class="flex items-center justify-between" style="margin-bottom: var(--aurora-md);">
            <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--aurora-on-surface);">
              Verificar Compra #{{ purchase.purchase_number || purchase.id?.substring(0, 8) }}
            </h3>
            <button @click="showVerifyModal = false" class="aurora-btn-icon">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--aurora-base); margin-bottom: var(--aurora-md);">
            <div v-for="(item, index) in verifyItems" :key="item.item_id"
              class="aurora-pressed" style="border-radius: var(--aurora-radius-lg); padding: var(--aurora-base);" :style="{ borderLeft: (item.rejected_qty > 0 ? '4px solid #dc2626' : '4px solid transparent') }">
              <div class="flex items-start justify-between" style="margin-bottom: var(--aurora-sm);">
                <div>
                  <p class="font-medium text-sm" style="color: var(--aurora-on-surface);">{{ item.product_name }}</p>
                  <p style="font-size: 0.75rem; color: var(--aurora-on-surface-variant);">Cantidad recibida: {{ item.quantity }}</p>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--aurora-sm);">
                <div>
                  <label style="display: block; font-size: 0.75rem; font-weight: 500; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Cantidad Verificada</label>
                  <input type="number" v-model.number="item.verified_qty" min="0" :max="item.quantity"
                    class="aurora-input" style="padding: 8px 12px;"
                    @input="onVerifyQtyChange(index, 'verified')" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.75rem; font-weight: 500; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Cantidad Rechazada</label>
                  <input type="number" v-model.number="item.rejected_qty" min="0" :max="item.quantity"
                    class="aurora-input" style="padding: 8px 12px;"
                    @input="onVerifyQtyChange(index, 'rejected')" />
                </div>
              </div>
              <div v-if="item.rejected_qty > 0" class="mt-2">
                <label style="display: block; font-size: 0.75rem; font-weight: 500; color: var(--aurora-on-surface-variant); margin-bottom: 0.25rem;">Motivo del Rechazo</label>
                <input type="text" v-model="item.rejected_reason" placeholder="Ej: Producto dañado, cantidad incorrecta..."
                  class="aurora-input" style="padding: 8px 12px;" />
              </div>
            </div>
          </div>

          <div class="flex justify-end" style="gap: var(--aurora-sm); padding-top: var(--aurora-base); border-top: 1px solid var(--aurora-outline-variant);">
            <button @click="showVerifyModal = false" class="aurora-btn-secondary">Cancelar</button>
            <button @click="confirmVerification" :disabled="verifying" class="aurora-btn-primary">
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
import { useRoute, useRouter } from 'vue-router';
import { purchasesAPI } from '../../api';
import DetailSkeleton from '../../components/skeletons/DetailSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';
import { useCurrency } from '../../composables/useCurrency';
import { formatDateTime } from '../../utils';

const { format, formatTable } = useCurrency();
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
  } finally {
    loading.value = false;
  }
};

// Verification
const showVerifyModal = ref(false);
const verifying = ref(false);
const verifyItems = ref([]);

const onVerifyQtyChange = (index, changed) => {
  const item = verifyItems.value[index];
  if (changed === 'verified') {
    item.rejected_qty = Math.max(0, item.quantity - item.verified_qty);
  } else {
    item.verified_qty = Math.max(0, item.quantity - item.rejected_qty);
  }
};

const openVerifyModal = () => {
  verifyItems.value = (purchase.value.purchase_items || []).map(item => ({
    item_id: item.id,
    product_name: item.product_name,
    quantity: item.quantity,
    verified_qty: item.verified_qty || item.quantity,
    rejected_qty: item.rejected_qty || 0,
    rejected_reason: item.rejected_reason || ''
  }));
  showVerifyModal.value = true;
};

const confirmVerification = async () => {
  verifying.value = true;
  try {
    const items = verifyItems.value.map(item => ({
      item_id: item.item_id,
      verified_qty: item.verified_qty,
      rejected_qty: item.rejected_qty,
      rejected_reason: item.rejected_reason || null
    }));

    await purchasesAPI.verify(route.params.id, { items });
    showVerifyModal.value = false;
    await Swal.fire('Verificada', 'La compra ha sido verificada exitosamente', 'success');
    await loadPurchase();
  } catch (e) {
    Swal.fire('Error', 'No se pudo verificar la compra', 'error');
  } finally {
    verifying.value = false;
  }
};

onMounted(loadPurchase);
</script>

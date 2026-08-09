<template>
  <div class="px-gutter">
    <!-- Header -->
      <div
        class="mesh-gradient-header"
        style="
          background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
        "
      >
        <div class="header-icon-container">
          <span class="material-symbols-outlined animate-header-icon"> local_shipping </span>
        </div>
        <div class="header-glass">
          <div class="header-information">
            <PageHeader
              title="Proveedores"
              :description="`${suppliers.length} proveedor${suppliers.length !== 1 ? 'es' : ''} registrados`"
              tag="h1"
            />
          </div>
          <div class="header-actions">
            <button @click="openModal(null)" class="aurora-header-button aurora-header-button-primary">
              <span class="material-symbols-outlined"> add </span>
              Nuevo Proveedor
            </button>
          </div>
        </div>
      </div>
  

    <!-- Desktop Table -->
    <div class="hidden md:block">
      <div class="aurora-raised-card !p-0 overflow-hidden">
        <!-- Filter/Sort Bar -->
        <div class="flex items-center justify-between p-md border-b" style="border-color: var(--aurora-outline-variant);">
          <div class="flex gap-2">
            <button @click="showFilters = !showFilters"
              class="aurora-btn-secondary"
              :class="{ 'aurora-pressed': showFilters }"
              style="padding: 8px 12px; font-size: 0.8rem;">
              <span class="material-symbols-outlined" style="font-size: 1rem;">filter_list</span>
              Filtrar
            </button>
          </div>
          <div class="relative">
            <input v-model="search" @input="fetchSuppliers" type="text" placeholder="Buscar proveedor..."
              class="aurora-search" />
          </div>
        </div>
        <DataTableSkeleton v-if="loading" />
        <DataTable v-else :columns="supplierColumns" :data="suppliers" :server-pagination="true" :total="totalPages * limit" :current-page-prop="page" :per-page="limit" empty-message="No hay proveedores registrados" @page-change="changePage">
          <template #cell-name="{ row }">
            <p class="text-sm font-semibold text-on-surface">{{ row.name }}</p>
            <p v-if="row.city" class="text-xs text-on-surface-variant">{{ row.city }}</p>
          </template>
          <template #cell-contact_name="{ row }">
            <span class="text-on-surface-variant">{{ row.contact_name || '—' }}</span>
          </template>
          <template #cell-phone="{ row }">
            <span class="text-on-surface-variant">{{ row.phone || '—' }}</span>
          </template>
          <template #cell-email="{ row }">
            <span class="text-on-surface-variant">{{ row.email || '—' }}</span>
          </template>
          <template #cell-tax_id="{ row }">
            <span class="text-on-surface-variant">{{ row.tax_id || '—' }}</span>
          </template>
          <template #cell-status="{ row }">
            <span class="aurora-badge" :class="row.is_active ? 'aurora-badge-success' : ''" :style="!row.is_active ? 'background: var(--aurora-surface-container); color: var(--aurora-on-surface-variant);' : ''">
              {{ row.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </template>
          <template #actions="{ row }">
            <button @click="openModal(row)" class="aurora-btn-icon" title="Editar">
              <span class="material-icons-outlined" style="font-size: 1.25rem;">edit</span>
            </button>
            <button @click="confirmDelete(row)" class="aurora-btn-icon" title="Eliminar" style="color: var(--aurora-error, #dc2626);">
              <span class="material-icons-outlined" style="font-size: 1.25rem;">delete</span>
            </button>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-3">
      <CardGridSkeleton v-if="loading" />
      <template v-else>
        <div v-for="s in suppliers" :key="s.id"
          class="aurora-raised-card">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-semibold text-on-surface">{{ s.name }}</p>
              <p v-if="s.contact_name" class="text-xs text-on-surface-variant mt-0.5">Contacto: {{ s.contact_name }}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <span v-if="s.phone" class="text-xs text-on-surface-variant flex items-center gap-1">
                  <span class="material-icons-outlined" style="font-size: 0.75rem;">phone</span> {{ s.phone }}
                </span>
                <span v-if="s.email" class="text-xs text-on-surface-variant flex items-center gap-1">
                  <span class="material-icons-outlined" style="font-size: 0.75rem;">email</span> {{ s.email }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <span class="aurora-badge mr-2" :class="s.is_active ? 'aurora-badge-success' : ''" :style="!s.is_active ? 'background: var(--aurora-surface-container); color: var(--aurora-on-surface-variant);' : ''">
                {{ s.is_active ? 'Activo' : 'Inactivo' }}
              </span>
              <button @click="openModal(s)" class="aurora-btn-icon" title="Editar">
                <span class="material-icons-outlined text-lg">edit</span>
              </button>
              <button @click="confirmDelete(s)" class="aurora-btn-icon" title="Eliminar" style="color: var(--aurora-error, #dc2626);">
                <span class="material-icons-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal Create/Edit -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="closeModal">
        <div class="aurora-raised-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between p-md pb-0">
            <div class="flex items-center gap-2">
              <span class="material-icons-outlined" style="color: var(--aurora-primary); font-size: 1.25rem;">local_shipping</span>
              <h3 class="text-lg font-semibold text-on-surface">
                {{ editingId ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
              </h3>
            </div>
            <button @click="closeModal" class="aurora-btn-icon text-on-surface-variant">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>
          <form @submit.prevent="saveSupplier" class="p-md flex flex-col gap-gutter">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div class="md:col-span-2">
                <label class="block mb-1 font-medium text-sm text-on-surface">Nombre *</label>
                <input v-model="form.name" class="aurora-input w-full" placeholder="Nombre del proveedor" required />
              </div>
              <div>
                <label class="block mb-1 font-medium text-sm text-on-surface">Contacto</label>
                <input v-model="form.contact_name" class="aurora-input w-full" placeholder="Nombre del contacto" />
              </div>
              <div>
                <label class="block mb-1 font-medium text-sm text-on-surface">RUC/CI</label>
                <input v-model="form.tax_id" class="aurora-input w-full font-mono" placeholder="RUC o cédula" />
              </div>
              <div>
                <label class="block mb-1 font-medium text-sm text-on-surface">Teléfono</label>
                <input v-model="form.phone" class="aurora-input w-full font-mono" placeholder="Teléfono" />
              </div>
              <div>
                <label class="block mb-1 font-medium text-sm text-on-surface">Email</label>
                <input v-model="form.email" type="email" class="aurora-input w-full" placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label class="block mb-1 font-medium text-sm text-on-surface">Ciudad</label>
                <input v-model="form.city" class="aurora-input w-full" placeholder="Ciudad" />
              </div>
              <div class="md:col-span-2">
                <label class="block mb-1 font-medium text-sm text-on-surface">Dirección</label>
                <input v-model="form.address" class="aurora-input w-full" placeholder="Dirección" />
              </div>
              <div class="md:col-span-2">
                <label class="block mb-1 font-medium text-sm text-on-surface">Términos de pago</label>
                <input v-model="form.payment_terms" class="aurora-input w-full" placeholder="Ej: 30 días, contado, etc." />
              </div>
              <div class="md:col-span-2">
                <label class="block mb-1 font-medium text-sm text-on-surface">Notas</label>
                <textarea v-model="form.notes" rows="2" class="aurora-input w-full resize-none" placeholder="Notas adicionales"></textarea>
              </div>
            </div>

            <div v-if="formError" class="p-3 rounded-lg text-sm" style="background: #fef2f2; color: #dc2626;">
              {{ formError }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="closeModal" class="aurora-btn-icon text-on-surface-variant">
                Cancelar
              </button>
              <button type="submit" :disabled="saving" class="aurora-btn-primary">
                {{ saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear Proveedor') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Delete -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="showDeleteConfirm = false">
        <div class="aurora-raised-card w-full max-w-md">
          <div class="text-center">
            <span class="material-icons-outlined text-5xl mb-3" style="color: var(--aurora-error, #dc2626);">warning</span>
            <h3 class="text-lg font-semibold text-on-surface mb-0">¿Eliminar proveedor?</h3>
            <p class="text-sm text-on-surface-variant">Se eliminará <strong>{{ deletingSupplier?.name }}</strong>. Esta acción no se puede deshacer si no tiene compras asociadas.</p>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button @click="showDeleteConfirm = false" class="aurora-btn-icon text-on-surface-variant">
              Cancelar
            </button>
            <button @click="deleteSupplier" :disabled="deleting" class="aurora-btn-primary" style="background: var(--aurora-error, #dc2626);">
              {{ deleting ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { suppliersAPI } from '../../api';
import DataTableSkeleton from '../../components/skeletons/DataTableSkeleton.vue';
import CardGridSkeleton from '../../components/skeletons/CardGridSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';
import DataTable from '../../components/shared/DataTable.vue';
import PageHeader from '../../components/shared/PageHeader.vue';
import { useToast } from '../../composables/useToast';

const toast = useToast();
const suppliers = ref([]);
const loading = ref(true);
const search = ref('');
const showFilters = ref(false);
const page = ref(1);
const totalPages = ref(1);
const limit = 15;

const supplierColumns = [
  { key: 'name', label: 'Nombre' },
  { key: 'contact_name', label: 'Contacto' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Email' },
  { key: 'tax_id', label: 'RUC/CI' },
  { key: 'status', label: 'Estado' }
];

// Modal form
const showModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const formError = ref('');
const form = ref({
  name: '', contact_name: '', email: '', phone: '',
  address: '', city: '', tax_id: '', payment_terms: '', notes: ''
});

// Delete confirm
const showDeleteConfirm = ref(false);
const deletingSupplier = ref(null);
const deleting = ref(false);

const fetchSuppliers = async () => {
  loading.value = true;
  try {
    const res = await suppliersAPI.getAll({ page: page.value, limit, search: search.value });
    suppliers.value = res.data || [];
    totalPages.value = res.pagination?.totalPages || 1;
  } catch (e) {
    suppliers.value = [];
  } finally {
    loading.value = false;
  }
};

const changePage = (p) => {
  page.value = p;
  fetchSuppliers();
};

const openModal = (supplier) => {
  if (supplier) {
    editingId.value = supplier.id;
    form.value = {
      name: supplier.name || '',
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      tax_id: supplier.tax_id || '',
      payment_terms: supplier.payment_terms || '',
      notes: supplier.notes || ''
    };
  } else {
    editingId.value = null;
    form.value = { name: '', contact_name: '', email: '', phone: '', address: '', city: '', tax_id: '', payment_terms: '', notes: '' };
  }
  formError.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingId.value = null;
  formError.value = '';
};

const saveSupplier = async () => {
  if (!form.value.name.trim()) {
    formError.value = 'El nombre es requerido';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    if (editingId.value) {
      await suppliersAPI.update(editingId.value, form.value);
      toast.success('Proveedor actualizado correctamente');
    } else {
      await suppliersAPI.create(form.value);
      toast.success('Proveedor creado correctamente');
    }
    closeModal();
    fetchSuppliers();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Error al guardar proveedor';
    toast.error(formError.value);
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (supplier) => {
  deletingSupplier.value = supplier;
  showDeleteConfirm.value = true;
};

const deleteSupplier = async () => {
  if (!deletingSupplier.value) return;
  deleting.value = true;
  try {
    await suppliersAPI.delete(deletingSupplier.value.id);
    showDeleteConfirm.value = false;
    deletingSupplier.value = null;
    fetchSuppliers();
    toast.success('Proveedor eliminado');
  } catch (err) {
    toast.error(err.response?.data?.error?.message || 'Error al eliminar proveedor');
  } finally {
    deleting.value = false;
  }
};

onMounted(fetchSuppliers);
</script>

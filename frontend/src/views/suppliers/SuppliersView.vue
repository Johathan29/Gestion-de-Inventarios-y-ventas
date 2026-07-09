<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Proveedores</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
          {{ suppliers.length }} proveedor{{ suppliers.length !== 1 ? 'es' : '' }} registrados
        </p>
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <button @click="openModal(null)"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
          style="background: #624200; color: white; border-color: rgba(139,94,0,0.2); font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5;">
          <span class="material-icons-outlined" style="font-size: 1.25rem;">add</span>
          Nuevo Proveedor
        </button>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="hidden md:block">
      <div class="dt-card overflow-hidden">
        <!-- Filter/Sort Bar -->
        <div class="filter-bar-container p-4 border-b border-[#d2c4b4]/30 flex justify-between items-center" style="background: #ffffff;">
          <div class="flex gap-2">
            <button @click="showFilters = !showFilters"
              class="px-3 py-1.5 text-sm font-medium border border-[#d2c4b4] rounded-md flex items-center gap-1 hover:bg-[#eff4ff] transition-colors bg-white relative"
              :class="{ 'ring-2 ring-[rgba(98,66,0,0.2)] border-[#624200]': showFilters }"
              style="font-family: 'Inter', sans-serif; color: #4f4539;">
              <span class="material-icons-outlined" style="font-size: 1rem;">filter_list</span>
              Filtrar
            </button>
          </div>
          <div class="relative">
            <div class="flex items-center bg-white border border-[#d2c4b4] rounded-full px-4 py-1.5 focus-within:border-[#624200] focus-within:ring-2 focus-within:ring-[rgba(98,66,0,0.2)] transition-all">
              <span class="material-icons-outlined" style="color: #d2c4b4; margin-right: 0.5rem; font-size: 1rem;">search</span>
              <input v-model="search" @input="fetchSuppliers" type="text" placeholder="Buscar proveedor..."
                class="bg-transparent border-none focus:ring-0 outline-none text-sm"
                style="font-family: 'Inter', sans-serif; color: #0b1c30;" />
            </div>
          </div>
        </div>
        <Loading v-if="loading" />
        <DataTable v-else :columns="supplierColumns" :data="suppliers" :server-pagination="true" :total="totalPages * limit" :current-page-prop="page" :per-page="limit" empty-message="No hay proveedores registrados" @page-change="changePage">
          <template #cell-name="{ row }">
            <p class="text-sm font-semibold" style="color: #0b1c30;">{{ row.name }}</p>
            <p v-if="row.city" class="text-xs" style="color: #817567;">{{ row.city }}</p>
          </template>
          <template #cell-contact_name="{ row }">
            <span style="color: #4f4539;">{{ row.contact_name || '—' }}</span>
          </template>
          <template #cell-phone="{ row }">
            <span style="color: #4f4539;">{{ row.phone || '—' }}</span>
          </template>
          <template #cell-email="{ row }">
            <span style="color: #4f4539;">{{ row.email || '—' }}</span>
          </template>
          <template #cell-tax_id="{ row }">
            <span style="color: #4f4539;">{{ row.tax_id || '—' }}</span>
          </template>
          <template #cell-status="{ row }">
            <span class="dt-badge" :class="row.is_active ? 'dt-badge-success' : 'dt-badge-neutral'">
              {{ row.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </template>
          <template #actions="{ row }">
            <button @click="openModal(row)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Editar" style="color: #4f4539; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; e.currentTarget.style.color = '#624200'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4f4539'; }">
              <span class="material-icons-outlined" style="font-size: 1.25rem;">edit</span>
            </button>
            <button @click="confirmDelete(row)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Eliminar" style="color: #dc2626; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#dc2626'; }">
              <span class="material-icons-outlined" style="font-size: 1.25rem;">delete</span>
            </button>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-3">
      <Loading v-if="loading" />
      <template v-else>
        <div v-for="s in suppliers" :key="s.id"
          class="dt-card-sm p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-semibold" style="color: #0b1c30;">{{ s.name }}</p>
              <p v-if="s.contact_name" class="text-xs text-gray-500 mt-0.5">Contacto: {{ s.contact_name }}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <span v-if="s.phone" class="text-xs text-gray-400 flex items-center gap-1">
                  <span class="material-icons-outlined text-xs">phone</span> {{ s.phone }}
                </span>
                <span v-if="s.email" class="text-xs text-gray-400 flex items-center gap-1">
                  <span class="material-icons-outlined text-xs">email</span> {{ s.email }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <span class="dt-badge mr-2" :class="s.is_active ? 'dt-badge-success' : 'dt-badge-neutral'">
                {{ s.is_active ? 'Activo' : 'Inactivo' }}
              </span>
              <button @click="openModal(s)"
                class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200"
                title="Editar" style="color: #4f4539; background: transparent; border: none; cursor: pointer;"
                @mouseenter="e => { e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; e.currentTarget.style.color = '#624200'; }"
                @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4f4539'; }">
                <span class="material-icons-outlined text-lg">edit</span>
              </button>
              <button @click="confirmDelete(s)"
                class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200"
                title="Eliminar" style="color: #dc2626; background: transparent; border: none; cursor: pointer;"
                @mouseenter="e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }"
                @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#dc2626'; }">
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
        <div class="bg-white rounded-[16px] w-full max-w-lg max-h-[90vh] overflow-y-auto" style="box-shadow: 0px 4px 20px rgba(98,66,0,0.05); border: 1px solid #d2c4b4/30;">
          <div class="flex items-center justify-between px-6 pt-6 pb-0">
            <div class="flex items-center gap-2">
              <span class="material-icons-outlined" style="color: #624200; font-size: 1.25rem;">local_shipping</span>
              <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: #0b1c30;">
                {{ editingId ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
              </h3>
            </div>
            <button @click="closeModal" class="p-2 rounded-lg transition-colors" style="color: #4f4539;" @mouseenter="e => { e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; }" @mouseleave="e => { e.currentTarget.style.background = ''; }">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>
          <form @submit.prevent="saveSupplier" class="p-6 flex flex-col gap-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Nombre *</label>
                <input v-model="form.name"
                  class="w-full rounded-lg px-3 py-2.5 transition-all"
                  style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                  placeholder="Nombre del proveedor" required
                  @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                  @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              </div>
              <div>
                <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Contacto</label>
                <input v-model="form.contact_name"
                  class="w-full rounded-lg px-3 py-2.5 transition-all"
                  style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                  placeholder="Nombre del contacto"
                  @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                  @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              </div>
              <div>
                <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">RUC/CI</label>
                <input v-model="form.tax_id"
                  class="w-full rounded-lg px-3 py-2.5 transition-all"
                  style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                  placeholder="RUC o cédula"
                  @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                  @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              </div>
              <div>
                <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Teléfono</label>
                <input v-model="form.phone"
                  class="w-full rounded-lg px-3 py-2.5 transition-all"
                  style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                  placeholder="Teléfono"
                  @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                  @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              </div>
              <div>
                <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Email</label>
                <input v-model="form.email" type="email"
                  class="w-full rounded-lg px-3 py-2.5 transition-all"
                  style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                  placeholder="correo@ejemplo.com"
                  @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                  @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              </div>
              <div>
                <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Ciudad</label>
                <input v-model="form.city"
                  class="w-full rounded-lg px-3 py-2.5 transition-all"
                  style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                  placeholder="Ciudad"
                  @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                  @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              </div>
              <div class="md:col-span-2">
                <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Dirección</label>
                <input v-model="form.address"
                  class="w-full rounded-lg px-3 py-2.5 transition-all"
                  style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                  placeholder="Dirección"
                  @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                  @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              </div>
              <div class="md:col-span-2">
                <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Términos de pago</label>
                <input v-model="form.payment_terms"
                  class="w-full rounded-lg px-3 py-2.5 transition-all"
                  style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                  placeholder="Ej: 30 días, contado, etc."
                  @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                  @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              </div>
              <div class="md:col-span-2">
                <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Notas</label>
                <textarea v-model="form.notes" rows="2"
                  class="w-full rounded-lg px-3 py-2.5 transition-all"
                  style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                  placeholder="Notas adicionales"
                  @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                  @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }"></textarea>
              </div>
            </div>

            <div v-if="formError" class="p-3" style="background: #fee2e2; color: #991b1b; border-radius: 0.5rem; font-size: 0.875rem;">
              {{ formError }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="closeModal"
                class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
                style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
                @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
                @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Cancelar</button>
              <button type="submit" :disabled="saving"
                class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
                style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
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
        <div class="bg-white rounded-2xl w-full max-w-md p-6" style="box-shadow: 0px 12px 48px rgba(98, 66, 0, 0.16);">
          <div class="text-center">
            <span class="material-icons-outlined text-5xl text-red-400 mb-3">warning</span>
            <h3 class="dt-headline-sm" style="margin-bottom: 0;">¿Eliminar proveedor?</h3>
            <p class="text-sm text-gray-500">Se eliminará <strong>{{ deletingSupplier?.name }}</strong>. Esta acción no se puede deshacer si no tiene compras asociadas.</p>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button @click="showDeleteConfirm = false"
              class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
              style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
              @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
              @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Cancelar</button>
            <button @click="deleteSupplier" :disabled="deleting"
              class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
              style="border-color: #ef4444; color: #ef4444; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
              @mouseenter="e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#dc2626'; }"
              @mouseleave="e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = '#ef4444'; }">
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
import Loading from '../../components/shared/Loading.vue';
import DataTable from '../../components/shared/DataTable.vue';

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
    } else {
      await suppliersAPI.create(form.value);
    }
    closeModal();
    fetchSuppliers();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Error al guardar proveedor';
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
  } catch (err) {
    alert(err.response?.data?.error?.message || 'Error al eliminar proveedor');
  } finally {
    deleting.value = false;
  }
};

onMounted(fetchSuppliers);
</script>

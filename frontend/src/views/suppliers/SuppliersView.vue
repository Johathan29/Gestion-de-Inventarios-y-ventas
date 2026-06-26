<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Proveedores</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ suppliers.length }} proveedor{{ suppliers.length !== 1 ? 'es' : '' }} registrados
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative">
          <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
          <input v-model="search" @input="fetchSuppliers" type="text" placeholder="Buscar proveedor..."
            class="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-56" />
        </div>
        <button @click="openModal(null)"
          class="btn-primary px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-primary-600 text-white font-medium text-sm hover:from-purple-700 hover:to-primary-700 transition-all duration-300 shadow-lg shadow-purple-600/20 flex items-center gap-2">
          <span class="material-icons-outlined text-lg">add</span>
          Nuevo Proveedor
        </button>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="hidden md:block">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Loading v-if="loading" />
        <table v-else class="w-full">
          <thead>
            <tr class="bg-gray-50 dark:bg-gray-700/50">
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contacto</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teléfono</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">RUC/CI</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
              <th class="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="s in suppliers" :key="s.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td class="px-5 py-4">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ s.name }}</p>
                <p v-if="s.city" class="text-xs text-gray-400">{{ s.city }}</p>
              </td>
              <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ s.contact_name || '—' }}</td>
              <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ s.phone || '—' }}</td>
              <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ s.email || '—' }}</td>
              <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ s.tax_id || '—' }}</td>
              <td class="px-5 py-4">
                <span class="inline-flex px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="s.is_active
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
                  {{ s.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openModal(s)"
                    class="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
                    <span class="material-icons-outlined text-lg">edit</span>
                  </button>
                  <button @click="confirmDelete(s)"
                    class="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <span class="material-icons-outlined text-lg">delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="suppliers.length === 0">
              <td colspan="7" class="px-5 py-16 text-center">
                <span class="material-icons-outlined text-5xl text-gray-300 dark:text-gray-600 block mb-3">local_shipping</span>
                <p class="text-gray-500 dark:text-gray-400">No hay proveedores registrados</p>
                <button @click="openModal(null)" class="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium">
                  + Crear primer proveedor
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <p class="text-xs text-gray-500">Página {{ page }} de {{ totalPages }}</p>
        <div class="flex gap-2">
          <button :disabled="page <= 1" @click="changePage(page - 1)"
            class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">Anterior</button>
          <button :disabled="page >= totalPages" @click="changePage(page + 1)"
            class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">Siguiente</button>
        </div>
      </div>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-3">
      <Loading v-if="loading" />
      <template v-else>
        <div v-for="s in suppliers" :key="s.id"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ s.name }}</p>
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
              <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full mr-2"
                :class="s.is_active
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
                {{ s.is_active ? 'Activo' : 'Inactivo' }}
              </span>
              <button @click="openModal(s)"
                class="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                <span class="material-icons-outlined text-lg">edit</span>
              </button>
              <button @click="confirmDelete(s)"
                class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
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
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ editingId ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
            </h3>
            <button @click="closeModal" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <span class="material-icons-outlined text-gray-500">close</span>
            </button>
          </div>
          <form @submit.prevent="saveSupplier" class="p-6 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="form-label">Nombre *</label>
                <input v-model="form.name" class="form-input" placeholder="Nombre del proveedor" required />
              </div>
              <div>
                <label class="form-label">Contacto</label>
                <input v-model="form.contact_name" class="form-input" placeholder="Nombre del contacto" />
              </div>
              <div>
                <label class="form-label">RUC/CI</label>
                <input v-model="form.tax_id" class="form-input" placeholder="RUC o cédula" />
              </div>
              <div>
                <label class="form-label">Teléfono</label>
                <input v-model="form.phone" class="form-input" placeholder="Teléfono" />
              </div>
              <div>
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" class="form-input" placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label class="form-label">Ciudad</label>
                <input v-model="form.city" class="form-input" placeholder="Ciudad" />
              </div>
              <div class="md:col-span-2">
                <label class="form-label">Dirección</label>
                <input v-model="form.address" class="form-input" placeholder="Dirección" />
              </div>
              <div class="md:col-span-2">
                <label class="form-label">Términos de pago</label>
                <input v-model="form.payment_terms" class="form-input" placeholder="Ej: 30 días, contado, etc." />
              </div>
              <div class="md:col-span-2">
                <label class="form-label">Notas</label>
                <textarea v-model="form.notes" class="form-input" rows="2" placeholder="Notas adicionales"></textarea>
              </div>
            </div>

            <div v-if="formError" class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {{ formError }}
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" @click="closeModal" class="btn btn-secondary">Cancelar</button>
              <button type="submit" :disabled="saving" class="btn btn-primary">
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
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div class="text-center">
            <span class="material-icons-outlined text-5xl text-red-400 mb-3">warning</span>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">¿Eliminar proveedor?</h3>
            <p class="text-sm text-gray-500">Se eliminará <strong>{{ deletingSupplier?.name }}</strong>. Esta acción no se puede deshacer si no tiene compras asociadas.</p>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button @click="showDeleteConfirm = false" class="btn btn-secondary">Cancelar</button>
            <button @click="deleteSupplier" :disabled="deleting" class="btn bg-red-600 text-white hover:bg-red-700 px-5 py-2 rounded-xl">
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

const suppliers = ref([]);
const loading = ref(true);
const search = ref('');
const page = ref(1);
const totalPages = ref(1);
const limit = 15;

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

<template>
  <div class="px-gutter">
    <!-- Page Header -->
   
<!-- Categories Header -->
<div
  class="mesh-gradient-header"
  style="
    background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
  "
>
  <div class="header-icon-container">
    <span class="material-symbols-outlined animate-header-icon"> category </span>
  </div>
  <div class="header-glass">
    <div class="header-information">
      <PageHeader
        title="Categorías"
        :description="`Gestión de familias de productos · ${categories.length} categoría${
          categories.length !== 1 ? 's' : ''
        } registradas`"
        tag="h1"
      />
    </div>
    <div class="header-actions">
      <button
        v-if="can('products', 'create')"
        @click="openModal(null)"
        class="aurora-header-button aurora-header-button-primary"
      >
        <span class="material-symbols-outlined"> add_circle </span>
        Nueva Categoría
      </button>
    </div>
  </div>
</div>


    <!-- DataTable Card -->
    <div class="aurora-raised-card !p-0 overflow-hidden">
      <!-- Filter/Sort Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-gutter p-4 " style="border-color: var(--aurora-outline-variant);">
        <div class="flex gap-2">
          <button @click="showFilters = !showFilters"
            class=" border !px-3 !py-1.5 flex items-center gap-1 border-[var(--aurora-outline-variant)] hover:!bg-[#9161f4] hover:text-white transition-colors duration-200 rounded-md text-[#9161f4] bg-white"
            :class="{ 'aurora-pressed': showFilters }"
            style="padding: 8px 12px; font-size: 0.8rem;">
            <span class="material-symbols-outlined" style="font-size: 1rem;">filter_list</span>
            Filtrar
          </button>
        </div>
        <div class="relative w-full sm:w-auto">
          <input v-model="searchQuery" type="text" placeholder="Filtrar categorías..."
            class="aurora-search w-full" />
        </div>
      </div>

      <DataTableSkeleton v-if="loading" />
      <template v-else>
        <!-- Desktop Table (DataTable) -->
        <DataTable :columns="categoryColumns" :data="filteredCategories" :per-page="limit" title="Lista de Categorías" empty-message="No hay categorías registradas">
          <template #cell-name="{ row }">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                :style="row.status === 'active'
                  ? { background: 'rgba(139,92,246,0.12)', color: 'var(--aurora-primary)' }
                  : { background: 'var(--aurora-surface-container)', color: 'var(--aurora-outline)' }">
                <span v-if="row.parent_id" class="material-icons-outlined" style="font-size: 18px;">subdirectory_arrow_right</span>
                <span v-else class="material-icons-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 1;">category</span>
              </div>
              <div>
                <p class="font-semibold text-sm text-on-surface">{{ row.name }}</p>
                <p v-if="row.slug" class="text-xs mt-0.5 font-mono text-on-surface-variant">{{ row.slug }}</p>
              </div>
            </div>
          </template>
          <template #cell-slug="{ row }">
            <span v-if="row.slug" class="font-mono text-xs px-2 py-1 rounded-md border" style="font-family: 'JetBrains Mono', monospace; color: var(--aurora-on-surface-variant); background: var(--aurora-surface-container); border-color: var(--aurora-outline-variant);">/{{ row.slug }}</span>
            <span v-else style="color: var(--aurora-outline);">—</span>
          </template>
          <template #cell-status="{ row }">
            <span v-if="row.status === 'active'" class="aurora-badge aurora-badge-success">
              <span class="w-1.5 h-1.5 rounded-full inline-block mr-1" style="background: currentColor;"></span>
              Activo
            </span>
            <span v-else class="aurora-badge" style="background: var(--aurora-surface-container); color: var(--aurora-on-surface-variant);">
              <span class="w-1.5 h-1.5 rounded-full inline-block mr-1" style="background: var(--aurora-on-surface-variant);"></span>
              Inactivo
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

        <!-- Mobile Cards -->
        <div class="md:hidden p-md space-y-3">
          <div v-for="cat in categories" :key="cat.id"
            class="aurora-raised-card transition-all"
            :style="cat.parent_id ? { marginLeft: '1rem', borderLeft: '2px solid var(--aurora-primary)' } : {}">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  :style="cat.status === 'active'
                    ? { background: 'rgba(139,92,246,0.12)', color: 'var(--aurora-primary)' }
                    : { background: 'var(--aurora-surface-container)', color: 'var(--aurora-outline)' }">
                  <span v-if="cat.parent_id" class="material-icons-outlined" style="font-size: 18px;">subdirectory_arrow_right</span>
                  <span v-else class="material-icons-outlined" style="font-size: 20px;">category</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold truncate text-on-surface">{{ cat.name }}</p>
                  <p v-if="cat.slug" class="text-xs mt-0.5 truncate font-mono text-on-surface-variant">{{ cat.slug }}</p>
                  <p class="text-xs mt-1 truncate text-on-surface-variant">{{ cat.description || 'Sin descripción' }}</p>
                  <span v-if="cat.status === 'active'" class="aurora-badge aurora-badge-success mt-2">
                    <span class="w-1.5 h-1.5 rounded-full inline-block mr-1" style="background: currentColor;"></span>
                    Activo
                  </span>
                  <span v-else class="aurora-badge mt-2" style="background: var(--aurora-surface-container); color: var(--aurora-on-surface-variant);">
                    <span class="w-1.5 h-1.5 rounded-full inline-block mr-1" style="background: var(--aurora-on-surface-variant);"></span>
                    Inactivo
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button @click="openModal(cat)" class="aurora-btn-icon" style="color: var(--aurora-on-surface-variant);">
                  <span class="material-icons-outlined" style="font-size: 1.25rem;">edit</span>
                </button>
                <button @click="confirmDelete(cat)" class="aurora-btn-icon" style="color: var(--aurora-error, #dc2626);">
                  <span class="material-icons-outlined" style="font-size: 1.25rem;">delete</span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="categories.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
            <span class="material-icons-outlined mb-2" style="font-size: 48px; color: var(--aurora-outline);">category</span>
            <p class="text-on-surface-variant">No hay categorías registradas</p>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="editing ? 'Editar Categoría' : 'Nueva Categoría'" @close="closeModal">
      <form @submit.prevent="handleSave" class="space-y-gutter px-6 pb-6 pt-2">
        <div>
          <label class="block mb-1 font-medium text-sm text-on-surface">Nombre <span style="color: #ef4444;">*</span></label>
          <input v-model="form.name" required placeholder="Nombre de la categoría" class="aurora-input w-full" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-sm text-on-surface">Descripción</label>
          <textarea v-model="form.description" rows="2" placeholder="Descripción opcional" class="aurora-input w-full resize-none"></textarea>
        </div>
        <div>
          <label class="block mb-1 font-medium text-sm text-on-surface">Categoría Padre</label>
          <select v-model="form.parent_id" class="aurora-select">
            <option :value="null">— Ninguna (categoría principal) —</option>
            <option v-for="cat in allCategories.filter(c => !c.parent_id && (!editing || c.id !== editing.id))"
              :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" @click="closeModal" class="aurora-btn-icon text-on-surface-variant">
            Cancelar
          </button>
          <button type="submit" :disabled="saving" class="aurora-btn-primary">
            <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else class="material-icons-outlined" style="font-size: 1.25rem;">{{ editing ? 'save' : 'add' }}</span>
            {{ editing ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog :show="showDelete" :message="`¿Eliminar la categoría «${deleting?.name}»?`"
                   @confirm="handleDelete" @cancel="showDelete = false" :loading="saving" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { categoriesAPI } from '../../api';
import { useAuth } from '../../composables/useAuth';
import PageHeader from '../../components/shared/PageHeader.vue';
import Modal from '../../components/shared/Modal.vue';
import Loading from '../../components/shared/Loading.vue';
import DataTableSkeleton from '../../components/skeletons/DataTableSkeleton.vue';
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue';
import DataTable from '../../components/shared/DataTable.vue';

const { can } = useAuth();
const categories = ref([]);
const allCategories = ref([]); // Full flat list for parent dropdown
const loading = ref(true);
const showModal = ref(false);
const showDelete = ref(false);
const editing = ref(null);
const deleting = ref(null);
const saving = ref(false);
const form = ref({ name: '', description: '', parent_id: null });
const searchQuery = ref('');
const showFilters = ref(false);

// Client-side pagination
const limit = 15;

const categoryColumns = [
  { key: 'name', label: 'Nombre' },
  { key: 'slug', label: 'Slug' },
  { key: 'description', label: 'Descripción' },
  { key: 'status', label: 'Estado' }
];

// Client-side search filter (backend returns all categories, no server-side search)
const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value;
  const q = searchQuery.value.toLowerCase();
  return categories.value.filter(c =>
    c.name?.toLowerCase().includes(q) ||
    c.slug?.toLowerCase().includes(q) ||
    c.description?.toLowerCase().includes(q)
  );
});

const fetchCategories = async () => {
  loading.value = true;
  try {
    const res = await categoriesAPI.getAll({});
    categories.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error('Error fetching categories:', e);
    categories.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchAllCategories = async () => {
  try {
    const res = await categoriesAPI.getAll({});
    const raw = Array.isArray(res.data) ? res.data : [];
    // Aplanar árbol si viene anidado
    const flatten = (items) => {
      let result = [];
      for (const item of items) {
        result.push(item);
        if (item.children && item.children.length > 0) {
          result = result.concat(flatten(item.children));
        }
      }
      return result;
    };
    allCategories.value = flatten(raw);
  } catch (e) {
    allCategories.value = [];
  }
};

const openModal = (cat) => {
  editing.value = cat;
  form.value = cat
    ? { name: cat.name || '', description: cat.description || '', parent_id: cat.parent_id || null }
    : { name: '', description: '', parent_id: null };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editing.value = null;
};

const handleSave = async () => {
  saving.value = true;
  try {
    if (editing.value) {
      await categoriesAPI.update(editing.value.id, form.value);
    } else {
      await categoriesAPI.create(form.value);
    }
    closeModal();
    await Promise.all([fetchCategories(), fetchAllCategories()]);
  } catch (e) {
    console.error('Error saving category:', e);
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (cat) => {
  deleting.value = cat;
  showDelete.value = true;
};

const handleDelete = async () => {
  saving.value = true;
  try {
    await categoriesAPI.delete(deleting.value.id);
    showDelete.value = false;
    await fetchCategories();
  } catch (e) {
    console.error('Error deleting category:', e);
  } finally {
    saving.value = false;
  }
};

onMounted(() => { fetchCategories(); fetchAllCategories(); });
</script>

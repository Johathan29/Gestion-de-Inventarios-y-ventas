<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-[32px] font-bold tracking-tight" style="font-family: 'Plus Jakarta Sans', sans-serif; color: #452d00; line-height: 1.25;">Categorías</h2>
        <p class="mt-1" style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.5; color: #4f4539;">
          Gestión de familias de productos · <span style="font-weight: 600; color: #452d00;">{{ categories.length }} categoría{{ categories.length !== 1 ? 's' : '' }} registradas</span>
        </p>
      </div>
      <button v-if="can('products', 'create')" @click="openModal(null)"
        class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-md transition-all duration-300"
        style="background: linear-gradient(to right, #624200, #8B5E00); color: white; font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.5;"
        @mouseenter="e => { e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(98,66,0,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }"
        @mouseleave="e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }">
        <span class="material-icons-outlined" style="font-size: 20px;">add_circle</span>
        Nueva Categoría
      </button>
    </div>

    <!-- DataTable Card -->
    <div class="bg-white rounded-2xl overflow-hidden border" style="border-color: rgba(210,196,180,0.2); box-shadow: 0px 4px 20px rgba(98,66,0,0.05);">
      <!-- Table Controls -->
      <div class="p-4 border-b flex flex-col sm:flex-row justify-between gap-4" style="border-color: rgba(210,196,180,0.2); background: rgba(253,251,247,0.5);">
        <div class="relative max-w-sm w-full">
          <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2" style="color: #4f4539; font-size: 16px;">search</span>
          <input v-model="searchQuery" @input="onSearchInput" type="text" placeholder="Filtrar categorías..."
            class="w-full bg-white border rounded-lg py-2 pl-9 pr-4 text-sm transition-all"
            style="font-family: 'Inter', sans-serif; color: #0b1c30; border-color: #E5E7EB; border-width: 1.5px;"
            @focus="e => { e.currentTarget.style.borderColor = '#a17808'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(161,120,8,0.2)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div class="flex gap-2">
          <button class="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm transition-colors"
            style="font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539; border-color: #E5E7EB; border-width: 1.5px;"
            @mouseenter="e => e.currentTarget.style.background = '#eff4ff'"
            @mouseleave="e => e.currentTarget.style.background = ''">
            <span class="material-icons-outlined" style="font-size: 16px;">filter_list</span>
            Filtros
          </button>
          <button class="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm transition-colors"
            style="font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539; border-color: #E5E7EB; border-width: 1.5px;"
            @mouseenter="e => e.currentTarget.style.background = '#eff4ff'"
            @mouseleave="e => e.currentTarget.style.background = ''">
            <span class="material-icons-outlined" style="font-size: 16px;">download</span>
            Exportar
          </button>
        </div>
      </div>

      <Loading v-if="loading" />
      <template v-else>
        <!-- Desktop Table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr style="background: #F9F7F2; border-bottom: 1px solid rgba(210,196,180,0.2);">
                <th class="py-3 px-4 font-semibold uppercase tracking-wider" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Nombre</th>
                <th class="py-3 px-4 font-semibold uppercase tracking-wider" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Slug</th>
                <th class="py-3 px-4 font-semibold uppercase tracking-wider" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Descripción</th>
                <th class="py-3 px-4 font-semibold uppercase tracking-wider text-center" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Estado</th>
                <th class="py-3 px-4 font-semibold uppercase tracking-wider text-right" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Acciones</th>
              </tr>
            </thead>
            <tbody style="font-size: 0.875rem; line-height: 1.5; color: #0b1c30; font-family: 'Inter', sans-serif;">
              <template v-for="cat in flatCategories" :key="cat.id">
                <tr class="transition-colors group" style="border-bottom: 1px solid rgba(210,196,180,0.15);"
                  :style="cat.level > 0 ? { background: 'rgba(239,244,255,0.3)' } : {}">
                  <td class="py-4 px-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        :style="cat.status === 'active'
                          ? { background: 'rgba(253,202,92,0.3)', color: '#624200' }
                          : { background: '#d3e4fe', color: '#4f4539' }">
                        <span v-if="cat.level > 0" class="material-icons-outlined" style="font-size: 18px;">subdirectory_arrow_right</span>
                        <span v-else class="material-icons-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 1;">category</span>
                      </div>
                      <div>
                        <p class="font-semibold" style="color: #452d00;">{{ cat.name }}</p>
                        <p v-if="cat.slug" class="text-xs mt-0.5" style="font-family: 'JetBrains Mono', monospace; color: #4f4539;">{{ cat.slug }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <span v-if="cat.slug" class="font-mono text-xs px-2 py-1 rounded-md border" style="font-family: 'JetBrains Mono', monospace; color: #4f4539; background: #eff4ff; border-color: rgba(210,196,180,0.3);">/{{ cat.slug }}</span>
                    <span v-else style="color: #d2c4b4;">—</span>
                  </td>
                  <td class="py-4 px-4 max-w-[220px] truncate" style="color: #4f4539;" :title="cat.description || ''">
                    {{ cat.description || '—' }}
                  </td>
                  <td class="py-4 px-4 text-center">
                    <span v-if="cat.status === 'active'" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border" style="background: #dcfce7; color: #166534; border-color: #bbf7d0; font-family: 'Inter', sans-serif;">
                      <span class="w-1.5 h-1.5 rounded-full" style="background: #16a34a;"></span>
                      Activo
                    </span>
                    <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border" style="background: #f3f4f6; color: #4b5563; border-color: #e5e7eb; font-family: 'Inter', sans-serif;">
                      <span class="w-1.5 h-1.5 rounded-full" style="background: #9ca3af;"></span>
                      Inactivo
                    </span>
                  </td>
                  <td class="py-4 px-4 text-right">
                    <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button @click="openModal(cat)"
                        class="p-1.5 rounded-md transition-colors" style="color: #4f4539;"
                        @mouseenter="e => { e.currentTarget.style.color = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; }"
                        @mouseleave="e => { e.currentTarget.style.color = '#4f4539'; e.currentTarget.style.background = ''; }"
                        title="Editar">
                        <span class="material-icons-outlined" style="font-size: 1.25rem;">edit</span>
                      </button>
                      <button @click="confirmDelete(cat)"
                        class="p-1.5 rounded-md transition-colors" style="color: #4f4539;"
                        @mouseenter="e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }"
                        @mouseleave="e => { e.currentTarget.style.color = '#4f4539'; e.currentTarget.style.background = ''; }"
                        title="Eliminar">
                        <span class="material-icons-outlined" style="font-size: 1.25rem;">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="flatCategories.length === 0">
                <td colspan="5" class="px-5 py-16 text-center">
                  <span class="material-icons-outlined" style="font-size: 3rem; color: #d2c4b4; display: block; margin-bottom: 0.75rem;">category</span>
                  <p style="color: #4f4539; margin-bottom: 0.25rem; font-family: 'Inter', sans-serif;">No hay categorías registradas</p>
                  <p style="font-size: 0.75rem; color: #4f4539; margin-bottom: 1rem; font-family: 'Inter', sans-serif;">Crea tu primera categoría para organizar los productos</p>
                  <button @click="openModal(null)"
                    style="font-size: 0.875rem; color: #624200; font-weight: 500; font-family: 'Inter', sans-serif;">
                    + Crear categoría
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="md:hidden p-4 space-y-3">
          <div v-for="cat in flatCategories" :key="cat.id"
            class="bg-white rounded-xl p-4 border transition-all"
            style="border-color: rgba(210,196,180,0.2);"
            :style="cat.level > 0 ? { marginLeft: '1rem', borderLeft: '2px solid rgba(98,66,0,0.3)' } : {}">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  :style="cat.status === 'active'
                    ? { background: 'rgba(253,202,92,0.3)', color: '#624200' }
                    : { background: '#d3e4fe', color: '#4f4539' }">
                  <span v-if="cat.level > 0" class="material-icons-outlined" style="font-size: 18px;">subdirectory_arrow_right</span>
                  <span v-else class="material-icons-outlined" style="font-size: 20px;">category</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold truncate" style="color: #452d00;">{{ cat.name }}</p>
                  <p v-if="cat.slug" class="text-xs mt-0.5 truncate" style="font-family: 'JetBrains Mono', monospace; color: #4f4539;">{{ cat.slug }}</p>
                  <p class="text-xs mt-1 truncate" style="color: #4f4539;">{{ cat.description || 'Sin descripción' }}</p>
                  <span v-if="cat.status === 'active'" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border mt-2" style="background: #dcfce7; color: #166534; border-color: #bbf7d0;">
                    <span class="w-1.5 h-1.5 rounded-full" style="background: #16a34a;"></span>
                    Activo
                  </span>
                  <span v-else class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border mt-2" style="background: #f3f4f6; color: #4b5563; border-color: #e5e7eb;">
                    <span class="w-1.5 h-1.5 rounded-full" style="background: #9ca3af;"></span>
                    Inactivo
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button @click="openModal(cat)"
                  class="p-1.5 rounded-md transition-colors" style="color: #4f4539;"
                  @mouseenter="e => e.currentTarget.style.color = '#624200'"
                  @mouseleave="e => e.currentTarget.style.color = '#4f4539'">
                  <span class="material-icons-outlined" style="font-size: 1.25rem;">edit</span>
                </button>
                <button @click="confirmDelete(cat)"
                  class="p-1.5 rounded-md transition-colors" style="color: #4f4539;"
                  @mouseenter="e => e.currentTarget.style.color = '#ef4444'"
                  @mouseleave="e => e.currentTarget.style.color = '#4f4539'">
                  <span class="material-icons-outlined" style="font-size: 1.25rem;">delete</span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="flatCategories.length === 0" class="text-center py-12">
            <span class="material-icons-outlined" style="font-size: 3rem; color: #d2c4b4; display: block; margin-bottom: 0.75rem;">category</span>
            <p style="color: #4f4539; font-family: 'Inter', sans-serif;">No hay categorías registradas</p>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="editing ? 'Editar Categoría' : 'Nueva Categoría'" @close="closeModal">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div>
          <label class="block mb-1 font-medium text-sm" style="color: #4f4539; font-family: 'Inter', sans-serif;">Nombre <span style="color: #ef4444;">*</span></label>
          <input v-model="form.name" required placeholder="Nombre de la categoría"
            class="w-full rounded-lg px-3 py-2 text-sm transition-all bg-white"
            style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-sm" style="color: #4f4539; font-family: 'Inter', sans-serif;">Descripción</label>
          <textarea v-model="form.description" rows="2" placeholder="Descripción opcional"
            class="w-full rounded-lg px-3 py-2 text-sm transition-all bg-white resize-none"
            style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }"></textarea>
        </div>
        <div>
          <label class="block mb-1 font-medium text-sm" style="color: #4f4539; font-family: 'Inter', sans-serif;">Categoría Padre</label>
          <select v-model="form.parent_id"
            class="w-full rounded-lg px-3 py-2 text-sm transition-all bg-white appearance-none"
            style="font-family: 'Inter', sans-serif; color: #0b1c30; border: 1.5px solid #E5E7EB;"
            @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(98,66,0,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
            <option :value="null">— Ninguna (categoría principal) —</option>
            <option v-for="cat in flatCategories.filter(c => c.level === 0 && (!editing || c.id !== editing.id))"
              :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" @click="closeModal"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style="font-family: 'Inter', sans-serif; color: #4f4539; border: 1.5px solid #d2c4b4; background: white;"
            @mouseenter="e => { e.currentTarget.style.background = '#eff4ff'; e.currentTarget.style.borderColor = '#624200'; }"
            @mouseleave="e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#d2c4b4'; }">
            Cancelar
          </button>
          <button type="submit" :disabled="saving"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :style="saving
              ? { background: '#624200', color: 'white', opacity: '0.7', cursor: 'not-allowed' }
              : { background: '#624200', color: 'white' }"
            @mouseenter="e => { if(!saving) e.currentTarget.style.background = '#8B5E00'; }"
            @mouseleave="e => { if(!saving) e.currentTarget.style.background = '#624200'; }">
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { categoriesAPI } from '../../api';
import { useAuth } from '../../composables/useAuth';
import Modal from '../../components/shared/Modal.vue';
import Loading from '../../components/shared/Loading.vue';
import ConfirmDialog from '../../components/shared/ConfirmDialog.vue';

const { can } = useAuth();
const categories = ref([]);
const loading = ref(true);
const showModal = ref(false);
const showDelete = ref(false);
const editing = ref(null);
const deleting = ref(null);
const saving = ref(false);
const form = ref({ name: '', description: '', parent_id: null });
const searchQuery = ref('');

// Debounce timer for search
let searchTimer = null;
const onSearchInput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    fetchCategories();
  }, 300);
};

// Aplana el árbol recursivo en un array plano con nivel de profundidad
const flatCategories = computed(() => {
  const flatten = (items, level = 0) => {
    let result = [];
    for (const item of items) {
      result.push({ ...item, level });
      if (item.children && item.children.length > 0) {
        result = result.concat(flatten(item.children, level + 1));
      }
    }
    return result;
  };
  return flatten(categories.value);
});

const fetchCategories = async () => {
  loading.value = true;
  try {
    const params = {};
    if (searchQuery.value) params.search = searchQuery.value;
    const res = await categoriesAPI.getAll(params);
    categories.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error('Error fetching categories:', e);
    categories.value = [];
  } finally {
    loading.value = false;
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
    await fetchCategories();
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

onMounted(fetchCategories);
onUnmounted(() => {
  clearTimeout(searchTimer);
});
</script>

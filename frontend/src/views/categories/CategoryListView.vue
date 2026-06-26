<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Categorías</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ categories.length }} categoría{{ categories.length !== 1 ? 's' : '' }} registradas
        </p>
      </div>
      <button v-if="can('products', 'create')" @click="openModal(null)"
        class="btn-primary px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-primary-600 text-white font-medium text-sm hover:from-purple-700 hover:to-primary-700 transition-all duration-300 shadow-lg shadow-purple-600/20 flex items-center gap-2">
        <span class="material-icons-outlined text-lg">add</span>
        Nueva Categoría
      </button>
    </div>

    <!-- Desktop Table -->
    <div class="hidden md:block">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Loading v-if="loading" />
        <table v-else class="w-full">
          <thead>
            <tr class="bg-gray-50 dark:bg-gray-700/50">
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descripción</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
              <th class="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <template v-for="cat in flatCategories" :key="cat.id">
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  :class="{ 'bg-purple-50/30 dark:bg-purple-900/10': cat.level > 0 }">
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <span class="material-icons-outlined text-gray-400"
                      :class="cat.level > 0 ? 'text-base ml-' + (cat.level * 5) : ''">
                      {{ cat.level > 0 ? 'subdirectory_arrow_right' : 'category' }}
                    </span>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white"
                        :class="{ 'text-primary-600 dark:text-primary-400': cat.level > 0 }">
                        {{ cat.name }}
                      </p>
                      <p v-if="cat.slug" class="text-xs text-gray-400">{{ cat.slug }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                  {{ cat.description || '—' }}
                </td>
                <td class="px-5 py-3.5">
                  <span class="inline-flex px-2.5 py-1 text-xs font-medium rounded-full"
                    :class="cat.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
                    {{ cat.status === 'ac6tive' ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button @click="openModal(cat)"
                      class="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
                      <span class="material-icons-outlined text-lg">edit</span>
                    </button>
                    <button @click="confirmDelete(cat)"
                      class="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                      <span class="material-icons-outlined text-lg">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="flatCategories.length === 0">
              <td colspan="4" class="px-5 py-16 text-center">
                <span class="material-icons-outlined text-5xl text-gray-300 dark:text-gray-600 block mb-3">category</span>
                <p class="text-gray-500 dark:text-gray-400">No hay categorías registradas</p>
                <button @click="openModal(null)"
                  class="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium">
                  + Crear primera categoría
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-3">
      <Loading v-if="loading" />
      <template v-else>
        <div v-for="cat in flatCategories" :key="cat.id"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4
                 hover:shadow-md transition-shadow duration-200"
          :class="{ 'ml-4 border-l-2 border-l-primary-400': cat.level > 0 }">
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-3">
              <span class="material-icons-outlined text-gray-400 mt-0.5"
                :class="cat.level > 0 ? 'text-base' : ''">
                {{ cat.level > 0 ? 'subdirectory_arrow_right' : 'category' }}
              </span>
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ cat.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ cat.description || 'Sin descripción' }}
                </p>
                <span class="inline-flex mt-2 px-2 py-0.5 text-xs font-medium rounded-full"
                  :class="cat.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
                  {{ cat.status === 'active' ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button @click="openModal(cat)"
                class="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
                <span class="material-icons-outlined text-lg">edit</span>
              </button>
              <button @click="confirmDelete(cat)"
                class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                <span class="material-icons-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        </div>
        <div v-if="flatCategories.length === 0" class="text-center py-12 text-gray-500">
          <span class="material-icons-outlined text-5xl text-gray-300 block mb-3">category</span>
          <p>No hay categorías registradas</p>
        </div>
      </template>
    </div>

    <!-- Modal -->
    <Modal :show="showModal" :title="editing ? 'Editar Categoría' : 'Nueva Categoría'" @close="closeModal">
      <form @submit.prevent="handleSave" class="space-y-4">
        <div>
          <label class="form-label">Nombre <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="form-input" required
            placeholder="Nombre de la categoría" />
        </div>
        <div>
          <label class="form-label">Descripción</label>
          <textarea v-model="form.description" rows="2" class="form-input"
            placeholder="Descripción opcional"></textarea>
        </div>
        <div>
          <label class="form-label">Categoría Padre</label>
          <select v-model="form.parent_id" class="form-input">
            <option :value="null">— Ninguna (categoría principal) —</option>
            <option v-for="cat in flatCategories.filter(c => c.level === 0 && (!editing || c.id !== editing.id))"
              :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" @click="closeModal" class="btn btn-secondary">Cancelar</button>
          <button type="submit" :disabled="saving"
            class="btn-primary px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-primary-600 text-white font-medium text-sm hover:from-purple-700 hover:to-primary-700 disabled:opacity-50 transition-all duration-300 shadow-lg shadow-purple-600/20 flex items-center gap-2">
            <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else class="material-icons-outlined text-lg">{{ editing ? 'save' : 'add' }}</span>
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
    const res = await categoriesAPI.getAll();
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
</script>

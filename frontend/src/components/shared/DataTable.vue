<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <!-- Toolbar -->
    <div v-if="$slots.toolbar || title || searchable" class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h3 v-if="title" class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
        <div class="flex items-center gap-2 ml-auto">
          <div v-if="searchable" class="relative">
            <span class="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
            <input v-model="searchQuery" type="text" placeholder="Buscar..."
                   class="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500">
          </div>
          <slot name="toolbar" />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50 dark:bg-gray-700/50">
            <th v-for="col in columns" :key="col.key"
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                :class="{ 'cursor-pointer select-none': col.sortable }"
                @click="col.sortable && toggleSort(col.key)">
              <div class="flex items-center gap-1">
                {{ col.label }}
                <span v-if="col.sortable && sortKey === col.key" class="material-icons-outlined text-sm">
                  {{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                </span>
              </div>
            </th>
            <th v-if="$slots.actions" class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="(row, rowIdx) in filteredData" :key="row.id || rowIdx"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
              @click="$emit('rowClick', row)">
            <td v-for="col in columns" :key="col.key" class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              <!-- Status badge -->
              <span v-if="col.type === 'status'"
                    class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                    :class="statusClass(row[col.key])">
                {{ getStatusLabel(row[col.key]) }}
              </span>
              <!-- Currency -->
              <span v-else-if="col.type === 'currency'" class="font-medium">
                {{ formatCurrency(row[col.key]) }}
              </span>
              <!-- Date -->
              <span v-else-if="col.type === 'date'">{{ formatDate(row[col.key]) }}</span>
              <!-- DateTime -->
              <span v-else-if="col.type === 'datetime'">{{ formatDateTime(row[col.key]) }}</span>
              <!-- Number -->
              <span v-else-if="col.type === 'number'" class="text-right font-medium">{{ row[col.key] }}</span>
              <!-- Boolean -->
              <span v-else-if="col.type === 'boolean'">
                <span class="material-icons-outlined" :class="row[col.key] ? 'text-green-500' : 'text-red-400'">
                  {{ row[col.key] ? 'check_circle' : 'cancel' }}
                </span>
              </span>
              <!-- Image -->
              <img v-else-if="col.type === 'image'" :src="row[col.key]" class="w-10 h-10 rounded object-cover" />
              <!-- Custom -->
              <span v-else-if="col.type === 'custom'">
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                  {{ row[col.key] }}
                </slot>
              </span>
              <!-- Default text -->
              <span v-else>{{ row[col.key] || '-' }}</span>
            </td>
            <td v-if="$slots.actions" class="px-4 py-3 text-right">
              <slot name="actions" :row="row" />
            </td>
          </tr>
          <tr v-if="filteredData.length === 0">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)"
                class="px-4 py-12 text-center text-gray-500">
              <span class="material-icons-outlined text-4xl block mb-2">inbox</span>
              {{ emptyMessage || 'No hay datos disponibles' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <p class="text-sm text-gray-500">
        Mostrando {{ ((currentPage - 1) * perPage) + 1 }} - {{ Math.min(currentPage * perPage, total) }} de {{ total }}
      </p>
      <div class="flex items-center gap-1">
        <button @click="prevPage" :disabled="currentPage <= 1"
                class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
          <span class="material-icons-outlined">chevron_left</span>
        </button>
        <span v-for="p in visiblePages" :key="p">
          <button v-if="p === '...'" disabled class="px-2 text-gray-400">...</button>
          <button v-else @click="goToPage(p)"
                  class="px-3 py-1 rounded text-sm font-medium"
                  :class="p === currentPage ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'">
            {{ p }}
          </button>
        </span>
        <button @click="nextPage" :disabled="currentPage >= totalPages"
                class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
          <span class="material-icons-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { formatCurrency, formatDate, formatDateTime, getStatusLabel, statusClass } from '../../utils';

const props = defineProps({
  columns: { type: Array, required: true },
  data: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  searchable: { type: Boolean, default: false },
  emptyMessage: { type: String, default: '' },
  perPage: { type: Number, default: 10 },
  serverPagination: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
  currentPageProp: { type: Number, default: 1 }
});

const emit = defineEmits(['rowClick', 'pageChange', 'sortChange']);

const searchQuery = ref('');
const currentPage = ref(props.currentPageProp);
const sortKey = ref('');
const sortDir = ref('asc');

watch(() => props.currentPageProp, (val) => { currentPage.value = val; });
watch(searchQuery, () => { currentPage.value = 1; });

const filteredData = computed(() => {
  if (props.serverPagination) return props.data;
  let result = [...props.data];
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(row =>
      Object.values(row).some(val => val?.toString().toLowerCase().includes(q))
    );
  }
  if (sortKey.value) {
    result.sort((a, b) => {
      const va = a[sortKey.value], vb = b[sortKey.value];
      if (sortDir.value === 'asc') return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });
  }
  return result;
});

const totalPages = computed(() => props.serverPagination
  ? Math.ceil(props.total / props.perPage)
  : Math.ceil(filteredData.value.length / props.perPage)
);

const toggleSort = (key) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else { sortKey.value = key; sortDir.value = 'asc'; }
  emit('sortChange', { key, dir: sortDir.value });
};

const goToPage = (page) => { currentPage.value = page; emit('pageChange', page); };
const prevPage = () => { if (currentPage.value > 1) goToPage(currentPage.value - 1); };
const nextPage = () => { if (currentPage.value < totalPages.value) goToPage(currentPage.value + 1); };

const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
  else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }
  return pages;
});
</script>

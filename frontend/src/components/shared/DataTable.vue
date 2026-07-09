<template>
  <div class="dt-card">
    <!-- Toolbar -->
    <div v-if="$slots.toolbar || title || searchable" class="p-4" style="border-bottom: 1px solid #e2d6c8;">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h3 v-if="title" class="text-[32px] font-bold tracking-tight" style="font-family: 'Plus Jakarta Sans', sans-serif; color: #452d00; line-height: 1.25; margin-bottom: 0;">{{ title }}</h3>
        <div class="flex items-center gap-2 ml-auto">
          <div v-if="searchable" class="relative">
            <div class="flex items-center bg-white border border-[#d2c4b4] rounded-full px-4 py-1.5 focus-within:border-[#624200] focus-within:ring-2 focus-within:ring-[rgba(98,66,0,0.2)] transition-all">
              <span class="material-icons-outlined" style="color: #d2c4b4; margin-right: 0.5rem; font-size: 1rem;">search</span>
              <input v-model="searchQuery" type="text" placeholder="Buscar..."
                     class="bg-transparent border-none focus:ring-0 outline-none text-sm"
                     style="font-family: 'Inter', sans-serif; color: #0b1c30;" />
            </div>
          </div>
          <slot name="toolbar" />
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- DESKTOP TABLE (hidden on mobile) -->
    <!-- ============================================ -->
    <div class="overflow-x-auto dt-hide-mobile">
      <table class="dt-table">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key"
                :class="{ 'cursor-pointer select-none': col.sortable, 'text-right': col.type === 'number' || col.type === 'currency' }"
                @click="col.sortable && toggleSort(col.key)">
              <div class="flex items-center gap-1" :class="{ 'justify-end': col.type === 'number' || col.type === 'currency' }">
                {{ col.label }}
                <span v-if="col.sortable && sortKey === col.key" class="material-icons-outlined text-sm">
                  {{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                </span>
              </div>
            </th>
            <th v-if="$slots.actions" class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIdx) in filteredData" :key="row.id || rowIdx"
              class="cursor-pointer group"
              @click="$emit('rowClick', row)">
            <td v-for="col in columns" :key="col.key">
              <!-- Status badge -->
              <span v-if="col.type === 'status'"
                    class="dt-badge"
                    :class="statusClass(row[col.key])">
                {{ getStatusLabel(row[col.key]) }}
              </span>
              <!-- Currency -->
              <span v-else-if="col.type === 'currency'" class="dt-financial">
                {{ formatTable(row[col.key]) }}
              </span>
              <!-- Date -->
              <span v-else-if="col.type === 'date'">{{ formatDate(row[col.key]) }}</span>
              <!-- DateTime -->
              <span v-else-if="col.type === 'datetime'">{{ formatDateTime(row[col.key]) }}</span>
              <!-- Number -->
              <span v-else-if="col.type === 'number'" class="dt-financial">{{ row[col.key] }}</span>
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
              <span v-else class="font-medium" style="color: #0b1c30;">{{ row[col.key] || '-' }}</span>
            </td>
            <td v-if="$slots.actions" class="text-right">
              <div class="flex items-center justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <slot name="actions" :row="row" />
              </div>
            </td>
          </tr>
          <tr v-if="filteredData.length === 0">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="dt-empty-state">
              <span class="dt-empty-icon material-symbols-outlined">inbox</span>
              <p>{{ emptyMessage || 'No hay datos disponibles' }}</p>
            </td>
          </tr>/
        </tbody>
      </table>
    </div>

    <!-- ============================================ -->
    <!-- Pagination (dt-pagination per DESIGN.md) -->
    <!-- ============================================ -->
    <div v-if="totalPages > 1" class="dt-pagination">
      <span class="dt-pagination-info">
        Mostrando <strong>{{ ((currentPage - 1) * perPage) + 1 }}</strong> a <strong>{{ Math.min(currentPage * perPage, total) }}</strong> de <strong>{{ total }}</strong> resultados
      </span>
      <div class="dt-pagination-buttons">
        <button @click="prevPage" :disabled="currentPage <= 1" class="dt-pagination-btn">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <span v-for="p in visiblePages" :key="p">
          <span v-if="p === '...'" class="dt-pagination-ellipsis">...</span>
          <button v-else @click="goToPage(p)"
                  class="dt-pagination-btn"
                  :class="p === currentPage ? 'dt-pagination-active' : ''">
            {{ p }}
          </button>
        </span>
        <button @click="nextPage" :disabled="currentPage >= totalPages" class="dt-pagination-btn">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useCurrency } from '../../composables/useCurrency';
import { formatDate, formatDateTime, getStatusLabel, statusClass } from '../../utils';

const { formatTable } = useCurrency();

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

<template>
  <div class="nexus-card !p-0 overflow-hidden flex flex-col" style="min-height: 400px;">
    <!-- Toolbar -->
    <div v-if="title || $slots.toolbar" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
      <div v-if="title" class="flex flex-col">
        <h3 class="text-lg font-semibold" style="color: #1e293b;">{{ title }}</h3>
      </div>
      <div v-if="$slots.toolbar" class="flex items-center gap-3">
        <slot name="toolbar" />
      </div>
    </div>

    <!-- Table Wrapper (Desktop) -->
    <div class="overflow-x-auto hidden md:block">
      <table class="w-full">
        <!-- Table Header -->
        <thead>
          <tr style="background: #1e293b;">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider cursor-pointer select-none"
              style="color: #f1f5f9;"
              :class="{ 'hover:text-white': col.sortable }"
              @click="toggleSort(col)"
            >
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold uppercase tracking-wider">{{ col.label }}</span>
                <span v-if="col.sortable" class="inline-flex items-center justify-center w-5 h-5 rounded transition-all duration-300 ease-in-out">
                  <!-- Text column sort icons (A-Z / Z-A) -->
                  <span v-if="col.type === 'text' || !col.type" class="material-icons-outlined transition-all duration-300 ease-in-out" style="font-size: 14px;"
                    :class="sortKey === col.key ? 'bg-white/15 text-white' : 'text-slate-400'">
                    {{ sortKey === col.key ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort' }}
                  </span>
                  <!-- Number column sort icons -->
                  <span v-else-if="col.type === 'number' || col.type === 'currency'" class="material-icons-outlined transition-all duration-300 ease-in-out" style="font-size: 14px;"
                    :class="sortKey === col.key ? 'bg-white/15 text-white' : 'text-slate-400'">
                    {{ sortKey === col.key ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort' }}
                  </span>
                  <!-- Date column sort icons -->
                  <span v-else class="material-icons-outlined transition-all duration-300 ease-in-out" style="font-size: 14px;"
                    :class="sortKey === col.key ? 'bg-white/15 text-white' : 'text-slate-400'">
                    {{ sortKey === col.key ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort' }}
                  </span>
                </span>
              </div>
            </th>
            <th v-if="$slots.actions" class="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider w-20" style="color: #f1f5f9;">
              Acciones
            </th>
          </tr>
        </thead>
        <!-- Table Body -->
        <tbody>
          <tr
            v-for="(row, rowIdx) in displayData"
            :key="row.id || rowIdx"
            class="transition-all duration-300 ease-in-out cursor-pointer group hover:bg-[#7840da0f]"
            @click="$emit('row-click', row)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3.5 text-sm"
              style="color: #475569;"
              :data-type="col.type"
            >
              <!-- Custom cell via slot -->
              <slot v-if="$slots[`cell-${col.key}`]" :name="`cell-${col.key}`" :row="row" />
              <!-- Custom column type (needs slot) -->
              <template v-else-if="col.type === 'custom'">
                {{ getValue(row, col.key) }}
              </template>
              <!-- Currency -->
              <template v-else-if="col.type === 'currency'">
                {{ formatCurrency(getValue(row, col.key)) }}
              </template>
              <!-- Number -->
              <template v-else-if="col.type === 'number'">
                {{ formatNumber(getValue(row, col.key)) }}
              </template>
              <!-- Date -->
              <template v-else-if="col.type === 'date'">
                {{ formatDate(getValue(row, col.key)) }}
              </template>
              <!-- Datetime -->
              <template v-else-if="col.type === 'datetime'">
                {{ formatDatetime(getValue(row, col.key)) }}
              </template>
              <!-- Default: plain text -->
              <template v-else>
                {{ getValue(row, col.key) }}
              </template>
            </td>
            <td v-if="$slots.actions" class="px-4 py-3.5 text-right">
              <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                <slot name="actions" :row="row" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden">
      <div
        v-for="(row, rowIdx) in displayData"
        :key="row.id || rowIdx"
        class="p-4 transition-colors cursor-pointer group"
        @click="$emit('row-click', row)"
      >
        <div v-for="col in columns" :key="col.key" class="flex items-center justify-between py-1.5">
          <span class="text-xs" style="color: #94a3b8;">{{ col.label }}</span>
          <span class="text-sm text-right" style="color: #475569;" :data-type="col.type">
            <slot v-if="$slots[`cell-${col.key}`]" :name="`cell-${col.key}`" :row="row" />
            <template v-else-if="col.type === 'currency'">{{ formatCurrency(getValue(row, col.key)) }}</template>
            <template v-else-if="col.type === 'number'">{{ formatNumber(getValue(row, col.key)) }}</template>
            <template v-else-if="col.type === 'date'">{{ formatDate(getValue(row, col.key)) }}</template>
            <template v-else-if="col.type === 'datetime'">{{ formatDatetime(getValue(row, col.key)) }}</template>
            <template v-else>{{ getValue(row, col.key) }}</template>
          </span>
        </div>
        <div v-if="$slots.actions" class="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <slot name="actions" :row="row" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="displayData.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <span class="material-icons-outlined text-5xl mb-4" style="color: #cbd5e1;">inventory_2</span>
      <p class="text-sm" style="color: #94a3b8;">{{ emptyMessage }}</p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 mt-auto">
      <span class="text-sm" style="color: #94a3b8;">
        Mostrando <strong style="color: #1e293b;">{{ showingFrom }}-{{ showingTo }}</strong> de <strong style="color: #1e293b;">{{ totalRows }}</strong>
      </span>
      <div class="flex items-center gap-1">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage <= 1"
          class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
          style="color: #64748b;"
        >
          <span class="material-icons-outlined text-lg">chevron_left</span>
        </button>
        <button
          v-for="p in visiblePageNumbers"
          :key="p"
          @click="goToPage(p)"
          class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors"
          :class="p === currentPage ? 'bg-primary text-white' : 'hover:bg-gray-100'"
          :style="p !== currentPage ? 'color: #64748b;' : ''"
        >
          {{ p }}
        </button>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage >= totalPages"
          class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
          style="color: #64748b;"
        >
          <span class="material-icons-outlined text-lg">chevron_right</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  columns: { type: Array, required: true },
  data: { type: Array, required: true },
  title: { type: String, default: null },
  serverPagination: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
  currentPageProp: { type: Number, default: 1 },
  perPage: { type: Number, default: 10 },
  emptyMessage: { type: String, default: 'No hay registros disponibles' },
  searchable: { type: Boolean, default: false }
});

const emit = defineEmits(['page-change', 'row-click', 'sort-change']);

// Internal sort state
const sortKey = ref('');
const sortDir = ref('asc');

// Internal pagination state (client-side)
const internalPage = ref(1);

// Current page — use prop if server-pagination, else internal
const currentPage = computed(() => props.serverPagination ? props.currentPageProp : internalPage.value);

// Total rows — use prop if server-pagination, else computed from data
const totalRows = computed(() => props.serverPagination ? props.total : props.data.length);

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / props.perPage)));

// Computed display data with client-side sorting/pagination
const displayData = computed(() => {
  let items = [...props.data];

  // Client-side sorting
  if (!props.serverPagination && sortKey.value) {
    items.sort((a, b) => {
      const aVal = getValue(a, sortKey.value);
      const bVal = getValue(b, sortKey.value);
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir.value === 'asc' ? cmp : -cmp;
    });
  }

  // Client-side pagination
  if (!props.serverPagination) {
    const start = (currentPage.value - 1) * props.perPage;
    items = items.slice(start, start + props.perPage);
  }

  return items;
});

// Pagination display helpers
const showingFrom = computed(() => totalRows.value === 0 ? 0 : ((currentPage.value - 1) * props.perPage) + 1);
const showingTo = computed(() => Math.min(currentPage.value * props.perPage, totalRows.value));

const visiblePageNumbers = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;
  let start = Math.max(1, current - 2);
  let end = Math.min(total, current + 2);
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4);
    else start = Math.max(1, end - 4);
  }
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

// Helpers
function getValue(obj, key) {
  if (!obj) return '';
  // Support nested keys like 'categories.name'
  if (key.includes('.')) {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), obj);
  }
  const val = obj[key];
  return val !== undefined && val !== null ? val : '';
}

function formatCurrency(val) {
  const num = Number(val);
  if (isNaN(num)) return val;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(num);
}

function formatNumber(val) {
  const num = Number(val);
  if (isNaN(num)) return val;
  return new Intl.NumberFormat('es-MX').format(num);
}

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

function formatDatetime(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d);
}

function toggleSort(col) {
  if (!col.sortable) return;
  if (sortKey.value === col.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = col.key;
    sortDir.value = 'asc';
  }
  // Reset to first page on sort change (client-side)
  if (!props.serverPagination) internalPage.value = 1;
  // Emit sort event for server-side sorting
  if (props.serverPagination) {
    emit('sort-change', { key: sortKey.value, dir: sortDir.value });
  }
}

function goToPage(p) {
  if (p < 1 || p > totalPages.value) return;
  if (props.serverPagination) {
    emit('page-change', p);
  } else {
    internalPage.value = p;
  }
}

// Watch for data changes to reset client-side pagination
watch(() => props.data.length, () => {
  if (!props.serverPagination && internalPage.value > totalPages.value) {
    internalPage.value = Math.max(1, totalPages.value);
  }
});
</script>

<style scoped>
@keyframes rowFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
tbody tr {
  animation: rowFadeIn 0.3s ease-out both;
}
</style>

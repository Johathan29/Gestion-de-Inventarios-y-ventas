<template>
  <DataTable
    :columns="columns"
    :data="data"
    :server-pagination="true"
    :total="total"
    :current-page-prop="currentPage"
    :per-page="perPage"
    :empty-message="emptyMessage"
    @page-change="$emit('pageChange', $event)"
    @rowClick="$emit('rowClick', $event)"
  >
    <template #cell-product="{ row }">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded flex-shrink-0 overflow-hidden" style="background: #e5eeff;">
          <img v-if="row.product?.images?.[0]" :src="row.product.images[0]" :alt="row.product_name"
            class="w-full h-full object-cover"
            :class="row.stock === 0 ? 'grayscale' : ''" />
          <span v-else class="material-icons-outlined flex items-center justify-center w-full h-full" style="color: #d2c4b4; font-size: 20px;">inventory_2</span>
        </div>
        <span class="font-semibold line-clamp-2" style="color: #0b1c30;">{{ row.product_name }}</span>
      </div>
    </template>
    <template #cell-sku="{ row }">
      <span class="dt-mono dt-sku">{{ row.product?.sku || row.sku || '—' }}</span>
    </template>
    <template #cell-stock="{ row }">
      <span v-if="row.stock > 0 && row.stock >= (row.min_stock || 0)"
        class="dt-badge dt-badge-stock-ok">{{ row.stock }}</span>
      <span v-else-if="row.stock > 0 && row.stock < (row.min_stock || 5)"
        class="dt-badge dt-badge-stock-low">{{ row.stock }}</span>
      <span v-else class="dt-badge dt-badge-stock-out">0</span>
    </template>
    <template #cell-min_stock="{ row }">
      <span style="color: #4f4539;">{{ row.min_stock ?? '—' }}</span>
    </template>
    <template #cell-purchase_price="{ row }">
      <span class="dt-financial" style="color: #4f4539;">{{ formatTable(row.purchase_price || row.cost_price || row.product?.cost_price || 0) }}</span>
    </template>
    <template #cell-price="{ row }">
      <span class="dt-financial">{{ formatTable(row.price || row.product?.price || 0) }}</span>
    </template>
    <template #cell-total_value="{ row }">
      <span class="dt-financial" style="color: #452d00;">{{ formatTable((row.stock || 0) * (row.price || row.product?.price || 0)) }}</span>
    </template>
    <template #actions="{ row }">
      <button @click="emitViewKardex(row)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Ver Kardex" style="color: #4f4539; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; e.currentTarget.style.color = '#624200'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4f4539'; }">
        <span class="material-icons-outlined" style="font-size: 20px;">history</span>
      </button>
    </template>
  </DataTable>
</template>

<script setup>
import DataTable from '../shared/DataTable.vue';
import { useCurrency } from '../../composables/useCurrency';

const { formatTable } = useCurrency();

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  perPage: { type: Number, default: 15 },
  emptyMessage: { type: String, default: 'No hay productos en inventario' }
});

const emit = defineEmits(['pageChange', 'rowClick', 'viewKardex']);

const columns = [
  { key: 'product', label: 'Producto', type: 'custom' },
  { key: 'sku', label: 'SKU', type: 'custom' },
  { key: 'stock', label: 'Stock Actual', type: 'custom' },
  { key: 'min_stock', label: 'Stock Mín.', type: 'custom' },
  { key: 'purchase_price', label: 'Costo Compra', type: 'custom' },
  { key: 'price', label: 'Precio Venta', type: 'custom' },
  { key: 'total_value', label: 'Valor Total', type: 'custom' }
];

const emitViewKardex = (row) => {
  emit('viewKardex', row);
};
</script>

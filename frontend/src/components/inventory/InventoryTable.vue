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
    <template #cell-status="{ row }">
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        :class="{
          'bg-green-100 text-green-700': (row.status || 'available') === 'available',
          'bg-yellow-100 text-yellow-700': row.status === 'pending',
          'bg-red-100 text-red-700': row.status === 'blocked',
          'bg-gray-100 text-gray-700': row.status === 'not_available',
          'bg-purple-100 text-purple-700': row.status === 'in_review',
          'bg-orange-100 text-orange-700': row.status === 'not_available_for_sales'
        }">
        <span class="w-1.5 h-1.5 rounded-full"
          :class="{
            'bg-green-500': (row.status || 'available') === 'available',
            'bg-yellow-500': row.status === 'pending',
            'bg-red-500': row.status === 'blocked',
            'bg-gray-500': row.status === 'not_available',
            'bg-purple-500': row.status === 'in_review',
            'bg-orange-500': row.status === 'not_available_for_sales'
          }"></span>
        {{ row.status === 'pending' ? 'Pendiente' : row.status === 'blocked' ? 'Bloqueado' : row.status === 'not_available' ? 'No Disponible' : row.status === 'in_review' ? 'En Revisión' : row.status === 'not_available_for_sales' ? 'No Disponible para Ventas' : 'Disponible' }}
      </span>
    </template>
    <template #cell-sku="{ row }">
      <span class="dt-mono dt-sku font-semibold" style="color: #7c3aed;">{{ row.product?.sku || row.sku || '—' }}</span>
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

  <!-- Mobile Cards -->
  <div class="md:hidden space-y-4 p-4">
    <div v-for="item in data" :key="item.id || item.product_id"
         class="dt-card-sm p-4 cursor-pointer dt-shadow-hover"
         @click="$emit('rowClick', item)">
      <!-- Card Header: product image + name -->
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded flex-shrink-0 overflow-hidden" style="background: #e5eeff;">
          <img v-if="item.product?.images?.[0]" :src="item.product.images[0]" :alt="item.product_name"
            class="w-full h-full object-cover"
            :class="item.stock === 0 ? 'grayscale' : ''" />
          <span v-else class="material-icons-outlined flex items-center justify-center w-full h-full" style="color: #d2c4b4; font-size: 20px;">inventory_2</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold truncate" style="color: #0b1c30;">{{ item.product_name }}</p>
          <p class="dt-mono dt-sku text-xs">{{ item.product?.sku || item.sku || '—' }}</p>
        </div>
        <div class="flex-shrink-0">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            :class="{
              'bg-green-100 text-green-700': (item.status || 'available') === 'available',
              'bg-yellow-100 text-yellow-700': item.status === 'pending',
              'bg-red-100 text-red-700': item.status === 'blocked',
              'bg-gray-100 text-gray-700': item.status === 'not_available',
              'bg-purple-100 text-purple-700': item.status === 'in_review',
              'bg-orange-100 text-orange-700': item.status === 'not_available_for_sales'
            }">
            <span class="w-1.5 h-1.5 rounded-full"
              :class="{
                'bg-green-500': (item.status || 'available') === 'available',
                'bg-yellow-500': item.status === 'pending',
                'bg-red-500': item.status === 'blocked',
                'bg-gray-500': item.status === 'not_available',
                'bg-purple-500': item.status === 'in_review',
                'bg-orange-500': item.status === 'not_available_for_sales'
              }"></span>
            {{ item.status === 'pending' ? 'Pendiente' : item.status === 'blocked' ? 'Bloqueado' : item.status === 'not_available' ? 'No Disponible' : item.status === 'in_review' ? 'En Revisión' : item.status === 'not_available_for_sales' ? 'No Disponible para Ventas' : 'Disponible' }}
          </span>
        </div>
      </div>
      <!-- Card Details: stock, prices, values -->
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span class="text-xs opacity-60" style="color: #4f4539;">Stock Actual</span>
          <div class="mt-0.5">
            <span v-if="item.stock > 0 && item.stock >= (item.min_stock || 0)"
              class="dt-badge dt-badge-stock-ok">{{ item.stock }}</span>
            <span v-else-if="item.stock > 0 && item.stock < (item.min_stock || 5)"
              class="dt-badge dt-badge-stock-low">{{ item.stock }}</span>
            <span v-else class="dt-badge dt-badge-stock-out">0</span>
          </div>
        </div>
        <div>
          <span class="text-xs opacity-60" style="color: #4f4539;">Stock Mín.</span>
          <p class="font-medium" style="color: #0b1c30;">{{ item.min_stock ?? '—' }}</p>
        </div>
        <div>
          <span class="text-xs opacity-60" style="color: #4f4539;">Costo Compra</span>
          <p class="font-medium" style="color: #4f4539;">{{ formatTable(item.purchase_price || item.cost_price || item.product?.cost_price || 0) }}</p>
        </div>
        <div>
          <span class="text-xs opacity-60" style="color: #4f4539;">Precio Venta</span>
          <p class="font-medium dt-financial">{{ formatTable(item.price || item.product?.price || 0) }}</p>
        </div>
        <div class="col-span-2">
          <span class="text-xs opacity-60" style="color: #4f4539;">Valor Total</span>
          <p class="font-semibold" style="color: #452d00;">{{ formatTable((item.stock || 0) * (item.price || item.product?.price || 0)) }}</p>
        </div>
      </div>
      <div class="flex justify-end mt-2 pt-2" style="border-top: 1px solid rgba(210,196,180,0.2);">
        <button @click.stop="$emit('viewKardex', item)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Ver Kardex" style="color: #4f4539; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; e.currentTarget.style.color = '#624200'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4f4539'; }">
          <span class="material-icons-outlined" style="font-size: 20px;">history</span>
        </button>
      </div>
    </div>
    <div v-if="!data || data.length === 0" class="dt-empty-state py-8">
      <span class="dt-empty-icon material-icons-outlined">inventory_2</span>
      <p style="color: #4f4539; font-family: 'Inter', sans-serif;">No hay productos en inventario</p>
    </div>
  </div>
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
  { key: 'sku', label: 'SKU', type: 'custom' },
  { key: 'status', label: 'Estado', type: 'custom' },
  { key: 'product', label: 'Producto', type: 'custom' },
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

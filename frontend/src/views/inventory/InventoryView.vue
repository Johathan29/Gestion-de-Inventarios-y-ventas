<template>
  <div>
    <!-- Subnavigation -->
    <div class="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
      <router-link to="/app/inventory" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/inventory' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Inventario
      </router-link>
      <router-link to="/app/inventory/movements" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/inventory/movements' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Movimientos
      </router-link>
      <router-link to="/app/inventory/kardex" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/inventory/kardex' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Kardex
      </router-link>
      <router-link to="/app/inventory/adjustments" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/inventory/adjustments' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Ajustes
      </router-link>
      <router-link to="/app/inventory/transfers" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/inventory/transfers' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Transferencias
      </router-link>
    </div>

    <router-view />
  </div>
</template>

<script setup>
</script>

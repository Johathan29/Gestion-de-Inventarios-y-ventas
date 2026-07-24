<template>
  <div class="flex gap-6 border-b overflow-x-auto mb-6" style="border-color: rgba(210,196,180,0.3);">
    <router-link to="/app/inventory"
      class="pb-3 border-b-2 font-bold whitespace-nowrap text-sm transition-colors"
      :class="$route.path === '/app/inventory' || $route.path === '/app/inventory/'
        ? 'border-[#452d00] text-[#452d00]'
        : 'border-transparent text-[#4f4539] hover:text-[#452d00]'"
      style="font-family: 'Inter', sans-serif;">
      Inventario
    </router-link>
    <router-link to="/app/inventory/movements"
      class="pb-3 border-b-2 font-medium whitespace-nowrap text-sm transition-colors"
      :class="$route.path.startsWith('/app/inventory/movements')
        ? 'border-[#452d00] text-[#452d00]'
        : 'border-transparent text-[#4f4539] hover:text-[#452d00]'"
      style="font-family: 'Inter', sans-serif;">
      Movimientos
    </router-link>
    <router-link to="/app/inventory/kardex"
      class="pb-3 border-b-2 font-medium whitespace-nowrap text-sm transition-colors"
      :class="$route.path.startsWith('/app/inventory/kardex')
        ? 'border-[#452d00] text-[#452d00]'
        : 'border-transparent text-[#4f4539] hover:text-[#452d00]'"
      style="font-family: 'Inter', sans-serif;">
      Kardex
    </router-link>
    <router-link to="/app/inventory/adjustments"
      class="pb-3 border-b-2 font-medium whitespace-nowrap text-sm transition-colors"
      :class="$route.path.startsWith('/app/inventory/adjustments')
        ? 'border-[#452d00] text-[#452d00]'
        : 'border-transparent text-[#4f4539] hover:text-[#452d00]'"
      style="font-family: 'Inter', sans-serif;">
      Ajustes
    </router-link>
    <router-link to="/app/inventory/transfers"
      class="pb-3 border-b-2 font-medium whitespace-nowrap text-sm transition-colors"
      :class="$route.path.startsWith('/app/inventory/transfers')
        ? 'border-[#452d00] text-[#452d00]'
        : 'border-transparent text-[#4f4539] hover:text-[#452d00]'"
      style="font-family: 'Inter', sans-serif;">
      Transferencias
    </router-link>
    <router-link to="/app/inventory/verification"
      class="pb-3 border-b-2 font-medium whitespace-nowrap text-sm transition-colors"
      :class="$route.path.startsWith('/app/inventory/verification')
        ? 'border-[#452d00] text-[#452d00]'
        : 'border-transparent text-[#4f4539] hover:text-[#452d00]'"
      style="font-family: 'Inter', sans-serif;">
      Verificación
    </router-link>
  </div>
</template>

<script setup>
// InventoryTabs — shared sub-navigation for all inventory views
</script>

<template>
  <div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div v-for="r in reportLinks" :key="r.path"
           @click="$router.push(r.path)"
           class="dt-card p-6 cursor-pointer"
           style="transition: box-shadow 0.2s ease, transform 0.2s ease;"
           @mouseenter="e => { e.currentTarget.style.boxShadow = '0px 8px 30px rgba(98,66,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }"
           @mouseleave="e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }">
        <span class="material-icons-outlined text-3xl mb-3" :class="r.color">{{ r.icon }}</span>
        <h3 class="font-semibold" style="color: #0b1c30; margin-bottom: 0.25rem;">{{ r.title }}</h3>
        <p class="dt-body-sm" style="color: #4f4539;">{{ r.desc }}</p>
      </div>
    </div>

    <router-view />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
const reportLinks = [
  { path: '/app/reports/sales', title: 'Reporte de Ventas', icon: 'receipt', desc: 'Resumen de ventas por período', color: 'text-blue-500' },
  { path: '/app/reports/inventory', title: 'Reporte de Inventario', icon: 'warehouse', desc: 'Estado del inventario', color: 'text-green-500' },
  { path: '/app/reports/top-products', title: 'Productos Más Vendidos', icon: 'trending_up', desc: 'Top productos por ventas', color: 'text-purple-500' },
  { path: '/app/reports/clients', title: 'Reporte de Clientes', icon: 'people', desc: 'Clientes frecuentes y compras', color: 'text-orange-500' }
];
</script>

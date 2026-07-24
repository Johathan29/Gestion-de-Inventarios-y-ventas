<template>
  <div class="px-gutter">
    <!-- Page Header -->
     
  
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> analytics </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Reportes"
            description="Analiza el rendimiento de tu negocio"
            tag="h1"
          />
        </div>
        <div class="header-actions"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-8">
      <div v-for="r in reportLinks" :key="r.path"
           @click="$router.push(r.path)"
           class="aurora-raised-card cursor-pointer relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
        <div class="absolute -bottom-4 -right-4 opacity-[0.06] group-hover:opacity-10 transition-opacity duration-300 pointer-events-none select-none">
          <span class="material-icons-outlined" :style="{ fontSize: '7.5rem', color: r.bgColor }">{{ r.icon }}</span>
        </div>
        <div class="relative z-10 flex flex-col">
          <h3 class="text-xs font-semibold uppercase tracking-wider mb-1.5 text-on-surface-variant">{{ r.title }}</h3>
          <p class="text-sm font-medium text-on-surface-variant">{{ r.desc }}</p>
        </div>
      </div>
      </div>
    </template>

    <!-- Child routes render here -->
    <router-view />
  </div>
</template>

<script setup>
import PageHeader from '../../components/shared/PageHeader.vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const reportLinks = [
  { path: '/app/reports/sales', title: 'Reporte de Ventas', icon: 'receipt', desc: 'Resumen de ventas por período', bgColor: '#3b82f6' },
  { path: '/app/reports/inventory', title: 'Reporte de Inventario', icon: 'warehouse', desc: 'Estado del inventario', bgColor: '#22c55e' },
  { path: '/app/reports/top-products', title: 'Productos Más Vendidos', icon: 'trending_up', desc: 'Top productos por ventas', bgColor: '#8b5cf6' },
  { path: '/app/reports/clients', title: 'Reporte de Clientes', icon: 'people', desc: 'Clientes frecuentes y compras', bgColor: '#f97316' },
  { path: '/app/reports/cash-register', title: 'Reporte de Caja', icon: 'point_of_sale', desc: 'Movimientos y cierres de turnos', bgColor: '#ec4899' }
];

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
</script>

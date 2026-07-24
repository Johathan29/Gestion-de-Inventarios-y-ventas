<template>
  <div>
    <div class="aurora-tabs mb-md">
      <router-link v-for="tab in tabs" :key="tab.path" :to="tab.path"
        class="aurora-tab"
        :class="$route.path === tab.path ? 'active' : ''">
        <span class="material-symbols-outlined text-lg mr-2">{{ tab.icon }}</span>
        {{ tab.label }}
      </router-link>
    </div>
    <router-view />
  </div>
</template>

<script setup>
const tabs = [
  { path: '/app/ecommerce', label: 'General', icon: 'dashboard' },
  { path: '/app/ecommerce/hero-slides', label: 'Hero Carrusel', icon: 'slideshow' },
  { path: '/app/ecommerce/banners', label: 'Banners', icon: 'view_carousel' },
  { path: '/app/ecommerce/floating-banners', label: 'Banners Flotantes', icon: 'floating' },
  { path: '/app/ecommerce/offers', label: 'Ofertas', icon: 'local_offer' },
  { path: '/app/ecommerce/hero', label: 'Hero (legacy)', icon: 'photo' },
  { path: '/app/ecommerce/reviews', label: 'Reseñas', icon: 'reviews' },
  { path: '/app/ecommerce/settings', label: 'Configuración', icon: 'settings' },
]
</script>

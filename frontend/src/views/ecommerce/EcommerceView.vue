<template>
  <div>
    <div class="dt-tabs mb-6 flex-wrap">
      <router-link to="/app/ecommerce" class="dt-tab"
                   :class="$route.path === '/app/ecommerce' ? 'dt-tab-active' : 'dt-tab'">
        General
      </router-link>
      <router-link to="/app/ecommerce/hero-slides" class="dt-tab"
                   :class="$route.path === '/app/ecommerce/hero-slides' ? 'dt-tab-active' : 'dt-tab'">
        Hero Carrusel
      </router-link>
      <router-link to="/app/ecommerce/banners" class="dt-tab"
                   :class="$route.path === '/app/ecommerce/banners' ? 'dt-tab-active' : 'dt-tab'">
        Banners
      </router-link>
      <router-link to="/app/ecommerce/floating-banners" class="dt-tab"
                   :class="$route.path === '/app/ecommerce/floating-banners' ? 'dt-tab-active' : 'dt-tab'">
        Banners Flotantes
      </router-link>
      <router-link to="/app/ecommerce/offers" class="dt-tab"
                   :class="$route.path === '/app/ecommerce/offers' ? 'dt-tab-active' : 'dt-tab'">
        Ofertas
      </router-link>
      <router-link to="/app/ecommerce/hero" class="dt-tab"
                   :class="$route.path === '/app/ecommerce/hero' ? 'dt-tab-active' : 'dt-tab'">
        Hero (legacy)
      </router-link>
      <router-link to="/app/ecommerce/reviews" class="dt-tab"
                   :class="$route.path === '/app/ecommerce/reviews' ? 'dt-tab-active' : 'dt-tab'">
        Reseñas
      </router-link>
      <router-link to="/app/ecommerce/settings" class="dt-tab"
                   :class="$route.path === '/app/ecommerce/settings' ? 'dt-tab-active' : 'dt-tab'">
        Configuración
      </router-link>
    </div>
    <router-view />
  </div>
</template>

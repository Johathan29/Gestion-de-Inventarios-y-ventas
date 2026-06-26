<template>
  <div>
    <div class="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 flex-wrap">
      <router-link to="/app/ecommerce" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/ecommerce' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        General
      </router-link>
      <router-link to="/app/ecommerce/hero-slides" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/ecommerce/hero-slides' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Hero Carrusel
      </router-link>
      <router-link to="/app/ecommerce/banners" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/ecommerce/banners' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Banners
      </router-link>
      <router-link to="/app/ecommerce/floating-banners" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/ecommerce/floating-banners' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Banners Flotantes
      </router-link>
      <router-link to="/app/ecommerce/offers" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/ecommerce/offers' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Ofertas
      </router-link>
      <router-link to="/app/ecommerce/hero" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/ecommerce/hero' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Hero (legacy)
      </router-link>
      <router-link to="/app/ecommerce/reviews" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/ecommerce/reviews' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Reseñas
      </router-link>
      <router-link to="/app/ecommerce/settings" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/ecommerce/settings' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Configuración
      </router-link>
    </div>
    <router-view />
  </div>
</template>

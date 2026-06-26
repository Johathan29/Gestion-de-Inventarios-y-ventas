<template>
  <div>
    <div class="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
      <router-link to="/app/admin" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/admin' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Usuarios
      </router-link>
      <router-link to="/app/admin/audit" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/admin/audit' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Auditoría
      </router-link>
      <router-link to="/app/admin/config" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/admin/config' ? 'bg-white dark:bg-gray-800 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'">
        Configuración
      </router-link>
    </div>
    <router-view />
  </div>
</template>

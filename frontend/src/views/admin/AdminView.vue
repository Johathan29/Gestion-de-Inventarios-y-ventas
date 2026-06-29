<template>
  <div>
    <div class="dt-tabs mb-6">
      <router-link to="/app/admin" class="px-4 py-2 text-sm font-medium rounded-t-lg"
                   :class="$route.path === '/app/admin' ? 'dt-tab-active' : 'dt-tab'">
        Usuarios
      </router-link>
      <router-link to="/app/admin/audit" class="dt-tab"
                   :class="$route.path === '/app/admin/audit' ? 'dt-tab-active' : 'dt-tab'">
        Auditoría
      </router-link>
      <router-link to="/app/admin/config" class="dt-tab"
                   :class="$route.path === '/app/admin/config' ? 'dt-tab-active' : 'dt-tab'">
        Configuración
      </router-link>
    </div>
    <router-view />
  </div>
</template>

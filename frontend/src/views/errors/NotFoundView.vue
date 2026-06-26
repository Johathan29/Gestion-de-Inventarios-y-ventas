<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <div class="text-center max-w-md">
      <div class="text-8xl font-bold text-primary-600 mb-4">404</div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Página No Encontrada</h1>
      <p class="text-gray-500 dark:text-gray-400 mb-8">La página que buscas no existe o ha sido movida.</p>
      <router-link to="/app/dashboard" class="btn btn-primary btn-lg">
        <span class="material-icons-outlined">dashboard</span>
        Volver al Dashboard
      </router-link>
    </div>
  </div>
</template>

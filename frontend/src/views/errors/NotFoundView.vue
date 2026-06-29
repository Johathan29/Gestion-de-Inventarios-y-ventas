<template>
  <div class="min-h-screen flex items-center justify-center" style="background: #FDFBF7; padding: 1rem;">
    <div class="text-center max-w-md">
      <div class="text-8xl font-bold" style="color: #624200; margin-bottom: 1rem;">404</div>
      <h1 class="text-2xl font-bold" style="color: #0b1c30; margin-bottom: 0.5rem;">Página No Encontrada</h1>
      <p class="dt-body-sm" style="color: #4f4539; margin-bottom: 2rem;">La página que buscas no existe o ha sido movida.</p>
      <router-link to="/app/dashboard" class="dt-btn-primary">
        <span class="material-icons-outlined">dashboard</span>
        Volver al Dashboard
      </router-link>
    </div>
  </div>
</template>

<template>
  <div class="min-h-screen flex items-center justify-center" style="background: #FDFBF7; padding: 1rem;">
    <div class="text-center max-w-md">
      <div class="text-8xl font-bold" style="color: #624200; margin-bottom: 1rem;">404</div>
      <h1 class="text-2xl font-bold" style="color: #0b1c30; margin-bottom: 0.5rem;">Página No Encontrada</h1>
      <p class="dt-body-sm" style="color: #4f4539; margin-bottom: 2rem;">La página que buscas no existe o ha sido movida.</p>
      <router-link to="/app/dashboard"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
        style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
        <span class="material-icons-outlined" style="font-size: 1.125rem;">dashboard</span>
        Volver al Dashboard
      </router-link>
    </div>
  </div>
</template>

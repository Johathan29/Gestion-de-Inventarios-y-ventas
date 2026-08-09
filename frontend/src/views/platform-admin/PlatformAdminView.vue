<template>
  <div class="pa-layout">
    <!-- Platform Admin Sidebar -->
    <aside class="pa-sidebar">
      <div class="pa-sidebar-header">
        <span class="pa-sidebar-logo">⚡</span>
        <span class="pa-sidebar-brand">Platform Admin</span>
      </div>
      <nav class="pa-nav">
        <router-link to="/app/platform" class="pa-nav-item" :class="{ active: $route.path === '/app/platform' }">
          <span class="pa-nav-icon">📊</span>
          <span>Dashboard</span>
        </router-link>
        <router-link to="/app/platform/companies" class="pa-nav-item" :class="{ active: $route.path.startsWith('/app/platform/companies') }">
          <span class="pa-nav-icon">🏢</span>
          <span>Empresas</span>
        </router-link>
        <router-link to="/app/platform/users" class="pa-nav-item" :class="{ active: $route.path === '/app/platform/users' }">
          <span class="pa-nav-icon">👥</span>
          <span>Usuarios Globales</span>
        </router-link>
        <router-link to="/app/platform/impersonation" class="pa-nav-item" :class="{ active: $route.path === '/app/platform/impersonation' }">
          <span class="pa-nav-icon">🔍</span>
          <span>Sesiones Soporte</span>
        </router-link>
      </nav>
      <div class="pa-sidebar-footer">
        <router-link to="/app/dashboard" class="pa-nav-item">
          <span class="pa-nav-icon">←</span>
          <span>Volver al Panel</span>
        </router-link>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="pa-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
// Layout wrapper for platform admin section
</script>

<style scoped>
.pa-layout { display: flex; min-height: 100vh; background: #f8fafc; }

/* Sidebar */
.pa-sidebar { width: 240px; background: #1e293b; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
.pa-sidebar-header { display: flex; align-items: center; gap: 10px; padding: 20px 18px; border-bottom: 1px solid #334155; }
.pa-sidebar-logo { font-size: 1.5rem; }
.pa-sidebar-brand { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 0.95rem; color: #fff; }
.pa-nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 4px; }
.pa-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; text-decoration: none; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 0.88rem; color: #94a3b8; transition: all 0.2s; }
.pa-nav-item:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }
.pa-nav-item.active { background: rgba(59,130,246,0.15); color: #60a5fa; font-weight: 600; }
.pa-nav-icon { width: 20px; text-align: center; }
.pa-sidebar-footer { padding: 10px; border-top: 1px solid #334155; }

/* Main */
.pa-main { flex: 1; margin-left: 240px; min-height: 100vh; }
</style>

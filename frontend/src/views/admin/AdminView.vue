<template>
  <div>
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> admin_panel_settings </span>
      </div>
      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Administración"
            description="Gestión de usuarios, auditoría y configuración del sistema"
            tag="h1"
          />
        </div>
        <div class="header-actions"></div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 border-b border-gray-200 pb-2 mb-6 overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-all no-underline whitespace-nowrap cursor-pointer"
        :class="activeTab === tab.id
          ? 'bg-purple-100 text-primary font-semibold'
          : 'text-gray-500 hover:text-primary hover:bg-purple-50'"
      >
        <span class="material-icons-outlined align-text-bottom text-lg mr-1.5">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Usuarios -->
      <AdminUsersTab v-if="activeTab === 'users'" />

      <!-- Auditoría -->
      <AdminAuditTab v-else-if="activeTab === 'audit'" />

      <!-- Configuración -->
      <AdminConfigTab v-else-if="activeTab === 'config'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AdminUsersTab from './UsersView.vue';
import AdminAuditTab from './AuditLogView.vue';
import AdminConfigTab from './ConfigView.vue';

const activeTab = ref('users');

const tabs = [
  { id: 'users', label: 'Usuarios', icon: 'people' },
  { id: 'audit', label: 'Auditoría', icon: 'fact_check' },
  { id: 'config', label: 'Configuración', icon: 'settings' },
];
</script>
